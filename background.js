import { initializeHiddenVideosService } from './background/hiddenVideosService.js';
import { STORAGE_KEYS, DEFAULT_SETTINGS } from './shared/constants.js';

let hiddenVideosInitializationPromise = null;

function ensurePromise(value) {
  if (value && typeof value.then === 'function') {
    return value;
  }
  return Promise.resolve(value);
}

async function initializeHiddenVideos() {
  if (!hiddenVideosInitializationPromise) {
    hiddenVideosInitializationPromise = initializeHiddenVideosService().catch((error) => {
      hiddenVideosInitializationPromise = null;
      throw error;
    });
  }
  await hiddenVideosInitializationPromise;
}

export function __getHiddenVideosInitializationPromiseForTests() {
  return hiddenVideosInitializationPromise || Promise.resolve();
}
async function ensureDefaultSettings(details) {
  if (details.reason !== 'install') return;
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
  await chrome.storage.sync.set(defaultData);
}

chrome.runtime.onInstalled.addListener((details) => {
  ensureDefaultSettings(details).catch((error) => {
    console.error('Failed to set default settings', error);
  });
});

chrome.runtime.onStartup.addListener(() => {
  initializeHiddenVideos().catch((error) => {
    console.error('Failed to initialize hidden videos service on startup', error);
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('youtube.com')) {
    ensurePromise(chrome.tabs.sendMessage(tabId, { action: 'pageUpdated' })).catch(() => {});
  }
});

initializeHiddenVideos().catch((error) => {
  console.error('Failed to initialize hidden videos service', error);
});
