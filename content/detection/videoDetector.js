import { SELECTORS } from '../utils/constants.js';
import { getThreshold } from '../storage/settings.js';
import { logDebug } from '../utils/logger.js';
import { extractVideoIdFromHref } from '../utils/dom.js';

export function getVideoId(element) {
  const links = element.querySelectorAll('a[href*="/watch?v="], a[href*="/shorts/"]');
  for (const link of links) {
    const href = link.getAttribute('href');
    const videoId = extractVideoIdFromHref(href);
    if (videoId) return videoId;
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
