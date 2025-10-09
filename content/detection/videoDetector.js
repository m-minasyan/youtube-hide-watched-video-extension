import { SELECTORS } from '../utils/constants.js';
import { getThreshold } from '../storage/settings.js';
import { logDebug } from '../utils/logger.js';

export function getVideoId(element) {
  const links = element.querySelectorAll('a[href*="/watch?v="], a[href*="/shorts/"]');
  for (const link of links) {
    const href = link.getAttribute('href');
    if (href) {
      const match = href.match(/\/watch\?v=([^&]+)/);
      if (match) return match[1];

      const shortsMatch = href.match(/\/shorts\/([^?]+)/);
      if (shortsMatch) return shortsMatch[1];
    }
  }
  return null;
}

export function findWatchedElements() {
  const watched = [];
  SELECTORS.PROGRESS_BAR.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      if (!watched.includes(el)) {
        watched.push(el);
      }
    });
  });

  const threshold = getThreshold();
  const withThreshold = watched.filter((bar) => {
    return bar.style.width && parseInt(bar.style.width, 10) >= threshold;
  });

  logDebug(`Found ${watched.length} watched elements (${withThreshold.length} within threshold)`);

  return withThreshold;
}
