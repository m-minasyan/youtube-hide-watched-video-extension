import { SELECTORS, CSS_CLASSES, SELECTOR_STRINGS } from './constants.js';
import { cachedClosest, cachedQuerySelector, cachedDocumentQuery } from './domCache.js';

export function extractVideoIdFromHref(href) {
  if (!href) return null;
  const watchMatch = href.match(/\/watch\?v=([^&]+)/);
  if (watchMatch) return watchMatch[1];
  const shortsMatch = href.match(/\/shorts\/([^?]+)/);
  if (shortsMatch) return shortsMatch[1];
  return null;
}

export function collectVisibleVideoIds() {
  const ids = new Set();

  cachedDocumentQuery('[data-ythwv-video-id]').forEach((element) => {
    const value = element.getAttribute('data-ythwv-video-id');
    if (value) ids.add(value);
  });

  cachedDocumentQuery('a[href*="/watch?v="], a[href*="/shorts/"]').forEach((link) => {
    const id = extractVideoIdFromHref(link.getAttribute('href'));
    if (id) ids.add(id);
  });

  return Array.from(ids);
}

export function findVideoContainers(videoId) {
  const containers = new Set();

  // Use cached document query for eye buttons
  const buttons = cachedDocumentQuery(`.${CSS_CLASSES.EYE_BUTTON}[data-video-id="${videoId}"]`);
  buttons.forEach((button) => {
    const container = cachedClosest(button, SELECTOR_STRINGS.VIDEO_CONTAINERS);
    if (container) containers.add(container);
  });

  // Use cached document query for video links
  const links = cachedDocumentQuery(`a[href*="/watch?v=${videoId}"], a[href*="/shorts/${videoId}"]`);
  links.forEach((link) => {
    const container = cachedClosest(link, SELECTOR_STRINGS.VIDEO_CONTAINERS);
    if (container) containers.add(container);
  });

  return Array.from(containers);
}

export function extractTitleFromContainer(container) {
  if (!container) return '';

  for (const selector of SELECTORS.TITLE_ELEMENTS) {
    const element = cachedQuerySelector(container, selector);
    if (element && !element.classList.contains(CSS_CLASSES.EYE_BUTTON)) {
      const text = element.getAttribute('title') || element.getAttribute('aria-label') || element.textContent?.trim() || '';
      if (!text) return '';
      if (text.includes(' - ')) {
        return text.split(' - ')[0];
      }
      if (text.includes(' by ')) {
        return text.split(' by ')[0];
      }
      return text;
    }
  }
  return '';
}
