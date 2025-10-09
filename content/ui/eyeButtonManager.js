import { CSS_CLASSES, SELECTORS } from '../utils/constants.js';
import { logDebug } from '../utils/logger.js';
import { getCachedHiddenVideo } from '../storage/cache.js';
import { fetchHiddenVideoStates, setHiddenVideoState } from '../storage/messaging.js';
import { isIndividualModeEnabled } from '../storage/settings.js';
import { extractTitleFromContainer } from '../utils/dom.js';
import { handleAriaHiddenConflicts } from './accessibility.js';
import { createEyeButton } from './eyeButton.js';

async function saveHiddenVideo(videoId, state, title = null) {
  if (!videoId) return null;
  return setHiddenVideoState(videoId, state, title || undefined);
}

export function addEyeButtons() {
  // Check if Individual Mode is enabled
  if (!isIndividualModeEnabled()) {
    // Remove existing eye buttons if Individual Mode is disabled
    const existingButtons = document.querySelectorAll(`.${CSS_CLASSES.EYE_BUTTON}`);
    existingButtons.forEach(button => button.remove());

    const thumbnails = document.querySelectorAll(`.${CSS_CLASSES.HAS_EYE_BUTTON}`);
    thumbnails.forEach(thumbnail => thumbnail.classList.remove(CSS_CLASSES.HAS_EYE_BUTTON));

    return;
  }

  // Support both old and new YouTube elements
  const thumbnails = document.querySelectorAll(SELECTORS.THUMBNAILS.join(', '));

  logDebug('Found thumbnails:', thumbnails.length);

  thumbnails.forEach(thumbnail => {
    const existingButton = thumbnail.querySelector(`.${CSS_CLASSES.EYE_BUTTON}`);
    if (existingButton) return;

    // Find the link that contains the video ID
    const link = thumbnail.closest('a') || thumbnail.querySelector('a');
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
    const parentContainer = thumbnail.closest(SELECTORS.VIDEO_CONTAINERS.join(', '));
    if (parentContainer) {
      parentContainer.setAttribute('data-ythwv-video-id', videoId);
    }
    fetchHiddenVideoStates([videoId]).then(() => {
      const record = getCachedHiddenVideo(videoId);
      if (!record || record.title) return;
      const container = thumbnail.closest(SELECTORS.VIDEO_CONTAINERS.join(', '));
      if (container) {
        container.setAttribute('data-ythwv-video-id', videoId);
      }
      const videoTitle = extractTitleFromContainer(container);
      if (videoTitle && videoTitle !== 'Toggle video visibility') {
        saveHiddenVideo(videoId, record.state, videoTitle);
      }
    }).catch(() => {});
    logDebug('Added eye button to video:', videoId);
  });

  handleAriaHiddenConflicts();
}
