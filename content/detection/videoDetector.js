import { SELECTOR_CHAINS, CACHE_CONFIG } from '../../shared/constants.js';
import { getThreshold } from '../storage/settings.js';
import { logDebug } from '../../shared/logger.js';
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
    // First, check if the element itself has style.width
    if (bar.style.width) {
      return parseInt(bar.style.width, 10) >= threshold;
    }

    // If not, try to find the actual progress bar element inside the container
    // This handles cases where the selector returns a container element
    // but the actual progress bar with width is nested inside
    // Use specific known YouTube progress bar selectors in order of reliability
    const progressChild = bar.querySelector(
      '#progress, ' +
      '.ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment, ' +
      '.yt-thumbnail-overlay-resume-playback-renderer-wiz__progress-bar, ' +
      '.progress-bar'
    );

    if (progressChild && progressChild.style.width) {
      return parseInt(progressChild.style.width, 10) >= threshold;
    }

    // No width found
    return false;
  });

  logDebug(`Found ${progressBars.length} watched elements (${withThreshold.length} within threshold)`);

  return withThreshold;
}
