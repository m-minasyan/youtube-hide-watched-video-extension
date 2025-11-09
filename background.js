import { initializeHiddenVideosService, ensureMessageListenerRegistered } from './background/hiddenVideosService.js';
import { closeDbSync } from './background/indexedDb.js';
import { STORAGE_KEYS, DEFAULT_SETTINGS, SERVICE_WORKER_CONFIG } from './shared/constants.js';
import { ensurePromise, buildDefaultSettings } from './shared/utils.js';
import { processFallbackStorage } from './background/indexedDb.js';
import { getFallbackStats } from './background/quotaManager.js';
import { logError, classifyError, ErrorType } from './shared/errorHandler.js';
import { info, warn, debug } from './shared/logger.js';

// CODE REVIEW FIX (P3-8): Global error handler for unhandled promise rejections
// Catches async errors that escape try-catch blocks to prevent silent failures
self.addEventListener('unhandledrejection', (event) => {
  logError('Background', event.reason, {
    operation: 'unhandledrejection',
    promiseRejection: true,
    fatal: true,
    message: 'Unhandled promise rejection in service worker'
  });
  // Don't call event.preventDefault() - let browser handle it for debugging
});

// CRITICAL: Register message listener IMMEDIATELY at top level (synchronously)
// This must happen before any async operations to avoid race conditions where
// content scripts try to send messages before the listener is registered.
// The listener will handle messages even during initialization by waiting
// for the init to complete internally.
ensureMessageListenerRegistered();

let hiddenVideosInitializationPromise = null;
let fullInitializationPromise = null; // FIXED P1-1: Promise-based approach prevents race condition
let keepAliveStarted = false; // Prevents duplicate keep-alive alarm creation
// FIXED P2-3: Atomic flag to prevent race condition during alarm creation
let createKeepAliveInProgress = false;
let createFallbackProcessingInProgress = false;
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

      // CODE REVIEW FIX (P2-4): Wait for alarm setup with proper error handling
      // SELF-REVIEW FIX: startKeepAlive is critical (MUST succeed), but fallbackProcessing is optional
      // - startKeepAlive: CRITICAL - prevents Service Worker suspension, initialization fails if it fails
      // - startFallbackProcessing: OPTIONAL - retries failed writes, but extension works without it
      await Promise.all([
        startKeepAlive(),  // No .catch() - failure propagates and blocks initialization
        startFallbackProcessing().catch((error) => {
          logError('Background', error, {
            operation: 'startFallbackProcessing',
            message: 'Failed to start fallback processing alarm (non-critical, continuing...)'
          });
          // Don't throw - this alarm is optional
        })
      ]);
    } catch (error) {
      logError('Background', error, {
        operation: 'performFullInitialization',
        trigger,
        message: 'Failed to perform full initialization'
      });

      // FIXED P2-3: Show error badge to user when initialization fails
      // This provides visual feedback that extension is not working correctly
      try {
        chrome.action.setBadgeText({ text: '!' });
        chrome.action.setBadgeBackgroundColor({ color: '#f00' });
        chrome.action.setTitle({
          title: 'YouTube Hide Watched - Initialization Error (click for details)'
        });
      } catch (badgeError) {
        // Badge API might not be available in all contexts
        logError('Background', badgeError, {
          operation: 'setBadge',
          message: 'Failed to set error badge'
        });
      }

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
  // FIXED P2-3: Atomic check-and-set to prevent race condition
  // If another call is creating the alarm, wait for it to complete
  if (createKeepAliveInProgress) {
    debug('[KeepAlive] Alarm creation in progress, waiting...');
    // Wait for in-progress creation (poll every 50ms, max 5 seconds)
    for (let i = 0; i < 100; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      if (!createKeepAliveInProgress) break;
    }
    return;
  }

  // Set atomic flag
  createKeepAliveInProgress = true;

  try {
    // Check if alarm already exists to prevent duplicates after Service Worker restart
    // The in-memory keepAliveStarted flag is not reliable as it resets on SW restart
    const existingAlarm = await chrome.alarms.get(KEEP_ALIVE_ALARM);
    if (existingAlarm) {
      keepAliveStarted = true; // Sync in-memory flag with actual alarm state
      debug('[KeepAlive] Alarm already exists, skipping creation');
      return; // Already exists, prevent duplicate
    }

    // FIXED P1-2: Set flag AFTER successful creation with error handling
    // Use await with Promise wrapper to handle callback-based chrome.alarms API
    await new Promise((resolve, reject) => {
      chrome.alarms.create(KEEP_ALIVE_ALARM, {
        periodInMinutes: SERVICE_WORKER_CONFIG.KEEP_ALIVE_INTERVAL / 60000 // 1 minute (Chrome API minimum)
      }, () => {
        if (chrome.runtime.lastError) {
          // Alarm creation failed - keep flag as false
          keepAliveStarted = false;
          logError('Background', chrome.runtime.lastError, {
            operation: 'startKeepAlive',
            fatal: true,
            message: 'Failed to create keep-alive alarm'
          });
          reject(chrome.runtime.lastError);
        } else {
          // Success - set flag to true only after confirmation
          keepAliveStarted = true;
          resolve();
        }
      });
    });
  } finally {
    // Always clear the in-progress flag
    createKeepAliveInProgress = false;
  }
}

function stopKeepAlive() {
  keepAliveStarted = false;
  chrome.alarms.clear(KEEP_ALIVE_ALARM);
}

// Fallback storage processing
// Periodically processes fallback storage to retry failed quota operations
async function startFallbackProcessing() {
  // FIXED P2-3: Atomic check-and-set to prevent race condition
  if (createFallbackProcessingInProgress) {
    debug('[FallbackProcessing] Alarm creation in progress, waiting...');
    // Wait for in-progress creation
    for (let i = 0; i < 100; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      if (!createFallbackProcessingInProgress) break;
    }
    return;
  }

  createFallbackProcessingInProgress = true;

  try {
    // Check if alarm already exists to prevent duplicates after Service Worker restart
    const existingAlarm = await chrome.alarms.get(FALLBACK_PROCESSING_ALARM);
    if (existingAlarm) {
      debug('[FallbackProcessing] Alarm already exists, skipping creation');
      return; // Already exists, prevent duplicate
    }

    // Check every 5 minutes if there's data in fallback storage
    chrome.alarms.create(FALLBACK_PROCESSING_ALARM, {
      periodInMinutes: 5
    });
  } finally {
    createFallbackProcessingInProgress = false;
  }
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
      info(`Processing ${stats.recordCount} records from fallback storage...`);

      // P1-3 FIX: Add try-catch for processFallbackStorage to prevent unhandled rejection
      try {
        const result = await processFallbackStorage();

        if (result.success && result.processed > 0) {
          info(`Successfully processed ${result.processed} records. ${result.remaining} remaining.`);
        } else if (result.remaining > 0) {
          warn(`Fallback processing incomplete. ${result.remaining} records still pending.`);
        }
      } catch (processingError) {
        logError('Background', processingError, {
          operation: 'processFallbackStorage',
          recordCount: stats.recordCount,
          message: 'Failed to process fallback storage'
        });
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
    // FIXED P1-6: Classify errors to distinguish expected vs unexpected failures
    ensurePromise(chrome.tabs.sendMessage(tabId, { action: 'pageUpdated' })).catch((error) => {
      // Expected errors: tab closed, content script not ready
      const errorType = classifyError(error);
      if (errorType === ErrorType.TRANSIENT || error.message?.includes('Receiving end does not exist')) {
        // Transient errors are expected (tab closed, content script not loaded yet)
        debug('Expected transient error sending pageUpdated:', error.message);
      } else {
        // Unexpected errors should be logged for investigation
        logError('Background', error, {
          operation: 'tabs.sendMessage',
          action: 'pageUpdated',
          tabId,
          unexpected: true
        });
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
