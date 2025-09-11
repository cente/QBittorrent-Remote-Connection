console.log("um.. hello?");

// Simple background script for QBittorrent extension
console.log("QBittorrent Background Script Starting...");

// Handle messages from content scripts
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log("Background received message:", request);

  if (request.type === "UPDATE_BADGE") {
    // Update badge with magnet count
    const badgeText =
      request.magnetCount > 0 ? request.magnetCount.toString() : "";
    const badgeColor = request.magnetCount > 0 ? "#ff6b6b" : "#666666";

    chrome.browserAction.setBadgeText({
      text: badgeText,
      tabId: sender.tab.id,
    });

    chrome.browserAction.setBadgeBackgroundColor({
      color: badgeColor,
      tabId: sender.tab.id,
    });

    console.log(
      `✅ Badge updated: ${badgeText} magnets on tab ${sender.tab.id}`
    );
    sendResponse({ success: true, badgeText: badgeText });
  } else if (request.type === "MAGNET_CLICKED") {
    // Send magnet to QBittorrent and show notification only on success
    console.log("🎯 Sending magnet to QBittorrent server...");

    sendMagnetToQBittorrent(request.magnetUrl, request.linkText)
      .then((result) => {
        console.log("✅ Magnet send result:", result);

        // Include background logs in the response for UI visibility
        const logMessages = [
          "🎯 Background: Sending magnet to QBittorrent server...",
          `✅ Background: Magnet send result: ${JSON.stringify(
            result,
            null,
            2
          )}`,
        ];

        if (result.success) {
          logMessages.push(
            "🎉 Background: SUCCESS - Magnet added to QBittorrent!"
          );

          // Show success notification
          const notificationId = "magnet-success-" + Date.now();
          chrome.notifications.create(
            notificationId,
            {
              type: "basic",
              iconUrl: "icons/icon-48.png",
              title: "QBittorrent - Torrent Added",
              message: `Successfully added: ${
                request.linkText || "Unknown torrent"
              }`,
              contextMessage: `From: ${new URL(request.pageUrl).hostname}`,
              priority: 1,
            },
            function (notificationId) {
              if (chrome.runtime.lastError) {
                console.log(
                  "Success notification error:",
                  chrome.runtime.lastError
                );
              } else {
                console.log(
                  `✅ Success notification created: ${notificationId}`
                );
              }
            }
          );

          // Update badge color to indicate success
          chrome.browserAction.setBadgeBackgroundColor({
            color: "#90EE90", // Green to indicate success
            tabId: sender.tab.id,
          });
        } else {
          // Handle different types of failures
          const notificationId = result.isDuplicate
            ? "magnet-duplicate-" + Date.now()
            : "magnet-error-" + Date.now();

          const notificationConfig = result.isDuplicate
            ? {
                type: "basic",
                iconUrl: "icons/icon-48.png",
                title: "⚠️ QBittorrent - Duplicate Torrent",
                message: `Already in queue: ${
                  request.linkText || "Unknown torrent"
                }`,
                contextMessage: `This torrent is already being downloaded`,
                priority: 1, // Lower priority for duplicates
              }
            : {
                type: "basic",
                iconUrl: "icons/icon-48.png",
                title: "❌ QBittorrent - Error",
                message: `Failed to add: ${
                  result.userMessage || result.message || "Unknown error"
                }`,
                contextMessage: `From: ${new URL(request.pageUrl).hostname}`,
                priority: 2,
              };

          chrome.notifications.create(
            notificationId,
            notificationConfig,
            function (notificationId) {
              if (chrome.runtime.lastError) {
                console.log(
                  "Error notification error:",
                  chrome.runtime.lastError
                );
              } else {
                const logMessage = result.isDuplicate
                  ? `⚠️ Duplicate notification created: ${notificationId}`
                  : `❌ Error notification created: ${notificationId}`;
                console.log(logMessage);
              }
            }
          );

          // Update badge color based on error type
          chrome.browserAction.setBadgeBackgroundColor({
            color: result.isDuplicate ? "#FFA500" : "#ff6b6b", // Orange for duplicates, Red for errors
            tabId: sender.tab.id,
          });
        }

        // Send response with logs for UI visibility
        sendResponse({
          ...result,
          backgroundLogs: logMessages,
        });
      })
      .catch((error) => {
        console.error("❌ Magnet send failed:", error);

        // Show error notification
        const notificationId = "magnet-error-" + Date.now();
        chrome.notifications.create(
          notificationId,
          {
            type: "basic",
            iconUrl: "icons/icon-48.png",
            title: "QBittorrent - Connection Error",
            message: `Failed to connect to QBittorrent: ${
              error.message || "Unknown error"
            }`,
            contextMessage: `From: ${new URL(request.pageUrl).hostname}`,
            priority: 2,
          },
          function (notificationId) {
            if (chrome.runtime.lastError) {
              console.log(
                "Error notification error:",
                chrome.runtime.lastError
              );
            } else {
              console.log(`❌ Error notification created: ${notificationId}`);
            }
          }
        );

        // Update badge color to indicate error
        chrome.browserAction.setBadgeBackgroundColor({
          color: "#ff6b6b", // Red to indicate error
          tabId: sender.tab.id,
        });

        sendResponse({
          success: false,
          message: error.message || "Failed to send magnet",
          error: error,
          backgroundLogs: [
            "🎯 Background: Sending magnet to QBittorrent server...",
            `❌ Background: Magnet send failed: ${error.message}`,
            `❌ Background: Full error: ${JSON.stringify(
              error,
              Object.getOwnPropertyNames(error),
              2
            )}`,
          ],
        });
      });

    // Reset badge color after 5 seconds
    setTimeout(() => {
      chrome.browserAction.setBadgeBackgroundColor({
        color: "#ff6b6b",
        tabId: sender.tab.id,
      });
    }, 5000);

    return true; // Keep message channel open for async response
  } else if (request.type === "SEND_MAGNET_TO_QBITTORRENT") {
    // Handle sending magnet to QBittorrent server
    console.log("=== SENDING MAGNET TO QBITTORRENT ===");
    console.log("🧲 Magnet URL:", request.magnetUrl);

    sendMagnetToQBittorrent(request.magnetUrl, request.linkText)
      .then((result) => {
        console.log("✅ Magnet send result:", result);
        sendResponse(result);
      })
      .catch((error) => {
        console.error("❌ Magnet send failed:", error);
        sendResponse({
          success: false,
          message: error.message || "Failed to send magnet",
          error: error,
        });
      });

    return true; // Keep message channel open for async response
  }

  return true; // Keep message channel open for async response
});

// Clear badge when tab is updated (page navigation)
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.status === "loading") {
    chrome.browserAction.setBadgeText({
      text: "",
      tabId: tabId,
    });
  }
});

console.log("✅ Background script initialized - ready for magnet detection");

/**
 * Send magnet link to QBittorrent server
 */
async function sendMagnetToQBittorrent(magnetUrl, linkText) {
  console.log("=== QBITTORRENT API: SENDING MAGNET ===");
  console.log("🧲 Magnet URL:", magnetUrl);
  console.log("📄 Link text:", linkText);

  try {
    // Load settings
    console.log("📋 Loading QBittorrent settings...");
    const result = await browser.storage.local.get(["qbittorrent_settings"]);
    const settings = result.qbittorrent_settings || {};

    // Apply defaults
    const config = {
      hostname: "localhost",
      port: "8080",
      username: "admin",
      password: "adminadmin",
      useHttps: false,
      ...settings,
    };

    console.log("⚙️ Using config:", {
      hostname: config.hostname,
      port: config.port,
      username: config.username,
      password: "[HIDDEN]",
      useHttps: config.useHttps,
    });

    const protocol = config.useHttps ? "https" : "http";
    const baseUrl = `${protocol}://${config.hostname}:${config.port}`;

    console.log("🔗 Base URL:", baseUrl);

    // Skip authentication for servers that don't require it (like blackbox:20000)
    // If hostname is 'blackbox' or if auth is disabled, skip auth step
    const skipAuth = config.hostname === "blackbox" || config.skipAuth === true;

    if (!skipAuth) {
      // Step 1: Authenticate (only if needed)
      console.log("🔐 Authenticating with QBittorrent...");
      const authFormData = new FormData();
      authFormData.append("username", config.username);
      authFormData.append("password", config.password);

      const authResponse = await fetch(`${baseUrl}/api/v2/auth/login`, {
        method: "POST",
        body: authFormData,
        credentials: "include",
      });

      console.log("🔐 Auth response status:", authResponse.status);
      const authResult = await authResponse.text();
      console.log("🔐 Auth response:", authResult);

      if (authResult !== "Ok.") {
        throw new Error(`Authentication failed: ${authResult}`);
      }
    } else {
      console.log("🔓 Skipping authentication for this server");
    }

    // Step 2: Add magnet
    console.log("📥 Adding magnet to QBittorrent...");
    const magnetFormData = new FormData();
    magnetFormData.append("urls", magnetUrl);
    magnetFormData.append("category", "WebExtension");
    magnetFormData.append("paused", "false");

    const magnetResponse = await fetch(`${baseUrl}/api/v2/torrents/add`, {
      method: "POST",
      body: magnetFormData,
      credentials: "include",
    });

    console.log("📥 Magnet response status:", magnetResponse.status);
    const magnetResult = await magnetResponse.text();
    console.log("📥 Magnet response:", magnetResult);

    if (magnetResult === "Ok.") {
      console.log("✅ Magnet added successfully to QBittorrent");
      return {
        success: true,
        message: "Torrent added successfully",
        magnetUrl: magnetUrl,
        linkText: linkText,
      };
    } else if (magnetResult === "Fails.") {
      console.log("⚠️ Magnet already exists in QBittorrent (duplicate)");
      return {
        success: false,
        isDuplicate: true,
        message: "Torrent already exists in your download queue",
        userMessage: "This torrent is already in your QBittorrent downloads",
        magnetUrl: magnetUrl,
        linkText: linkText,
        serverResponse: magnetResult,
      };
    } else {
      console.log(
        "❌ QBittorrent rejected magnet with response:",
        magnetResult
      );
      return {
        success: false,
        message: `QBittorrent rejected the torrent: ${magnetResult}`,
        userMessage: `Server responded with: ${magnetResult}`,
        magnetUrl: magnetUrl,
        linkText: linkText,
        serverResponse: magnetResult,
      };
    }
  } catch (error) {
    console.error("❌ QBittorrent API error:", error);
    return {
      success: false,
      message: error.message,
      magnetUrl: magnetUrl,
      linkText: linkText,
      error: error,
    };
  }
}

class QBittorrentBackground {
  constructor() {
    this.connectionStatus = {
      connected: false,
      lastChecked: null,
      lastResult: null,
      lastError: null,
      settings: null,
    };
    this.pollInterval = null;
    this.pollSettings = null;
    // Heartbeat interval for background script
    setInterval(() => {
      console.log(
        "⏰ Background script heartbeat: " + new Date().toISOString()
      );
    }, 2000);
    console.log("QBittorrentBackground initializing...");
    this.setupListeners();
    console.log("QBittorrentBackground initialization complete");
  }

  setupListeners() {
    console.log("=== SETTING UP LISTENERS ===");

    // Handle extension installation
    browser.runtime.onInstalled.addListener((details) => {
      console.log("Extension installed/updated:", details);
    });

    // Handle messages from popup and options pages
    // DISABLED: This conflicts with the main message handler for MAGNET_CLICKED
    // browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    //   console.log("=== MESSAGE RECEIVED IN BACKGROUND ===");
    //   console.log("Message:", message);
    //   console.log("Sender:", sender);
    //   console.log("Time:", new Date().toISOString());

    //   // Handle async operations
    //   this.handleMessage(message, sender, sendResponse);
    //   return true; // Keep message channel open for async response
    // });

    console.log("Listeners set up successfully");
  }

  async handleMessage(message, sender, sendResponse) {
    console.log("=== BACKGROUND: HANDLING MESSAGE ===");
    console.log("Message received:", message);
    console.log("Sender:", sender);

    try {
      const { action } = message;
      console.log("Action to handle:", action);

      switch (action) {
        case "testConnection":
          console.log("=== BACKGROUND: TEST CONNECTION ===");
          console.log("Connection config:", message.settings || message.config);
          const result = await this.testConnection(
            message.settings || message.config
          );
          console.log("Test connection result:", result);
          sendResponse({ success: true, data: result });
          // Start polling if successful
          if (result.connected) {
            this.startPolling(message.settings || message.config);
          }
          break;
        case "getConnectionStatus":
          sendResponse({
            success: true,
            status: this.connectionStatus,
          });
          break;
        default:
          console.log("=== BACKGROUND: UNKNOWN ACTION ===");
          console.log("Unknown action:", message.action);
          sendResponse({ success: false, error: "Unknown action" });
      }
    } catch (error) {
      console.error("=== ERROR HANDLING MESSAGE ===");
      console.error("Error:", error);
      sendResponse({ success: false, error: error.message });
    }
  }

  /**
   * Start polling the qBittorrent connection every 5 seconds
   */
  startPolling(settings) {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    this.pollSettings = settings;
    this.pollInterval = setInterval(() => {
      this.pollConnection();
    }, 5000);
    // Immediately poll once
    this.pollConnection();
    console.log("Started polling qBittorrent connection every 5 seconds.");
  }

  /**
   * Poll the qBittorrent connection and update status
   */
  async pollConnection() {
    if (!this.pollSettings) return;
    try {
      const result = await this.testConnection(this.pollSettings);
      this.connectionStatus = {
        connected: result.connected,
        lastChecked: new Date().toISOString(),
        lastResult: result,
        lastError: null,
        settings: this.pollSettings,
      };
      console.log("[Poll] Connection status:", this.connectionStatus);
    } catch (error) {
      this.connectionStatus = {
        connected: false,
        lastChecked: new Date().toISOString(),
        lastResult: null,
        lastError: error.message,
        settings: this.pollSettings,
      };
      console.error("[Poll] Connection error:", error);
    }
  }

  /**
   * Test connection to QBittorrent API
   * This method replicates the connection test logic without external dependencies
   */
  async testConnection(settings) {
    console.log("=== TESTING CONNECTION ===");
    console.log("Settings received:", {
      ...settings,
      password: settings.password ? "[HIDDEN]" : "",
    });

    try {
      // Validate required settings
      if (!settings.hostname || !settings.port) {
        const errorMsg = "Hostname and port are required";
        console.error("Validation failed:", errorMsg);
        throw new Error(errorMsg);
      }

      // Build URL from settings
      const protocol = settings.useHttps ? "https" : "http";
      const baseUrl = `${protocol}://${settings.hostname}:${settings.port}`;

      console.log("=== TESTING API CONNECTION ===");
      console.log("Protocol:", protocol);
      console.log("Base URL:", baseUrl);

      // Test version endpoint - simplest API call
      const versionUrl = `${baseUrl}/api/v2/app/version`;
      console.log("Version endpoint URL:", versionUrl);

      console.log("Making fetch request...");
      const versionResponse = await fetch(versionUrl, {
        method: "GET",
        mode: "cors",
        credentials: "omit",
        headers: {
          Accept: "text/plain",
        },
      });

      console.log("=== FETCH RESPONSE RECEIVED ===");
      console.log("Response status:", versionResponse.status);
      console.log("Response status text:", versionResponse.statusText);
      console.log(
        "Response headers:",
        Object.fromEntries(versionResponse.headers.entries())
      );
      console.log("Response ok:", versionResponse.ok);

      if (!versionResponse.ok) {
        const errorMsg = `QBittorrent API returned HTTP ${versionResponse.status}: ${versionResponse.statusText}`;
        console.error("HTTP Error:", errorMsg);
        throw new Error(errorMsg);
      }

      console.log("Reading response text...");
      const version = await versionResponse.text();
      console.log("=== API VERSION RECEIVED ===");
      console.log("QBittorrent API version:", version);

      // Return success with server info
      console.log("=== CONNECTION SUCCESS ===");
      const result = {
        server_version: version,
        api_version: "2.0",
        connected: true,
      };
      console.log("Returning result:", result);
      return result;
    } catch (error) {
      console.error("=== CONNECTION TEST FAILED ===");
      console.error("Error object:", error);
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);

      // Re-throw with a more user-friendly message
      throw new Error(error.message);
    }
  }
}

// Initialize the background script
try {
  console.log("=== INITIALIZING BACKGROUND SCRIPT ===");
  const backgroundInstance = new QBittorrentBackground();
  console.log(
    "Background script initialized successfully:",
    !!backgroundInstance
  );
} catch (error) {
  console.error("=== FAILED TO INITIALIZE BACKGROUND SCRIPT ===");
  console.error("Error object:", error);
  console.error("Error name:", error.name);
  console.error("Error message:", error.message);
  console.error("Error stack:", error.stack);
}
