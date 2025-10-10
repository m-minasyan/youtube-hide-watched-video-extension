import { INTERSECTION_OBSERVER_CONFIG, SELECTOR_STRINGS } from '../utils/constants.js';
import { processIntersectionEntries, clearVisibilityTracking } from '../utils/visibilityTracker.js';
import { debounce } from '../utils/debounce.js';
import { logDebug } from '../utils/logger.js';
import { cachedDocumentQuery } from '../utils/domCache.js';

let intersectionObserver = null;
let debouncedProcessEntries = null;
let batchedEntries = [];

/**
 * Create and configure IntersectionObserver
 * @returns {IntersectionObserver}
 */
function createIntersectionObserver() {
  const options = {
    root: null, // viewport
    rootMargin: INTERSECTION_OBSERVER_CONFIG.ROOT_MARGIN,
    threshold: INTERSECTION_OBSERVER_CONFIG.THRESHOLD
  };

  // Batch process intersection changes
  debouncedProcessEntries = debounce(() => {
    if (batchedEntries.length > 0) {
      processIntersectionEntries([...batchedEntries]);
      batchedEntries.length = 0;
    }
  }, INTERSECTION_OBSERVER_CONFIG.BATCH_DELAY);

  const observer = new IntersectionObserver((entries) => {
    batchedEntries.push(...entries);
    debouncedProcessEntries();
  }, options);

  logDebug('IntersectionObserver created with options:', options);
  return observer;
}

/**
 * Start observing video containers
 * @param {Array<Element>} containers - Optional specific containers to observe
 */
export function observeVideoContainers(containers = null) {
  if (!intersectionObserver) {
    logDebug('No IntersectionObserver instance available');
    return;
  }

  const elementsToObserve = containers || cachedDocumentQuery(SELECTOR_STRINGS.VIDEO_CONTAINERS);

  elementsToObserve.forEach(element => {
    try {
      intersectionObserver.observe(element);
    } catch (error) {
      logDebug('Failed to observe element:', error);
    }
  });

  logDebug(`Observing ${elementsToObserve.length} video containers`);
}

/**
 * Stop observing specific elements
 * @param {Array<Element>} elements
 */
export function unobserveVideoContainers(elements) {
  if (!intersectionObserver) return;

  elements.forEach(element => {
    try {
      intersectionObserver.unobserve(element);
    } catch (error) {
      logDebug('Failed to unobserve element:', error);
    }
  });
}

/**
 * Setup IntersectionObserver for the page
 * Initial observation of all video containers
 */
export function setupIntersectionObserver() {
  if (!INTERSECTION_OBSERVER_CONFIG.ENABLE_LAZY_PROCESSING) {
    logDebug('Lazy processing disabled, skipping IntersectionObserver setup');
    return null;
  }

  // Clear existing observer if any
  disconnectIntersectionObserver();

  // Create new observer
  intersectionObserver = createIntersectionObserver();

  // Observe initial containers
  observeVideoContainers();

  return intersectionObserver;
}

/**
 * Disconnect and cleanup IntersectionObserver
 */
export function disconnectIntersectionObserver() {
  if (intersectionObserver) {
    intersectionObserver.disconnect();
    intersectionObserver = null;
    clearVisibilityTracking();
    logDebug('IntersectionObserver disconnected');
  }

  // Clear pending batched entries to prevent memory leaks
  batchedEntries.length = 0;

  // Cancel any pending debounced calls
  if (debouncedProcessEntries && typeof debouncedProcessEntries.cancel === 'function') {
    debouncedProcessEntries.cancel();
  }
  debouncedProcessEntries = null;
}

/**
 * Get current IntersectionObserver instance
 * @returns {IntersectionObserver|null}
 */
export function getIntersectionObserver() {
  return intersectionObserver;
}

/**
 * Reconnect observer after page navigation
 */
export function reconnectIntersectionObserver() {
  disconnectIntersectionObserver();
  setupIntersectionObserver();
}
