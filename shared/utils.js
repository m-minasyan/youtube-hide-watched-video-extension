import { debug } from './logger.js';

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
 * Generic timeout wrapper for any promise
 * P1-5 FIX: Exported for use in handleImportRecords and other operations
 * @param {Promise} promise - The promise to wrap
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} operationName - Name of the operation for error messages
 * @returns {Promise} - Promise that rejects if timeout is exceeded
 */
export function withTimeout(promise, timeoutMs, operationName = 'Operation') {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      const timeoutId = setTimeout(() => {
        const error = new Error(`${operationName} timeout after ${timeoutMs}ms`);
        error.name = 'TimeoutError';
        error.timeout = true;
        reject(error);
      }, timeoutMs);

      // Clean up timeout if promise resolves first
      promise.finally(() => clearTimeout(timeoutId));
    })
  ]);
}

/**
 * Wraps a chrome.storage operation with a timeout to prevent indefinite hanging
 * @param {Promise} promise - The chrome.storage promise to wrap
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} operationName - Name of the operation for error messages
 * @returns {Promise} - Promise that rejects if timeout is exceeded
 */
export function withStorageTimeout(promise, timeoutMs, operationName = 'Storage operation') {
  return withTimeout(promise, timeoutMs, operationName);
}

/**
 * Validates that videoId contains only safe characters
 * YouTube video IDs should only contain alphanumeric characters, hyphens, and underscores
 * This prevents potential CSS injection or other security issues
 * @param {string} videoId - Video ID to validate
 * @returns {boolean} - True if videoId is valid, false otherwise
 */
export function isValidVideoId(videoId) {
  if (!videoId || typeof videoId !== 'string') return false;

  // FIXED P2-11: More permissive length validation for compatibility
  // YouTube video IDs are typically 8-15 characters, but allow 6-20 for:
  // - Historical compatibility (older IDs may be shorter)
  // - Future-proofing (YouTube may change ID format)
  // - Shorts IDs can vary (8-11 characters)
  if (videoId.length < 6 || videoId.length > 20) {
    return false;
  }

  // Log unusual lengths for monitoring (typical is 10-15)
  if ((videoId.length < 10 || videoId.length > 15) && typeof debug !== 'undefined') {
    debug('[VideoID] Unusual length:', videoId.length, 'for ID:', videoId);
  }

  // Only allow alphanumeric, hyphen, underscore (prevents injection)
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  return validPattern.test(videoId);
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
