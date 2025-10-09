import { SELECTORS } from '../utils/constants.js';
import { logDebug } from '../utils/logger.js';

export function findShortsContainers() {
  const shortsContainers = [];
  const processedContainers = new Set();

  SELECTORS.SHORTS_CONTAINERS.forEach(selector => {
    try {
      document.querySelectorAll(selector).forEach(element => {
        const key = element.tagName + element.className;
        if (!processedContainers.has(key)) {
          processedContainers.add(key);

          const parentShelf = element.closest('ytd-reel-shelf-renderer') ||
                             element.closest('ytd-rich-shelf-renderer') ||
                             element.closest('ytd-rich-section-renderer');

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

  const reelItemLinks = document.querySelectorAll('a.reel-item-endpoint, a[href^="/shorts/"]');
  reelItemLinks.forEach(link => {
    const container = link.closest('ytd-rich-item-renderer') ||
                     link.closest('ytd-video-renderer') ||
                     link.closest('ytd-compact-video-renderer') ||
                     link.closest('ytd-grid-video-renderer');
    if (container && !shortsContainers.includes(container)) {
      shortsContainers.push(container);
    }
  });

  document.querySelectorAll('.ytd-thumbnail-overlay-time-status-renderer[aria-label="Shorts"]').forEach((child) => {
    const container = child.closest('ytd-video-renderer') ||
                     child.closest('ytd-compact-video-renderer') ||
                     child.closest('ytd-grid-video-renderer');
    if (container && !shortsContainers.includes(container)) {
      shortsContainers.push(container);
    }
  });

  const richShelves = document.querySelectorAll('ytd-rich-shelf-renderer');
  richShelves.forEach(shelf => {
    const hasShorts = shelf.querySelector('a[href^="/shorts/"]') ||
                     shelf.querySelector('.reel-item-endpoint') ||
                     shelf.querySelector('.shortsLockupViewModelHost');
    if (hasShorts && !shortsContainers.includes(shelf)) {
      shortsContainers.push(shelf);
    }
  });

  logDebug(`Found ${shortsContainers.length} shorts container elements`);

  return shortsContainers;
}
