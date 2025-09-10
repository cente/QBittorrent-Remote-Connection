// Popup functionality
class PopupManager {
  constructor() {
    this.config = null;
    this.isConnected = false;

    this.init();
  }

  async init() {
    await this.loadConfig();
    this.setupEventListeners();
    await this.checkConnection();
  }

  setupEventListeners() {
    // Settings button
    document.getElementById("settingsBtn").addEventListener("click", () => {
      this.openSettings();
    });

    // Open settings from prompt
    document.getElementById("openSettingsBtn").addEventListener("click", () => {
      this.openSettings();
    });

    // Open Web UI button
    document.getElementById("openWebUIBtn").addEventListener("click", () => {
      this.openWebUI();
    });

    // Refresh button
    document.getElementById("refreshBtn").addEventListener("click", () => {
      this.refresh();
    });

    // Pause all button
    document.getElementById("pauseAllBtn").addEventListener("click", () => {
      this.pauseAll();
    });

    // Retry button
    document.getElementById("retryBtn").addEventListener("click", () => {
      this.retry();
    });

    // Footer links
    document.getElementById("aboutLink").addEventListener("click", (e) => {
      e.preventDefault();
      this.showAbout();
    });

    document.getElementById("helpLink").addEventListener("click", (e) => {
      e.preventDefault();
      this.showHelp();
    });
  }

  async loadConfig() {
    try {
      const response = await browser.runtime.sendMessage({
        action: "getConfig",
      });

      if (response.success) {
        this.config = response.data;
      }
    } catch (error) {
      console.error("Failed to load config:", error);
    }
  }

  async checkConnection() {
    if (!this.config || !this.config.serverUrl || !this.config.port) {
      this.showConfigPrompt();
      return;
    }

    this.updateConnectionStatus("Checking connection...", "checking");

    try {
      const response = await browser.runtime.sendMessage({
        action: "testConnection",
        data: this.config,
      });

      if (response.success && response.data.connected) {
        this.isConnected = true;
        this.showMainInterface();
        this.updateConnectionStatus("Connected", "connected");
        this.updateServerInfo(response.data.version);
        await this.loadTorrentStats();
      } else {
        this.isConnected = false;
        this.showError(`Connection failed: ${response.data.error}`);
      }
    } catch (error) {
      console.error("Connection check failed:", error);
      this.showError("Failed to check connection");
    }
  }

  async loadTorrentStats() {
    if (!this.isConnected) return;

    try {
      const response = await browser.runtime.sendMessage({
        action: "qbittorrentApi",
        data: {
          endpoint: "/api/v2/torrents/info",
          method: "GET",
          requiresAuth: true,
        },
      });

      if (response.success) {
        this.updateTorrentStats(response.data);
      }
    } catch (error) {
      console.error("Failed to load torrent stats:", error);
    }
  }

  updateTorrentStats(torrents) {
    const stats = {
      downloading: 0,
      seeding: 0,
      paused: 0,
      total: torrents.length,
    };

    torrents.forEach((torrent) => {
      switch (torrent.state) {
        case "downloading":
        case "stalledDL":
        case "metaDL":
          stats.downloading++;
          break;
        case "uploading":
        case "stalledUP":
          stats.seeding++;
          break;
        case "pausedDL":
        case "pausedUP":
          stats.paused++;
          break;
      }
    });

    document.getElementById("downloadingCount").textContent = stats.downloading;
    document.getElementById("seedingCount").textContent = stats.seeding;
    document.getElementById("pausedCount").textContent = stats.paused;
    document.getElementById("totalCount").textContent = stats.total;

    document.getElementById("torrentStats").style.display = "block";
  }

  showConfigPrompt() {
    document.getElementById("configPrompt").style.display = "block";
    document.getElementById("mainContent").style.display = "none";
  }

  showMainInterface() {
    document.getElementById("configPrompt").style.display = "none";
    document.getElementById("mainContent").style.display = "block";
    document.getElementById("quickActions").style.display = "block";
    document.getElementById("serverInfo").style.display = "block";
  }

  showError(message) {
    const errorElement = document.getElementById("errorMessage");
    const errorText = errorElement.querySelector(".error-text");

    errorText.textContent = message;
    errorElement.style.display = "block";

    this.updateConnectionStatus("Disconnected", "disconnected");
    document.getElementById("quickActions").style.display = "none";
    document.getElementById("torrentStats").style.display = "none";
  }

  updateConnectionStatus(text, status) {
    const statusElement = document.getElementById("connectionStatus");
    const statusText = statusElement.querySelector(".status-text");
    const statusIndicator = statusElement.querySelector(".status-indicator i");

    statusText.textContent = text;

    // Remove existing classes
    statusElement.classList.remove(
      "alert-info",
      "alert-success",
      "alert-danger",
      "alert-warning"
    );
    statusIndicator.classList.remove(
      "text-secondary",
      "text-success",
      "text-danger",
      "text-warning"
    );

    // Apply status-specific styling
    switch (status) {
      case "connected":
        statusElement.classList.add("alert-success");
        statusIndicator.classList.add("text-success");
        statusIndicator.className = "bi bi-check-circle-fill text-success";
        break;
      case "disconnected":
        statusElement.classList.add("alert-danger");
        statusIndicator.classList.add("text-danger");
        statusIndicator.className = "bi bi-x-circle-fill text-danger";
        break;
      case "checking":
        statusElement.classList.add("alert-warning");
        statusIndicator.classList.add("text-warning");
        statusIndicator.className = "bi bi-hourglass-split text-warning";
        break;
      default:
        statusElement.classList.add("alert-info");
        statusIndicator.classList.add("text-secondary");
        statusIndicator.className = "bi bi-circle-fill text-secondary";
    }
  }

  updateServerInfo(version) {
    const protocol = this.config.useHttps ? "https" : "http";
    const serverUrl = `${protocol}://${this.config.serverUrl}:${this.config.port}`;

    document.getElementById("serverUrl").textContent = serverUrl;
    document.getElementById("serverVersion").textContent = version;
  }

  openSettings() {
    browser.tabs.create({
      url: browser.runtime.getURL("options/options.html"),
    });
    window.close();
  }

  openWebUI() {
    if (!this.config) return;

    const protocol = this.config.useHttps ? "https" : "http";
    const url = `${protocol}://${this.config.serverUrl}:${this.config.port}`;

    browser.tabs.create({ url });
    window.close();
  }

  async refresh() {
    document.getElementById("errorMessage").style.display = "none";
    await this.checkConnection();
  }

  async retry() {
    await this.refresh();
  }

  async pauseAll() {
    if (!this.isConnected) return;

    try {
      const response = await browser.runtime.sendMessage({
        action: "qbittorrentApi",
        data: {
          endpoint: "/api/v2/torrents/pause",
          method: "POST",
          body: "hashes=all",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          requiresAuth: true,
        },
      });

      if (response.success) {
        this.showTemporaryStatus("All torrents paused", "success");
        // Refresh after a short delay
        setTimeout(() => this.loadTorrentStats(), 1000);
      } else {
        this.showTemporaryStatus("Failed to pause torrents", "error");
      }
    } catch (error) {
      console.error("Failed to pause all torrents:", error);
      this.showTemporaryStatus("Failed to pause torrents", "error");
    }
  }

  showTemporaryStatus(message, type) {
    const statusElement = document.getElementById("connectionStatus");
    const originalText =
      statusElement.querySelector(".status-text").textContent;
    const originalIcon = statusElement.querySelector(
      ".status-indicator i"
    ).className;
    const originalClass = statusElement.className;

    // Show temporary message
    this.updateConnectionStatus(message, type);

    // Restore original status after 2 seconds
    setTimeout(() => {
      statusElement.querySelector(".status-text").textContent = originalText;
      statusElement.querySelector(".status-indicator i").className =
        originalIcon;
      statusElement.className = originalClass;
    }, 2000);
  }

  showAbout() {
    alert(
      "QBittorrent Remote Connection v1.0.0\n\nA Firefox extension for managing remote QBittorrent connections.\n\nDeveloped with ❤️ for the torrenting community."
    );
  }

  showHelp() {
    const helpText = `
QBittorrent Remote Connection Help:

1. Setup: Click the settings button to configure your QBittorrent server connection
2. Enter your server's IP address and port (usually 8080)
3. Provide your QBittorrent Web UI username and password
4. Test the connection to verify settings
5. Save your configuration

Troubleshooting:
- Ensure QBittorrent Web UI is enabled
- Check if the server is accessible from your browser
- Verify username and password are correct
- Try both HTTP and HTTPS connection types

For more help, visit the extension's GitHub page.
    `;

    alert(helpText.trim());
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new PopupManager();
});
