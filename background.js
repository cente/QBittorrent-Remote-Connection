// Background script for QBittorrent Remote Connection
class QBittorrentBackground {
  constructor() {
    this.setupListeners();
    this.setupWebRequestInterceptor();
  }

  setupWebRequestInterceptor() {
    // Handle HTTPS-only mode for local HTTP services
    if (browser.webRequest && browser.webRequest.onBeforeRequest) {
      browser.webRequest.onBeforeRequest.addListener(
        (details) => {
          // Allow HTTP requests to local/private networks
          const url = new URL(details.url);
          if (this.isLocalNetwork(url.hostname)) {
            return { cancel: false };
          }
        },
        {
          urls: ["http://*/*", "https://*/*"],
        },
        ["blocking"]
      );
    }
  }

  isLocalNetwork(hostname) {
    // Check if hostname is a local/private network address
    const localPatterns = [
      /^localhost$/i,
      /^127\./,
      /^192\.168\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /\.local$/i,
    ];

    return localPatterns.some((pattern) => pattern.test(hostname));
  }

  setupListeners() {
    // Handle extension installation
    browser.runtime.onInstalled.addListener((details) => {
      if (details.reason === "install") {
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
      url: browser.runtime.getURL("options/options.html"),
    });
  }

  async setDefaultConfig() {
    const defaultConfig = {
      serverUrl: "",
      username: "",
      password: "",
      port: "8080",
      useHttps: false,
      autoLogin: false,
    };

    await browser.storage.local.set({ config: defaultConfig });
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.action) {
        case "getConfig":
          const config = await this.getConfig();
          sendResponse({ success: true, data: config });
          break;

        case "saveConfig":
          await this.saveConfig(message.data);
          sendResponse({ success: true });
          break;

        case "testConnection":
          // Handle both old format (message.data) and new format (message.settings)
          const connectionConfig = message.settings || message.data;
          const result = await this.testConnection(connectionConfig);
          sendResponse({ success: true, data: result });
          break;

        case "makeRequest":
          // Handle QBittorrent API requests with settings
          const apiResult = await this.makeQBittorrentRequest(
            message.settings,
            message.endpoint,
            message.method,
            message.data
          );
          sendResponse({ success: true, data: apiResult });
          break;

        case "qbittorrentApi":
          const legacyApiResult = await this.makeQBittorrentRequest(
            message.data
          );
          sendResponse({ success: true, data: legacyApiResult });
          break;

        default:
          sendResponse({ success: false, error: "Unknown action" });
      }
    } catch (error) {
      console.error("Background script error:", error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async getConfig() {
    const result = await browser.storage.local.get("config");
    return result.config || {};
  }

  async saveConfig(config) {
    await browser.storage.local.set({ config });
  }

  async testConnection(settings) {
    try {
      // Handle both old format (config) and new format (settings)
      const config = settings.hostname
        ? {
            serverUrl: settings.hostname,
            port: settings.port,
            useHttps: settings.useHttps,
            username: settings.username,
            password: settings.password,
          }
        : settings;

      const protocol = config.useHttps ? "https" : "http";
      const baseUrl = `${protocol}://${config.serverUrl}:${config.port}`;

      console.log("Testing QBittorrent API connection to:", baseUrl);

      // Test version endpoint first - simplest API call
      const versionUrl = `${baseUrl}/api/v2/app/version`;
      const versionResponse = await fetch(versionUrl, {
        method: "GET",
        mode: "cors",
        credentials: "omit",
        headers: {
          Accept: "text/plain",
        },
      });

      console.log("Version API Response status:", versionResponse.status);

      if (!versionResponse.ok) {
        throw new Error(
          `QBittorrent API returned HTTP ${versionResponse.status}: ${versionResponse.statusText}`
        );
      }

      const version = await versionResponse.text();
      console.log("QBittorrent API version:", version);

      // Return success with server info
      return {
        server_version: version,
        api_version: "2.0", // QBittorrent API v2
        connected: true,
      };
    } catch (error) {
      console.error("Connection test failed:", error);
      // Return error for sendResponse to handle
      throw new Error(error.message);
    }
  }

  // New simplified API request handler
  async makeQBittorrentRequest(
    settings,
    endpoint,
    method = "GET",
    data = null
  ) {
    try {
      const config = settings.hostname
        ? {
            serverUrl: settings.hostname,
            port: settings.port,
            useHttps: settings.useHttps,
            username: settings.username,
            password: settings.password,
          }
        : settings;

      const protocol = config.useHttps ? "https" : "http";
      const baseUrl = `${protocol}://${config.serverUrl}:${config.port}`;
      const url = `${baseUrl}${endpoint}`;

      const requestOptions = {
        method: method,
        mode: "cors",
        credentials: "omit",
        headers: {
          Accept: "application/json",
        },
      };

      // Add data for POST requests
      if (method === "POST" && data) {
        const formData = new FormData();
        Object.keys(data).forEach((key) => {
          formData.append(key, data[key]);
        });
        requestOptions.body = formData;
      }

      const response = await fetch(url, requestOptions);

      if (!response.ok) {
        throw new Error(`API request failed: HTTP ${response.status}`);
      }

      // Handle different response types
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await response.json();
      } else {
        return await response.text();
      }
    } catch (error) {
      console.error("QBittorrent API request failed:", error);
      throw error;
    }
  }

  async testAuthentication(config, baseUrl) {
    try {
      const loginUrl = `${baseUrl}/api/v2/auth/login`;
      const formData = new FormData();
      formData.append("username", config.username);
      formData.append("password", config.password);

      const response = await fetch(loginUrl, {
        method: "POST",
        mode: "cors",
        credentials: "include",
        body: formData,
      });

      if (response.ok) {
        const result = await response.text();
        if (result === "Ok.") {
          return { success: true };
        } else {
          return { success: false, error: "Invalid username or password" };
        }
      } else {
        return {
          success: false,
          error: `Authentication failed: HTTP ${response.status}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Authentication error: ${error.message}`,
      };
    }
  }

  async makeQBittorrentRequest(requestData) {
    const config = await this.getConfig();
    const protocol = config.useHttps ? "https" : "http";
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
        "User-Agent": "QBittorrent-Remote-Extension/1.0",
        ...requestData.headers,
      };

      const response = await fetch(`${baseUrl}${requestData.endpoint}`, {
        method: requestData.method || "GET",
        mode: "cors",
        credentials: "include",
        headers: requestHeaders,
        body: requestData.body,
      });

      if (response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          return await response.json();
        } else {
          const text = await response.text();
          return text.trim();
        }
      } else {
        throw new Error(
          `QBittorrent API error: HTTP ${response.status} - ${response.statusText}`
        );
      }
    } catch (error) {
      console.error("QBittorrent API request failed:", error);
      throw new Error(`API request failed: ${error.message}`);
    }
  }

  async login(config, baseUrl) {
    try {
      const url = `${baseUrl}/api/v2/auth/login`;

      const formData = new FormData();
      formData.append("username", config.username);
      formData.append("password", config.password);

      const response = await fetch(url, {
        method: "POST",
        mode: "cors",
        credentials: "include",
        body: formData,
        headers: {
          "User-Agent": "QBittorrent-Remote-Extension/1.0",
        },
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Login request failed: HTTP ${response.status}`,
        };
      }

      const result = await response.text();
      if (result.trim() === "Ok.") {
        return { success: true };
      } else {
        return { success: false, error: "Invalid credentials" };
      }
    } catch (error) {
      return { success: false, error: `Login error: ${error.message}` };
    }
  }
}

// Initialize background script
new QBittorrentBackground();
