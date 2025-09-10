/**
 * Magnet Settings Module
 * Handles configuration for magnet link detection and handling
 */
class MagnetSettings {
  constructor() {
    this.defaultSettings = {
      enableMagnetHandling: true,
      autoAddMagnets: false,
      defaultCategory: "",
      defaultSavePath: "",
      showNotifications: true,
      highlightMagnetLinks: true,
      interceptMagnetClicks: true,
    };
  }

  /**
   * Load magnet settings from storage
   */
  async loadSettings() {
    try {
      const result = await browser.storage.local.get("magnet_settings");
      return { ...this.defaultSettings, ...result.magnet_settings };
    } catch (error) {
      console.error("Failed to load magnet settings:", error);
      return this.defaultSettings;
    }
  }

  /**
   * Save magnet settings to storage
   */
  async saveSettings(settings) {
    try {
      await browser.storage.local.set({ magnet_settings: settings });
      return true;
    } catch (error) {
      console.error("Failed to save magnet settings:", error);
      return false;
    }
  }

  /**
   * Render magnet settings UI
   */
  renderSettingsHTML() {
    return `
            <div class="card mt-4">
                <div class="card-header">
                    <h5 class="mb-0">
                        <i class="bi bi-magnet me-2"></i>
                        Magnet Link Handling
                    </h5>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-check mb-3">
                                <input class="form-check-input" type="checkbox" id="enableMagnetHandling">
                                <label class="form-check-label" for="enableMagnetHandling">
                                    Enable magnet link detection
                                </label>
                                <div class="form-text">Automatically detect and enhance magnet links on web pages</div>
                            </div>

                            <div class="form-check mb-3">
                                <input class="form-check-input" type="checkbox" id="interceptMagnetClicks">
                                <label class="form-check-label" for="interceptMagnetClicks">
                                    Intercept magnet link clicks
                                </label>
                                <div class="form-text">Override default magnet link behavior to add directly to QBittorrent</div>
                            </div>

                            <div class="form-check mb-3">
                                <input class="form-check-input" type="checkbox" id="highlightMagnetLinks">
                                <label class="form-check-label" for="highlightMagnetLinks">
                                    Highlight magnet links
                                </label>
                                <div class="form-text">Add visual indicators to detected magnet links</div>
                            </div>
                        </div>

                        <div class="col-md-6">
                            <div class="form-check mb-3">
                                <input class="form-check-input" type="checkbox" id="autoAddMagnets">
                                <label class="form-check-label" for="autoAddMagnets">
                                    Auto-add magnets (experimental)
                                </label>
                                <div class="form-text">Automatically add magnet links without confirmation</div>
                            </div>

                            <div class="form-check mb-3">
                                <input class="form-check-input" type="checkbox" id="showNotifications">
                                <label class="form-check-label" for="showNotifications">
                                    Show notifications
                                </label>
                                <div class="form-text">Display browser notifications when torrents are added</div>
                            </div>
                        </div>
                    </div>

                    <hr>

                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label for="defaultCategory" class="form-label">Default Category</label>
                                <input type="text" class="form-control" id="defaultCategory" placeholder="Optional">
                                <div class="form-text">Default category for new torrents</div>
                            </div>
                        </div>

                        <div class="col-md-6">
                            <div class="mb-3">
                                <label for="defaultSavePath" class="form-label">Default Save Path</label>
                                <input type="text" class="form-control" id="defaultSavePath" placeholder="Optional">
                                <div class="form-text">Default download location for new torrents</div>
                            </div>
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-12">
                            <button type="button" id="saveMagnetSettings" class="btn btn-primary me-2">
                                <i class="bi bi-check-lg me-1"></i>
                                Save Magnet Settings
                            </button>
                            <button type="button" id="testMagnetDetection" class="btn btn-outline-secondary">
                                <i class="bi bi-search me-1"></i>
                                Test on Current Page
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
  }

  /**
   * Initialize magnet settings functionality
   */
  async init(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error("Magnet settings container not found");
      return;
    }

    // Render UI
    container.innerHTML = this.renderSettingsHTML();

    // Load and populate current settings
    await this.populateSettings();

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Populate form with current settings
   */
  async populateSettings() {
    const settings = await this.loadSettings();

    document.getElementById("enableMagnetHandling").checked =
      settings.enableMagnetHandling;
    document.getElementById("autoAddMagnets").checked = settings.autoAddMagnets;
    document.getElementById("showNotifications").checked =
      settings.showNotifications;
    document.getElementById("highlightMagnetLinks").checked =
      settings.highlightMagnetLinks;
    document.getElementById("interceptMagnetClicks").checked =
      settings.interceptMagnetClicks;
    document.getElementById("defaultCategory").value =
      settings.defaultCategory || "";
    document.getElementById("defaultSavePath").value =
      settings.defaultSavePath || "";
  }

  /**
   * Setup event listeners for magnet settings
   */
  setupEventListeners() {
    // Save settings button
    document
      .getElementById("saveMagnetSettings")
      .addEventListener("click", async () => {
        await this.saveCurrentSettings();
      });

    // Test magnet detection button
    document
      .getElementById("testMagnetDetection")
      .addEventListener("click", async () => {
        await this.testMagnetDetection();
      });

    // Enable/disable dependent controls
    document
      .getElementById("enableMagnetHandling")
      .addEventListener("change", (e) => {
        this.toggleDependentControls(e.target.checked);
      });

    // Initial state
    this.toggleDependentControls(
      document.getElementById("enableMagnetHandling").checked
    );
  }

  /**
   * Toggle dependent controls based on main enable checkbox
   */
  toggleDependentControls(enabled) {
    const dependentControls = [
      "interceptMagnetClicks",
      "highlightMagnetLinks",
      "autoAddMagnets",
      "showNotifications",
      "defaultCategory",
      "defaultSavePath",
      "testMagnetDetection",
    ];

    dependentControls.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        element.disabled = !enabled;
      }
    });
  }

  /**
   * Save current form settings
   */
  async saveCurrentSettings() {
    const settings = {
      enableMagnetHandling: document.getElementById("enableMagnetHandling")
        .checked,
      autoAddMagnets: document.getElementById("autoAddMagnets").checked,
      showNotifications: document.getElementById("showNotifications").checked,
      highlightMagnetLinks: document.getElementById("highlightMagnetLinks")
        .checked,
      interceptMagnetClicks: document.getElementById("interceptMagnetClicks")
        .checked,
      defaultCategory: document.getElementById("defaultCategory").value.trim(),
      defaultSavePath: document.getElementById("defaultSavePath").value.trim(),
    };

    const success = await this.saveSettings(settings);

    if (success) {
      this.showAlert("Magnet settings saved successfully!", "success");

      // Notify content scripts of settings change
      try {
        const tabs = await browser.tabs.query({});
        tabs.forEach((tab) => {
          browser.tabs
            .sendMessage(tab.id, {
              action: "magnetSettingsUpdated",
              settings: settings,
            })
            .catch(() => {
              // Ignore errors for tabs that don't have content script
            });
        });
      } catch (error) {
        console.log("Could not notify all tabs of settings change");
      }
    } else {
      this.showAlert("Failed to save magnet settings", "danger");
    }
  }

  /**
   * Test magnet detection on current page
   */
  async testMagnetDetection() {
    try {
      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tabs.length === 0) {
        this.showAlert("No active tab found", "warning");
        return;
      }

      const response = await browser.tabs.sendMessage(tabs[0].id, {
        action: "getMagnetLinksOnPage",
      });

      if (response && response.magnetLinks) {
        const count = response.magnetLinks.length;
        if (count > 0) {
          this.showAlert(
            `Found ${count} magnet link${count === 1 ? "" : "s"} on this page`,
            "success"
          );

          // Show details in console
          console.log("Detected magnet links:", response.magnetLinks);
        } else {
          this.showAlert("No magnet links detected on this page", "info");
        }
      } else {
        this.showAlert(
          "Could not scan current page (content script not loaded)",
          "warning"
        );
      }
    } catch (error) {
      console.error("Test failed:", error);
      this.showAlert("Test failed: " + error.message, "danger");
    }
  }

  /**
   * Show alert message
   */
  showAlert(message, type = "info") {
    // Remove existing alerts
    const existingAlert = document.querySelector("#magnetSettingsAlert");
    if (existingAlert) {
      existingAlert.remove();
    }

    // Create new alert
    const alert = document.createElement("div");
    alert.id = "magnetSettingsAlert";
    alert.className = `alert alert-${type} alert-dismissible fade show mt-3`;
    alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

    // Insert after the save button
    const saveButton = document.getElementById("saveMagnetSettings");
    saveButton.parentNode.appendChild(alert);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (alert.parentNode) {
        alert.remove();
      }
    }, 5000);
  }
}

// Export for use in options page
if (typeof window !== "undefined") {
  window.MagnetSettings = MagnetSettings;
}
