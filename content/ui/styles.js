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
}
