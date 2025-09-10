// Simple test content script with MutationObserver
console.log("QBITTORRENT EXTENSION TEST SCRIPT RUNNING!");
console.log("TIME:", new Date().toISOString());
console.log("PAGE:", window.location.href);

let magnetCount = 0;

// MutationObserver to watch for dynamically added content
const observer = new MutationObserver(function (mutations) {
  console.log("🔍 DOM MUTATION DETECTED - checking for new magnet links...");

  mutations.forEach(function (mutation) {
    // Check added nodes
    mutation.addedNodes.forEach(function (node) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        processMagnetLinks(node);
      }
    });

    // Check modified attributes (href changes)
    if (mutation.type === "attributes" && mutation.attributeName === "href") {
      if (mutation.target.tagName === "A") {
        processMagnetLinks(mutation.target);
      }
    }
  });
});

// Start observing
observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["href"],
});

console.log("🔍 MUTATION OBSERVER STARTED - watching for dynamic content");

// Function to process magnet links in an element
function processMagnetLinks(element) {
  // Find magnet links in this element and its children
  const magnetLinks = element.querySelectorAll
    ? element.querySelectorAll('a[href^="magnet:"]')
    : element.matches && element.matches('a[href^="magnet:"]')
    ? [element]
    : [];

  if (magnetLinks.length > 0) {
    console.log(`🧲 FOUND ${magnetLinks.length} NEW MAGNET LINKS!`);

    magnetLinks.forEach((link, index) => {
      if (!link.dataset.magnetProcessed) {
        magnetCount++;
        console.log(`Processing new magnet ${magnetCount}:`, link.href);

        // Mark as processed
        link.dataset.magnetProcessed = "true";

        // Store original href
        link.dataset.originalMagnet = link.href;

        // Replace href to prevent Firefox from handling it
        link.href = "javascript:void(0)";

        // Add visual indicator
        link.style.border = "2px solid #ff6b6b";
        link.style.backgroundColor = "#ffe0e0";
        link.title = "QBittorrent Extension: Magnet link detected";

        // Add click handler
        link.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          console.log("🧲🧲🧲 INTERCEPTED MAGNET CLICK! 🧲🧲🧲");
          console.log("Original magnet:", link.dataset.originalMagnet);
          console.log("Link text:", link.textContent.trim());

          // Here we could send to QBittorrent
          handleMagnetClick(link.dataset.originalMagnet, link);
        });

        console.log(
          `✅ Processed magnet ${magnetCount} - href changed to javascript:void(0)`
        );
      }
    });

    updatePageTitle();
  }
}

// Enhanced Bootstrap-based Notification System
class QBNotificationManager {
  constructor() {
    this.notificationCount = 0;
    this.initializeStyles();
    console.log("🔔 QBNotificationManager initialized");
  }

  initializeStyles() {
    // Add custom styles if not already added
    if (!document.getElementById('qb-notification-styles')) {
      const style = document.createElement('style');
      style.id = 'qb-notification-styles';
      style.textContent = `
        .qb-notification-container {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 999999;
          max-width: 350px;
        }
        
        .qb-notification {
          margin-bottom: 10px;
          animation: qbSlideIn 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        }
        
        .qb-notification.qb-fade-out {
          animation: qbFadeOut 0.3s ease-in;
        }
        
        @keyframes qbSlideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes qbFadeOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
        
        .qb-notification:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
          transition: all 0.2s ease;
        }
        
        .qb-notification .btn-close {
          opacity: 0.7;
        }
        
        .qb-notification .btn-close:hover {
          opacity: 1;
        }
      `;
      document.head.appendChild(style);
    }

    // Create notification container if it doesn't exist
    if (!document.getElementById('qb-notification-container')) {
      const container = document.createElement('div');
      container.id = 'qb-notification-container';
      container.className = 'qb-notification-container';
      document.body.appendChild(container);
    }
  }

  /**
   * Show a notification with Bootstrap styling
   * @param {Object} options - Notification options
   * @param {string} options.type - Bootstrap alert type (primary, secondary, success, danger, warning, info, light, dark)
   * @param {string} options.title - Notification title
   * @param {string} options.message - Notification message
   * @param {string} options.icon - Bootstrap icon class (e.g., 'bi-download', 'bi-check-circle')
   * @param {number} options.duration - Auto-dismiss duration in ms (default: 4000, 0 = no auto-dismiss)
   * @param {boolean} options.dismissible - Show close button (default: true)
   * @param {function} options.onClick - Click handler function
   */
  show(options = {}) {
    const {
      type = 'success',
      title = 'QBittorrent Extension',
      message = '',
      icon = '',
      duration = 4000,
      dismissible = true,
      onClick = null
    } = options;

    this.notificationCount++;
    const notificationId = `qb-notification-${this.notificationCount}`;

    // Build icon HTML
    const iconHtml = icon ? `<i class="bi ${icon} me-2"></i>` : '';
    
    // Build close button HTML
    const closeButtonHtml = dismissible ? 
      `<button type="button" class="btn-close" aria-label="Close"></button>` : '';

    // Create notification element with Bootstrap structure
    const notification = document.createElement('div');
    notification.id = notificationId;
    notification.className = `alert alert-${type} alert-dismissible qb-notification`;
    notification.setAttribute('role', 'alert');
    
    notification.innerHTML = `
      <div class="d-flex align-items-start">
        <div class="flex-grow-1">
          <div class="fw-bold mb-1">
            ${iconHtml}${title}
          </div>
          ${message ? `<div class="mb-0">${message}</div>` : ''}
        </div>
        ${closeButtonHtml}
      </div>
    `;

    // Add click handler if provided
    if (onClick && typeof onClick === 'function') {
      notification.style.cursor = 'pointer';
      notification.addEventListener('click', (e) => {
        if (!e.target.classList.contains('btn-close')) {
          onClick(e, notification);
        }
      });
    }

    // Add close button functionality
    if (dismissible) {
      const closeBtn = notification.querySelector('.btn-close');
      closeBtn.addEventListener('click', () => {
        this.dismiss(notificationId);
      });
    }

    // Add to container
    const container = document.getElementById('qb-notification-container');
    container.appendChild(notification);

    // Auto-dismiss if duration is set
    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(notificationId);
      }, duration);
    }

    console.log(`✅ Notification created: ${notificationId}`);
    return notificationId;
  }

  /**
   * Dismiss a notification
   * @param {string} notificationId - ID of notification to dismiss
   */
  dismiss(notificationId) {
    const notification = document.getElementById(notificationId);
    if (notification) {
      notification.classList.add('qb-fade-out');
      setTimeout(() => {
        if (notification && notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }
  }

  /**
   * Clear all notifications
   */
  clearAll() {
    const container = document.getElementById('qb-notification-container');
    if (container) {
      const notifications = container.querySelectorAll('.qb-notification');
      notifications.forEach(notification => {
        notification.classList.add('qb-fade-out');
        setTimeout(() => {
          if (notification && notification.parentNode) {
            notification.remove();
          }
        }, 300);
      });
    }
  }

  /**
   * Predefined notification types for common use cases
   */
  showSuccess(title, message, options = {}) {
    return this.show({
      type: 'success',
      icon: 'bi-check-circle-fill',
      title,
      message,
      ...options
    });
  }

  showError(title, message, options = {}) {
    return this.show({
      type: 'danger',
      icon: 'bi-exclamation-triangle-fill',
      title,
      message,
      ...options
    });
  }

  showWarning(title, message, options = {}) {
    return this.show({
      type: 'warning',
      icon: 'bi-exclamation-triangle',
      title,
      message,
      ...options
    });
  }

  showInfo(title, message, options = {}) {
    return this.show({
      type: 'info',
      icon: 'bi-info-circle-fill',
      title,
      message,
      ...options
    });
  }

  showMagnetSuccess(magnetUrl, linkText) {
    return this.show({
      type: 'success',
      icon: 'bi-magnet',
      title: 'Magnet Link Intercepted',
      message: `<small class="text-muted">Torrent:</small><br><strong>${linkText || 'Unknown torrent'}</strong>`,
      duration: 5000,
      onClick: (e, notification) => {
        console.log('Notification clicked:', magnetUrl);
        // Could show more details or trigger download
      }
    });
  }
}

// Initialize the notification manager
const qbNotifications = new QBNotificationManager();

// Handle magnet click (placeholder for actual QBittorrent integration)
function handleMagnetClick(magnetUrl, linkElement) {
  console.log("🎯 HANDLING MAGNET CLICK:", magnetUrl);

  // Visual feedback on the link
  linkElement.style.backgroundColor = "#90EE90";
  linkElement.textContent = "✅ " + linkElement.textContent;

  // Show page notification using new notification system
  const linkText = linkElement.textContent.replace("✅ ", "").trim();
  qbNotifications.showMagnetSuccess(magnetUrl, linkText);

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
      }
    }
  );

  // TODO: Send to QBittorrent API here
  // For now, just log it
  console.log("Would send to QBittorrent:", magnetUrl);
}

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

// Test function you can call from console
window.testQBNotification = function(testText) {
  console.log("🧪 TESTING PAGE NOTIFICATION");
  qbNotifications.showMagnetSuccess(
    'magnet:?xt=urn:btih:test123&dn=Console%20Test', 
    testText || 'Console Test - Sample Torrent Name.mkv'
  );
};

// Additional test functions for different notification types
window.testNotificationTypes = function() {
  console.log("🧪 TESTING ALL NOTIFICATION TYPES");
  
  qbNotifications.showSuccess('Success!', 'This is a success message');
  
  setTimeout(() => {
    qbNotifications.showInfo('Information', 'This is an info message with Bootstrap icons');
  }, 500);
  
  setTimeout(() => {
    qbNotifications.showWarning('Warning!', 'This is a warning message');
  }, 1000);
  
  setTimeout(() => {
    qbNotifications.showError('Error!', 'This is an error message');
  }, 1500);
  
  setTimeout(() => {
    qbNotifications.show({
      type: 'primary',
      title: 'Custom Notification',
      message: 'This is a custom primary notification with click handler',
      icon: 'bi-gear-fill',
      duration: 0, // Won't auto-dismiss
      onClick: () => {
        alert('Custom notification clicked!');
      }
    });
  }, 2000);
};

console.log("💡 TIP: Type 'testQBNotification()' in console to test the popup!");
console.log("💡 Or: testQBNotification('Custom torrent name here')");
console.log("💡 NEW: Type 'testNotificationTypes()' to see all notification styles!");
