/**
 * Magnet Link Handler Module
 * Detects and processes magnet links on web pages
 */
class MagnetLinkHandler {
  constructor() {
    this.magnetRegex = /magnet:\?xt=urn:btih:[a-fA-F0-9]{20,40}[&\w\d%=.-]*/gi;
    this.processedLinks = new Set();
    this.observer = null;
    this.isEnabled = true;
  }

  /**
   * Initialize the magnet link handler
   */
  async init() {
    // Check if magnet handling is enabled in settings
    const settings = await this.getSettings();
    this.isEnabled = settings?.enableMagnetHandling !== false;

    if (!this.isEnabled) {
      return;
    }

    this.scanExistingLinks();
    this.startObserver();
    this.setupContextMenu();
  }

  /**
   * Get extension settings
   */
  async getSettings() {
    try {
      const result = await browser.storage.local.get([
        "qbittorrent_settings",
        "magnet_settings",
      ]);
      return {
        ...result.qbittorrent_settings,
        ...result.magnet_settings,
      };
    } catch (error) {
      console.error("Failed to load settings:", error);
      return {};
    }
  }

  /**
   * Scan existing links on page load
   */
  scanExistingLinks() {
    // Scan all existing links
    const links = document.querySelectorAll('a[href*="magnet:"]');
    links.forEach((link) => this.processLink(link));

    // Scan text content for raw magnet links
    this.scanTextNodes(document.body);
  }

  /**
   * Scan text nodes for raw magnet links
   */
  scanTextNodes(element) {
    if (!element) return;

    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    const textNodes = [];
    let node;
    while ((node = walker.nextNode())) {
      if (this.magnetRegex.test(node.textContent)) {
        textNodes.push(node);
      }
    }

    textNodes.forEach((node) => this.wrapMagnetLinks(node));
  }

  /**
   * Wrap raw magnet links with clickable elements
   */
  wrapMagnetLinks(textNode) {
    const text = textNode.textContent;
    const matches = [...text.matchAll(this.magnetRegex)];

    if (matches.length === 0) return;

    const parent = textNode.parentNode;
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;

    matches.forEach((match) => {
      const [magnetUrl] = match;
      const startIndex = match.index;

      // Add text before magnet link
      if (startIndex > lastIndex) {
        fragment.appendChild(
          document.createTextNode(text.slice(lastIndex, startIndex))
        );
      }

      // Create clickable magnet link
      const magnetElement = this.createMagnetElement(magnetUrl);
      fragment.appendChild(magnetElement);

      lastIndex = startIndex + magnetUrl.length;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    parent.replaceChild(fragment, textNode);
  }

  /**
   * Create a clickable element for magnet links
   */
  createMagnetElement(magnetUrl) {
    const span = document.createElement("span");
    span.textContent = magnetUrl;
    span.style.cssText = `
            color: #007bff;
            text-decoration: underline;
            cursor: pointer;
            background-color: rgba(0, 123, 255, 0.1);
            padding: 2px 4px;
            border-radius: 3px;
            font-family: monospace;
            font-size: 0.9em;
        `;

    span.title = "Click to add to QBittorrent";
    span.addEventListener("click", (e) => {
      e.preventDefault();
      this.handleMagnetClick(magnetUrl);
    });

    return span;
  }

  /**
   * Process a link element
   */
  processLink(link) {
    if (!link.href || this.processedLinks.has(link.href)) {
      return;
    }

    if (this.isMagnetLink(link.href)) {
      this.processedLinks.add(link.href);
      this.enhanceLink(link);
    }
  }

  /**
   * Check if URL is a magnet link
   */
  isMagnetLink(url) {
    return url.startsWith("magnet:");
  }

  /**
   * Enhance existing magnet links
   */
  enhanceLink(link) {
    // Add visual indicator
    link.style.cssText += `
            position: relative;
            padding-right: 20px;
        `;

    // Add download icon
    const icon = document.createElement("span");
    icon.innerHTML = "⬇️";
    icon.style.cssText = `
            position: absolute;
            right: 2px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 12px;
        `;

    link.style.position = "relative";
    link.appendChild(icon);

    // Override click behavior
    link.addEventListener("click", (e) => {
      e.preventDefault();
      this.handleMagnetClick(link.href);
    });
  }

  /**
   * Handle magnet link click
   */
  async handleMagnetClick(magnetUrl) {
    try {
      // Show loading indicator
      this.showNotification("Adding torrent...", "info");

      // Send to background script
      const response = await browser.runtime.sendMessage({
        action: "addMagnet",
        magnetUrl: magnetUrl,
      });

      if (response.success) {
        this.showNotification("Torrent added successfully!", "success");
      } else {
        this.showNotification(
          `Failed to add torrent: ${response.error}`,
          "error"
        );
      }
    } catch (error) {
      console.error("Failed to handle magnet click:", error);
      this.showNotification("Failed to add torrent", "error");
    }
  }

  /**
   * Start mutation observer for dynamic content
   */
  startObserver() {
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check for new magnet links
            const links = node.querySelectorAll
              ? node.querySelectorAll('a[href*="magnet:"]')
              : [];
            links.forEach((link) => this.processLink(link));

            // Check for text nodes with magnet links
            this.scanTextNodes(node);
          } else if (node.nodeType === Node.TEXT_NODE) {
            this.scanTextNodes(node.parentElement);
          }
        });
      });
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Setup context menu for magnet links
   */
  setupContextMenu() {
    document.addEventListener("contextmenu", (e) => {
      const target = e.target;

      // Check if right-clicked on magnet link
      if (target.tagName === "A" && this.isMagnetLink(target.href)) {
        // Send message to background to show context menu
        browser.runtime.sendMessage({
          action: "showMagnetContextMenu",
          magnetUrl: target.href,
        });
      }
    });
  }

  /**
   * Show notification to user
   */
  showNotification(message, type = "info") {
    // Create notification element
    const notification = document.createElement("div");
    notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            padding: 12px 20px;
            border-radius: 6px;
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            max-width: 300px;
            word-wrap: break-word;
        `;

    // Set background color based on type
    const colors = {
      info: "#007bff",
      success: "#28a745",
      error: "#dc3545",
      warning: "#ffc107",
    };
    notification.style.backgroundColor = colors[type] || colors.info;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.opacity = "1";
      notification.style.transform = "translateX(0)";
    }, 100);

    // Remove after delay
    setTimeout(() => {
      notification.style.opacity = "0";
      notification.style.transform = "translateX(100%)";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  /**
   * Cleanup and stop observer
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// Export for use in content script
if (typeof window !== "undefined") {
  window.MagnetLinkHandler = MagnetLinkHandler;
}
