/**
 * QBittorrent API Module
 * Handles all communication with QBittorrent Web API
 */
class QBittorrentAPI {
  constructor() {
    console.log("=== QBittorrentAPI: Constructor called ===");
    this.settings = null;
    this.sessionCookie = null;
    this.isAuthenticated = false;
    console.log("QBittorrentAPI instance created");
  }

  /**
   * Load settings from browser storage
   */
  async loadSettings() {
    console.log("=== QBittorrentAPI: Loading settings ===");
    try {
      console.log("Requesting settings from browser storage...");
      const result = await browser.storage.local.get("qbittorrent_settings");
      console.log("Storage result:", result);

      this.settings = result.qbittorrent_settings || null;
      console.log("Loaded settings:", {
        ...this.settings,
        password: this.settings?.password ? "[HIDDEN]" : "",
      });

      const hasSettings = this.settings !== null;
      console.log("Settings loaded successfully:", hasSettings);
      return hasSettings;
    } catch (error) {
      console.error("=== QBittorrentAPI: Failed to load settings ===");
      console.error("Error:", error);
      return false;
    }
  }

  /**
   * Build API URL
   */
  buildUrl(endpoint) {
    if (!this.settings) {
      throw new Error("Settings not loaded");
    }

    const protocol = this.settings.useHttps ? "https" : "http";
    const port = this.settings.port ? `:${this.settings.port}` : "";
    return `${protocol}://${this.settings.hostname}${port}/api/v2/${endpoint}`;
  }

  /**
   * Authenticate with QBittorrent
   */
  async authenticate() {
    if (!this.settings) {
      await this.loadSettings();
    }

    if (!this.settings) {
      throw new Error("No QBittorrent settings configured");
    }

    try {
      const response = await fetch(this.buildUrl("auth/login"), {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          username: this.settings.username || "",
          password: this.settings.password || "",
        }),
        credentials: "include",
      });

      if (response.ok) {
        const text = await response.text();
        this.isAuthenticated = text === "Ok.";

        // Store session cookie
        const setCookie = response.headers.get("set-cookie");
        if (setCookie) {
          this.sessionCookie = setCookie;
        }

        return this.isAuthenticated;
      }

      return false;
    } catch (error) {
      console.error("Authentication failed:", error);
      return false;
    }
  }

  /**
   * Test connection to QBittorrent
   */
  async testConnection() {
    try {
      const response = await fetch(this.buildUrl("app/version"), {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        return await response.text();
      }

      return null;
    } catch (error) {
      console.error("Connection test failed:", error);
      return null;
    }
  }

  /**
   * Add torrent via magnet link
   */
  async addMagnet(magnetUrl, options = {}) {
    // Ensure we're authenticated
    if (!this.isAuthenticated) {
      const authSuccess = await this.authenticate();
      if (!authSuccess) {
        throw new Error("Authentication failed");
      }
    }

    try {
      const formData = new FormData();
      formData.append("urls", magnetUrl);

      // Add optional parameters
      if (options.savepath) {
        formData.append("savepath", options.savepath);
      }
      if (options.category) {
        formData.append("category", options.category);
      }
      if (options.paused !== undefined) {
        formData.append("paused", options.paused);
      }
      if (options.priority !== undefined) {
        formData.append("priority", options.priority);
      }

      const response = await fetch(this.buildUrl("torrents/add"), {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (response.ok) {
        const result = await response.text();
        return result === "Ok.";
      }

      return false;
    } catch (error) {
      console.error("Failed to add magnet:", error);
      throw error;
    }
  }

  /**
   * Get torrent list
   */
  async getTorrents() {
    if (!this.isAuthenticated) {
      const authSuccess = await this.authenticate();
      if (!authSuccess) {
        throw new Error("Authentication failed");
      }
    }

    try {
      const response = await fetch(this.buildUrl("torrents/info"), {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        return await response.json();
      }

      return [];
    } catch (error) {
      console.error("Failed to get torrents:", error);
      return [];
    }
  }

  /**
   * Get available categories
   */
  async getCategories() {
    if (!this.isAuthenticated) {
      const authSuccess = await this.authenticate();
      if (!authSuccess) {
        return {};
      }
    }

    try {
      const response = await fetch(this.buildUrl("torrents/categories"), {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        return await response.json();
      }

      return {};
    } catch (error) {
      console.error("Failed to get categories:", error);
      return {};
    }
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = QBittorrentAPI;
} else if (typeof window !== "undefined") {
  window.QBittorrentAPI = QBittorrentAPI;
}
