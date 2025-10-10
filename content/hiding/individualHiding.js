import { CSS_CLASSES, INTERSECTION_OBSERVER_CONFIG } from '../utils/constants.js';
import { logDebug } from '../utils/logger.js';
import { getCachedHiddenVideo, hasCachedVideo } from '../storage/cache.js';
import { fetchHiddenVideoStates } from '../storage/messaging.js';
import { isIndividualModeEnabled } from '../storage/settings.js';
import { collectVisibleVideoIds, findVideoContainers, extractVideoIdFromHref } from '../utils/dom.js';
import { getVisibleVideos, isVideoVisible } from '../utils/visibilityTracker.js';

let individualHidingIteration = 0;
let isInitialLoad = true;

/**
 * Synchronizes container CSS classes with video state
 * Exported so eye button creation can sync state immediately after fetch
 * @param {HTMLElement} container - Video container element
 * @param {string} state - Video state ('normal', 'dimmed', 'hidden')
 */
export function syncIndividualContainerState(container, state) {
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

/**
 * Mark the initial load as complete
 * Exported for testing purposes
 */
export function markInitialLoadComplete() {
  isInitialLoad = false;
}

export async function applyIndividualHiding() {
  if (!isIndividualModeEnabled()) {
    document.querySelectorAll(`.${CSS_CLASSES.INDIVIDUAL_DIMMED}, .${CSS_CLASSES.INDIVIDUAL_HIDDEN}`).forEach((el) => {
      el.classList.remove(CSS_CLASSES.INDIVIDUAL_DIMMED, CSS_CLASSES.INDIVIDUAL_HIDDEN);
    });
    return;
  }

  // Enhanced debug logging
  logDebug('=== applyIndividualHiding called ===');
  logDebug(`Initial load: ${isInitialLoad}`);
  logDebug(`Lazy processing enabled: ${INTERSECTION_OBSERVER_CONFIG.ENABLE_LAZY_PROCESSING}`);
  logDebug(`Visible videos count: ${getVisibleVideos().size}`);

  individualHidingIteration += 1;
  const token = individualHidingIteration;

  let videoIds;

  if (INTERSECTION_OBSERVER_CONFIG.ENABLE_LAZY_PROCESSING && !isInitialLoad) {
    // Lazy processing for subsequent updates (after initial load)
    const visibleContainers = getVisibleVideos();
    const visibleIds = new Set();

    visibleContainers.forEach(container => {
      // Add null check and verify container is still connected to DOM
      if (!container || !container.isConnected) {
        return;
      }

      try {
        const videoId = container.getAttribute('data-ythwv-video-id');
        if (videoId) visibleIds.add(videoId);

        // Also check for links within visible containers
        const links = container.querySelectorAll('a[href*="/watch?v="], a[href*="/shorts/"]');
        links.forEach(link => {
          const href = link.getAttribute('href');
          if (href) {
            const id = extractVideoIdFromHref(href);
            if (id) visibleIds.add(id);
          }
        });
      } catch (error) {
        // Container may have been removed from DOM during iteration
        logDebug('Error processing container in lazy mode:', error);
      }
    });

    videoIds = Array.from(visibleIds);
    logDebug(`Processing ${videoIds.length} visible videos (lazy mode)`);
  } else {
    // Initial load or lazy processing disabled: process ALL videos
    videoIds = collectVisibleVideoIds();
    logDebug(`Processing ${videoIds.length} total videos (${isInitialLoad ? 'initial load' : 'full mode'})`);
  }

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
    // Skip if no cached record - eye button will handle initial fetch and sync
    // This prevents applying stale/incorrect state before cache is populated
    if (!hasCachedVideo(videoId)) {
      return;
    }

    const record = getCachedHiddenVideo(videoId);
    const state = record?.state || 'normal';
    const containers = findVideoContainers(videoId);

    containers.forEach((container) => {
      // On initial load, process all containers
      // After initial load, only process visible containers if lazy processing enabled
      const shouldProcess = !INTERSECTION_OBSERVER_CONFIG.ENABLE_LAZY_PROCESSING ||
                            isInitialLoad ||
                            isVideoVisible(container);

      if (shouldProcess) {
        syncIndividualContainerState(container, state);
      }
    });
  });

  // Mark initial load as complete
  if (isInitialLoad) {
    isInitialLoad = false;
    logDebug('Initial load complete, switching to lazy processing mode');
  }
}
