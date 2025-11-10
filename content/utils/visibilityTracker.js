import { INTERSECTION_OBSERVER_CONFIG } from './constants.js';
import { logDebug } from '../../shared/logger.js';

// Track visibility state of video containers
const visibleVideos = new Set();
const visibilityCallbacks = new Set();

/**
 * Check if element is visible based on intersection ratio
 * @param {IntersectionObserverEntry} entry
 * @returns {boolean}
 */
function isElementVisible(entry) {
  return entry.isIntersecting &&
         entry.intersectionRatio >= INTERSECTION_OBSERVER_CONFIG.VISIBILITY_THRESHOLD;
}

/**
 * Add callback to be notified when visibility changes
 * @param {Function} callback
 */
export function onVisibilityChange(callback) {
  visibilityCallbacks.add(callback);
  return () => visibilityCallbacks.delete(callback);
}

/**
 * Notify all registered callbacks of visibility change
 * @param {Array<Element>} becameVisible
 * @param {Array<Element>} becameHidden
 */
function notifyVisibilityChange(becameVisible, becameHidden) {
  visibilityCallbacks.forEach(callback => {
    try {
      callback({ becameVisible, becameHidden });
    } catch (error) {
      logDebug('Error in visibility callback:', error);
    }
  });
}

/**
 * Get all currently visible video containers
 * @returns {Set<Element>}
 */
export function getVisibleVideos() {
  return new Set(visibleVideos);
}

/**
 * Check if specific element is currently visible
 * @param {Element} element
 * @returns {boolean}
 */
export function isVideoVisible(element) {
  return visibleVideos.has(element);
}

/**
 * Get count of visible videos
 * @returns {number}
 */
export function getVisibleVideoCount() {
  return visibleVideos.size;
}

/**
 * Mark element as visible
 * @param {Element} element
 */
export function markVisible(element) {
  if (!visibleVideos.has(element)) {
    visibleVideos.add(element);
    return true;
  }
  return false;
}

/**
 * Mark element as hidden
 * @param {Element} element
 */
export function markHidden(element) {
  return visibleVideos.delete(element);
}

/**
 * Clear all visibility tracking
 */
export function clearVisibilityTracking() {
  visibleVideos.clear();
}

/**
 * Process intersection observer entries
 * @param {Array<IntersectionObserverEntry>} entries
 */
export function processIntersectionEntries(entries) {
  // Validate entries parameter
  if (!Array.isArray(entries) || entries.length === 0) {
    return;
  }

  const becameVisible = [];
  const becameHidden = [];

  entries.forEach(entry => {
    const element = entry.target;
    const visible = isElementVisible(entry);

    if (visible && markVisible(element)) {
      becameVisible.push(element);
    } else if (!visible && markHidden(element)) {
      becameHidden.push(element);
    }
  });

  if (becameVisible.length > 0 || becameHidden.length > 0) {
    logDebug(`Visibility changed: +${becameVisible.length} visible, -${becameHidden.length} hidden`);
    notifyVisibilityChange(becameVisible, becameHidden);
  }
}

/**
 * Export for testing
 */
export const __testing__ = {
  isElementVisible,
  notifyVisibilityChange
};
