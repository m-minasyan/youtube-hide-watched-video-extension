import { CSS_CLASSES } from '../utils/constants.js';
import { logDebug } from '../utils/logger.js';
import { getCachedHiddenVideo } from '../storage/cache.js';
import { fetchHiddenVideoStates } from '../storage/messaging.js';
import { isIndividualModeEnabled } from '../storage/settings.js';
import { collectVisibleVideoIds, findVideoContainers } from '../utils/dom.js';

let individualHidingIteration = 0;

function syncIndividualContainerState(container, state) {
  if (!container) return;
  const hasDimmed = container.classList.contains(CSS_CLASSES.INDIVIDUAL_DIMMED);
  const hasHidden = container.classList.contains(CSS_CLASSES.INDIVIDUAL_HIDDEN);
  if (state === 'dimmed') {
    if (hasHidden) {
      container.classList.remove(CSS_CLASSES.INDIVIDUAL_HIDDEN);
    }
    if (!hasDimmed) {
      container.classList.add(CSS_CLASSES.INDIVIDUAL_DIMMED);
    }
    return;
  }
  if (state === 'hidden') {
    if (hasDimmed) {
      container.classList.remove(CSS_CLASSES.INDIVIDUAL_DIMMED);
    }
    if (!hasHidden) {
      container.classList.add(CSS_CLASSES.INDIVIDUAL_HIDDEN);
    }
    return;
  }
  if (hasDimmed) {
    container.classList.remove(CSS_CLASSES.INDIVIDUAL_DIMMED);
  }
  if (hasHidden) {
    container.classList.remove(CSS_CLASSES.INDIVIDUAL_HIDDEN);
  }
}

export async function applyIndividualHiding() {
  if (!isIndividualModeEnabled()) {
    document.querySelectorAll(`.${CSS_CLASSES.INDIVIDUAL_DIMMED}, .${CSS_CLASSES.INDIVIDUAL_HIDDEN}`).forEach((el) => {
      el.classList.remove(CSS_CLASSES.INDIVIDUAL_DIMMED, CSS_CLASSES.INDIVIDUAL_HIDDEN);
    });
    return;
  }
  individualHidingIteration += 1;
  const token = individualHidingIteration;
  const videoIds = collectVisibleVideoIds();
  if (videoIds.length === 0) {
    return;
  }
  try {
    await fetchHiddenVideoStates(videoIds);
  } catch (error) {
    logDebug('Failed to fetch hidden video states', error);
    return;
  }
  if (token !== individualHidingIteration) {
    return;
  }
  videoIds.forEach((videoId) => {
    const record = getCachedHiddenVideo(videoId);
    const state = record?.state || 'normal';
    const containers = findVideoContainers(videoId);
    containers.forEach((container) => {
      syncIndividualContainerState(container, state);
    });
  });
}
