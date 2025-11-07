/**
 * Quota Manager - Handles IndexedDB quota exceeded errors with data loss prevention
 *
 * Features:
 * - Smart space calculation and progressive cleanup
 * - Fallback storage to chrome.storage.local for critical data
 * - Retry queue for failed operations
 * - User notifications for quota issues
 * - Detailed logging of all quota events
 */

import { logError } from '../shared/errorHandler.js';
import { debug, error, warn, info } from '../shared/logger.js';
import { QUOTA_CONFIG, ERROR_CONFIG } from '../shared/constants.js';
import { withStorageTimeout } from '../shared/utils.js';

// Fallback storage keys
const FALLBACK_STORAGE_KEY = 'YTHWV_FALLBACK_STORAGE';
const QUOTA_EVENTS_KEY = 'YTHWV_QUOTA_EVENTS';
const LAST_NOTIFICATION_KEY = 'YTHWV_LAST_QUOTA_NOTIFICATION';
const NOTIFICATION_BACKOFF_KEY = 'YTHWV_NOTIFICATION_BACKOFF';
const NOTIFICATION_DISABLED_KEY = 'YTHWV_QUOTA_NOTIFICATIONS_DISABLED';

// Local Configuration (quotaManager-specific settings)
// Note: Common quota settings are centralized in QUOTA_CONFIG (shared/constants.js)
const CONFIG = {
  // Notification cooldown with exponential backoff
  // Base cooldown: 15 minutes (initial notification interval)
  // Increased from 5 minutes to reduce notification spam
  BASE_NOTIFICATION_COOLDOWN_MS: 15 * 60 * 1000,

  // Maximum cooldown: 2 hours (prevents indefinite silence)
  MAX_NOTIFICATION_COOLDOWN_MS: 2 * 60 * 60 * 1000,

  // Backoff multiplier: doubles cooldown with each consecutive notification
  NOTIFICATION_BACKOFF_MULTIPLIER: 2,

  // Maximum consecutive notifications: limits spam to 3 notifications max
  // After 3 notifications, no more will be shown until backoff resets
  // Notification times: T+0min, T+15min, T+45min (then silence until 24h stability)
  // Cooldown intervals: 15min, 30min, 60min (time to wait before next notification)
  MAX_CONSECUTIVE_NOTIFICATIONS: 3,

  // Reset threshold: 24 hours without notifications resets backoff
  NOTIFICATION_BACKOFF_RESET_MS: 24 * 60 * 60 * 1000,

  // Retry delays (exponential backoff in milliseconds)
  RETRY_DELAYS: [5000, 30000, 120000] // 5s, 30s, 2min
};

// Multi-tier Fallback Protection Thresholds
const FALLBACK_THRESHOLDS = {
  WARNING: 0.80,      // 80% - aggressive cleanup of main DB
  CRITICAL: 0.90,     // 90% - block new operations + notification
  EMERGENCY: 0.95,    // 95% - emergency export
  MAX: 1.0            // 100% - reject all new records
};

// Protection flags for race conditions and recursion
let fallbackLock = null;
let isCleaningUp = false;

/**
 * Estimates the size of data to be stored in bytes
 * @param {Object|Array} data - Data to estimate
 * @returns {number} Estimated size in bytes
 */
function estimateDataSize(data) {
  if (!data) return 0;

  // For arrays, sum individual record sizes
  if (Array.isArray(data)) {
    return data.length * QUOTA_CONFIG.ESTIMATED_RECORD_SIZE;
  }

  // For single record
  return QUOTA_CONFIG.ESTIMATED_RECORD_SIZE;
}

/**
 * Calculates how many records to delete to free up space
 * @param {number} estimatedNeededBytes - Bytes needed for the operation
 * @returns {number} Number of records to delete
 */
function calculateCleanupCount(estimatedNeededBytes) {
  // Calculate records needed with safety margin
  const recordsNeeded = Math.ceil(
    (estimatedNeededBytes / QUOTA_CONFIG.ESTIMATED_RECORD_SIZE) * QUOTA_CONFIG.CLEANUP_SAFETY_MARGIN
  );

  // Apply min/max bounds
  return Math.max(
    QUOTA_CONFIG.MIN_CLEANUP_COUNT,
    Math.min(QUOTA_CONFIG.MAX_CLEANUP_COUNT, recordsNeeded)
  );
}

/**
 * Checks fallback storage pressure level and determines actions
 * @param {number} currentCount - Current number of records in fallback
 * @returns {Promise<Object>} - Status and recommended actions
 */
async function checkFallbackPressure(currentCount) {
  const utilization = currentCount / QUOTA_CONFIG.MAX_FALLBACK_RECORDS;

  // 🟢 NORMAL: < 80% - all is good
  if (utilization < FALLBACK_THRESHOLDS.WARNING) {
    return {
      level: 'normal',
      action: 'none',
      allowNewRecords: true,
      utilization
    };
  }

  // 🟡 WARNING: 80-90% - aggressive cleanup
  if (utilization < FALLBACK_THRESHOLDS.CRITICAL) {
    await handleFallbackWarning(currentCount);
    return {
      level: 'warning',
      action: 'aggressive_cleanup',
      allowNewRecords: true,
      utilization
    };
  }

  // 🟠 CRITICAL: 90-95% - block new operations
  if (utilization < FALLBACK_THRESHOLDS.EMERGENCY) {
    await handleFallbackCritical(currentCount);
    return {
      level: 'critical',
      action: 'block_operations',
      allowNewRecords: false,
      utilization
    };
  }

  // 🔴 EMERGENCY: 95-100% - emergency export
  if (utilization < FALLBACK_THRESHOLDS.MAX) {
    await handleFallbackEmergency(currentCount);
    return {
      level: 'emergency',
      action: 'emergency_export',
      allowNewRecords: false,
      utilization
    };
  }

  // 🛑 MAX: 100% - reject all
  return {
    level: 'max',
    action: 'reject',
    allowNewRecords: false,
    utilization
  };
}

/**
 * 🟡 WARNING (80%): Aggressive cleanup of main DB
 */
async function handleFallbackWarning(currentCount) {
  try {
    // Delete MUCH more records from main DB
    // Goal: free up space for fallback records
    const aggressiveCleanupCount = Math.max(
      QUOTA_CONFIG.MIN_CLEANUP_COUNT * 5, // Minimum 500 records
      currentCount * 2                     // Or 2x more than in fallback
    );

    logError('QuotaManager', new Error('Fallback WARNING threshold reached'), {
      operation: 'handleFallbackWarning',
      currentCount,
      utilization: `${(currentCount / QUOTA_CONFIG.MAX_FALLBACK_RECORDS * 100).toFixed(1)}%`,
      cleanupTarget: aggressiveCleanupCount
    });

    // Import deleteOldestHiddenVideos dynamically to avoid circular dependency
    const { deleteOldestHiddenVideos } = await import('./indexedDb.js');

    // Delete old records from main DB with recursion protection
    if (!isCleaningUp) {
      await deleteOldestHiddenVideosWithProtection(deleteOldestHiddenVideos, aggressiveCleanupCount);
    }

    // Try to process fallback immediately
    const result = await processFallbackStorageAggressively();

    if (result.success && result.processed > 0) {
      await showQuotaNotification({
        title: 'Storage Optimization',
        message: `Freed space for ${result.processed} pending videos. Deleted ${aggressiveCleanupCount} old records.`
      });
    }

    await logQuotaEvent({
      type: 'fallback_warning_handled',
      currentCount,
      cleanupCount: aggressiveCleanupCount,
      processedFromFallback: result.processed
    });

  } catch (error) {
    logError('QuotaManager', error, {
      operation: 'handleFallbackWarning',
      fatal: true
    });
  }
}

/**
 * 🟠 CRITICAL (90%): Block operations + notification
 */
async function handleFallbackCritical(currentCount) {
  try {
    logError('QuotaManager', new Error('Fallback CRITICAL threshold reached'), {
      operation: 'handleFallbackCritical',
      currentCount,
      utilization: `${(currentCount / QUOTA_CONFIG.MAX_FALLBACK_RECORDS * 100).toFixed(1)}%`
    });

    // Show critical notification
    await showCriticalNotification({
      title: '🔴 CRITICAL: Storage Almost Full',
      message: `Fallback storage at ${(currentCount / QUOTA_CONFIG.MAX_FALLBACK_RECORDS * 100).toFixed(0)}%. New video tracking is temporarily disabled. Please clear old videos in settings immediately.`
    });

    // Last attempt at aggressive cleanup
    const emergencyCleanup = Math.min(
      QUOTA_CONFIG.MAX_CLEANUP_COUNT, // Maximum 5000
      currentCount * 3                 // Or 3x more than in fallback
    );

    const { deleteOldestHiddenVideos } = await import('./indexedDb.js');

    if (!isCleaningUp) {
      await deleteOldestHiddenVideosWithProtection(deleteOldestHiddenVideos, emergencyCleanup);
    }

    await processFallbackStorageAggressively();

    await logQuotaEvent({
      type: 'fallback_critical_handled',
      currentCount,
      emergencyCleanup
    });

  } catch (error) {
    logError('QuotaManager', error, {
      operation: 'handleFallbackCritical',
      fatal: true
    });
  }
}

/**
 * 🔴 EMERGENCY (95%): Auto-export fallback data
 */
async function handleFallbackEmergency(currentCount) {
  try {
    logError('QuotaManager', new Error('Fallback EMERGENCY threshold reached'), {
      operation: 'handleFallbackEmergency',
      currentCount,
      utilization: `${(currentCount / QUOTA_CONFIG.MAX_FALLBACK_RECORDS * 100).toFixed(1)}%`
    });

    // Automatic export of fallback data
    const exportData = await exportFallbackStorage();

    // Save export via chrome.downloads API
    const jsonBlob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(jsonBlob);

    try {
      await chrome.downloads.download({
        url: url,
        filename: `youtube-hidden-videos-emergency-${Date.now()}.json`,
        saveAs: true // Ask user to choose location
      });
    } catch (error) {
      // If downloads API fails, log but continue
      logError('QuotaManager', error, {
        operation: 'emergency_download',
        fatal: false
      });
    }

    // Show notification
    await showCriticalNotification({
      title: '🆘 EMERGENCY: Auto-Export Started',
      message: `Emergency backup created. Fallback storage at ${(currentCount / QUOTA_CONFIG.MAX_FALLBACK_RECORDS * 100).toFixed(0)}%. Save the file and clear old videos immediately.`
    });

    await logQuotaEvent({
      type: 'fallback_emergency_export',
      currentCount,
      recordsExported: exportData.recordCount
    });

  } catch (error) {
    logError('QuotaManager', error, {
      operation: 'handleFallbackEmergency',
      fatal: true
    });
  }
}

/**
 * Aggressively processes fallback storage
 * Tries to process ALL records, ignoring errors
 * @returns {Promise<Object>} Result with processed count
 */
async function processFallbackStorageAggressively() {
  const fallbackRecords = await getFromFallbackStorage();

  if (fallbackRecords.length === 0) {
    return { success: true, processed: 0, remaining: 0 };
  }

  // Process in small batches for better reliability
  const AGGRESSIVE_BATCH_SIZE = 50;
  let processedCount = 0;

  const { upsertHiddenVideos } = await import('./indexedDb.js');

  for (let i = 0; i < fallbackRecords.length; i += AGGRESSIVE_BATCH_SIZE) {
    const batch = fallbackRecords.slice(i, Math.min(i + AGGRESSIVE_BATCH_SIZE, fallbackRecords.length));

    try {
      await upsertHiddenVideos(batch);
      processedCount += batch.length;

      // Remove successfully processed records
      await removeFromFallbackStorage(batch.length);

      // Give browser time to breathe
      await new Promise(resolve => setTimeout(resolve, 10));

    } catch (error) {
      // Ignore errors, continue processing
      logError('QuotaManager', error, {
        operation: 'processFallbackStorageAggressively',
        batchIndex: i,
        continuing: true
      });
    }
  }

  const remaining = fallbackRecords.length - processedCount;

  return {
    success: processedCount > 0,
    processed: processedCount,
    remaining
  };
}

/**
 * Wrapper for deleteOldestHiddenVideos with recursion protection
 */
async function deleteOldestHiddenVideosWithProtection(deleteFunction, count) {
  if (isCleaningUp) {
    warn('QuotaManager', 'Cleanup already in progress, skipping');
    return;
  }

  isCleaningUp = true;
  try {
    await deleteFunction(count);
  } finally {
    isCleaningUp = false;
  }
}

/**
 * Logs a quota event for monitoring and debugging
 * @param {Object} event - Event details
 */
async function logQuotaEvent(event) {
  try {
    const result = await withStorageTimeout(
      chrome.storage.local.get(QUOTA_EVENTS_KEY),
      ERROR_CONFIG.STORAGE_TIMEOUT,
      'chrome.storage.local.get(QUOTA_EVENTS_KEY)'
    );
    const events = result[QUOTA_EVENTS_KEY] || [];

    // Add timestamp
    event.timestamp = Date.now();

    // Add to events array
    events.push(event);

    // Keep only recent events
    if (events.length > QUOTA_CONFIG.MAX_QUOTA_EVENTS) {
      events.splice(0, events.length - QUOTA_CONFIG.MAX_QUOTA_EVENTS);
    }

    await withStorageTimeout(
      chrome.storage.local.set({ [QUOTA_EVENTS_KEY]: events }),
      ERROR_CONFIG.STORAGE_TIMEOUT,
      'chrome.storage.local.set(QUOTA_EVENTS_KEY)'
    );
  } catch (error) {
    // Silently fail - don't want logging to cause more errors
    logError('QuotaManager', error, {
      operation: 'logQuotaEvent',
      eventType: type,
      message: 'Failed to log quota event'
    });
  }
}

/**
 * Saves failed operation data to fallback storage with pressure checking
 * @param {Array} records - Records that failed to save
 * @returns {Promise<Object>} Result with success status and message
 */
async function saveToFallbackStorage(records) {
  if (!records || records.length === 0) {
    return { success: true, message: 'No records to save' };
  }

  // 🔒 Race condition protection - wait for any pending operation
  if (fallbackLock) {
    await fallbackLock;
  }

  // Create new lock promise
  fallbackLock = (async () => {
    try {
      const result = await withStorageTimeout(
        chrome.storage.local.get(FALLBACK_STORAGE_KEY),
        ERROR_CONFIG.STORAGE_TIMEOUT,
        'chrome.storage.local.get(FALLBACK_STORAGE_KEY)'
      );
      const fallbackData = result[FALLBACK_STORAGE_KEY] || [];

      // 🎯 Check pressure BEFORE adding records
      const newRecords = Array.isArray(records) ? records : [records];
      const projectedCount = fallbackData.length + newRecords.length;
      const pressureCheck = await checkFallbackPressure(projectedCount);

      // 🛑 Reject if fallback is too full
      if (!pressureCheck.allowNewRecords) {
        await logQuotaEvent({
          type: 'fallback_rejected',
          currentCount: fallbackData.length,
          attemptedToAdd: newRecords.length,
          reason: pressureCheck.level
        });

        return {
          success: false,
          message: `Fallback storage full (${pressureCheck.level}). Cannot save new records.`,
          rejected: true,
          level: pressureCheck.level,
          currentCount: fallbackData.length
        };
      }

      // ✅ Add records
      fallbackData.push(...newRecords);

      await withStorageTimeout(
        chrome.storage.local.set({ [FALLBACK_STORAGE_KEY]: fallbackData }),
        ERROR_CONFIG.STORAGE_TIMEOUT,
        'chrome.storage.local.set(FALLBACK_STORAGE_KEY)'
      );

      await logQuotaEvent({
        type: 'fallback_save',
        recordsSaved: newRecords.length,
        totalInFallback: fallbackData.length,
        pressureLevel: pressureCheck.level
      });

      return {
        success: true,
        message: `Saved ${newRecords.length} records to fallback storage`,
        recordsSaved: newRecords.length,
        totalInFallback: fallbackData.length,
        pressureLevel: pressureCheck.level
      };

    } catch (error) {
      logError('QuotaManager', error, {
        operation: 'saveToFallbackStorage',
        recordCount: records.length,
        fatal: true
      });

      return {
        success: false,
        message: 'Failed to save to fallback storage',
        error: error.message
      };
    }
  })();

  try {
    return await fallbackLock;
  } finally {
    fallbackLock = null;
  }
}

/**
 * Retrieves records from fallback storage
 * @param {number} limit - Maximum number of records to retrieve
 * @returns {Promise<Array>} Array of records
 */
export async function getFromFallbackStorage(limit = null) {
  try {
    const result = await withStorageTimeout(
      chrome.storage.local.get(FALLBACK_STORAGE_KEY),
      ERROR_CONFIG.STORAGE_TIMEOUT,
      'chrome.storage.local.get(FALLBACK_STORAGE_KEY)'
    );
    const fallbackData = result[FALLBACK_STORAGE_KEY] || [];

    if (limit && limit > 0) {
      return fallbackData.slice(0, limit);
    }

    return fallbackData;
  } catch (error) {
    logError('QuotaManager', error, {
      operation: 'getFromFallbackStorage',
      fatal: false
    });
    return [];
  }
}

/**
 * Removes records from fallback storage after successful retry
 * @param {number} count - Number of records to remove from beginning
 */
export async function removeFromFallbackStorage(count) {
  try {
    const result = await withStorageTimeout(
      chrome.storage.local.get(FALLBACK_STORAGE_KEY),
      ERROR_CONFIG.STORAGE_TIMEOUT,
      'chrome.storage.local.get(FALLBACK_STORAGE_KEY)'
    );
    const fallbackData = result[FALLBACK_STORAGE_KEY] || [];

    fallbackData.splice(0, count);

    await withStorageTimeout(
      chrome.storage.local.set({ [FALLBACK_STORAGE_KEY]: fallbackData }),
      ERROR_CONFIG.STORAGE_TIMEOUT,
      'chrome.storage.local.set(FALLBACK_STORAGE_KEY)'
    );

    await logQuotaEvent({
      type: 'fallback_clear',
      recordsRemoved: count,
      remainingInFallback: fallbackData.length
    });
  } catch (error) {
    logError('QuotaManager', error, {
      operation: 'removeFromFallbackStorage',
      fatal: false
    });
  }
}

/**
 * Clears all fallback storage
 */
export async function clearFallbackStorage() {
  try {
    await withStorageTimeout(
      chrome.storage.local.remove(FALLBACK_STORAGE_KEY),
      ERROR_CONFIG.STORAGE_TIMEOUT,
      'chrome.storage.local.remove(FALLBACK_STORAGE_KEY)'
    );

    await logQuotaEvent({
      type: 'fallback_clear_all'
    });
  } catch (error) {
    logError('QuotaManager', error, {
      operation: 'clearFallbackStorage',
      fatal: false
    });
  }
}

/**
 * Exports fallback storage data for user backup/recovery
 * This allows users to save fallback data before it's lost due to overflow
 * @returns {Promise<Object>} Export data with metadata and records
 */
export async function exportFallbackStorage() {
  try {
    const result = await withStorageTimeout(
      chrome.storage.local.get(FALLBACK_STORAGE_KEY),
      ERROR_CONFIG.STORAGE_TIMEOUT,
      'chrome.storage.local.get(FALLBACK_STORAGE_KEY)'
    );
    const fallbackData = result[FALLBACK_STORAGE_KEY] || [];

    const exportData = {
      exportType: 'fallback_storage',
      exportDate: new Date().toISOString(),
      recordCount: fallbackData.length,
      maxCapacity: QUOTA_CONFIG.MAX_FALLBACK_RECORDS,
      utilizationPercent: (fallbackData.length / QUOTA_CONFIG.MAX_FALLBACK_RECORDS) * 100,
      warning: fallbackData.length >= QUOTA_CONFIG.MAX_FALLBACK_RECORDS * 0.8
        ? 'Fallback storage is at 80%+ capacity. Data loss may occur soon.'
        : null,
      records: fallbackData
    };

    await logQuotaEvent({
      type: 'fallback_export',
      recordCount: fallbackData.length
    });

    return exportData;
  } catch (error) {
    logError('QuotaManager', error, {
      operation: 'exportFallbackStorage',
      fatal: false
    });

    return {
      exportType: 'fallback_storage',
      exportDate: new Date().toISOString(),
      recordCount: 0,
      error: error.message,
      records: []
    };
  }
}

/**
 * Gets fallback storage statistics
 * @returns {Promise<Object>} Statistics object
 */
export async function getFallbackStats() {
  try {
    const result = await withStorageTimeout(
      chrome.storage.local.get(FALLBACK_STORAGE_KEY),
      ERROR_CONFIG.STORAGE_TIMEOUT,
      'chrome.storage.local.get(FALLBACK_STORAGE_KEY)'
    );
    const fallbackData = result[FALLBACK_STORAGE_KEY] || [];

    return {
      recordCount: fallbackData.length,
      maxRecords: QUOTA_CONFIG.MAX_FALLBACK_RECORDS,
      utilizationPercent: (fallbackData.length / QUOTA_CONFIG.MAX_FALLBACK_RECORDS) * 100
    };
  } catch (error) {
    return { recordCount: 0, maxRecords: 0, utilizationPercent: 0 };
  }
}

/**
 * Gets current notification backoff state
 * @returns {Promise<Object>} Backoff state { consecutiveCount, lastNotificationTime }
 */
async function getNotificationBackoff() {
  try {
    const result = await withStorageTimeout(
      chrome.storage.local.get([NOTIFICATION_BACKOFF_KEY, LAST_NOTIFICATION_KEY]),
      ERROR_CONFIG.STORAGE_TIMEOUT,
      'chrome.storage.local.get([NOTIFICATION_BACKOFF_KEY, LAST_NOTIFICATION_KEY])'
    );
    const backoffData = result[NOTIFICATION_BACKOFF_KEY] || { consecutiveCount: 0 };
    const lastNotificationTime = result[LAST_NOTIFICATION_KEY] || 0;

    return {
      consecutiveCount: backoffData.consecutiveCount || 0,
      lastNotificationTime
    };
  } catch (error) {
    return { consecutiveCount: 0, lastNotificationTime: 0 };
  }
}

/**
 * Updates notification backoff state
 * @param {number} consecutiveCount - New consecutive count
 */
async function updateNotificationBackoff(consecutiveCount) {
  try {
    await withStorageTimeout(
      chrome.storage.local.set({
        [NOTIFICATION_BACKOFF_KEY]: { consecutiveCount, updatedAt: Date.now() }
      }),
      ERROR_CONFIG.STORAGE_TIMEOUT,
      'chrome.storage.local.set(NOTIFICATION_BACKOFF_KEY)'
    );
  } catch (error) {
    logError('QuotaManager', error, {
      operation: 'updateNotificationBackoff',
      consecutiveCount,
      message: 'Failed to update notification backoff'
    });
  }
}

/**
 * Calculates current notification cooldown using exponential backoff
 * Formula: min(BASE_COOLDOWN * (MULTIPLIER ^ consecutiveCount), MAX_COOLDOWN)
 * @param {number} consecutiveCount - Number of consecutive notifications
 * @returns {number} Cooldown in milliseconds
 */
function calculateNotificationCooldown(consecutiveCount) {
  const cooldown = CONFIG.BASE_NOTIFICATION_COOLDOWN_MS *
    Math.pow(CONFIG.NOTIFICATION_BACKOFF_MULTIPLIER, consecutiveCount);

  return Math.min(cooldown, CONFIG.MAX_NOTIFICATION_COOLDOWN_MS);
}

/**
 * Resets notification backoff if enough time has passed without issues
 * @param {number} lastNotificationTime - Timestamp of last notification
 * @returns {boolean} Whether backoff was reset
 */
async function maybeResetNotificationBackoff(lastNotificationTime) {
  const now = Date.now();
  const timeSinceLastNotification = now - lastNotificationTime;

  // Reset backoff if no notifications for RESET_MS
  if (timeSinceLastNotification >= CONFIG.NOTIFICATION_BACKOFF_RESET_MS) {
    await updateNotificationBackoff(0);

    await logQuotaEvent({
      type: 'notification_backoff_reset',
      reason: 'stable_period',
      daysSinceLastNotification: Math.floor(timeSinceLastNotification / (24 * 60 * 60 * 1000))
    });

    return true;
  }

  return false;
}

/**
 * Shows notification to user about quota issue with exponential backoff
 * @param {Object} options - Notification options
 */
async function showQuotaNotification(options = {}) {
  try {
    // Check if notifications are disabled by user
    const disabledResult = await withStorageTimeout(
      chrome.storage.local.get(NOTIFICATION_DISABLED_KEY),
      ERROR_CONFIG.STORAGE_TIMEOUT,
      'chrome.storage.local.get(NOTIFICATION_DISABLED_KEY)'
    );
    if (disabledResult[NOTIFICATION_DISABLED_KEY] === true) {
      await logQuotaEvent({
        type: 'notification_suppressed',
        reason: 'disabled_by_user'
      });
      return;
    }

    // Get current backoff state
    const { consecutiveCount, lastNotificationTime } = await getNotificationBackoff();
    const now = Date.now();

    // Check if backoff should be reset (stable for 24h)
    const wasReset = await maybeResetNotificationBackoff(lastNotificationTime);

    // Calculate effective consecutive count after potential reset
    const effectiveCount = wasReset ? 0 : consecutiveCount;

    // Check if we've reached the maximum notification limit
    if (effectiveCount >= CONFIG.MAX_CONSECUTIVE_NOTIFICATIONS) {
      await logQuotaEvent({
        type: 'notification_suppressed',
        reason: 'max_consecutive_limit_reached',
        consecutiveCount: effectiveCount,
        maxLimit: CONFIG.MAX_CONSECUTIVE_NOTIFICATIONS,
        willResetAfter24Hours: true
      });
      return;
    }

    // Calculate current cooldown with exponential backoff
    const currentCooldown = calculateNotificationCooldown(effectiveCount);

    // Check if we're still in cooldown period
    if (lastNotificationTime > 0 && now - lastNotificationTime < currentCooldown) {
      // Skip notification - in cooldown period
      await logQuotaEvent({
        type: 'notification_suppressed',
        reason: 'exponential_backoff_cooldown',
        consecutiveCount: effectiveCount,
        currentCooldownMinutes: Math.round(currentCooldown / 60000),
        timeUntilNextNotificationMinutes: Math.round((currentCooldown - (now - lastNotificationTime)) / 60000)
      });
      return;
    }

    // Update notification state
    const newConsecutiveCount = effectiveCount + 1;
    await updateNotificationBackoff(newConsecutiveCount);
    await withStorageTimeout(
      chrome.storage.local.set({ [LAST_NOTIFICATION_KEY]: now }),
      ERROR_CONFIG.STORAGE_TIMEOUT,
      'chrome.storage.local.set(LAST_NOTIFICATION_KEY)'
    );

    // Create notification
    const title = options.title || 'YouTube Hide Watched Videos - Storage Warning';
    const baseMessage = options.message || 'Storage quota exceeded. Some video data has been moved to temporary storage and will be retried automatically.';

    // Build message with appropriate context
    let message = baseMessage;

    if (newConsecutiveCount === CONFIG.MAX_CONSECUTIVE_NOTIFICATIONS) {
      // This is the final notification before silence
      message = `${baseMessage}\n\n⚠️ Warning ${newConsecutiveCount}/${CONFIG.MAX_CONSECUTIVE_NOTIFICATIONS}: This is the final storage notification. No more warnings will be shown until storage is stable for 24 hours. Please clear old videos in extension settings to prevent data loss.`;
    } else {
      // Calculate next notification interval for user info
      const nextCooldown = calculateNotificationCooldown(newConsecutiveCount);
      const nextCooldownMinutes = Math.round(nextCooldown / 60000);
      const remainingNotifications = CONFIG.MAX_CONSECUTIVE_NOTIFICATIONS - newConsecutiveCount;

      message = `${baseMessage}\n\nWarning ${newConsecutiveCount}/${CONFIG.MAX_CONSECUTIVE_NOTIFICATIONS}: Next notification in ${nextCooldownMinutes} minutes if issue persists (${remainingNotifications} warning${remainingNotifications !== 1 ? 's' : ''} remaining).`;
    }

    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title,
      message,
      priority: 1
    });

    await logQuotaEvent({
      type: 'notification_shown',
      title,
      message,
      consecutiveCount: newConsecutiveCount,
      currentCooldownMinutes: Math.round(currentCooldown / 60000),
      isFinalNotification: newConsecutiveCount === CONFIG.MAX_CONSECUTIVE_NOTIFICATIONS
    });
  } catch (error) {
    logError('QuotaManager', error, {
      operation: 'showQuotaNotification',
      fatal: false
    });
  }
}

/**
 * Shows CRITICAL notification to user (bypasses cooldown)
 * Used for critical issues like data loss that require immediate user attention
 * @param {Object} options - Notification options
 */
async function showCriticalNotification(options = {}) {
  try {
    const title = options.title || 'YouTube Hide Watched Videos - CRITICAL WARNING';
    const message = options.message || 'Critical storage issue detected. Please check extension settings immediately.';

    // CRITICAL notifications always show (no cooldown check)
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title,
      message,
      priority: 2, // Maximum priority
      requireInteraction: true // Force user to dismiss
    });

    await logQuotaEvent({
      type: 'critical_notification_shown',
      title,
      message
    });
  } catch (error) {
    logError('QuotaManager', error, {
      operation: 'showCriticalNotification',
      fatal: false
    });
  }
}

/**
 * Main quota exceeded handler with multi-tier fallback protection
 * @param {Error} error - The quota exceeded error
 * @param {Function} cleanupFunction - Function to delete old records (deleteOldestHiddenVideos)
 * @param {Object} operationContext - Context about the failed operation
 * @returns {Promise<Object>} Result with cleanup stats and recommendations
 */
export async function handleQuotaExceeded(error, cleanupFunction, operationContext = {}) {
  const startTime = Date.now();

  logError('QuotaManager', error, {
    operation: 'handleQuotaExceeded',
    context: operationContext
  });

  try {
    // Extract operation details
    const { data, operationType = 'unknown' } = operationContext;

    // Estimate space needed
    const estimatedBytes = estimateDataSize(data);
    const cleanupCount = calculateCleanupCount(estimatedBytes);

    // Log quota event
    await logQuotaEvent({
      type: 'quota_exceeded',
      operationType,
      dataSize: Array.isArray(data) ? data.length : 1,
      estimatedBytes,
      cleanupCount
    });

    // Save data to fallback storage first (critical - before cleanup)
    // This now includes pressure checking
    const fallbackResult = await saveToFallbackStorage(data);

    // 🛑 If fallback REJECTED the records - DO NOT delete data
    if (!fallbackResult.success && fallbackResult.rejected) {
      // Data NOT saved, DO NOT perform cleanup
      await showCriticalNotification({
        title: '🛑 Storage Full - Operation Blocked',
        message: `Cannot save ${Array.isArray(data) ? data.length : 1} videos. Storage is critically full (${fallbackResult.level}). Clear old videos in settings immediately.`
      });

      return {
        success: false,
        cleanupPerformed: false,
        fallbackSaved: false,
        rejected: true,
        level: fallbackResult.level,
        error: 'Fallback storage full - operation rejected',
        recommendation: 'critical_cleanup_required'
      };
    }

    // If fallback failed for other reasons (not rejection)
    if (!fallbackResult.success) {
      // Critical: couldn't even save to fallback storage
      await showQuotaNotification({
        title: 'Critical Storage Error',
        message: 'Unable to save video data. Please export your data and clear old videos in the extension settings.'
      });

      return {
        success: false,
        cleanupPerformed: false,
        fallbackSaved: false,
        error: 'Failed to save to fallback storage',
        recommendation: 'manual_intervention_required'
      };
    }

    // Perform cleanup with recursion protection
    try {
      // Use protection wrapper for cleanup
      if (!isCleaningUp) {
        isCleaningUp = true;
        try {
          await cleanupFunction(cleanupCount);
        } finally {
          isCleaningUp = false;
        }
      }

      const cleanupTime = Date.now() - startTime;

      await logQuotaEvent({
        type: 'cleanup_success',
        recordsDeleted: cleanupCount,
        cleanupTimeMs: cleanupTime,
        fallbackPressureLevel: fallbackResult.pressureLevel
      });

      // Show notification to user (with cooldown)
      await showQuotaNotification({
        message: `Storage space optimized. Deleted ${cleanupCount} old videos. Your recent data has been preserved.`
      });

      return {
        success: true,
        cleanupPerformed: true,
        recordsDeleted: cleanupCount,
        fallbackSaved: true,
        fallbackRecords: fallbackResult.recordsSaved,
        pressureLevel: fallbackResult.pressureLevel,
        recommendation: 'retry_operation'
      };
    } catch (error) {
      logError('QuotaManager', error, {
        operation: 'cleanup',
        cleanupCount,
        fatal: true
      });

      await logQuotaEvent({
        type: 'cleanup_failed',
        cleanupCount,
        error: error.message
      });

      // Show critical notification
      await showQuotaNotification({
        title: 'Storage Cleanup Failed',
        message: 'Unable to free storage space. Please manually clear old videos in the extension settings.'
      });

      return {
        success: false,
        cleanupPerformed: false,
        fallbackSaved: true,
        fallbackRecords: fallbackResult.recordsSaved,
        pressureLevel: fallbackResult.pressureLevel,
        error: 'Cleanup failed',
        recommendation: 'manual_cleanup_required'
      };
    }
  } catch (error) {
    logError('QuotaManager', error, {
      operation: 'handleQuotaExceeded',
      fatal: true
    });

    return {
      success: false,
      cleanupPerformed: false,
      fallbackSaved: false,
      error: error.message,
      recommendation: 'system_error'
    };
  }
}

/**
 * Gets quota event history for debugging
 * @returns {Promise<Array>} Array of quota events
 */
export async function getQuotaEvents() {
  try {
    const result = await withStorageTimeout(
      chrome.storage.local.get(QUOTA_EVENTS_KEY),
      ERROR_CONFIG.STORAGE_TIMEOUT,
      'chrome.storage.local.get(QUOTA_EVENTS_KEY)'
    );
    return result[QUOTA_EVENTS_KEY] || [];
  } catch (error) {
    return [];
  }
}

/**
 * Clears quota event history
 */
export async function clearQuotaEvents() {
  try {
    await withStorageTimeout(
      chrome.storage.local.remove(QUOTA_EVENTS_KEY),
      ERROR_CONFIG.STORAGE_TIMEOUT,
      'chrome.storage.local.remove(QUOTA_EVENTS_KEY)'
    );
  } catch (error) {
    logError('QuotaManager', error, {
      operation: 'clearQuotaEvents',
      fatal: false
    });
  }
}

/**
 * Gets notification backoff statistics
 * @returns {Promise<Object>} Backoff statistics
 */
export async function getNotificationBackoffStats() {
  try {
    const { consecutiveCount, lastNotificationTime } = await getNotificationBackoff();
    const currentCooldown = calculateNotificationCooldown(consecutiveCount);
    const now = Date.now();
    const timeSinceLastNotification = lastNotificationTime > 0 ? now - lastNotificationTime : 0;
    const timeUntilNextNotification = lastNotificationTime > 0
      ? Math.max(0, currentCooldown - timeSinceLastNotification)
      : 0;

    return {
      consecutiveCount,
      lastNotificationTime,
      lastNotificationDate: lastNotificationTime > 0 ? new Date(lastNotificationTime).toISOString() : null,
      currentCooldownMinutes: Math.round(currentCooldown / 60000),
      timeUntilNextNotificationMinutes: Math.round(timeUntilNextNotification / 60000),
      timeSinceLastNotificationMinutes: Math.round(timeSinceLastNotification / 60000),
      willResetIn24Hours: timeSinceLastNotification > 0 && timeSinceLastNotification < CONFIG.NOTIFICATION_BACKOFF_RESET_MS,
      timeUntilResetHours: Math.max(0, Math.round((CONFIG.NOTIFICATION_BACKOFF_RESET_MS - timeSinceLastNotification) / 3600000)),
      maxConsecutiveNotifications: CONFIG.MAX_CONSECUTIVE_NOTIFICATIONS,
      backoffSchedule: Array.from({ length: CONFIG.MAX_CONSECUTIVE_NOTIFICATIONS }, (_, i) => ({
        notificationNumber: i + 1,
        cooldownMinutes: Math.round(calculateNotificationCooldown(i) / 60000)
      }))
    };
  } catch (error) {
    logError('QuotaManager', error, {
      operation: 'getNotificationBackoffStats',
      fatal: false
    });

    return {
      consecutiveCount: 0,
      lastNotificationTime: 0,
      lastNotificationDate: null,
      currentCooldownMinutes: 15,
      timeUntilNextNotificationMinutes: 0,
      timeSinceLastNotificationMinutes: 0,
      willResetIn24Hours: false,
      timeUntilResetHours: 0,
      backoffSchedule: [],
      maxConsecutiveNotifications: CONFIG.MAX_CONSECUTIVE_NOTIFICATIONS
    };
  }
}

/**
 * Manually resets notification backoff (for testing or user action)
 * @returns {Promise<void>}
 */
export async function resetNotificationBackoff() {
  try {
    await updateNotificationBackoff(0);

    await logQuotaEvent({
      type: 'notification_backoff_reset',
      reason: 'manual_reset'
    });
  } catch (error) {
    logError('QuotaManager', error, {
      operation: 'resetNotificationBackoff',
      fatal: false
    });
  }
}

/**
 * Gets comprehensive quota statistics
 * @returns {Promise<Object>} Statistics object
 */
export async function getQuotaStats() {
  try {
    const [events, fallbackStats, backoffStats] = await Promise.all([
      getQuotaEvents(),
      getFallbackStats(),
      getNotificationBackoffStats()
    ]);

    // Analyze events
    const eventsByType = {};
    let totalCleanups = 0;
    let totalRecordsDeleted = 0;
    let totalDataLoss = 0;
    let totalNotificationsShown = 0;
    let totalNotificationsSuppressed = 0;

    events.forEach(event => {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;

      if (event.type === 'cleanup_success') {
        totalCleanups++;
        totalRecordsDeleted += event.recordsDeleted || 0;
      }

      if (event.type === 'data_loss') {
        totalDataLoss += event.recordsLost || 0;
      }

      if (event.type === 'notification_shown') {
        totalNotificationsShown++;
      }

      if (event.type === 'notification_suppressed') {
        totalNotificationsSuppressed++;
      }
    });

    return {
      totalEvents: events.length,
      eventsByType,
      totalCleanups,
      totalRecordsDeleted,
      totalDataLoss,
      totalNotificationsShown,
      totalNotificationsSuppressed,
      fallback: fallbackStats,
      notificationBackoff: backoffStats,
      lastEvent: events.length > 0 ? events[events.length - 1] : null
    };
  } catch (error) {
    logError('QuotaManager', error, {
      operation: 'getQuotaStats',
      fatal: false
    });

    return {
      totalEvents: 0,
      eventsByType: {},
      totalCleanups: 0,
      totalRecordsDeleted: 0,
      totalDataLoss: 0,
      totalNotificationsShown: 0,
      totalNotificationsSuppressed: 0,
      fallback: { recordCount: 0, maxRecords: 0, utilizationPercent: 0 },
      notificationBackoff: {
        consecutiveCount: 0,
        currentCooldownMinutes: 15,
        backoffSchedule: []
      },
      lastEvent: null
    };
  }
}

/**
 * Sets whether quota notifications are enabled or disabled
 * @param {boolean} enabled - Whether notifications should be enabled
 * @returns {Promise<void>}
 */
export async function setQuotaNotificationsEnabled(enabled) {
  try {
    await withStorageTimeout(
      chrome.storage.local.set({
        [NOTIFICATION_DISABLED_KEY]: !enabled
      }),
      ERROR_CONFIG.STORAGE_TIMEOUT,
      'chrome.storage.local.set(NOTIFICATION_DISABLED_KEY)'
    );

    await logQuotaEvent({
      type: 'notification_preferences_changed',
      enabled,
      changedAt: Date.now()
    });

    info('QuotaManager', `Quota notifications ${enabled ? 'enabled' : 'disabled'}`);
  } catch (error) {
    logError('QuotaManager', error, {
      operation: 'setQuotaNotificationsEnabled',
      fatal: false
    });
  }
}

/**
 * Gets whether quota notifications are currently enabled
 * @returns {Promise<boolean>} Whether notifications are enabled
 */
export async function getQuotaNotificationsEnabled() {
  try {
    const result = await withStorageTimeout(
      chrome.storage.local.get(NOTIFICATION_DISABLED_KEY),
      ERROR_CONFIG.STORAGE_TIMEOUT,
      'chrome.storage.local.get(NOTIFICATION_DISABLED_KEY)'
    );
    // If the key doesn't exist, notifications are enabled by default
    return result[NOTIFICATION_DISABLED_KEY] !== true;
  } catch (error) {
    logError('QuotaManager', error, {
      operation: 'getQuotaNotificationsEnabled',
      fatal: false
    });
    // Default to enabled on error
    return true;
  }
}
