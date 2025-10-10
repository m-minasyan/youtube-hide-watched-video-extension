import { initializeHiddenVideosService } from './background/hiddenVideosService.js';
import { STORAGE_KEYS, DEFAULT_SETTINGS } from './shared/constants.js';
import { ensurePromise, buildDefaultSettings } from './shared/utils.js';

let hiddenVideosInitializationPromise = null;

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
  const defaultData = buildDefaultSettings(STORAGE_KEYS, DEFAULT_SETTINGS);
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
