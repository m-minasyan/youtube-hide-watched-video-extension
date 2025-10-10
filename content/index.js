import { injectStyles } from './ui/styles.js';
import { loadSettings } from './storage/settings.js';
import { applyHiding, setupMessageListener } from './events/eventHandler.js';
import { setupMutationObserver } from './observers/mutationObserver.js';
import { setupUrlObserver } from './observers/urlObserver.js';
import { setupXhrObserver } from './observers/xhrObserver.js';
import { logDebug } from './utils/logger.js';
import { sendHiddenVideosMessage } from '../shared/messaging.js';
import { HIDDEN_VIDEO_MESSAGES } from '../shared/constants.js';
import { logError } from '../shared/errorHandler.js';
import { showNotification } from '../shared/notifications.js';

/**
 * Wait for background script to be ready
 * Exported for testing purposes
 *
 * @param {number} maxAttempts - Maximum number of health check attempts
 * @param {number} delayMs - Delay between attempts in milliseconds
 * @returns {Promise<boolean>} True if background is ready, false otherwise
 */
export async function waitForBackgroundReady(maxAttempts = 10, delayMs = 500) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const health = await sendHiddenVideosMessage(
        HIDDEN_VIDEO_MESSAGES.HEALTH_CHECK,
        {}
      );

      if (health && health.ready) {
        return true;
      }

      if (health && health.error) {
        logError('ContentInit', new Error('Background initialization error: ' + health.error));
        // Continue waiting, it might recover
      }
    } catch (error) {
      logError('ContentInit', error, {
        attempt,
        maxAttempts,
        message: 'Health check failed, retrying...'
      });
    }

    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return false; // Not ready after max attempts
}

async function init() {
  try {
    const isReady = await waitForBackgroundReady();

    if (!isReady) {
      console.warn('[YT-HWV] Background script not ready, starting with limited functionality. Individual video hiding/dimming may not work until background service is ready.');
      // Continue anyway but with graceful degradation
    }

    try {
      injectStyles();
    } catch (styleError) {
      logError('ContentInit', styleError, { component: 'styles', fatal: true });
      if (typeof document !== 'undefined' && document.body) {
        showNotification('YouTube Hide Watched Videos failed to load styles', 'error', 5000);
      }
      throw styleError;
    }

    await loadSettings();
    applyHiding();

    setupMutationObserver(applyHiding);
    setupXhrObserver(applyHiding);
    setupUrlObserver(applyHiding);
    setupMessageListener();
  } catch (error) {
    logError('ContentInit', error, { fatal: true });
    if (typeof document !== 'undefined' && document.body) {
      showNotification('YouTube Hide Watched Videos extension failed to initialize', 'error', 5000);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

logDebug('YouTube Hide Watched Videos extension loaded');
