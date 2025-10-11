import { SELECTOR_CHAINS, CACHE_CONFIG } from '../../shared/constants.js';
import { getThreshold } from '../storage/settings.js';
import { logDebug } from '../utils/logger.js';
import { extractVideoIdFromHref } from '../utils/dom.js';
import { cachedDocumentQueryWithFallback, cachedQuerySelectorWithFallback } from '../utils/domCache.js';

export function getVideoId(element) {
  // Use fallback chain for video links
  const videoLink = cachedQuerySelectorWithFallback(
    element,
    'VIDEO_LINK',
    SELECTOR_CHAINS.VIDEO_LINK
  );

  if (videoLink) {
    const href = videoLink.getAttribute('href');
    const videoId = extractVideoIdFromHref(href);
    if (videoId) return videoId;
  }

  // Try shorts link as fallback
  const shortsLink = cachedQuerySelectorWithFallback(
    element,
    'SHORTS_LINK',
    SELECTOR_CHAINS.SHORTS_LINK
  );

  if (shortsLink) {
    const href = shortsLink.getAttribute('href');
    const videoId = extractVideoIdFromHref(href);
    if (videoId) return videoId;
  }

  return null;
}

export function findWatchedElements() {
  // Use fallback chain for progress bars
  const progressBars = cachedDocumentQueryWithFallback(
    'PROGRESS_BAR',
    SELECTOR_CHAINS.PROGRESS_BAR,
    CACHE_CONFIG.PROGRESS_BAR_TTL
  );

  const threshold = getThreshold();
  const withThreshold = progressBars.filter((bar) => {
    return bar.style.width && parseInt(bar.style.width, 10) >= threshold;
  });

  logDebug(`Found ${progressBars.length} watched elements (${withThreshold.length} within threshold)`);

  return withThreshold;
}
