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
  // Search for actual progress bar within container
  const progressBarSelectors = [
    'div[id="progress"]',
    '.yt-thumbnail-overlay-resume-playback-renderer-wiz__progress-bar',
    '.ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment',
    '[class*="progress"][class*="bar"]'
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

  // Method 3: Check computed style (only for elements with percentage-based width)
  try {
    const computedStyle = window.getComputedStyle(element);
    const width = computedStyle.width;
    if (width && width.endsWith('%')) {
      const percentage = parseFloat(width);
      if (!isNaN(percentage) && percentage > 0 && percentage <= 100) {
        return percentage;
      }
    }
  } catch (e) {
    // getComputedStyle failed, continue
  }

  // Method 4: Check aria-valuenow attribute (accessibility)
  const ariaValue = element.getAttribute('aria-valuenow');
  if (ariaValue) {
    const value = parseInt(ariaValue, 10);
    if (!isNaN(value) && value >= 0 && value <= 100) {
      return value;
    }
  }

  // No progress found - return -1 to indicate not watched/no progress bar
  return -1;
}

/**
 * Check if progress bar element is within a video thumbnail/container
 * Prevents false positives from progress bars elsewhere on the page
 * @param {Element} element - Progress bar element
 * @returns {boolean} True if element is part of video thumbnail
 */
function isWithinVideoThumbnail(element) {
  if (!element) return false;

  // Check if element or its parents are within video thumbnail containers
  const videoContainerSelectors = [
    'ytd-rich-item-renderer',
    'ytd-video-renderer',
    'ytd-grid-video-renderer',
    'ytd-compact-video-renderer',
    'ytd-thumbnail',
    'yt-thumbnail-view-model',
    'a[href*="/watch"]',
    'a[href*="/shorts"]'
  ];

  for (const selector of videoContainerSelectors) {
    if (element.closest(selector)) {
      return true;
    }
  }

  return false;
}

export function findWatchedElements() {
  // Use fallback chain for progress bars
  const progressBars = cachedDocumentQueryWithFallback(
    'PROGRESS_BAR',
    SELECTOR_CHAINS.PROGRESS_BAR,
    CACHE_CONFIG.PROGRESS_BAR_TTL
  );

  const threshold = getThreshold();

  // Filter by threshold and validate they're within video thumbnails
  const withThreshold = progressBars.filter((bar) => {
    // First check if it's within a video thumbnail to avoid false positives
    if (!isWithinVideoThumbnail(bar)) {
      logDebug('Progress bar found outside video thumbnail, skipping');
      return false;
    }

    const progress = extractProgressPercentage(bar);
    const meetsThreshold = progress >= 0 && progress >= threshold;

    if (meetsThreshold) {
      logDebug(`Valid watched element found: ${progress}% >= ${threshold}%`);
    }

    return meetsThreshold;
  });

  logDebug(`Found ${progressBars.length} progress bars (${withThreshold.length} valid watched elements within threshold ${threshold}%)`);

  return withThreshold;
}
