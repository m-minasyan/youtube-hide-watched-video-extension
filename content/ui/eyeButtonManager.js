import { CSS_CLASSES, SELECTORS } from '../utils/constants.js';
import { logDebug } from '../utils/logger.js';
import { getCachedHiddenVideo } from '../storage/cache.js';
import { fetchHiddenVideoStates, setHiddenVideoState } from '../storage/messaging.js';
import { isIndividualModeEnabled } from '../storage/settings.js';
import { extractTitleFromContainer } from '../utils/dom.js';
import { handleAriaHiddenConflicts } from './accessibility.js';
import { createEyeButton } from './eyeButton.js';
import { cachedDocumentQuery, cachedClosest, cachedQuerySelector } from '../utils/domCache.js';
import { syncIndividualContainerState } from '../hiding/individualHiding.js';
import { logError } from '../../shared/errorHandler.js';

async function saveHiddenVideo(videoId, state, title = null) {
  if (!videoId) return null;
  return setHiddenVideoState(videoId, state, title || undefined);
}

export function addEyeButtons() {
  // Check if Individual Mode is enabled
  if (!isIndividualModeEnabled()) {
    // Remove existing eye buttons if Individual Mode is disabled
    const existingButtons = cachedDocumentQuery(`.${CSS_CLASSES.EYE_BUTTON}`);
    existingButtons.forEach(button => button.remove());

    const thumbnails = cachedDocumentQuery(`.${CSS_CLASSES.HAS_EYE_BUTTON}`);
    thumbnails.forEach(thumbnail => thumbnail.classList.remove(CSS_CLASSES.HAS_EYE_BUTTON));

    return;
  }

  // Use cached query for thumbnails
  const thumbnails = cachedDocumentQuery(SELECTORS.THUMBNAILS.join(', '));

  logDebug('Found thumbnails:', thumbnails.length);

  thumbnails.forEach(thumbnail => {
    const existingButton = cachedQuerySelector(thumbnail, `.${CSS_CLASSES.EYE_BUTTON}`);
    if (existingButton) return;

    // Use cached closest/querySelector
    const link = cachedClosest(thumbnail, 'a') || cachedQuerySelector(thumbnail, 'a');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;

    // Extract video ID
    let videoId = null;
    const watchMatch = href.match(/\/watch\?v=([^&]+)/);
    const shortsMatch = href.match(/\/shorts\/([^?]+)/);

    if (watchMatch) {
      videoId = watchMatch[1];
    } else if (shortsMatch) {
      videoId = shortsMatch[1];
    }

    if (!videoId) return;

    const eyeButton = createEyeButton(null, videoId);
    if (!eyeButton) return;

    thumbnail.style.position = 'relative';
    thumbnail.appendChild(eyeButton);
    thumbnail.classList.add(CSS_CLASSES.HAS_EYE_BUTTON);
    thumbnail.setAttribute('data-ythwv-video-id', videoId);

    const parentContainer = cachedClosest(thumbnail, SELECTORS.VIDEO_CONTAINERS.join(', '));
    if (parentContainer) {
      parentContainer.setAttribute('data-ythwv-video-id', videoId);
    }

    // Fetch video state and synchronize container CSS classes
    // This prevents a race condition where the eye button shows correct state
    // but the container is not actually hidden/dimmed after page reload
    fetchHiddenVideoStates([videoId]).then(() => {
      const record = getCachedHiddenVideo(videoId);

      // Apply container state immediately after cache update
      // This ensures eye button visual state matches container state
      if (record && parentContainer) {
        syncIndividualContainerState(parentContainer, record.state);
      }

      if (!record || record.title) return;

      const container = cachedClosest(thumbnail, SELECTORS.VIDEO_CONTAINERS.join(', '));
      if (container) {
        container.setAttribute('data-ythwv-video-id', videoId);
      }
      const videoTitle = extractTitleFromContainer(container);
      if (videoTitle && videoTitle !== 'Toggle video visibility') {
        saveHiddenVideo(videoId, record.state, videoTitle);
      }
    }).catch((error) => {
      logError('EyeButtonManager', error, {
        operation: 'fetchHiddenVideoStates',
        videoId
      });
    });

    logDebug('Added eye button to video:', videoId);
  });

  handleAriaHiddenConflicts();
}
