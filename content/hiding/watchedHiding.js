import { CSS_CLASSES } from '../utils/constants.js';
import { getWatchedState } from '../storage/settings.js';
import { determineYoutubeSection } from '../detection/sectionDetector.js';
import { findWatchedElements } from '../detection/videoDetector.js';
import { removeClassesFromAll } from '../utils/cssHelpers.js';

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
      watchedItem = (
        item.closest('.ytd-grid-renderer') ||
        item.closest('.ytd-item-section-renderer') ||
        item.closest('.ytd-rich-grid-row') ||
        item.closest('.ytd-rich-grid-renderer') ||
        item.closest('#grid-container')
      );

      if (watchedItem?.classList.contains('ytd-item-section-renderer')) {
        watchedItem.closest('ytd-item-section-renderer')?.classList.add(CSS_CLASSES.HIDDEN_ROW_PARENT);
      }
    } else if (section === 'playlist') {
      watchedItem = item.closest('ytd-playlist-video-renderer');
    } else if (section === 'watch') {
      watchedItem = item.closest('ytd-compact-video-renderer');

      if (watchedItem?.closest('ytd-compact-autoplay-renderer')) {
        watchedItem = null;
      }

      const watchedItemInPlaylist = item.closest('ytd-playlist-panel-video-renderer');
      if (!watchedItem && watchedItemInPlaylist) {
        dimmedItem = watchedItemInPlaylist;
      }
    } else {
      watchedItem = (
        item.closest('ytd-rich-item-renderer') ||
        item.closest('ytd-video-renderer') ||
        item.closest('ytd-grid-video-renderer') ||
        item.closest('ytm-video-with-context-renderer') ||
        item.closest('ytm-item-section-renderer')
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
