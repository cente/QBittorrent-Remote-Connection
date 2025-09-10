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
      const baseUrl = `${protocol}://${config.serverUrl}:${config.port}`;
      
      console.log('Testing QBittorrent API connection to:', baseUrl);
      
      // First, try to get the API version (this doesn't require authentication)
      const versionUrl = `${baseUrl}/api/v2/app/version`;
      const response = await fetch(versionUrl, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        headers: {
          'Accept': 'text/plain',
          'User-Agent': 'QBittorrent-Remote-Extension/1.0'
        }
      });

      console.log('API Response status:', response.status);

      if (response.ok) {
        const version = await response.text();
        console.log('QBittorrent API version:', version);
        
        // If we have credentials, test authentication
        if (config.username && config.password) {
          const authResult = await this.testAuthentication(config, baseUrl);
          if (authResult.success) {
            return { 
              connected: true, 
              version: version.trim(),
              authenticated: true 
            };
          } else {
            return { 
              connected: true, 
              version: version.trim(),
              authenticated: false,
              authError: authResult.error 
            };
          }
        }
        
        return { 
          connected: true, 
          version: version.trim(),
          authenticated: false 
        };
      } else {
        return { 
          connected: false, 
          error: `QBittorrent API returned HTTP ${response.status}: ${response.statusText}`
        };
      }
    } catch (error) {
      console.error('QBittorrent API connection test error:', error);
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return { 
          connected: false, 
          error: 'Cannot reach QBittorrent server - Check if QBittorrent is running and Web UI is enabled'
        };
      } else {
        return { 
          connected: false, 
          error: `API connection failed: ${error.message}`
        };
      }
    }
  }

  async testAuthentication(config, baseUrl) {
    try {
      const loginUrl = `${baseUrl}/api/v2/auth/login`;
      const formData = new FormData();
      formData.append('username', config.username);
      formData.append('password', config.password);

      const response = await fetch(loginUrl, {
        method: 'POST',
        mode: 'cors',
        credentials: 'include',
        body: formData
      });

      if (response.ok) {
        const result = await response.text();
        if (result === 'Ok.') {
          return { success: true };
        } else {
          return { success: false, error: 'Invalid username or password' };
        }
      } else {
        return { success: false, error: `Authentication failed: HTTP ${response.status}` };
      }
    } catch (error) {
      return { success: false, error: `Authentication error: ${error.message}` };
    }
  }

  async makeQBittorrentRequest(requestData) {
    const config = await this.getConfig();
    const protocol = config.useHttps ? 'https' : 'http';
    const baseUrl = `${protocol}://${config.serverUrl}:${config.port}`;
    
    try {
      // Login first if needed and credentials are available
      if (requestData.requiresAuth && config.username && config.password) {
        const authResult = await this.login(config, baseUrl);
        if (!authResult.success) {
          throw new Error(`Authentication failed: ${authResult.error}`);
        }
      }

      const requestHeaders = {
        'User-Agent': 'QBittorrent-Remote-Extension/1.0',
        ...requestData.headers
      };

      const response = await fetch(`${baseUrl}${requestData.endpoint}`, {
        method: requestData.method || 'GET',
        mode: 'cors',
        credentials: 'include',
        headers: requestHeaders,
        body: requestData.body
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await response.json();
        } else {
          const text = await response.text();
          return text.trim();
        }
      } else {
        throw new Error(`QBittorrent API error: HTTP ${response.status} - ${response.statusText}`);
      }
    } catch (error) {
      console.error('QBittorrent API request failed:', error);
      throw new Error(`API request failed: ${error.message}`);
    }
  }

  async login(config, baseUrl) {
    try {
      const url = `${baseUrl}/api/v2/auth/login`;
      
      const formData = new FormData();
      formData.append('username', config.username);
      formData.append('password', config.password);

      const response = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        credentials: 'include',
        body: formData,
        headers: {
          'User-Agent': 'QBittorrent-Remote-Extension/1.0'
        }
      });

      if (!response.ok) {
        return { success: false, error: `Login request failed: HTTP ${response.status}` };
      }

      const result = await response.text();
      if (result.trim() === 'Ok.') {
        return { success: true };
      } else {
        return { success: false, error: 'Invalid credentials' };
      }
    } catch (error) {
      return { success: false, error: `Login error: ${error.message}` };
    }
  }
}

// Initialize background script
new QBittorrentBackground();
