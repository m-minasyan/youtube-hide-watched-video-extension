import { SELECTORS } from '../utils/constants.js';
import { logDebug } from '../utils/logger.js';
import { cachedDocumentQuery, cachedClosest, cachedQuerySelector } from '../utils/domCache.js';

export function findShortsContainers() {
  const shortsContainers = [];
  const processedContainers = new Set();

  SELECTORS.SHORTS_CONTAINERS.forEach(selector => {
    try {
      // Use cached query
      cachedDocumentQuery(selector).forEach(element => {
        const key = element.tagName + element.className;
        if (!processedContainers.has(key)) {
          processedContainers.add(key);

          // Use cached closest
          const parentShelf = cachedClosest(element, 'ytd-reel-shelf-renderer') ||
                             cachedClosest(element, 'ytd-rich-shelf-renderer') ||
                             cachedClosest(element, 'ytd-rich-section-renderer');

          if (parentShelf && !shortsContainers.includes(parentShelf)) {
            shortsContainers.push(parentShelf);
          } else if (!parentShelf && !shortsContainers.includes(element)) {
            shortsContainers.push(element);
          }
        }
      });
    } catch(e) {
      logDebug(`Selector failed: ${selector}`, e);
    }
  });

  // Use cached queries for additional detection
  const reelItemLinks = cachedDocumentQuery('a.reel-item-endpoint, a[href^="/shorts/"]');
  reelItemLinks.forEach(link => {
    const container = cachedClosest(link, 'ytd-rich-item-renderer') ||
                     cachedClosest(link, 'ytd-video-renderer') ||
                     cachedClosest(link, 'ytd-compact-video-renderer') ||
                     cachedClosest(link, 'ytd-grid-video-renderer');
    if (container && !shortsContainers.includes(container)) {
      shortsContainers.push(container);
    }
  });

  const shortsLabels = cachedDocumentQuery('.ytd-thumbnail-overlay-time-status-renderer[aria-label="Shorts"]');
  shortsLabels.forEach((child) => {
    const container = cachedClosest(child, 'ytd-video-renderer') ||
                     cachedClosest(child, 'ytd-compact-video-renderer') ||
                     cachedClosest(child, 'ytd-grid-video-renderer');
    if (container && !shortsContainers.includes(container)) {
      shortsContainers.push(container);
    }
  });

  const richShelves = cachedDocumentQuery('ytd-rich-shelf-renderer');
  richShelves.forEach(shelf => {
    const hasShorts = cachedQuerySelector(shelf, 'a[href^="/shorts/"]') ||
                     cachedQuerySelector(shelf, '.reel-item-endpoint') ||
                     cachedQuerySelector(shelf, '.shortsLockupViewModelHost');
    if (hasShorts && !shortsContainers.includes(shelf)) {
      shortsContainers.push(shelf);
    }
  });

  logDebug(`Found ${shortsContainers.length} shorts container elements`);

  return shortsContainers;
}
