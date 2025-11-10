import { debounce } from '../utils/debounce.js';
import { CSS_CLASSES, DEBUG, CACHE_CONFIG } from '../utils/constants.js';
import { invalidateElementCache, invalidateVideoContainerCaches, clearAllCaches, logCacheStats } from '../utils/domCache.js';
import { observeVideoContainers, unobserveVideoContainers } from './intersectionObserver.js';

// FIXED P1-7: Track interval ID for cleanup
let cacheStatsInterval = null;

export function setupMutationObserver(applyHiding) {
  const debouncedApplyHiding = debounce(applyHiding, 250);

  const observer = new MutationObserver((mutations) => {
    let shouldApplyHiding = false;
    let hasVideoContainerChanges = false;
    let hasMajorDOMChanges = false;
    const addedContainers = [];
    const removedContainers = [];

    mutations.forEach(mutation => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'aria-hidden') {
        const target = mutation.target;
        if (target.getAttribute('aria-hidden') === 'true' &&
            target.querySelector(`.${CSS_CLASSES.EYE_BUTTON}`)) {
          target.removeAttribute('aria-hidden');
        }
      } else if (mutation.type === 'childList') {
        shouldApplyHiding = true;

        // Track removed video containers
        mutation.removedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            invalidateElementCache(node);

            // Check if removed node is a video container
            const isVideoContainer = node.matches && (
              node.matches('ytd-rich-item-renderer') ||
              node.matches('ytd-video-renderer') ||
              node.matches('ytd-grid-video-renderer') ||
              node.matches('ytd-compact-video-renderer')
            );

            if (isVideoContainer) {
              hasVideoContainerChanges = true;
              removedContainers.push(node);
            }
          }
        });

        // Track added video containers
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const isVideoContainer = node.matches && (
              node.matches('ytd-rich-item-renderer') ||
              node.matches('ytd-video-renderer') ||
              node.matches('ytd-grid-video-renderer') ||
              node.matches('ytd-compact-video-renderer')
            );

            if (isVideoContainer) {
              hasVideoContainerChanges = true;
              addedContainers.push(node);
            }

            // Check for major structural changes (page sections)
            const isMajorStructure = node.matches && (
              node.matches('ytd-browse') ||
              node.matches('ytd-watch-flexy') ||
              node.matches('ytd-search')
            );

            if (isMajorStructure) {
              hasMajorDOMChanges = true;
            }
          }
        });
      }
    });

    // Update IntersectionObserver tracking
    if (addedContainers.length > 0) {
      observeVideoContainers(addedContainers);
    }
    if (removedContainers.length > 0) {
      unobserveVideoContainers(removedContainers);
    }

    // Granular cache invalidation based on change type
    if (hasMajorDOMChanges) {
      // Major page structure change - clear all caches
      clearAllCaches();
    } else if (hasVideoContainerChanges) {
      // Video container changes - only invalidate video-related caches
      invalidateVideoContainerCaches();
    }

    if (shouldApplyHiding) {
      if (mutations.length === 1 &&
          (mutations[0].target.classList?.contains(CSS_CLASSES.WATCHED_DIMMED) ||
           mutations[0].target.classList?.contains(CSS_CLASSES.WATCHED_HIDDEN) ||
           mutations[0].target.classList?.contains(CSS_CLASSES.SHORTS_DIMMED) ||
           mutations[0].target.classList?.contains(CSS_CLASSES.SHORTS_HIDDEN))) {
        return;
      }
      debouncedApplyHiding();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['aria-hidden']
  });

  // FIXED P1-7: Track interval for cleanup, only start if not already running
  if (DEBUG && !cacheStatsInterval) {
    cacheStatsInterval = setInterval(() => {
      logCacheStats();
    }, CACHE_CONFIG.STATS_LOG_INTERVAL);
  }

  return observer;
}

/**
 * FIXED P1-7: Cleanup function to stop cache stats interval
 * Should be called on navigation/cleanup to prevent memory leaks
 */
export function cleanupMutationObserver() {
  if (cacheStatsInterval) {
    clearInterval(cacheStatsInterval);
    cacheStatsInterval = null;
  }
}
