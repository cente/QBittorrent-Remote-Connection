// Options page functionality
class OptionsManager {
  constructor() {
    this.form = document.getElementById("configForm");
    this.testButton = document.getElementById("testConnection");
    this.saveButton = document.getElementById("saveConfig");
    this.statusMessage = document.getElementById("statusMessage");

    this.init();
  }

  async init() {
    await this.loadConfig();
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.form.addEventListener("submit", (e) => this.handleSave(e));
    this.testButton.addEventListener("click", () =>
      this.handleTestConnection()
    );

    // Debug button listeners
    document
      .getElementById("testBasicFetch")
      ?.addEventListener("click", () => this.testBasicFetch());
    document
      .getElementById("testVersionApi")
      ?.addEventListener("click", () => this.testVersionApi());
    document
      .getElementById("testTorrentsApi")
      ?.addEventListener("click", () => this.testTorrentsApi());
    document
      .getElementById("testWithCurl")
      ?.addEventListener("click", () => this.showCurlCommands());
    document
      .getElementById("testCorsMode")
      ?.addEventListener("click", () => this.testCorsMode());
    document
      .getElementById("clearDebugLog")
      ?.addEventListener("click", () => this.clearDebugLog());
    document
      .getElementById("showHttpsOnlyHelp")
      ?.addEventListener("click", () => this.showHttpsOnlyHelp());
    document
      .getElementById("fixHttpsOnlyMode")
      ?.addEventListener("click", () => this.fixHttpsOnlyMode());

    // Auto-save on input change
    this.form.addEventListener("input", () => {
      this.clearStatus();
      this.hideConnectionResult();
      this.validateInputs();
    });
  }

  validateInputs() {
    const serverUrl = document.getElementById("serverUrl");
    const port = document.getElementById("port");

    // Server URL validation
    if (serverUrl.value.trim()) {
      serverUrl.classList.remove("is-invalid");
      serverUrl.classList.add("is-valid");
    } else {
      serverUrl.classList.remove("is-valid", "is-invalid");
    }

    // Port validation
    const portValue = parseInt(port.value);
    if (portValue && portValue >= 1 && portValue <= 65535) {
      port.classList.remove("is-invalid");
      port.classList.add("is-valid");
    } else if (port.value) {
      port.classList.remove("is-valid");
      port.classList.add("is-invalid");
    } else {
      port.classList.remove("is-valid", "is-invalid");
    }
  }

  async loadConfig() {
    try {
      const response = await browser.runtime.sendMessage({
        action: "getConfig",
      });

      if (response.success && response.data) {
        this.populateForm(response.data);
      }
    } catch (error) {
      console.error("Failed to load config:", error);
      this.showStatus("Failed to load configuration", "error");
    }
  }

  populateForm(config) {
    document.getElementById("serverUrl").value = config.serverUrl || "";
    document.getElementById("port").value = config.port || "8080";
    document.getElementById("username").value = config.username || "";
    document.getElementById("password").value = config.password || "";
    document.getElementById("useHttps").checked = config.useHttps || false;
    document.getElementById("autoLogin").checked = config.autoLogin || false;
  }

  getFormData() {
    return {
      serverUrl: document.getElementById("serverUrl").value.trim(),
      port: document.getElementById("port").value.trim(),
      username: document.getElementById("username").value.trim(),
      password: document.getElementById("password").value,
      useHttps: document.getElementById("useHttps").checked,
      autoLogin: document.getElementById("autoLogin").checked,
    };
  }

  async handleSave(e) {
    e.preventDefault();

    const config = this.getFormData();

    // Validate required fields
    if (!config.serverUrl || !config.port) {
      this.showStatus("Please fill in server URL and port", "error");
      return;
    }

    try {
      this.setButtonLoading(this.saveButton, true);

      const response = await browser.runtime.sendMessage({
        action: "saveConfig",
        data: config,
      });

      if (response.success) {
        this.showStatus("Configuration saved successfully!", "success");
      } else {
        this.showStatus("Failed to save configuration", "error");
      }
    } catch (error) {
      console.error("Save error:", error);
      this.showStatus("Failed to save configuration", "error");
    } finally {
      this.setButtonLoading(this.saveButton, false);
    }
  }

  async handleTestConnection() {
    const config = this.getFormData();

    // Validate required fields for testing
    if (!config.serverUrl || !config.port) {
      this.showStatus(
        "Please fill in server URL and port before testing",
        "error"
      );
      return;
    }

    try {
      this.setButtonLoading(this.testButton, true);
      this.showStatus("Testing connection...", "info");
      this.hideConnectionResult();

      const startTime = Date.now();
      const response = await browser.runtime.sendMessage({
        action: "testConnection",
        data: config,
      });
      const responseTime = Date.now() - startTime;

      if (response.success && response.data.connected) {
        let statusMessage = `✅ QBittorrent API connected! Version: ${response.data.version}`;

        if (response.data.torrentCount !== undefined) {
          statusMessage += ` (${response.data.torrentCount} torrents)`;
        }

        if (response.data.authenticated === true) {
          statusMessage += "\n🔐 Access granted - API working properly";
        } else if (
          response.data.authenticated === false &&
          response.data.authError
        ) {
          statusMessage += `\n⚠️ Data access issue: ${response.data.authError}`;
        } else if (config.username && config.password) {
          statusMessage +=
            "\n⚠️ Credentials provided but authentication not tested";
        }

        this.showStatus(statusMessage, "success");
        this.showConnectionResult(
          config,
          response.data.version,
          responseTime,
          response.data
        );
      } else {
        this.showStatus(
          `❌ Connection failed: ${response.data.error}`,
          "error"
        );
        this.hideConnectionResult();
      }
    } catch (error) {
      console.error("Test connection error:", error);
      this.showStatus("Connection test failed", "error");
      this.hideConnectionResult();
    } finally {
      this.setButtonLoading(this.testButton, false);
    }
  }

  showConnectionResult(config, version, responseTime, testData = {}) {
    const protocol = config.useHttps ? "https" : "http";
    const serverUrl = `${protocol}://${config.serverUrl}:${config.port}`;

    document.getElementById("testServerUrl").textContent = serverUrl;
    document.getElementById("testServerVersion").textContent = version;
    document.getElementById(
      "testResponseTime"
    ).textContent = `${responseTime}ms`;

    // Add authentication status if available
    const resultCard = document.getElementById("connectionResult");
    let authStatusHtml = "";

    if (testData.authenticated === true) {
      authStatusHtml = `
        <div class="d-flex justify-content-between align-items-center">
          <span class="text-muted">
            <i class="bi bi-shield-check me-1"></i>Authentication:
          </span>
          <span class="text-success">✅ Successful</span>
        </div>
      `;
    } else if (testData.authenticated === false && testData.authError) {
      authStatusHtml = `
        <div class="d-flex justify-content-between align-items-center">
          <span class="text-muted">
            <i class="bi bi-shield-x me-1"></i>Authentication:
          </span>
          <span class="text-warning">⚠️ Failed</span>
        </div>
      `;
    }

    if (authStatusHtml) {
      const cardBody = resultCard.querySelector(".card-body");
      const existingAuth = cardBody.querySelector(".auth-status");
      if (existingAuth) {
        existingAuth.remove();
      }
      cardBody.insertAdjacentHTML(
        "beforeend",
        `<div class="auth-status">${authStatusHtml}</div>`
      );
    }

    resultCard.style.display = "block";
  }

  hideConnectionResult() {
    document.getElementById("connectionResult").style.display = "none";
  }

  setButtonLoading(button, loading) {
    const text = button.querySelector(".btn-text");
    const spinner = button.querySelector(".spinner-border");

    if (loading) {
      button.disabled = true;
      if (text) text.style.display = "none";
      if (spinner) spinner.style.display = "inline-block";
    } else {
      button.disabled = false;
      if (text) text.style.display = "inline";
      if (spinner) spinner.style.display = "none";
    }
  }

  showStatus(message, type) {
    const statusText = this.statusMessage.querySelector(".status-text");
    statusText.textContent = message;

    // Remove existing Bootstrap alert classes
    this.statusMessage.classList.remove(
      "alert-success",
      "alert-danger",
      "alert-info"
    );

    // Add appropriate Bootstrap alert class
    if (type === "success") {
      this.statusMessage.classList.add("alert-success");
    } else if (type === "error") {
      this.statusMessage.classList.add("alert-danger");
    } else if (type === "info") {
      this.statusMessage.classList.add("alert-info");
    }

    this.statusMessage.style.display = "block";

    // Auto-hide success messages after 3 seconds
    if (type === "success") {
      setTimeout(() => {
        this.clearStatus();
      }, 3000);
    }
  }

  clearStatus() {
    this.statusMessage.style.display = "none";
  }

  // Debug Functions
  logDebug(message, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;

    const debugOutput = document.getElementById("debugOutput");
    debugOutput.textContent += logEntry + "\n";

    if (data) {
      debugOutput.textContent += JSON.stringify(data, null, 2) + "\n";
    }

    debugOutput.textContent += "\n";

    // Show debug log
    document.getElementById("debugLog").style.display = "block";

    // Scroll to bottom
    debugOutput.scrollTop = debugOutput.scrollHeight;

    console.log(logEntry, data);
  }

  clearDebugLog() {
    document.getElementById("debugOutput").textContent = "";
    document.getElementById("debugLog").style.display = "none";
  }

  async testBasicFetch() {
    const config = this.getFormData();
    if (!config.serverUrl || !config.port) {
      this.logDebug("❌ ERROR: Please fill in server URL and port first");
      return;
    }

    const protocol = config.useHttps ? "https" : "http";
    const baseUrl = `${protocol}://${config.serverUrl}:${config.port}`;

    this.logDebug(`🔍 Testing basic fetch to: ${baseUrl}`);
    this.logDebug(
      `ℹ️  Protocol: ${protocol}, HTTPS setting: ${config.useHttps}`
    );

    // Check for HTTPS-only mode warning
    if (!config.useHttps) {
      this.logDebug(
        "⚠️  Note: Testing HTTP connection - Firefox HTTPS-Only mode may interfere"
      );
      this.logDebug(
        "💡 If this fails, try disabling HTTPS-Only mode for this extension"
      );
    }

    try {
      const response = await fetch(baseUrl, {
        method: "GET",
        mode: "no-cors",
        cache: "no-cache",
      });

      this.logDebug(`✅ Basic fetch completed`, {
        status: response.status,
        statusText: response.statusText,
        type: response.type,
        url: response.url,
        redirected: response.redirected,
      });

      if (response.type === "opaque") {
        this.logDebug(
          'ℹ️  Response type is "opaque" - this is normal for no-cors requests'
        );
      }
    } catch (error) {
      this.logDebug(`❌ Basic fetch failed: ${error.message}`, {
        name: error.name,
        stack: error.stack.split("\n").slice(0, 3).join("\n"),
      });

      if (error.message.includes("NetworkError")) {
        this.logDebug(
          "🔍 NetworkError suggests HTTPS-Only mode or CORS blocking"
        );
        this.logDebug(
          "💡 Try: 1) Disable HTTPS-Only mode, 2) Add extension exception, 3) Use different CORS mode"
        );

        // Auto-detect HTTPS-Only Mode and show solution
        this.detectAndShowHttpsOnlySolution(config);
      }
    }
  }

  async testVersionApi() {
    const config = this.getFormData();
    if (!config.serverUrl || !config.port) {
      this.logDebug("❌ ERROR: Please fill in server URL and port first");
      return;
    }

    const protocol = config.useHttps ? "https" : "http";
    const versionUrl = `${protocol}://${config.serverUrl}:${config.port}/api/v2/app/version`;

    this.logDebug(`🔍 Testing version API: ${versionUrl}`);

    try {
      const response = await fetch(versionUrl, {
        method: "GET",
        mode: "cors",
        credentials: "omit",
        headers: {
          Accept: "text/plain",
        },
      });

      this.logDebug(`📡 Version API response`, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        url: response.url,
      });

      if (response.ok) {
        const version = await response.text();
        this.logDebug(`✅ Version API success: ${version.trim()}`);
      } else {
        this.logDebug(`❌ Version API failed with status ${response.status}`);
      }
    } catch (error) {
      this.logDebug(`❌ Version API error: ${error.message}`, {
        name: error.name,
        stack: error.stack,
      });
    }
  }

  async testTorrentsApi() {
    const config = this.getFormData();
    if (!config.serverUrl || !config.port) {
      this.logDebug("❌ ERROR: Please fill in server URL and port first");
      return;
    }

    const protocol = config.useHttps ? "https" : "http";
    const torrentsUrl = `${protocol}://${config.serverUrl}:${config.port}/api/v2/torrents/info`;

    this.logDebug(`🔍 Testing torrents API: ${torrentsUrl}`);

    try {
      const response = await fetch(torrentsUrl, {
        method: "GET",
        mode: "cors",
        credentials: "omit",
        headers: {
          Accept: "application/json",
        },
      });

      this.logDebug(`📡 Torrents API response`, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        url: response.url,
      });

      if (response.ok) {
        const torrents = await response.json();
        this.logDebug(
          `✅ Torrents API success: Found ${torrents.length} torrents`
        );

        if (torrents.length > 0) {
          this.logDebug(`📋 First torrent sample:`, {
            name: torrents[0].name,
            state: torrents[0].state,
            progress: torrents[0].progress,
            size: torrents[0].size,
          });
        }
      } else {
        this.logDebug(`❌ Torrents API failed with status ${response.status}`);
      }
    } catch (error) {
      this.logDebug(`❌ Torrents API error: ${error.message}`, {
        name: error.name,
        stack: error.stack,
      });
    }
  }

  showCurlCommands() {
    const config = this.getFormData();
    if (!config.serverUrl || !config.port) {
      this.logDebug("❌ ERROR: Please fill in server URL and port first");
      return;
    }

    const protocol = config.useHttps ? "https" : "http";
    const baseUrl = `${protocol}://${config.serverUrl}:${config.port}`;

    this.logDebug("🖥️  Equivalent curl commands for testing:");
    this.logDebug("");
    this.logDebug("1. Test version API:");
    this.logDebug(`curl -v "${baseUrl}/api/v2/app/version"`);
    this.logDebug("");
    this.logDebug("2. Test torrents API:");
    this.logDebug(`curl -v "${baseUrl}/api/v2/torrents/info"`);
    this.logDebug("");
    this.logDebug("3. Test basic connectivity:");
    this.logDebug(`curl -v "${baseUrl}"`);
    this.logDebug("");
    this.logDebug(
      "💡 Run these in your terminal to verify server accessibility"
    );
  }

  async testCorsMode() {
    const config = this.getFormData();
    if (!config.serverUrl || !config.port) {
      this.logDebug("❌ ERROR: Please fill in server URL and port first");
      return;
    }

    const protocol = config.useHttps ? "https" : "http";
    const versionUrl = `${protocol}://${config.serverUrl}:${config.port}/api/v2/app/version`;

    const modes = ["cors", "no-cors", "same-origin"];

    for (const mode of modes) {
      this.logDebug(`🔍 Testing CORS mode: ${mode}`);

      try {
        const response = await fetch(versionUrl, {
          method: "GET",
          mode: mode,
          credentials: "omit",
        });

        this.logDebug(`✅ CORS mode '${mode}' completed`, {
          status: response.status,
          type: response.type,
          ok: response.ok,
        });

        if (response.ok && response.type !== "opaque") {
          const text = await response.text();
          this.logDebug(`📄 Response text: ${text}`);
        }
      } catch (error) {
        this.logDebug(`❌ CORS mode '${mode}' failed: ${error.message}`);
      }

      this.logDebug("");
    }
  }

  showHttpsOnlyHelp() {
    this.logDebug("🛡️  HTTPS-Only Mode Configuration Help");
    this.logDebug("");
    this.logDebug(
      "Your Firefox is in HTTPS-Only mode, which blocks HTTP connections."
    );
    this.logDebug(
      "For local services like QBittorrent, you need to allow HTTP access."
    );
    this.logDebug("");
    this.logDebug("🔧 Solution Options:");
    this.logDebug("");
    this.logDebug("1. 📍 Add Site Exception (Recommended):");
    this.logDebug(
      "   • Click the shield icon in Firefox address bar when visiting this extension"
    );
    this.logDebug('   • Select "Turn off Blocking for this site"');
    this.logDebug(
      "   • Or go to Firefox Settings > Privacy & Security > HTTPS-Only Mode"
    );
    this.logDebug("   • Add your local network to exceptions");
    this.logDebug("");
    this.logDebug("2. 🏠 Local Network Pattern Exception:");
    this.logDebug(
      "   • In Firefox Settings, add these to HTTPS-Only exceptions:"
    );
    this.logDebug("   • http://192.168.*");
    this.logDebug("   • http://10.*");
    this.logDebug("   • http://172.*");
    this.logDebug("   • http://*.local");
    this.logDebug("");
    this.logDebug("3. ⚙️  Temporary Disable (Not Recommended):");
    this.logDebug("   • Firefox Settings > Privacy & Security");
    this.logDebug('   • HTTPS-Only Mode > "Don\'t enable HTTPS-Only Mode"');
    this.logDebug("");
    this.logDebug(
      "🏡 Your QBittorrent server is on your local network and doesn't need HTTPS."
    );
    this.logDebug(
      "Using HTTP for local services is normal and safe on home networks."
    );
  }

  detectAndShowHttpsOnlySolution(config) {
    if (!config.useHttps) {
      this.logDebug("");
      this.logDebug("🚨 HTTPS-Only Mode Detected!");
      this.logDebug(
        "Firefox is blocking HTTP connections to your local server."
      );
      this.logDebug("");

      // Show prominent solution modal/alert
      this.showHttpsOnlyModal(config);
    }
  }

  showHttpsOnlyModal(config) {
    const protocol = config.useHttps ? "https" : "http";
    const serverUrl = `${protocol}://${config.serverUrl}:${config.port}`;

    // Create modal content
    const modalHtml = `
      <div class="alert alert-warning border-warning mt-3" id="httpsOnlyAlert">
        <h5 class="alert-heading">
          <i class="bi bi-shield-exclamation me-2"></i>HTTPS-Only Mode Blocking Connection
        </h5>
        <p class="mb-3">
          Firefox is automatically upgrading your HTTP request to HTTPS, but your QBittorrent server 
          at <code>${serverUrl}</code> only supports HTTP (which is normal for local services).
        </p>
        
        <div class="row g-2 mb-3">
          <div class="col-md-6">
            <button type="button" class="btn btn-success w-100" onclick="window.openFirefoxSettings()">
              <i class="bi bi-gear me-1"></i>Open Firefox Settings
            </button>
          </div>
          <div class="col-md-6">
            <button type="button" class="btn btn-info w-100" onclick="window.copyExceptionUrl()">
              <i class="bi bi-clipboard me-1"></i>Copy Exception URL
            </button>
          </div>
        </div>
        
        <div class="row g-2 mb-3">
          <div class="col-12">
            <button type="button" class="btn btn-outline-secondary w-100 btn-sm" onclick="window.showManualSettingsInstructions()">
              <i class="bi bi-list-ol me-1"></i>Show Step-by-Step Instructions
            </button>
          </div>
        </div>
        
        <div class="small">
          <strong>Quick Fix:</strong>
          <ol class="mb-2 ps-3">
            <li>Click "Open Firefox Settings" above</li>
            <li>Go to "Privacy & Security" → "HTTPS-Only Mode"</li>
            <li>Click "Manage Exceptions"</li>
            <li>Add: <code>${serverUrl}</code></li>
          </ol>
          <div class="text-muted">
            This allows HTTP connections to your local QBittorrent server while keeping HTTPS-Only mode 
            active for internet sites.
          </div>
        </div>
        
        <button type="button" class="btn-close float-end" onclick="document.getElementById('httpsOnlyAlert').remove()"></button>
      </div>
    `;

    // Insert after debug log or status message
    const debugLog = document.getElementById("debugLog");
    if (debugLog && debugLog.style.display !== "none") {
      debugLog.insertAdjacentHTML("afterend", modalHtml);
    } else {
      const statusMessage = document.getElementById("statusMessage");
      statusMessage.insertAdjacentHTML("afterend", modalHtml);
    }

    // Add global functions for the buttons
    const self = this; // Capture 'this' context for global functions
    
    window.openFirefoxSettings = () => {
      self.logDebug("🔧 Attempting to help you open Firefox settings...");
      
      // Method 1: Try to use browser.tabs API if available
      if (typeof browser !== 'undefined' && browser.tabs) {
        browser.tabs.create({
          url: 'about:preferences#privacy'
        }).then(() => {
          self.logDebug("✅ Opened Firefox Privacy & Security settings in new tab");
        }).catch(error => {
          self.logDebug("⚠️ Browser API method failed, trying alternative methods...");
          window.tryAlternativeSettingsMethod();
        });
      } else {
        window.tryAlternativeSettingsMethod();
      }
    };
    
    // Alternative method for opening settings
    window.tryAlternativeSettingsMethod = () => {
      self.logDebug("🔧 Using alternative method...");
      
      // Method 2: Try direct window.open with error handling
      try {
        const settingsWindow = window.open("about:preferences#privacy", "_blank");
        if (!settingsWindow) {
          throw new Error("Popup blocked or not supported");
        }
        self.logDebug("✅ Opened settings window (if popup wasn't blocked)");
      } catch (error) {
        self.logDebug("⚠️ Cannot auto-open settings page due to browser security restrictions");
        window.showManualSettingsInstructions();
      }
    };
    
    // Show step-by-step manual instructions
    window.showManualSettingsInstructions = () => {
      self.logDebug("");
      self.logDebug("📋 Manual Firefox Settings Instructions:");
      self.logDebug("1️⃣ Type 'about:preferences#privacy' in Firefox address bar");
      self.logDebug("2️⃣ OR: Firefox Menu (☰) → Settings → Privacy & Security");
      self.logDebug("3️⃣ Scroll down to 'HTTPS-Only Mode' section");
      self.logDebug("4️⃣ Click 'Manage Exceptions...'");
      self.logDebug("5️⃣ Add your server URL to exceptions");
      self.logDebug("");
      
      // Also try to copy the settings URL to clipboard
      const settingsUrl = "about:preferences#privacy";
      navigator.clipboard.writeText(settingsUrl).then(() => {
        self.logDebug("✅ Copied settings URL to clipboard: " + settingsUrl);
        self.logDebug("📋 Paste this in Firefox address bar");
      }).catch(() => {
        self.logDebug("📋 Copy this URL manually: " + settingsUrl);
      });
    };

    window.copyExceptionUrl = () => {
      const url = serverUrl;
      navigator.clipboard
        .writeText(url)
        .then(() => {
          self.logDebug(`✅ Copied to clipboard: ${url}`);
          self.logDebug("📋 Paste this URL in HTTPS-Only Mode exceptions");
        })
        .catch(() => {
          self.logDebug(`📋 Copy this URL manually: ${url}`);
        });
    };
  }

  fixHttpsOnlyMode() {
    const config = this.getFormData();
    if (!config.serverUrl || !config.port) {
      this.showStatus("Please fill in server URL and port first", "error");
      return;
    }

    this.clearDebugLog();
    this.logDebug("🔧 HTTPS-Only Mode Auto-Fix Tool");
    this.logDebug("");

    // Auto-detect if this is likely an HTTPS-Only issue
    if (!config.useHttps) {
      this.logDebug(
        "✅ Detected HTTP connection to local server - this is the typical HTTPS-Only Mode issue"
      );
      this.logDebug("");

      // Show the solution immediately
      this.detectAndShowHttpsOnlySolution(config);
      this.logDebug("📋 Solution displayed above ↑");
    } else {
      this.logDebug(
        "ℹ️  You have HTTPS enabled, so this may not be an HTTPS-Only Mode issue"
      );
      this.logDebug("Try the regular 'Test Connection' button first");
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new OptionsManager();
});
