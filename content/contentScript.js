// Simple test content script with MutationObserver
console.log("QBITTORRENT EXTENSION TEST SCRIPT RUNNING!");
console.log("TIME:", new Date().toISOString());
console.log("PAGE:", window.location.href);
console.log("DOCUMENT STATE:", document.readyState);

// Global variables (accessible to all functions)
if (!window.magnetCount) window.magnetCount = 0;
if (!window.qbObserver) window.qbObserver = null;

// Load notification manager from separate file
if (!window.QBNotificationManager) {
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("notifications/NotificationManager.js");
  script.onload = () => {
    console.log("✅ Notification manager loaded from separate file");
  };
  document.head.appendChild(script);
}

// Function definitions (accessible globally)
window.processMagnetLinks = function processMagnetLinks(
  element,
  reason = "scan"
) {
  const allLinks =
    element === document.body
      ? document.querySelectorAll("a")
      : element.querySelectorAll
      ? element.querySelectorAll("a")
      : [];

  // Only log for significant scans, not tiny element checks
  const isSignificantScan =
    element === document.body ||
    element === document.documentElement ||
    allLinks.length > 5;

  if (isSignificantScan) {
    console.log(`🔍 SCANNING FOR MAGNETS (${reason})...`);
    console.log(`🔍 Found ${allLinks.length} total links to check`);
  }

  const magnetLinks = Array.from(allLinks).filter((link) => {
    const href = link.href || link.getAttribute("href") || "";
    return href.toLowerCase().includes("magnet:");
  });

  if (isSignificantScan || magnetLinks.length > 0) {
    console.log(`🧲 Found ${magnetLinks.length} magnet links!`);
  }

  if (magnetLinks.length > 0) {
    magnetLinks.forEach((link, index) => {
      if (!link.dataset.magnetProcessed) {
        window.magnetCount++;
        console.log(`Processing magnet ${window.magnetCount}: ${link.href}`);

        link.dataset.magnetProcessed = "true";
        link.dataset.originalMagnet = link.href;
        link.href = "javascript:void(0)";
        link.style.border = "2px solid #ff6b6b";
        link.style.backgroundColor = "#ffe0e0";
        link.title = "QBittorrent Extension: Magnet link detected";

        link.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          console.log("🧲🧲🧲 INTERCEPTED MAGNET CLICK! 🧲🧲🧲");
          console.log("Original magnet:", link.dataset.originalMagnet);
          console.log("Link text:", link.textContent.trim());

          // DEBUG: Check function availability
          console.log(
            "🔍 DEBUG: window.handleMagnetClick exists?",
            !!window.handleMagnetClick
          );
          console.log(
            "🔍 DEBUG: typeof window.handleMagnetClick:",
            typeof window.handleMagnetClick
          );
          console.log(
            "🔍 DEBUG: handleMagnetClick exists?",
            typeof handleMagnetClick !== "undefined"
          );

          if (window.handleMagnetClick) {
            console.log("✅ CALLING window.handleMagnetClick");
            window.handleMagnetClick(link.dataset.originalMagnet, link);
          } else if (typeof handleMagnetClick !== "undefined") {
            console.log("✅ CALLING handleMagnetClick directly");
            handleMagnetClick(link.dataset.originalMagnet, link);
          } else {
            console.log("❌ NO handleMagnetClick FUNCTION FOUND!");
          }
        });

        console.log(
          `✅ Processed magnet ${window.magnetCount} - href changed to javascript:void(0)`
        );
      }
    });

    if (window.updatePageTitle) window.updatePageTitle();
  } else if (isSignificantScan) {
    console.log("❌ NO MAGNET LINKS FOUND");
  }
};

// Prevent double initialization
if (window.qbExtensionInitialized) {
  console.log("⚠️ Extension already initialized, skipping...");
} else {
  window.qbExtensionInitialized = true;

  function initializeMagnetDetection() {
    console.log("🚀 INITIALIZING MAGNET DETECTION");

    // Only create observer if we don't have one
    if (!window.qbObserver) {
      window.qbObserver = new MutationObserver(function (mutations) {
        console.log(
          "🔍 DOM MUTATION DETECTED - checking for new magnet links..."
        );

        mutations.forEach(function (mutation) {
          // Check added nodes
          mutation.addedNodes.forEach(function (node) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              window.processMagnetLinks(node, "mutation");
            }
          });

          // Check modified attributes (href changes)
          if (
            mutation.type === "attributes" &&
            mutation.attributeName === "href"
          ) {
            if (mutation.target.tagName === "A") {
              window.processMagnetLinks(mutation.target, "href change");
            }
          }
        });
      });
    }

    // Start observing if we can
    if (document.body && !window.qbObserver.isObserving) {
      window.qbObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["href"],
      });
      window.qbObserver.isObserving = true;
      console.log(
        "🔍 MUTATION OBSERVER STARTED - watching for dynamic content"
      );
    }

    // Always scan for existing magnet links
    if (document.body) {
      console.log("📡 SCANNING EXISTING CONTENT...");
      window.processMagnetLinks(document.body, "initial scan");
      if (window.scanEntirePage) window.scanEntirePage();
    } else if (document.documentElement) {
      console.log("📡 SCANNING DOCUMENT ELEMENT...");
      window.processMagnetLinks(
        document.documentElement,
        "document element scan"
      );
    }
  }

  // Try to initialize immediately
  initializeMagnetDetection();

  // Also initialize when DOM is ready (covers both early and late scenarios)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeMagnetDetection);
  }

  // And when window is fully loaded (covers late dynamic content)
  if (document.readyState !== "complete") {
    window.addEventListener("load", initializeMagnetDetection);
  }

  // Periodic backup scans for dynamic content
  setInterval(function () {
    console.log("⏰ PERIODIC SCAN...");
    if (document.body) {
      window.processMagnetLinks(document.body, "periodic scan");
    }
  }, 5000); // Every 5 seconds
} // End of initialization check

// Comprehensive page scan function
window.scanEntirePage = function scanEntirePage() {
  console.log("🔎 COMPREHENSIVE PAGE SCAN STARTING...");

  // Method 1: Direct selector search
  const directMagnets = document.querySelectorAll('a[href^="magnet:"]');
  console.log(`🔍 Direct selector found: ${directMagnets.length} magnet links`);

  // Method 2: Search all links
  const allLinks = document.querySelectorAll("a");
  console.log(`🔍 Total links on page: ${allLinks.length}`);

  const magnetLinks = Array.from(allLinks).filter((link) => {
    const href = link.href || link.getAttribute("href") || "";
    return href.toLowerCase().includes("magnet:");
  });

  console.log(`🔍 Links containing 'magnet:': ${magnetLinks.length}`);

  // Method 3: Search page HTML source
  const pageHTML = document.documentElement.outerHTML;
  const magnetMatches = pageHTML.match(/magnet:\?[^"'\s<>]+/gi);
  console.log(
    `🔍 Magnet URLs in HTML source: ${magnetMatches ? magnetMatches.length : 0}`
  );

  if (magnetMatches) {
    magnetMatches.forEach((match, index) => {
      console.log(`🧲 HTML Magnet ${index + 1}: ${match.substring(0, 100)}...`);
    });
  }

  // Method 4: Search text content
  const textContent = document.body.textContent || "";
  const textMagnets = textContent.match(/magnet:\?[^\s]+/gi);
  console.log(
    `🔍 Magnet URLs in text content: ${textMagnets ? textMagnets.length : 0}`
  );

  // Process any found magnet links
  if (magnetLinks.length > 0) {
    console.log(`🧲 PROCESSING ${magnetLinks.length} FOUND MAGNET LINKS`);
    magnetLinks.forEach((link, index) => {
      console.log(
        `🔍 Link ${index + 1}: ${
          link.href
        } | Text: "${link.textContent.trim()}"`
      );
      if (!link.dataset.magnetProcessed) {
        processMagnetLinks(link);
      }
    });
  }

  console.log("🔎 COMPREHENSIVE PAGE SCAN COMPLETE");
};

// Initialize the notification manager globally (avoiding lexical declaration issues)
if (!window.qbNotifications && window.QBNotificationManager) {
  try {
    window.qbNotifications = new window.QBNotificationManager();
    console.log("✅ Global qbNotifications initialized");
  } catch (e) {
    console.log("❌ Failed to initialize qbNotifications:", e);
  }
}

// Handle magnet click (placeholder for actual QBittorrent integration)
window.handleMagnetClick = function handleMagnetClick(magnetUrl, linkElement) {
  console.log("🎯 HANDLING MAGNET CLICK:", magnetUrl);

  // Visual feedback on the link
  linkElement.style.backgroundColor = "#90EE90";
  linkElement.textContent = "✅ " + linkElement.textContent;

  // Show page notification using global notification system
  const linkText = linkElement.textContent.replace("✅ ", "").trim();

  // Don't show immediate notification - wait for background script response
  console.log("🎯 Sending magnet to background script and waiting for result...");

  // Send message to background script for notification
  chrome.runtime.sendMessage(
    {
      type: "MAGNET_CLICKED",
      magnetUrl: magnetUrl,
      pageUrl: window.location.href,
      linkText: linkText,
    },
    function (response) {
      if (chrome.runtime.lastError) {
        console.log(
          "Error sending message to background:",
          chrome.runtime.lastError
        );
      } else {
        console.log("✅ Notified background script of magnet click");

        // Display background script logs in UI console
        if (response && response.backgroundLogs) {
          console.log("📋 Background Script Logs:");
          response.backgroundLogs.forEach((log) => {
            console.log("  " + log);
          });
        }

        // Log the full response for debugging
        console.log("📨 Full background response:", response);

        // Show appropriate notification based on the result
        if (response && response.success) {
          // Success - torrent added
          console.log("🎉 SUCCESS: Magnet successfully sent to QBittorrent!");
          
          if (window.qbNotifications && window.qbNotifications.showSuccess) {
            window.qbNotifications.showSuccess(
              "🎯 Successfully Added to QBittorrent!",
              `Torrent: <strong>${linkText || "Unknown torrent"}</strong>`,
              { duration: 6000 }
            );
          } else {
            showFallbackNotification("🎯 Successfully Added to QBittorrent!", linkText, "success");
          }
          
        } else if (response && response.isDuplicate) {
          // Duplicate torrent
          console.log("⚠️ DUPLICATE: Torrent already exists in QBittorrent");
          
          if (window.qbNotifications && window.qbNotifications.showWarning) {
            window.qbNotifications.showWarning(
              "⚠️ Already in Queue",
              `Torrent: <strong>${linkText || "Unknown torrent"}</strong><br><small>This torrent is already being downloaded</small>`,
              { duration: 6000 }
            );
          } else {
            showFallbackNotification("⚠️ Already in Queue", linkText + "\nThis torrent is already being downloaded", "warning");
          }
          
        } else if (response && !response.success) {
          // Error
          console.log("❌ ERROR: Failed to send magnet to QBittorrent");
          console.log("Error details:", response.message);
          
          if (window.qbNotifications && window.qbNotifications.showError) {
            window.qbNotifications.showError(
              "❌ QBittorrent Error",
              `Failed to add: <strong>${linkText || "Unknown torrent"}</strong><br><small>${response.userMessage || response.message || "Unknown error"}</small>`,
              { duration: 8000 }
            );
          } else {
            showFallbackNotification("❌ QBittorrent Error", (response.userMessage || response.message || "Unknown error"), "error");
          }
        }
      }
    }
  );

  // Fallback notification function for when qbNotifications isn't available
  function showFallbackNotification(title, message, type = "info") {
    const popup = document.createElement("div");
    const bgColors = {
      success: "#d1edff",
      warning: "#fff3cd", 
      error: "#f8d7da",
      info: "#d1ecf1"
    };
    const textColors = {
      success: "#055160",
      warning: "#664d03",
      error: "#721c24", 
      info: "#0c5460"
    };
    const borderColors = {
      success: "#b6effb",
      warning: "#ffecb5",
      error: "#f5c2c7",
      info: "#bee5eb"
    };

    popup.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 999999;
      background: ${bgColors[type]};
      color: ${textColors[type]};
      padding: 16px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      font-size: 14px;
      max-width: 350px;
      border: 1px solid ${borderColors[type]};
      animation: slideInRight 0.4s ease-out;
    `;

    // Add animation styles if not already added
    if (!document.getElementById("fallback-popup-styles")) {
      const style = document.createElement("style");
      style.id = "fallback-popup-styles";
      style.textContent = `
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    popup.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 8px;">${title}</div>
      <div style="font-size: 13px; white-space: pre-line;">${message}</div>
    `;

    document.body.appendChild(popup);

    // Remove after duration with animation
    setTimeout(() => {
      if (popup.parentNode) {
        popup.style.animation = "slideOutRight 0.3s ease-in";
        setTimeout(() => {
          if (popup.parentNode) {
            popup.remove();
          }
        }, 300);
      }
    }, type === "error" ? 8000 : 6000);
  }
};

// DEBUG: Check if function is available after definition
console.log(
  "🔍 DEBUG: handleMagnetClick defined?",
  typeof handleMagnetClick !== "undefined"
);
console.log(
  "🔍 DEBUG: window.handleMagnetClick available?",
  !!window.handleMagnetClick
);

// Make it globally accessible
window.handleMagnetClick = handleMagnetClick;
console.log(
  "🔍 DEBUG: window.handleMagnetClick assigned?",
  !!window.handleMagnetClick
);

// Update page title with magnet count
function updatePageTitle() {
  const titlePrefix =
    magnetCount > 0 ? `[${magnetCount} MAGNETS] ` : "[NO MAGNETS] ";
  const originalTitle = document.title.replace(/^\[[^\]]+\] /, "");
  document.title = titlePrefix + originalTitle;

  // Send magnet count to background for badge update
  chrome.runtime.sendMessage(
    {
      type: "UPDATE_BADGE",
      magnetCount: magnetCount,
      pageUrl: window.location.href,
    },
    function (response) {
      if (chrome.runtime.lastError) {
        console.log("Error updating badge:", chrome.runtime.lastError);
      } else {
        console.log(`✅ Updated badge count to ${magnetCount}`);
      }
    }
  );
}

// Global click listener for any remaining magnet links
document.addEventListener(
  "click",
  function (event) {
    const link = event.target.closest("a");
    if (
      link &&
      link.href &&
      link.href.includes("magnet:") &&
      !link.dataset.magnetProcessed
    ) {
      console.log("🧲 UNPROCESSED MAGNET LINK CLICKED!");
      console.log("Magnet URL:", link.href);
      event.preventDefault();
      event.stopPropagation();

      // Process it immediately
      processMagnetLinks(link);
    }
  },
  true
);

// Initial scan of existing content
function initialScan() {
  console.log("🔎 INITIAL SCAN - searching for existing magnet links...");
  processMagnetLinks(document.body);
  console.log(`✅ Initial scan complete - found ${magnetCount} magnet links`);
}

// Run initial scan when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialScan);
} else {
  initialScan();
}

// Also scan after a delay for late-loading content
setTimeout(() => {
  console.log(
    "🔎 DELAYED SCAN - checking for content loaded after page ready..."
  );
  const beforeCount = magnetCount;
  processMagnetLinks(document.body);
  const newMagnets = magnetCount - beforeCount;
  if (newMagnets > 0) {
    console.log(`🧲 Found ${newMagnets} additional magnets in delayed scan`);
  }
}, 3000);

console.log("MAGNET OBSERVER SETUP COMPLETE - watching for changes...");

// Manual scan function for testing
window.scanForMagnets = function () {
  console.log("🧪 MANUAL MAGNET SCAN TRIGGERED");
  scanEntirePage();
  processMagnetLinks(document.body);
};

// Test function you can call from console
window.testQBNotification = function (testText) {
  console.log("🧪 TESTING PAGE NOTIFICATION");
  qbNotifications.showMagnetSuccess(
    "magnet:?xt=urn:btih:test123&dn=Console%20Test",
    testText || "Console Test - Sample Torrent Name.mkv"
  );
};

// Periodic scan every 5 seconds to catch dynamic content
setInterval(() => {
  console.log("🔄 PERIODIC SCAN...");
  scanEntirePage();
}, 5000);

// Additional test functions for different notification types
window.testNotificationTypes = function () {
  console.log("🧪 TESTING ALL NOTIFICATION TYPES");

  qbNotifications.showSuccess("Success!", "This is a success message");

  setTimeout(() => {
    qbNotifications.showInfo(
      "Information",
      "This is an info message with Bootstrap icons"
    );
  }, 500);

  setTimeout(() => {
    qbNotifications.showWarning("Warning!", "This is a warning message");
  }, 1000);

  setTimeout(() => {
    qbNotifications.showError("Error!", "This is an error message");
  }, 1500);

  setTimeout(() => {
    qbNotifications.show({
      type: "primary",
      title: "Custom Notification",
      message: "This is a custom primary notification with click handler",
      icon: "bi-gear-fill",
      duration: 0, // Won't auto-dismiss
      onClick: () => {
        alert("Custom notification clicked!");
      },
    });
  }, 2000);
};

console.log(
  "💡 TIP: Type 'testQBNotification()' in console to test the popup!"
);
console.log("💡 Or: testQBNotification('Custom torrent name here')");
console.log(
  "💡 NEW: Type 'testNotificationTypes()' to see all notification styles!"
);
