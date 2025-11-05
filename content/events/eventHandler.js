import { logDebug } from '../utils/logger.js';
import { CSS_CLASSES, INTERSECTION_OBSERVER_CONFIG } from '../utils/constants.js';
import { applyCacheUpdate, clearCache } from '../storage/cache.js';
import { loadSettings } from '../storage/settings.js';
import { updateClassOnWatchedItems } from '../hiding/watchedHiding.js';
import { updateClassOnShortsItems } from '../hiding/shortsHiding.js';
import { applyStateToEyeButton } from '../ui/eyeButton.js';
import { addEyeButtons } from '../ui/eyeButtonManager.js';
import { applyIndividualHiding } from '../hiding/individualHiding.js';
import { onVisibilityChange } from '../utils/visibilityTracker.js';

export function handleHiddenVideosEvent(event) {
  if (!event || !event.type) return;
  if (event.type === 'updated' && event.record) {
    applyCacheUpdate(event.record.videoId, event.record);
    // Use programmatic filtering to prevent CSS selector injection
    document.querySelectorAll(`.${CSS_CLASSES.EYE_BUTTON}`).forEach((button) => {
      if (button.dataset.videoId === event.record.videoId) {
        applyStateToEyeButton(button, event.record.state);
      }
    });
    applyIndividualHiding();
    return;
  }
  if (event.type === 'removed' && event.videoId) {
    applyCacheUpdate(event.videoId, null);
    // Use programmatic filtering to prevent CSS selector injection
    document.querySelectorAll(`.${CSS_CLASSES.EYE_BUTTON}`).forEach((button) => {
      if (button.dataset.videoId === event.videoId) {
        applyStateToEyeButton(button, 'normal');
      }
    });
    applyIndividualHiding();
    return;
  }
  if (event.type === 'cleared') {
    clearCache();
    document.querySelectorAll(`.${CSS_CLASSES.EYE_BUTTON}`).forEach((button) => {
      applyStateToEyeButton(button, 'normal');
    });
    applyIndividualHiding();
  }
}

export function applyHiding() {
  logDebug('Applying hiding/dimming');
  updateClassOnWatchedItems();
  updateClassOnShortsItems();
  // Removed setTimeout delay - synchronization now happens in eye button fetch callbacks
  // This improves responsiveness and prevents race condition where container state
  // is applied before cache is populated
  addEyeButtons();
  applyIndividualHiding();
}

// Visibility change handler
let visibilityUnsubscribe = null;

export function setupMessageListener() {
  chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.action === 'settingsUpdated') {
      await loadSettings();
      applyHiding();
    } else if (request.action === 'resetSettings') {
      await loadSettings();
      applyHiding();
    } else if (request.type === 'HIDDEN_VIDEOS_EVENT') {
      handleHiddenVideosEvent(request.event);
    }
  });

  // Listen for custom events from eye buttons
  document.addEventListener('yt-hwv-individual-update', () => {
    applyIndividualHiding();
  });

  // Listen to visibility changes if lazy processing is enabled
  // When ENABLE_LAZY_PROCESSING is false, all videos are processed immediately
  // without visibility tracking, which is the traditional behavior for smaller pages
  if (INTERSECTION_OBSERVER_CONFIG.ENABLE_LAZY_PROCESSING) {
    visibilityUnsubscribe = onVisibilityChange(({ becameVisible, becameHidden }) => {
      if (becameVisible.length > 0) {
        logDebug(`Processing ${becameVisible.length} newly visible videos`);
        // Process videos that just became visible
        applyIndividualHiding();
      }
    });
  } else {
    logDebug('Lazy processing disabled - processing all videos immediately on DOM changes');
  }
}

// Export cleanup function
export function cleanupEventHandlers() {
  if (visibilityUnsubscribe) {
    visibilityUnsubscribe();
    visibilityUnsubscribe = null;
  }
}
