import { initializeHiddenVideosService, ensureMessageListenerRegistered } from './background/hiddenVideosService.js';
import { closeDbSync } from './background/indexedDb.js';
import { STORAGE_KEYS, DEFAULT_SETTINGS, SERVICE_WORKER_CONFIG } from './shared/constants.js';
import { ensurePromise, buildDefaultSettings } from './shared/utils.js';
import { processFallbackStorage } from './background/indexedDb.js';
import { getFallbackStats } from './background/quotaManager.js';
import { logError } from './shared/errorHandler.js';

// CRITICAL: Register message listener IMMEDIATELY at top level (synchronously)
// This must happen before any async operations to avoid race conditions where
// content scripts try to send messages before the listener is registered.
// The listener will handle messages even during initialization by waiting
// for the init to complete internally.
ensureMessageListenerRegistered();

let hiddenVideosInitializationPromise = null;
let fullInitializationPromise = null; // FIXED P1-1: Promise-based approach prevents race condition
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

/**
 * Performs full initialization including alarms
 * FIXED P1-1: Uses Promise-based approach to prevent race conditions during rapid SW restarts
 * Returns the same promise if initialization is already in progress
 */
async function performFullInitialization(trigger = 'unknown') {
  // If initialization is already in progress, return the same promise
  if (fullInitializationPromise) {
    return fullInitializationPromise;
  }

  // Create new initialization promise
  fullInitializationPromise = (async () => {
    try {
      await initializeHiddenVideos();

      // Wait for ALL alarm setup to complete before clearing promise
      // This prevents race condition during rapid SW restart
      await Promise.all([
        startKeepAlive().catch((error) => {
          console.error('Failed to start keep-alive alarm:', error);
        }),
        startFallbackProcessing().catch((error) => {
          console.error('Failed to start fallback processing alarm:', error);
        })
      ]);
    } catch (error) {
      logError('Background', error, {
        operation: 'performFullInitialization',
        trigger,
        message: 'Failed to perform full initialization'
      });
      // Stop alarms if initialization fails
      stopKeepAlive();
      stopFallbackProcessing();
      throw error;
    } finally {
      // FIXED P1-1: Always clear promise in finally block to prevent race condition
      // This ensures cleanup happens after ALL operations complete or fail
      // Critical for Service Worker suspend/resume cycles
      fullInitializationPromise = null;
    }
  })();

  return fullInitializationPromise;
}

// Keep service worker alive during active usage using chrome.alarms API
// Chrome enforces a minimum alarm period of 1 minute, so the worker will still
// be suspended between pings (~30s inactivity threshold). This is acceptable
// because the service worker is designed to be ephemeral - all state is persisted
// in IndexedDB and the worker restarts quickly when needed.
async function startKeepAlive() {
  // Check if alarm already exists to prevent duplicates after Service Worker restart
  // The in-memory keepAliveStarted flag is not reliable as it resets on SW restart
  const existingAlarm = await chrome.alarms.get(KEEP_ALIVE_ALARM);
  if (existingAlarm) {
    keepAliveStarted = true; // Sync in-memory flag with actual alarm state
    return; // Already exists, prevent duplicate
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
async function startFallbackProcessing() {
  // Check if alarm already exists to prevent duplicates after Service Worker restart
  const existingAlarm = await chrome.alarms.get(FALLBACK_PROCESSING_ALARM);
  if (existingAlarm) {
    return; // Already exists, prevent duplicate
  }

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
      logError('Background', error, {
        operation: 'processFallbackStorage',
        alarm: FALLBACK_PROCESSING_ALARM,
        message: 'Failed to process fallback storage'
      });
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
    logError('Background', error, {
      operation: 'processFallbackStorageIfNeeded',
      message: 'Error in processFallbackStorageIfNeeded'
    });
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
    logError('Background', error, {
      operation: 'ensureDefaultSettings',
      reason: details.reason,
      message: 'Failed to set default settings'
    });
  });
});

chrome.runtime.onStartup.addListener(() => {
  performFullInitialization('onStartup');
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('youtube.com')) {
    // FIXED P1-6: Added debug logging instead of empty catch
    ensurePromise(chrome.tabs.sendMessage(tabId, { action: 'pageUpdated' })).catch((error) => {
      // Expected errors: tab closed, content script not ready
      // Only log in development mode to avoid noise
      if (typeof DEBUG !== 'undefined' && DEBUG) {
        console.debug('Failed to send pageUpdated to tab:', tabId, error.message);
      }
    });
  }
});

// Start keep-alive and fallback processing when extension loads
// This handles initial load and service worker restarts
performFullInitialization('extensionLoad');

// Clean up on suspend
// CRITICAL: onSuspend must use SYNCHRONOUS operations only
// Chrome can terminate the service worker before async operations complete,
// which would leave IndexedDB connections open and cause blocking on next startup
chrome.runtime.onSuspend.addListener(() => {
  stopKeepAlive();
  stopFallbackProcessing();
  // Close IndexedDB connection synchronously to prevent blocking on next startup
  // closeDbSync() handles graceful shutdown of active operations
  closeDbSync();
});
