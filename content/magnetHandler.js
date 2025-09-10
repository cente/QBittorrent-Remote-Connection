// Simple magnet link interceptor for QBittorrent extension
console.log("🔴🔴🔴 QBITTORRENT EXTENSION CONTENT SCRIPT IS RUNNING! 🔴🔴🔴");
console.log("🔴🔴🔴 TIME:", new Date().toISOString());
console.log("🔴🔴🔴 PAGE:", window.location.href);
console.log("🔴🔴🔴 DOCUMENT STATE:", document.readyState);

// Show alert to make it super obvious
alert("QBittorrent Extension Content Script Loaded!");

console.log("=== QBITTORRENT MAGNET HANDLER LOADED ===");
console.log("Document ready state:", document.readyState);
console.log("Location:", window.location.href);

class MagnetInterceptor {
  constructor() {
    this.interceptedCount = 0;
    console.log("MagnetInterceptor constructor called");
    this.init();
  }

  init() {
    console.log("Initializing magnet link interceptor...");
    console.log("Document body exists:", !!document.body);

    // Add immediate check for magnet links
    const initialMagnets = document.querySelectorAll('a[href^="magnet:"]');
    console.log(`Initial magnet links found: ${initialMagnets.length}`);

    // Add multiple event listeners to catch clicks at different phases
    document.addEventListener("click", this.handleClick.bind(this), true); // Capture phase
    document.addEventListener("click", this.handleClick.bind(this), false); // Bubble phase

    // Also try to intercept at the mousedown level
    document.addEventListener(
      "mousedown",
      this.handleMouseDown.bind(this),
      true
    );

    // Process existing magnet links on the page
    this.markExistingMagnetLinks();

    // Watch for dynamically added magnet links
    this.setupMutationObserver();

    // Show that we're active
    this.showNotification(
      "QBittorrent Extension Active",
      "Magnet link interceptor is running",
      "info"
    );

    console.log("Magnet interceptor ready");
  }

  handleMouseDown(event) {
    const link = event.target.closest('a[href^="magnet:"]');
    if (!link) return;

    console.log("=== MAGNET LINK MOUSEDOWN ===");
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

  handleClick(event) {
    const link = event.target.closest('a[href^="magnet:"]');
    if (!link) return;

    console.log("=== MAGNET LINK CLICKED ===");
    console.log("URL:", link.href);
    console.log("Event phase:", event.eventPhase);

    // Aggressively prevent the default behavior
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    // Also try to clear the href temporarily
    const originalHref = link.href;
    link.href = "javascript:void(0)";

    this.interceptedCount++;

    // Show success notification
    this.showNotification(
      `Magnet link intercepted! (#${this.interceptedCount})`,
      `URL: ${this.truncateUrl(originalHref)}`,
      "success"
    );

    console.log(
      `Successfully intercepted magnet link #${this.interceptedCount}`
    );

    // Restore href after a moment
    setTimeout(() => {
      link.href = originalHref;
    }, 100);
  }

  markExistingMagnetLinks() {
    const magnetLinks = document.querySelectorAll('a[href^="magnet:"]');
    console.log(`=== PROCESSING ${magnetLinks.length} MAGNET LINKS ===`);

    magnetLinks.forEach((link, index) => {
      console.log(`Processing magnet link ${index + 1}:`, link.href);

      // Store original magnet URL
      if (!link.dataset.originalMagnet) {
        link.dataset.originalMagnet = link.href;
        console.log(`Stored original magnet: ${link.href}`);

        // Replace href with javascript void to prevent navigation
        link.href = "javascript:void(0)";
        console.log(`Modified href to: ${link.href}`);

        // Add a very obvious visual change
        link.style.cssText += `
          background-color: red !important;
          color: white !important;
          border: 2px solid blue !important;
          padding: 5px !important;
          margin: 2px !important;
        `;

        // Add custom click handler
        link.addEventListener(
          "click",
          (event) => {
            console.log("CUSTOM CLICK HANDLER TRIGGERED!");
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            this.interceptedCount++;
            this.showNotification(
              `Magnet link intercepted! (#${this.interceptedCount})`,
              `URL: ${this.truncateUrl(link.dataset.originalMagnet)}`,
              "success"
            );

            console.log(`Intercepted magnet: ${link.dataset.originalMagnet}`);
          },
          true
        );

        // Add the indicator
        const indicator = document.createElement("span");
        indicator.className = "qbt-indicator";
        indicator.innerHTML = " 🔗 MODIFIED";
        indicator.style.cssText = `
          color: yellow;
          font-size: 12px;
          margin-left: 4px;
          font-weight: bold;
          background: black;
          padding: 2px;
        `;
        link.appendChild(indicator);

        console.log(`Added indicator to link ${index + 1}`);
      }
    });

    if (magnetLinks.length > 0) {
      this.showNotification(
        `QBittorrent extension active`,
        `Modified ${magnetLinks.length} magnet link${
          magnetLinks.length > 1 ? "s" : ""
        } on this page`,
        "info"
      );
    } else {
      console.log("No magnet links found on this page");
    }
  }

  setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      let hasNewMagnets = false;

      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if the node itself is a magnet link
            if (
              node.tagName === "A" &&
              node.href &&
              node.href.startsWith("magnet:")
            ) {
              hasNewMagnets = true;
            }
            // Check for magnet links within the added node
            const magnetLinks =
              node.querySelectorAll &&
              node.querySelectorAll('a[href^="magnet:"]');
            if (magnetLinks && magnetLinks.length > 0) {
              hasNewMagnets = true;
            }
          }
        });
      });

      if (hasNewMagnets) {
        console.log("New magnet links detected, updating...");
        this.markExistingMagnetLinks();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  showNotification(title, message, type = "info") {
    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      padding: 12px 16px;
      border-radius: 6px;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
      font-size: 14px;
      font-weight: 500;
      max-width: 350px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      border-left: 4px solid;
      animation: slideIn 0.3s ease-out;
    `;

    // Set colors based on type
    switch (type) {
      case "success":
        notification.style.backgroundColor = "#28a745";
        notification.style.borderLeftColor = "#1e7e34";
        break;
      case "info":
        notification.style.backgroundColor = "#007acc";
        notification.style.borderLeftColor = "#005a9e";
        break;
      case "warning":
        notification.style.backgroundColor = "#ffc107";
        notification.style.color = "#212529";
        notification.style.borderLeftColor = "#e0a800";
        break;
      default:
        notification.style.backgroundColor = "#6c757d";
        notification.style.borderLeftColor = "#495057";
    }

    notification.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 4px;">${title}</div>
      <div style="font-size: 12px; opacity: 0.9;">${message}</div>
    `;

    // Add slide-in animation
    const style = document.createElement("style");
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    // Remove after 4 seconds
    setTimeout(() => {
      notification.style.transition = "all 0.3s ease-out";
      notification.style.transform = "translateX(100%)";
      notification.style.opacity = "0";

      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 4000);
  }

  truncateUrl(url) {
    if (url.length <= 50) return url;
    return url.substring(0, 50) + "...";
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    new MagnetInterceptor();
  });
} else {
  new MagnetInterceptor();
}
