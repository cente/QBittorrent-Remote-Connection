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
    // Show notification when magnet is clicked
    const notificationId = "magnet-" + Date.now();

    chrome.notifications.create(
      notificationId,
      {
        type: "basic",
        iconUrl: "icons/icon-48.png",
        title: "QBittorrent - Magnet Link Detected",
        message: `Magnet link intercepted: ${
          request.linkText || "Unknown torrent"
        }`,
        contextMessage: `From: ${new URL(request.pageUrl).hostname}`,
        priority: 1,
      },
      function (notificationId) {
        if (chrome.runtime.lastError) {
          console.log("Notification error:", chrome.runtime.lastError);
        } else {
          console.log(`✅ Notification created: ${notificationId}`);
        }
      }
    );

    // Update badge color to indicate activity
    chrome.browserAction.setBadgeBackgroundColor({
      color: "#90EE90", // Green to indicate click
      tabId: sender.tab.id,
    });

    // Reset badge color after 3 seconds
    setTimeout(() => {
      chrome.browserAction.setBadgeBackgroundColor({
        color: "#ff6b6b",
        tabId: sender.tab.id,
      });
    }, 3000);

    console.log(
      `🧲 Magnet clicked notification sent for: ${request.magnetUrl}`
    );
    sendResponse({ success: true, notificationId: notificationId });
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

class QBittorrentBackground {
  constructor() {
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
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log("=== MESSAGE RECEIVED IN BACKGROUND ===");
      console.log("Message:", message);
      console.log("Sender:", sender);
      console.log("Time:", new Date().toISOString());

      // Handle async operations
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async response
    });

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
