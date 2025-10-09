import { logDebug } from '../utils/logger.js';
import { CSS_CLASSES } from '../utils/constants.js';
import { applyCacheUpdate, clearCache } from '../storage/cache.js';
import { loadSettings } from '../storage/settings.js';
import { updateClassOnWatchedItems } from '../hiding/watchedHiding.js';
import { updateClassOnShortsItems } from '../hiding/shortsHiding.js';
import { applyStateToEyeButton } from '../ui/eyeButton.js';
import { addEyeButtons } from '../ui/eyeButtonManager.js';
import { applyIndividualHiding } from '../hiding/individualHiding.js';

export function handleHiddenVideosEvent(event) {
  if (!event || !event.type) return;
  if (event.type === 'updated' && event.record) {
    applyCacheUpdate(event.record.videoId, event.record);
    document.querySelectorAll(`.${CSS_CLASSES.EYE_BUTTON}[data-video-id="${event.record.videoId}"]`).forEach((button) => {
      applyStateToEyeButton(button, event.record.state);
    });
    applyIndividualHiding();
    return;
  }
  if (event.type === 'removed' && event.videoId) {
    applyCacheUpdate(event.videoId, null);
    document.querySelectorAll(`.${CSS_CLASSES.EYE_BUTTON}[data-video-id="${event.videoId}"]`).forEach((button) => {
      applyStateToEyeButton(button, 'normal');
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
  setTimeout(() => {
    addEyeButtons();
    applyIndividualHiding();
  }, 500);
}

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
}
