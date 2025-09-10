// Background script for QBittorrent Remote Connection
class QBittorrentBackground {
  constructor() {
    this.setupListeners();
  }

  setupListeners() {
    // Handle extension installation
    browser.runtime.onInstalled.addListener((details) => {
      if (details.reason === 'install') {
        this.handleFirstInstall();
      }
    });

    // Handle messages from popup and options
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async response
    });
  }

  async handleFirstInstall() {
    // Set default configuration on first install
    await this.setDefaultConfig();
    
    // Open options page
    browser.tabs.create({
      url: browser.runtime.getURL('options/options.html')
    });
  }

  async setDefaultConfig() {
    const defaultConfig = {
      serverUrl: '',
      username: '',
      password: '',
      port: '8080',
      useHttps: false,
      autoLogin: false
    };

    await browser.storage.local.set({ config: defaultConfig });
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.action) {
        case 'getConfig':
          const config = await this.getConfig();
          sendResponse({ success: true, data: config });
          break;

        case 'saveConfig':
          await this.saveConfig(message.data);
          sendResponse({ success: true });
          break;

        case 'testConnection':
          const result = await this.testConnection(message.data);
          sendResponse({ success: true, data: result });
          break;

        case 'qbittorrentApi':
          const apiResult = await this.makeQBittorrentRequest(message.data);
          sendResponse({ success: true, data: apiResult });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Background script error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async getConfig() {
    const result = await browser.storage.local.get('config');
    return result.config || {};
  }

  async saveConfig(config) {
    await browser.storage.local.set({ config });
  }

  async testConnection(config) {
    try {
      const protocol = config.useHttps ? 'https' : 'http';
      const url = `${protocol}://${config.serverUrl}:${config.port}/api/v2/app/version`;
      
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const version = await response.text();
        return { connected: true, version };
      } else {
        return { connected: false, error: `HTTP ${response.status}` };
      }
    } catch (error) {
      return { connected: false, error: error.message };
    }
  }

  async makeQBittorrentRequest(requestData) {
    const config = await this.getConfig();
    const protocol = config.useHttps ? 'https' : 'http';
    const baseUrl = `${protocol}://${config.serverUrl}:${config.port}`;
    
    try {
      // Login first if needed
      if (requestData.requiresAuth && config.username && config.password) {
        await this.login(config);
      }

      const response = await fetch(`${baseUrl}${requestData.endpoint}`, {
        method: requestData.method || 'GET',
        headers: requestData.headers || {},
        body: requestData.body,
        credentials: 'include'
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await response.json();
        } else {
          return await response.text();
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      throw new Error(`Request failed: ${error.message}`);
    }
  }

  async login(config) {
    const protocol = config.useHttps ? 'https' : 'http';
    const url = `${protocol}://${config.serverUrl}:${config.port}/api/v2/auth/login`;
    
    const formData = new FormData();
    formData.append('username', config.username);
    formData.append('password', config.password);

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const result = await response.text();
    if (result !== 'Ok.') {
      throw new Error('Invalid credentials');
    }
  }
}

// Initialize background script
new QBittorrentBackground();
