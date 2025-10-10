import { SELECTORS, CACHE_CONFIG } from '../utils/constants.js';
import { getThreshold } from '../storage/settings.js';
import { logDebug } from '../utils/logger.js';
import { extractVideoIdFromHref } from '../utils/dom.js';
import { cachedDocumentQuery, cachedQuerySelectorAll } from '../utils/domCache.js';

export function getVideoId(element) {
  // Use cached querySelector for links
  const links = cachedQuerySelectorAll(element, 'a[href*="/watch?v="], a[href*="/shorts/"]');
  for (const link of links) {
    const href = link.getAttribute('href');
    const videoId = extractVideoIdFromHref(href);
    if (videoId) return videoId;
  }
  return null;
}

export function findWatchedElements() {
  const watched = [];
  const seen = new Set();

  SELECTORS.PROGRESS_BAR.forEach(selector => {
    // Use cached query with short TTL for progress bars (they update frequently)
    cachedDocumentQuery(selector, CACHE_CONFIG.PROGRESS_BAR_TTL).forEach(el => {
      if (!seen.has(el)) {
        seen.add(el);
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
