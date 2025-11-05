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

// Fallback storage keys
const FALLBACK_STORAGE_KEY = 'YTHWV_FALLBACK_STORAGE';
const QUOTA_EVENTS_KEY = 'YTHWV_QUOTA_EVENTS';
const LAST_NOTIFICATION_KEY = 'YTHWV_LAST_QUOTA_NOTIFICATION';

// Configuration
const CONFIG = {
  // Estimate record size (bytes) - typical video record with metadata
  ESTIMATED_RECORD_SIZE: 200,

  // Safety margin for cleanup (delete 20% more than estimated need)
  CLEANUP_SAFETY_MARGIN: 1.2,

  // Minimum records to delete (avoid too frequent cleanups)
  MIN_CLEANUP_COUNT: 100,

  // Maximum records to delete in one cleanup (prevent excessive deletions)
  MAX_CLEANUP_COUNT: 5000,

  // Maximum records to store in fallback storage
  // INCREASED from 1000 to 5000 to prevent data loss during high-volume operations
  MAX_FALLBACK_RECORDS: 5000,

  // Notification cooldown (5 minutes)
  NOTIFICATION_COOLDOWN_MS: 5 * 60 * 1000,

  // Maximum quota events to log
  MAX_QUOTA_EVENTS: 50,

  // Retry delays (exponential backoff in milliseconds)
  RETRY_DELAYS: [5000, 30000, 120000] // 5s, 30s, 2min
};

/**
 * Estimates the size of data to be stored in bytes
 * @param {Object|Array} data - Data to estimate
 * @returns {number} Estimated size in bytes
 */
function estimateDataSize(data) {
  if (!data) return 0;

  // For arrays, sum individual record sizes
  if (Array.isArray(data)) {
    return data.length * CONFIG.ESTIMATED_RECORD_SIZE;
  }

  // For single record
  return CONFIG.ESTIMATED_RECORD_SIZE;
}

/**
 * Calculates how many records to delete to free up space
 * @param {number} estimatedNeededBytes - Bytes needed for the operation
 * @returns {number} Number of records to delete
 */
function calculateCleanupCount(estimatedNeededBytes) {
  // Calculate records needed with safety margin
  const recordsNeeded = Math.ceil(
    (estimatedNeededBytes / CONFIG.ESTIMATED_RECORD_SIZE) * CONFIG.CLEANUP_SAFETY_MARGIN
  );

  // Apply min/max bounds
  return Math.max(
    CONFIG.MIN_CLEANUP_COUNT,
    Math.min(CONFIG.MAX_CLEANUP_COUNT, recordsNeeded)
  );
}

/**
 * Logs a quota event for monitoring and debugging
 * @param {Object} event - Event details
 */
async function logQuotaEvent(event) {
  try {
    const result = await chrome.storage.local.get(QUOTA_EVENTS_KEY);
    const events = result[QUOTA_EVENTS_KEY] || [];

    // Add timestamp
    event.timestamp = Date.now();

    // Add to events array
    events.push(event);

    // Keep only recent events
    if (events.length > CONFIG.MAX_QUOTA_EVENTS) {
      events.splice(0, events.length - CONFIG.MAX_QUOTA_EVENTS);
    }

    await chrome.storage.local.set({ [QUOTA_EVENTS_KEY]: events });
  } catch (err) {
    // Silently fail - don't want logging to cause more errors
    error('Failed to log quota event:', err);
  }
}

/**
 * Saves failed operation data to fallback storage
 * @param {Array} records - Records that failed to save
 * @returns {Promise<Object>} Result with success status and message
 */
async function saveToFallbackStorage(records) {
  if (!records || records.length === 0) {
    return { success: true, message: 'No records to save' };
  }

  try {
    const result = await chrome.storage.local.get(FALLBACK_STORAGE_KEY);
    const fallbackData = result[FALLBACK_STORAGE_KEY] || [];

    // Add new records
    const newRecords = Array.isArray(records) ? records : [records];
    fallbackData.push(...newRecords);

    // CRITICAL: Limit fallback storage size to prevent unbounded memory growth
    if (fallbackData.length > CONFIG.MAX_FALLBACK_RECORDS) {
      const removed = fallbackData.splice(0, fallbackData.length - CONFIG.MAX_FALLBACK_RECORDS);

      // Log data loss
      await logQuotaEvent({
        type: 'data_loss',
        recordsLost: removed.length,
        reason: 'fallback_storage_full'
      });

      logError('QuotaManager', new Error(`Lost ${removed.length} records - fallback storage full`), {
        recordsLost: removed.length,
        totalInFallback: fallbackData.length
      });

      // CRITICAL NOTIFICATION: Show immediate warning to user about data loss
      // Bypass cooldown for critical data loss events
      await showCriticalNotification({
        title: '⚠️ CRITICAL: Data Loss Detected',
        message: `Lost ${removed.length} video records due to storage overflow. Please export your fallback data immediately and clear old videos in settings.`
      });
    }

    await chrome.storage.local.set({ [FALLBACK_STORAGE_KEY]: fallbackData });

    await logQuotaEvent({
      type: 'fallback_save',
      recordsSaved: newRecords.length,
      totalInFallback: fallbackData.length
    });

    return {
      success: true,
      message: `Saved ${newRecords.length} records to fallback storage`,
      recordsSaved: newRecords.length,
      totalInFallback: fallbackData.length
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
}

/**
 * Retrieves records from fallback storage
 * @param {number} limit - Maximum number of records to retrieve
 * @returns {Promise<Array>} Array of records
 */
export async function getFromFallbackStorage(limit = null) {
  try {
    const result = await chrome.storage.local.get(FALLBACK_STORAGE_KEY);
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
    const result = await chrome.storage.local.get(FALLBACK_STORAGE_KEY);
    const fallbackData = result[FALLBACK_STORAGE_KEY] || [];

    fallbackData.splice(0, count);

    await chrome.storage.local.set({ [FALLBACK_STORAGE_KEY]: fallbackData });

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
    await chrome.storage.local.remove(FALLBACK_STORAGE_KEY);

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
    const result = await chrome.storage.local.get(FALLBACK_STORAGE_KEY);
    const fallbackData = result[FALLBACK_STORAGE_KEY] || [];

    const exportData = {
      exportType: 'fallback_storage',
      exportDate: new Date().toISOString(),
      recordCount: fallbackData.length,
      maxCapacity: CONFIG.MAX_FALLBACK_RECORDS,
      utilizationPercent: (fallbackData.length / CONFIG.MAX_FALLBACK_RECORDS) * 100,
      warning: fallbackData.length >= CONFIG.MAX_FALLBACK_RECORDS * 0.8
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
    const result = await chrome.storage.local.get(FALLBACK_STORAGE_KEY);
    const fallbackData = result[FALLBACK_STORAGE_KEY] || [];

    return {
      recordCount: fallbackData.length,
      maxRecords: CONFIG.MAX_FALLBACK_RECORDS,
      utilizationPercent: (fallbackData.length / CONFIG.MAX_FALLBACK_RECORDS) * 100
    };
  } catch (error) {
    return { recordCount: 0, maxRecords: 0, utilizationPercent: 0 };
  }
}

/**
 * Shows notification to user about quota issue
 * @param {Object} options - Notification options
 */
async function showQuotaNotification(options = {}) {
  try {
    // Check notification cooldown
    const result = await chrome.storage.local.get(LAST_NOTIFICATION_KEY);
    const lastNotification = result[LAST_NOTIFICATION_KEY] || 0;
    const now = Date.now();

    if (now - lastNotification < CONFIG.NOTIFICATION_COOLDOWN_MS) {
      // Skip notification - in cooldown period
      return;
    }

    // Update last notification time
    await chrome.storage.local.set({ [LAST_NOTIFICATION_KEY]: now });

    // Create notification
    const title = options.title || 'YouTube Hide Watched Videos - Storage Warning';
    const message = options.message || 'Storage quota exceeded. Some video data has been moved to temporary storage and will be retried automatically.';

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
      message
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
 * Main quota exceeded handler
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
    const fallbackResult = await saveToFallbackStorage(data);

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
        error: 'Failed to save to fallback storage'
      };
    }

    // Perform cleanup
    try {
      await cleanupFunction(cleanupCount);

      const cleanupTime = Date.now() - startTime;

      await logQuotaEvent({
        type: 'cleanup_success',
        recordsDeleted: cleanupCount,
        cleanupTimeMs: cleanupTime
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
        recommendation: 'retry_operation'
      };
    } catch (cleanupError) {
      logError('QuotaManager', cleanupError, {
        operation: 'cleanup',
        cleanupCount,
        fatal: true
      });

      await logQuotaEvent({
        type: 'cleanup_failed',
        cleanupCount,
        error: cleanupError.message
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
      error: error.message
    };
  }
}

/**
 * Gets quota event history for debugging
 * @returns {Promise<Array>} Array of quota events
 */
export async function getQuotaEvents() {
  try {
    const result = await chrome.storage.local.get(QUOTA_EVENTS_KEY);
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
    await chrome.storage.local.remove(QUOTA_EVENTS_KEY);
  } catch (error) {
    logError('QuotaManager', error, {
      operation: 'clearQuotaEvents',
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
    const [events, fallbackStats] = await Promise.all([
      getQuotaEvents(),
      getFallbackStats()
    ]);

    // Analyze events
    const eventsByType = {};
    let totalCleanups = 0;
    let totalRecordsDeleted = 0;
    let totalDataLoss = 0;

    events.forEach(event => {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;

      if (event.type === 'cleanup_success') {
        totalCleanups++;
        totalRecordsDeleted += event.recordsDeleted || 0;
      }

      if (event.type === 'data_loss') {
        totalDataLoss += event.recordsLost || 0;
      }
    });

    return {
      totalEvents: events.length,
      eventsByType,
      totalCleanups,
      totalRecordsDeleted,
      totalDataLoss,
      fallback: fallbackStats,
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
      fallback: { recordCount: 0, maxRecords: 0, utilizationPercent: 0 },
      lastEvent: null
    };
  }
}
