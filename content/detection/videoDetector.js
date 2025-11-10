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

/**
 * Extract progress percentage from a progress bar element or container
 * @param {Element} element - Progress bar element or container
 * @returns {number} Progress percentage (0-100) or -1 if not found
 */
function extractProgressPercentage(element) {
  if (!element) return -1;

  // Method 1: Check inline style width directly
  if (element.style.width) {
    const width = parseInt(element.style.width, 10);
    if (!isNaN(width)) return width;
  }

  // Method 2: Check for child progress bar elements
  const progressBarSelectors = [
    'div[id="progress"]',
    '.yt-thumbnail-overlay-resume-playback-renderer-wiz__progress-bar',
    '.ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment',
    '[class*="progress"][class*="bar"]',
    '[style*="width"]'
  ];

  for (const selector of progressBarSelectors) {
    try {
      const child = element.querySelector(selector);
      if (child && child.style.width) {
        const width = parseInt(child.style.width, 10);
        if (!isNaN(width)) return width;
      }
    } catch (e) {
      // Invalid selector, continue
    }
  }

  // Method 3: Check computed style
  try {
    const computedStyle = window.getComputedStyle(element);
    const width = computedStyle.width;
    if (width && width.endsWith('%')) {
      const percentage = parseFloat(width);
      if (!isNaN(percentage)) return percentage;
    }
  } catch (e) {
    // getComputedStyle failed, continue
  }

  // Method 4: Check aria-valuenow attribute (accessibility)
  const ariaValue = element.getAttribute('aria-valuenow');
  if (ariaValue) {
    const value = parseInt(ariaValue, 10);
    if (!isNaN(value)) return value;
  }

  // Method 5: If we found a container but no width, assume it's watched (any progress = watched)
  // This handles cases where YouTube changed the structure completely
  if (element.tagName && element.tagName.toLowerCase().includes('overlay')) {
    logDebug('Found progress bar container without width, assuming 100% watched');
    return 100;
  }

  return -1;
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
    const progress = extractProgressPercentage(bar);
    return progress >= 0 && progress >= threshold;
  });

  logDebug(`Found ${progressBars.length} watched elements (${withThreshold.length} within threshold ${threshold}%)`);

  return withThreshold;
}
