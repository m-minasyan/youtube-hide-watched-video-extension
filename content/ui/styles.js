export function injectStyles() {
  const styleId = 'yt-hwv-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .YT-HWV-WATCHED-HIDDEN { display: none !important }
    .YT-HWV-WATCHED-DIMMED { opacity: 0.3 }
    .YT-HWV-SHORTS-HIDDEN { display: none !important }
    .YT-HWV-SHORTS-DIMMED { opacity: 0.3 }
    .YT-HWV-HIDDEN-ROW-PARENT { padding-bottom: 10px }
    .YT-HWV-INDIVIDUAL-HIDDEN { display: none !important }
    .YT-HWV-INDIVIDUAL-DIMMED { opacity: 0.3 }

    .yt-hwv-eye-button {
      position: absolute !important;
      top: 8px !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      z-index: 999 !important;
      background: rgba(0, 0, 0, 0.7) !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
      border-radius: 6px !important;
      padding: 6px 8px !important;
      cursor: pointer !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      transition: all 0.2s ease !important;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3) !important;
      opacity: 0.3 !important;
    }

    .yt-hwv-eye-button:hover {
      opacity: 1 !important;
      background: rgba(0, 0, 0, 1) !important;
      transform: translateX(-50%) scale(1.1) !important;
      box-shadow: 0 4px 8px rgba(0,0,0,0.7) !important;
    }

    .yt-hwv-eye-button svg {
      width: 20px !important;
      height: 20px !important;
      fill: white !important;
      pointer-events: none !important;
    }

    .yt-hwv-eye-button.hidden svg {
      fill: #ff4444 !important;
    }

    .yt-hwv-eye-button.dimmed svg {
      fill: #ffaa00 !important;
    }

    ytd-thumbnail, yt-thumbnail-view-model, #dismissible, #thumbnail-container {
      position: relative !important;
    }
  `;
  document.head.appendChild(style);

  // Inject notification styles for content script
  injectNotificationStyles();
}

function injectNotificationStyles() {
  const notificationStyleId = 'yt-hwv-notification-styles';
  if (document.getElementById(notificationStyleId)) return;

  const notificationStyle = document.createElement('style');
  notificationStyle.id = notificationStyleId;
  notificationStyle.textContent = `
    .yt-hwv-notification-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 999999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 400px;
    }

    .yt-hwv-notification {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 8px;
      background: white;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s ease;
    }

    .yt-hwv-notification.visible {
      opacity: 1;
      transform: translateX(0);
    }

    .yt-hwv-notification.error {
      background: #fee;
      border-left: 4px solid #c00;
      color: #c00;
    }

    .yt-hwv-notification.warning {
      background: #ffc;
      border-left: 4px solid #fa0;
      color: #a60;
    }

    .yt-hwv-notification.success {
      background: #efe;
      border-left: 4px solid #0a0;
      color: #060;
    }

    .yt-hwv-notification.info {
      background: #eef;
      border-left: 4px solid #06c;
      color: #048;
    }

    .notification-icon {
      font-size: 20px;
      font-weight: bold;
    }

    .notification-message {
      flex: 1;
      font-size: 14px;
    }

    .notification-close {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      opacity: 0.6;
      padding: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .notification-close:hover {
      opacity: 1;
    }

    [data-theme="dark"] .yt-hwv-notification {
      background: #333;
      color: #fff;
    }

    [data-theme="dark"] .yt-hwv-notification.error {
      background: #400;
      border-left-color: #f88;
      color: #fcc;
    }

    [data-theme="dark"] .yt-hwv-notification.warning {
      background: #440;
      border-left-color: #fa0;
      color: #ffc;
    }

    [data-theme="dark"] .yt-hwv-notification.success {
      background: #040;
      border-left-color: #0f0;
      color: #cfc;
    }

    [data-theme="dark"] .yt-hwv-notification.info {
      background: #004;
      border-left-color: #09f;
      color: #ccf;
    }
  `;
  document.head.appendChild(notificationStyle);
}
