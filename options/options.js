// Options page JavaScript - no CSP violations, external event listeners only
document.addEventListener("DOMContentLoaded", function () {
  console.log("=== OPTIONS PAGE: DOM Content Loaded ===");
  console.log("Browser runtime available:", !!browser?.runtime);
  console.log("Browser storage available:", !!browser?.storage);

  loadSettings();
  setupEventListeners();
  startConnectionMonitoring();
});

function setupEventListeners() {
  document
    .getElementById("settingsForm")
    .addEventListener("submit", handleFormSubmit);
}

function handleFormSubmit(event) {
  event.preventDefault();
  saveSettings();
}

async function loadSettings() {
  console.log("=== LOADING SETTINGS ===");
  try {
    console.log("Requesting settings from browser storage...");
    const result = await browser.storage.local.get(["qbittorrent_settings"]);
    console.log("Raw storage result:", result);

    const settings = result.qbittorrent_settings || {};
    console.log("Parsed settings:", settings);

    const hostname = settings.hostname || "";
    const port = settings.port || "";
    const username = settings.username || "";
    const password = settings.password || "";
    const useHttps = settings.useHttps || false;

    console.log("Setting form values:", {
      hostname,
      port,
      username,
      password: password ? "[HIDDEN]" : "",
      useHttps,
    });

    document.getElementById("hostname").value = hostname;
    document.getElementById("port").value = port;
    document.getElementById("username").value = username;
    document.getElementById("password").value = password;
    document.getElementById("useHttps").checked = useHttps;

    console.log("Settings loaded successfully");
  } catch (error) {
    console.error("=== ERROR LOADING SETTINGS ===");
    console.error("Error object:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
  }
}

async function saveSettings() {
  console.log("=== SAVING SETTINGS ===");
  try {
    console.log("Reading form values...");
    const settings = {
      hostname: document.getElementById("hostname").value.trim(),
      port: document.getElementById("port").value.trim(),
      username: document.getElementById("username").value.trim(),
      password: document.getElementById("password").value,
      useHttps: document.getElementById("useHttps").checked,
    };

    console.log("Form settings collected:", {
      ...settings,
      password: settings.password ? "[HIDDEN]" : "",
    });

    // Validate required fields
    console.log("Validating required fields...");
    if (!settings.hostname || !settings.port) {
      console.error("Validation failed: hostname or port missing");
      showError("Hostname and port are required");
      return;
    }

    console.log("Validation passed, saving to storage...");
    // Save to storage
    await browser.storage.local.set({ qbittorrent_settings: settings });
    console.log("Settings saved to storage successfully");

    console.log("Starting connection test...");
    // Test connection immediately
    await testConnection(settings);
  } catch (error) {
    console.error("=== ERROR SAVING SETTINGS ===");
    console.error("Error object:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    showError("Failed to save settings");
  }
}

async function testConnection(settings) {
  console.log("=== TESTING CONNECTION ===");
  try {
    console.log("Input settings:", {
      ...settings,
      password: settings.password ? "[HIDDEN]" : "",
    });

    updateConnectionStatus("testing", "Testing connection...");
    console.log("Updated UI status to 'testing'");

    // Direct API call - no background script needed
    const protocol = settings.useHttps ? "https" : "http";
    const baseUrl = `${protocol}://${settings.hostname}:${settings.port}`;
    const versionUrl = `${baseUrl}/api/v2/app/version`;

    console.log("Making direct API call to:", versionUrl);

    const response = await fetch(versionUrl, {
      method: "GET",
      mode: "cors",
      credentials: "omit",
      headers: {
        Accept: "text/plain",
      },
    });

    console.log("API Response:", response.status, response.statusText);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const version = await response.text();
    console.log("QBittorrent version:", version);

    updateConnectionStatus("success", `Connected to QBittorrent ${version}`);
    showSuccess("Settings saved and connection verified!");
    console.log("UI updated with success status");
  } catch (error) {
    console.error("=== ERROR TESTING CONNECTION ===");
    console.error("Error object:", error);
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);

    updateConnectionStatus("error", `Connection error: ${error.message}`);
    showError(`Connection error: ${error.message}`);
    console.log("UI updated with exception error status");
  }
}

function updateConnectionStatus(type, message) {
  const statusElement = document.getElementById("connectionStatus");
  const statusClasses = {
    testing: "alert-warning",
    success: "alert-success",
    error: "alert-danger",
    checking: "alert-secondary",
  };

  // Reset classes
  statusElement.className = "alert mb-4";
  statusElement.classList.add(statusClasses[type] || "alert-secondary");

  // Update content based on type
  if (type === "testing" || type === "checking") {
    statusElement.innerHTML = `
            <div class="d-flex align-items-center">
                <div class="spinner-border spinner-border-sm me-2" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <span>${message}</span>
            </div>
        `;
  } else if (type === "success") {
    statusElement.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="bi bi-check-circle me-2"></i>
                <span>${message}</span>
            </div>
        `;
  } else if (type === "error") {
    statusElement.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="bi bi-x-circle me-2"></i>
                <span>${message}</span>
            </div>
        `;
  }
}

async function checkCurrentConnection() {
  console.log("=== CHECKING CURRENT CONNECTION ===");
  try {
    console.log("Loading settings for connection check...");
    const result = await browser.storage.local.get(["qbittorrent_settings"]);
    const settings = result.qbittorrent_settings || {};
    console.log("Settings loaded for check:", {
      ...settings,
      password: settings.password ? "[HIDDEN]" : "",
    });

    if (!settings.hostname || !settings.port) {
      console.log("No connection configured - missing hostname or port");
      updateConnectionStatus("error", "No connection configured");
      return;
    }

    console.log("Settings valid, testing connection...");
    updateConnectionStatus("checking", "Checking connection...");

    // Direct API call - no background script needed
    const protocol = settings.useHttps ? "https" : "http";
    const baseUrl = `${protocol}://${settings.hostname}:${settings.port}`;
    const versionUrl = `${baseUrl}/api/v2/app/version`;

    console.log("Making direct API call to:", versionUrl);

    const response = await fetch(versionUrl, {
      method: "GET",
      mode: "cors",
      credentials: "omit",
      headers: {
        Accept: "text/plain",
      },
    });

    console.log("API Response:", response.status, response.statusText);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const version = await response.text();
    console.log("QBittorrent version:", version);

    updateConnectionStatus("success", `Connected to QBittorrent ${version}`);
  } catch (error) {
    console.error("=== ERROR CHECKING CONNECTION ===");
    console.error("Error:", error);
    updateConnectionStatus("error", `Connection error: ${error.message}`);
  }
}

function startConnectionMonitoring() {
  console.log("=== STARTING CONNECTION MONITORING ===");
  console.log("Setting up 30-second interval monitoring");

  // Check connection every 30 seconds
  setInterval(() => {
    console.log("Periodic connection check triggered");
    checkCurrentConnection();
  }, 30000);

  console.log("Starting initial connection check");
  // Initial check
  checkCurrentConnection();
}

function showError(message) {
  const errorElement = document.getElementById("errorMessage");
  const errorText = document.getElementById("errorText");
  const successElement = document.getElementById("successMessage");

  successElement.style.display = "none";
  errorText.textContent = message;
  errorElement.style.display = "block";

  setTimeout(() => {
    errorElement.style.display = "none";
  }, 5000);
}

function showSuccess(message) {
  const successElement = document.getElementById("successMessage");
  const successText = document.getElementById("successText");
  const errorElement = document.getElementById("errorMessage");

  errorElement.style.display = "none";
  successText.textContent = message;
  successElement.style.display = "block";

  setTimeout(() => {
    successElement.style.display = "none";
  }, 3000);
}
