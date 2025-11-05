import { initializeHiddenVideosService, ensureMessageListenerRegistered } from './background/hiddenVideosService.js';
import { closeDb } from './background/indexedDb.js';
import { STORAGE_KEYS, DEFAULT_SETTINGS, SERVICE_WORKER_CONFIG } from './shared/constants.js';
import { ensurePromise, buildDefaultSettings } from './shared/utils.js';
import { processFallbackStorage } from './background/indexedDb.js';
import { getFallbackStats } from './background/quotaManager.js';

// CRITICAL: Register message listener IMMEDIATELY at top level (synchronously)
// This must happen before any async operations to avoid race conditions where
// content scripts try to send messages before the listener is registered.
// The listener will handle messages even during initialization by waiting
// for the init to complete internally.
ensureMessageListenerRegistered();

let hiddenVideosInitializationPromise = null;
let keepAliveStarted = false; // Prevents duplicate keep-alive alarm creation
const KEEP_ALIVE_ALARM = 'keep-alive';
const FALLBACK_PROCESSING_ALARM = 'process-fallback-storage';

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
// Chrome enforces a minimum alarm period of 1 minute, so the worker will still
// be suspended between pings (~30s inactivity threshold). This is acceptable
// because the service worker is designed to be ephemeral - all state is persisted
// in IndexedDB and the worker restarts quickly when needed.
function startKeepAlive() {
  if (keepAliveStarted) {
    return; // Already started, prevent duplicate alarms
  }
  keepAliveStarted = true;
  chrome.alarms.create(KEEP_ALIVE_ALARM, {
    periodInMinutes: SERVICE_WORKER_CONFIG.KEEP_ALIVE_INTERVAL / 60000 // 1 minute (Chrome API minimum)
  });
}

function stopKeepAlive() {
  keepAliveStarted = false;
  chrome.alarms.clear(KEEP_ALIVE_ALARM);
}

// Fallback storage processing
// Periodically processes fallback storage to retry failed quota operations
function startFallbackProcessing() {
  // Check every 5 minutes if there's data in fallback storage
  chrome.alarms.create(FALLBACK_PROCESSING_ALARM, {
    periodInMinutes: 5
  });
}

function stopFallbackProcessing() {
  chrome.alarms.clear(FALLBACK_PROCESSING_ALARM);
}

// Handle alarms
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === KEEP_ALIVE_ALARM) {
    // Ping to keep worker alive
    chrome.runtime.getPlatformInfo(() => {
      // No-op, just keep alive
    });
  } else if (alarm.name === FALLBACK_PROCESSING_ALARM) {
    // Process fallback storage
    processFallbackStorageIfNeeded().catch((error) => {
      console.error('Failed to process fallback storage:', error);
    });
  }
});

// Process fallback storage only if there are records waiting
async function processFallbackStorageIfNeeded() {
  try {
    const stats = await getFallbackStats();

    if (stats.recordCount > 0) {
      console.log(`Processing ${stats.recordCount} records from fallback storage...`);

      const result = await processFallbackStorage();

      console.log('Fallback processing result:', result);

      if (result.success && result.processed > 0) {
        console.log(`Successfully processed ${result.processed} records. ${result.remaining} remaining.`);
      } else if (result.remaining > 0) {
        console.log(`Fallback processing incomplete. ${result.remaining} records still pending.`);
      }
    }
  } catch (error) {
    console.error('Error in processFallbackStorageIfNeeded:', error);
  }
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
  initializeHiddenVideos()
    .then(() => {
      startKeepAlive();
      startFallbackProcessing();
    })
    .catch((error) => {
      console.error('Failed to initialize hidden videos service on startup', error);
      // Stop alarms if initialization fails
      stopKeepAlive();
      stopFallbackProcessing();
    });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('youtube.com')) {
    ensurePromise(chrome.tabs.sendMessage(tabId, { action: 'pageUpdated' })).catch(() => {});
  }
});

// Start keep-alive and fallback processing when extension loads
initializeHiddenVideos()
  .then(() => {
    startKeepAlive();
    startFallbackProcessing();
  })
  .catch((error) => {
    console.error('Failed to initialize hidden videos service', error);
    // Stop alarms if they were running from previous session
    stopKeepAlive();
    stopFallbackProcessing();
  });

// Clean up on suspend
chrome.runtime.onSuspend.addListener(async () => {
  stopKeepAlive();
  stopFallbackProcessing();
  // Close IndexedDB connection to prevent blocking on next startup
  await closeDb();
});
