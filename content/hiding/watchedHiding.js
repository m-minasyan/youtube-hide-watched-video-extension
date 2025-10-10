import { CSS_CLASSES } from '../utils/constants.js';
import { getWatchedState } from '../storage/settings.js';
import { determineYoutubeSection } from '../detection/sectionDetector.js';
import { findWatchedElements } from '../detection/videoDetector.js';
import { removeClassesFromAll } from '../utils/cssHelpers.js';
import { cachedClosest } from '../utils/domCache.js';

export function updateClassOnWatchedItems() {
  removeClassesFromAll(CSS_CLASSES.WATCHED_DIMMED, CSS_CLASSES.WATCHED_HIDDEN);

  if (window.location.href.indexOf('/feed/history') >= 0) return;

  const section = determineYoutubeSection();
  const state = getWatchedState(section) || 'normal';

  if (state === 'normal') return;

  findWatchedElements().forEach((item) => {
    let watchedItem;
    let dimmedItem;

    if (section === 'subscriptions') {
      // Use cached closest for all lookups
      watchedItem = (
        cachedClosest(item, '.ytd-grid-renderer') ||
        cachedClosest(item, '.ytd-item-section-renderer') ||
        cachedClosest(item, '.ytd-rich-grid-row') ||
        cachedClosest(item, '.ytd-rich-grid-renderer') ||
        cachedClosest(item, '#grid-container')
      );

      if (watchedItem?.classList.contains('ytd-item-section-renderer')) {
        cachedClosest(watchedItem, 'ytd-item-section-renderer')?.classList.add(CSS_CLASSES.HIDDEN_ROW_PARENT);
      }
    } else if (section === 'playlist') {
      watchedItem = cachedClosest(item, 'ytd-playlist-video-renderer');
    } else if (section === 'watch') {
      watchedItem = cachedClosest(item, 'ytd-compact-video-renderer');

      if (cachedClosest(watchedItem, 'ytd-compact-autoplay-renderer')) {
        watchedItem = null;
      }

      const watchedItemInPlaylist = cachedClosest(item, 'ytd-playlist-panel-video-renderer');
      if (!watchedItem && watchedItemInPlaylist) {
        dimmedItem = watchedItemInPlaylist;
      }
    } else {
      watchedItem = (
        cachedClosest(item, 'ytd-rich-item-renderer') ||
        cachedClosest(item, 'ytd-video-renderer') ||
        cachedClosest(item, 'ytd-grid-video-renderer') ||
        cachedClosest(item, 'ytm-video-with-context-renderer') ||
        cachedClosest(item, 'ytm-item-section-renderer')
      );
    }

    if (watchedItem) {
      if (state === 'dimmed') {
        watchedItem.classList.add(CSS_CLASSES.WATCHED_DIMMED);
      } else if (state === 'hidden') {
        watchedItem.classList.add(CSS_CLASSES.WATCHED_HIDDEN);
      }
    }

    if (dimmedItem && (state === 'dimmed' || state === 'hidden')) {
      dimmedItem.classList.add(CSS_CLASSES.WATCHED_DIMMED);
    }
  });
}
