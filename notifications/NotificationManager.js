/**
 * Encapsulated Notification Manager for QBittorrent Extension
 * This is the working notification system extracted from contentScript.js
 */
if (!window.QBNotificationManager) {
  // Define QBNotificationManager only once
  window.QBNotificationManager = class QBNotificationManager {
    constructor() {
      this.ensureBootstrapStyles();
    }

    ensureBootstrapStyles() {
      // Don't load Bootstrap globally - notifications will use inline styles instead
      // This prevents affecting the entire page's styling
    }

    show(options = {}) {
      const {
        message = "Magnet link intercepted!",
        type = "success",
        duration = 5000,
        title = "QBittorrent Extension",
        dismissible = true,
        onClick = null,
        icon = null,
      } = options;

      // Don't load Bootstrap Icons globally - use custom styling instead
      // This prevents affecting the entire page's styling

      const notification = document.createElement("div");
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 999999;
        min-width: 300px;
        max-width: 400px;
        background: ${
          type === "success"
            ? "#d1edff"
            : type === "danger"
            ? "#f8d7da"
            : type === "warning"
            ? "#fff3cd"
            : "#cff4fc"
        };
        color: ${
          type === "success"
            ? "#055160"
            : type === "danger"
            ? "#721c24"
            : type === "warning"
            ? "#664d03"
            : "#055160"
        };
        border: 1px solid ${
          type === "success"
            ? "#b6effb"
            : type === "danger"
            ? "#f5c2c7"
            : type === "warning"
            ? "#ffecb5"
            : "#9eeaf9"
        };
        border-radius: 8px;
        padding: 16px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        font-size: 14px;
        animation: slideInRight 0.4s ease-out;
      `;

      // Add slide animation styles if not already added
      if (!document.getElementById("qb-notification-styles")) {
        const style = document.createElement("style");
        style.id = "qb-notification-styles";
        style.textContent = `
          @keyframes slideInRight {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          @keyframes slideOutRight {
            from {
              transform: translateX(0);
              opacity: 1;
            }
            to {
              transform: translateX(100%);
              opacity: 0;
            }
          }
          .qb-notification-fade-out {
            animation: slideOutRight 0.3s ease-in;
          }
        `;
        document.head.appendChild(style);
      }

      const closeButtonHtml = dismissible
        ? '<button type="button" style="background:none;border:none;float:right;font-size:18px;cursor:pointer;opacity:0.7;" aria-label="Close">&times;</button>'
        : "";

      const iconHtml = icon
        ? `<span style="margin-right: 8px;">${
            icon.includes("bi-") ? "🔔" : icon
          }</span>`
        : "";

      notification.innerHTML = `
        <div style="display: flex; align-items: flex-start;">
          <div style="flex-grow: 1;">
            <div style="font-weight: 600; margin-bottom: 4px;">${iconHtml}${title}</div>
            ${message ? `<div style="margin-bottom: 0;">${message}</div>` : ""}
          </div>
          ${closeButtonHtml}
        </div>
      `;

      if (onClick && typeof onClick === "function") {
        notification.style.cursor = "pointer";
        notification.addEventListener("click", (e) => {
          if (!e.target.matches('button[aria-label="Close"]')) {
            onClick(e, notification);
          }
        });
      }

      if (dismissible) {
        const closeBtn = notification.querySelector(
          'button[aria-label="Close"]'
        );
        if (closeBtn) {
          closeBtn.addEventListener("click", () => {
            notification.classList.add("qb-notification-fade-out");
            setTimeout(() => {
              if (notification.parentNode) {
                notification.remove();
              }
            }, 300);
          });
        }
      }

      document.body.appendChild(notification);

      if (duration > 0) {
        setTimeout(() => {
          if (notification.parentNode) {
            notification.classList.add("qb-notification-fade-out");
            setTimeout(() => {
              if (notification.parentNode) {
                notification.remove();
              }
            }, 300);
          }
        }, duration);
      }

      console.log("✅ Bootstrap notification shown:", title);
      return notification;
    }

    /**
     * Convenience methods for common notification types
     */
    showSuccess(title, message, options = {}) {
      return this.show({
        type: "success",
        icon: "✅",
        title,
        message,
        ...options,
      });
    }

    showError(title, message, options = {}) {
      return this.show({
        type: "danger",
        icon: "❌",
        title,
        message,
        ...options,
      });
    }

    showWarning(title, message, options = {}) {
      return this.show({
        type: "warning",
        icon: "⚠️",
        title,
        message,
        ...options,
      });
    }

    showInfo(title, message, options = {}) {
      return this.show({
        type: "info",
        icon: "ℹ️",
        title,
        message,
        ...options,
      });
    }

    showMagnetSuccess(magnetUrl, linkText) {
      return this.show({
        type: "success",
        icon: "🧲",
        title: "Magnet Link Intercepted",
        message: `<small style="opacity: 0.8;">Torrent:</small><br><strong>${
          linkText || "Unknown torrent"
        }</strong>`,
        duration: 5000,
        onClick: (e, notification) => {
          console.log("Notification clicked:", magnetUrl);
          // Could show more details or trigger download
        },
      });
    }
  };
}

// Initialize global notification manager
if (!window.qbNotifications) {
  window.qbNotifications = new window.QBNotificationManager();
  console.log("✅ Global qbNotifications initialized from separate file");
}
