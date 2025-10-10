/**
 * Ensures a value is a Promise.
 * Chrome APIs can return either a Promise or use callbacks.
 */
export function ensurePromise(value) {
  if (value && typeof value.then === 'function') {
    return value;
  }
  return Promise.resolve(value);
}

/**
 * Determines if a video ID belongs to a YouTube Short.
 * Shorts have video IDs shorter than 15 characters.
 */
export function isShorts(videoId) {
  if (!videoId) return false;
  return String(videoId).length < 15;
}

/**
 * Builds the default settings object from constants.
 */
export function buildDefaultSettings(STORAGE_KEYS, DEFAULT_SETTINGS) {
  const defaultData = {
    [STORAGE_KEYS.THRESHOLD]: DEFAULT_SETTINGS.threshold,
    [STORAGE_KEYS.INDIVIDUAL_MODE]: DEFAULT_SETTINGS.individualMode,
    [STORAGE_KEYS.INDIVIDUAL_MODE_ENABLED]: DEFAULT_SETTINGS.individualModeEnabled,
    [STORAGE_KEYS.THEME]: DEFAULT_SETTINGS.theme
  };

  Object.keys(DEFAULT_SETTINGS.states.watched).forEach((section) => {
    defaultData[`${STORAGE_KEYS.WATCHED_STATE}_${section}`] = DEFAULT_SETTINGS.states.watched[section];
  });

  Object.keys(DEFAULT_SETTINGS.states.shorts).forEach((section) => {
    defaultData[`${STORAGE_KEYS.SHORTS_STATE}_${section}`] = DEFAULT_SETTINGS.states.shorts[section];
  });

  return defaultData;
}

/**
 * Queries all YouTube tabs.
 */
export function queryYoutubeTabs() {
  return new Promise((resolve) => {
    chrome.tabs.query({ url: '*://*.youtube.com/*' }, (tabs) => {
      if (chrome.runtime.lastError) {
        resolve([]);
        return;
      }
      resolve(tabs || []);
    });
  });
}
