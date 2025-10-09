import { CSS_CLASSES, SELECTORS } from '../utils/constants.js';
import { getCachedHiddenVideo } from '../storage/cache.js';
import { fetchHiddenVideoStates, setHiddenVideoState } from '../storage/messaging.js';
import { getIndividualMode } from '../storage/settings.js';
import { extractTitleFromContainer } from '../utils/dom.js';

export function applyStateToEyeButton(button, state) {
  if (!button) return;
  button.classList.remove('dimmed', 'hidden');
  if (state === 'dimmed') {
    button.classList.add('dimmed');
  } else if (state === 'hidden') {
    button.classList.add('hidden');
  }
}

async function saveHiddenVideo(videoId, state, title = null) {
  if (!videoId) return null;
  return setHiddenVideoState(videoId, state, title || undefined);
}

export function createEyeButton(videoContainer, videoId) {
  if (!videoId) return null;
  const button = document.createElement('button');
  button.className = CSS_CLASSES.EYE_BUTTON;
  button.setAttribute('data-video-id', videoId);
  button.setAttribute('tabindex', '-1');
  button.setAttribute('aria-label', 'Toggle video visibility');
  const cachedRecord = getCachedHiddenVideo(videoId);
  applyStateToEyeButton(button, cachedRecord?.state || 'normal');
  if (!cachedRecord) {
    fetchHiddenVideoStates([videoId]).then(() => {
      const refreshed = getCachedHiddenVideo(videoId);
      applyStateToEyeButton(button, refreshed?.state || 'normal');
    }).catch(() => {});
  }
  button.innerHTML = `
    <svg viewBox="0 0 24 24">
      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
    </svg>
  `;
  button.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const cached = getCachedHiddenVideo(videoId);
    const currentState = cached?.state || 'normal';
    const nextState = currentState === 'normal' ? getIndividualMode() : 'normal';
    const container = button.closest(SELECTORS.VIDEO_CONTAINERS.join(', '));
    if (container) {
      container.setAttribute('data-ythwv-video-id', videoId);
    }
    const title = extractTitleFromContainer(container);
    const record = await saveHiddenVideo(videoId, nextState, title);
    const effectiveState = record ? record.state : 'normal';
    applyStateToEyeButton(button, effectiveState);
    if (container) {
      container.classList.remove(CSS_CLASSES.INDIVIDUAL_DIMMED, CSS_CLASSES.INDIVIDUAL_HIDDEN);
      if (effectiveState === 'dimmed') {
        container.classList.add(CSS_CLASSES.INDIVIDUAL_DIMMED);
      } else if (effectiveState === 'hidden') {
        container.classList.add(CSS_CLASSES.INDIVIDUAL_HIDDEN);
      }
    }
    // Trigger individual hiding update - will be handled by event handler
    const event = new CustomEvent('yt-hwv-individual-update');
    document.dispatchEvent(event);
  });
  return button;
}
