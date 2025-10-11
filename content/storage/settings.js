import { STORAGE_KEYS } from '../utils/constants.js';
import { logDebug } from '../../shared/logger.js';

let settings = {
  threshold: 10,
  watchedStates: {},
  shortsStates: {},
  individualMode: 'dimmed',
  individualModeEnabled: true
};

export async function loadSettings() {
  const syncResult = await chrome.storage.sync.get(null);
  settings.threshold = syncResult[STORAGE_KEYS.THRESHOLD] || 10;
  settings.individualMode = syncResult[STORAGE_KEYS.INDIVIDUAL_MODE] || 'dimmed';
  settings.individualModeEnabled = syncResult[STORAGE_KEYS.INDIVIDUAL_MODE_ENABLED] !== undefined ?
    syncResult[STORAGE_KEYS.INDIVIDUAL_MODE_ENABLED] : true;
  const sections = ['misc', 'subscriptions', 'channel', 'watch', 'trending', 'playlist'];
  sections.forEach((section) => {
    settings.watchedStates[section] = syncResult[`${STORAGE_KEYS.WATCHED_STATE}_${section}`] || 'normal';
    if (section !== 'playlist') {
      settings.shortsStates[section] = syncResult[`${STORAGE_KEYS.SHORTS_STATE}_${section}`] || 'normal';
    }
  });
  logDebug('Settings loaded');
}

export function getSettings() {
  return settings;
}

export function getThreshold() {
  return settings.threshold;
}

export function getWatchedState(section) {
  return settings.watchedStates[section];
}

export function getShortsState(section) {
  return settings.shortsStates[section];
}

export function getIndividualMode() {
  return settings.individualMode;
}

export function isIndividualModeEnabled() {
  return settings.individualModeEnabled;
}
