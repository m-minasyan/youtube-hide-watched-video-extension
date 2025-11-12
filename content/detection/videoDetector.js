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

  // Debug: Log what we found
  logDebug(`[YT-HWV] findWatchedElements: Found ${progressBars.length} progress bar elements`);

  // Log first 10 elements to understand what we're finding
  if (progressBars.length > 0) {
    const samplesToLog = Math.min(progressBars.length, 10);
    logDebug(`[YT-HWV] Logging first ${samplesToLog} progress bar elements:`);

    for (let i = 0; i < samplesToLog; i++) {
      const bar = progressBars[i];
      logDebug(`[YT-HWV] Progress bar ${i}:`, {
        tagName: bar.tagName,
        className: bar.className,
        id: bar.id,
        hasStyleWidth: !!bar.style.width,
        styleWidth: bar.style.width,
        styleWidthParsed: parseInt(bar.style.width, 10),
        hasChildren: bar.children.length,
        hasShadowRoot: !!bar.shadowRoot,
        outerHTML: bar.outerHTML.substring(0, 200)
      });
    }
  }

  const threshold = getThreshold();
  logDebug(`[YT-HWV] Threshold: ${threshold}%`);

  const withThreshold = progressBars.filter((bar) => {
    // First, check if the element itself has style.width
    if (bar.style.width) {
      return parseInt(bar.style.width, 10) >= threshold;
    }

    // If not, try to find the actual progress bar element inside the container
    // This handles cases where the selector returns a container element
    // but the actual progress bar with width is nested inside
    // Use specific known YouTube progress bar selectors in order of reliability
    const progressSelectors =
      '#progress, ' +
      '.ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment, ' +
      '.yt-thumbnail-overlay-resume-playback-renderer-wiz__progress-bar, ' +
      '.progress-bar';

    // Try regular DOM first
    let progressChild = bar.querySelector(progressSelectors);

    // If not found in regular DOM, try Shadow DOM
    // YouTube uses Shadow DOM for some custom elements
    if (!progressChild && bar.shadowRoot) {
      progressChild = bar.shadowRoot.querySelector(progressSelectors);
    }

    if (progressChild) {
      // Check if progress child has style.width
      if (progressChild.style.width) {
        return parseInt(progressChild.style.width, 10) >= threshold;
      }

      // Debug logging when progress element found but no style.width
      logDebug(`[YT-HWV] Progress element found without style.width:`, {
        tagName: progressChild.tagName,
        className: progressChild.className,
        id: progressChild.id,
        style: progressChild.getAttribute('style'),
        parentTagName: bar.tagName
      });
    }

    // No width found
    return false;
  });

  logDebug(`Found ${progressBars.length} watched elements (${withThreshold.length} within threshold)`);

  return withThreshold;
}
