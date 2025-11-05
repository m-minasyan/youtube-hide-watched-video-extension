import { initializeHiddenVideosService } from './background/hiddenVideosService.js';
import { closeDb } from './background/indexedDb.js';
import { STORAGE_KEYS, DEFAULT_SETTINGS, SERVICE_WORKER_CONFIG } from './shared/constants.js';
import { ensurePromise, buildDefaultSettings } from './shared/utils.js';

let hiddenVideosInitializationPromise = null;
let keepAliveStarted = false; // Prevents duplicate keep-alive alarm creation
const KEEP_ALIVE_ALARM = 'keep-alive';

async function initializeHiddenVideos() {
  if (!hiddenVideosInitializationPromise) {
    hiddenVideosInitializationPromise = initializeHiddenVideosService().catch((error) => {
      hiddenVideosInitializationPromise = null;
      throw error;
    });
  }
  await hiddenVideosInitializationPromise;
}

// Keep service worker alive during active usage using chrome.alarms API
// This is more efficient than setInterval for service workers
function startKeepAlive() {
  if (keepAliveStarted) {
    return; // Already started, prevent duplicate alarms
  }
  keepAliveStarted = true;
  chrome.alarms.create(KEEP_ALIVE_ALARM, {
    periodInMinutes: SERVICE_WORKER_CONFIG.KEEP_ALIVE_INTERVAL / 60000 // Convert ms to minutes
  });
}

function stopKeepAlive() {
  keepAliveStarted = false;
  chrome.alarms.clear(KEEP_ALIVE_ALARM);
}

// Handle keep-alive alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === KEEP_ALIVE_ALARM) {
    // Ping to keep worker alive
    chrome.runtime.getPlatformInfo(() => {
      // No-op, just keep alive
    });
  }
});

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

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('youtube.com')) {
    ensurePromise(chrome.tabs.sendMessage(tabId, { action: 'pageUpdated' })).catch(() => {});
  }
});

// Start keep-alive when extension loads
initializeHiddenVideos()
  .then(() => {
    startKeepAlive();
  })
  .catch((error) => {
    console.error('Failed to initialize hidden videos service', error);
  });

// Clean up on suspend
chrome.runtime.onSuspend.addListener(async () => {
  stopKeepAlive();
  // Close IndexedDB connection to prevent blocking on next startup
  await closeDb();
});
