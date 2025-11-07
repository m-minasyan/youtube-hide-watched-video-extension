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
 * Wraps a chrome.storage operation with a timeout to prevent indefinite hanging
 * @param {Promise} promise - The chrome.storage promise to wrap
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} operationName - Name of the operation for error messages
 * @returns {Promise} - Promise that rejects if timeout is exceeded
 */
export function withStorageTimeout(promise, timeoutMs, operationName = 'Storage operation') {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      const timeoutId = setTimeout(() => {
        const error = new Error(`${operationName} timeout after ${timeoutMs}ms`);
        error.name = 'StorageTimeoutError';
        error.timeout = true;
        reject(error);
      }, timeoutMs);

      // Clean up timeout if promise resolves first
      promise.finally(() => clearTimeout(timeoutId));
    })
  ]);
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
