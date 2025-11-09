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
// P3-5 FIX: Removed UI_CONFIG import (AGGRESSIVE_BATCH_SIZE moved to QUOTA_CONFIG)
import { QUOTA_CONFIG, ERROR_CONFIG, UI_TIMING, VALIDATION_LIMITS } from '../shared/constants.js';
import { withStorageTimeout } from '../shared/utils.js';
// FIXED P2-1: Import deleteOldestHiddenVideos and upsertHiddenVideos at top level
// Previously these were dynamically imported 3 times, causing code duplication
import { deleteOldestHiddenVideos, upsertHiddenVideos } from './indexedDb.js';

// Fallback storage keys
const FALLBACK_STORAGE_KEY = 'YTHWV_FALLBACK_STORAGE';
const EMERGENCY_BACKUP_KEY = 'YTHWV_EMERGENCY_BACKUP'; // FIXED P1-2: Third-tier emergency storage
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
  RETRY_DELAYS: [5000, 30000, 120000], // 5s, 30s, 2min

  // FIXED P2-4: Global rate limiting to prevent notification spam
  // Maximum notifications per minute (across ALL types)
  GLOBAL_NOTIFICATION_LIMIT: 3,
  GLOBAL_NOTIFICATION_WINDOW_MS: 60 * 1000 // 1 minute
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

// CODE REVIEW FIX (P1-4): Global lock for quota handling to prevent concurrent cleanup
// Prevents race condition where multiple transactions hit quota simultaneously and
// both call deleteOldestHiddenVideos, resulting in excessive data deletion
// SELF-REVIEW FIX: Store result WITH the lock to prevent result overwrite race condition
let quotaHandlingLock = null; // Stores { promise, result } object

// FIXED P2-4: Global notification rate limiter
// Tracks timestamps of recent notifications across all types
const globalNotificationTimestamps = [];

// FIXED P3-8: Per-type notification cooldown to prevent spam of same notification type
// Maps notification type to last shown timestamp
// CODE REVIEW FIX (P2-1): Enhanced with time-based cleanup to prevent unbounded growth
// 2ND SELF-REVIEW FIX: Use constants from VALIDATION_LIMITS to avoid duplication
const lastNotificationByType = new Map();
const PER_TYPE_COOLDOWN_MS = 60000; // 1 minute cooldown per type (not in VALIDATION_LIMITS - not security-critical)

/**
 * CODE REVIEW FIX (P2-1): Cleans up old notification type entries to prevent Map growth
 * Removes entries older than VALIDATION_LIMITS.PER_TYPE_CLEANUP_WINDOW_MS (5 minutes)
 * This prevents unbounded Map growth when notification types are dynamic
 */
function cleanupOldNotificationTypes() {
  const now = Date.now();
  const cutoff = now - VALIDATION_LIMITS.PER_TYPE_CLEANUP_WINDOW_MS;

  for (const [type, timestamp] of lastNotificationByType.entries()) {
    if (timestamp < cutoff) {
      lastNotificationByType.delete(type);
    }
  }
}

// Recursion depth tracking to prevent infinite loops
// Tracks depth of quota-related operations (cleanup, fallback processing, etc.)
let quotaOperationDepth = 0;
// FIXED P2-1: Increased from 3 to 5 for complex quota scenarios with multiple retry layers
const MAX_QUOTA_OPERATION_DEPTH = 5; // Maximum recursion depth for quota operations

// FIXED P2-1: Separate depth tracking for fallback processing to prevent oscillation loops
let fallbackProcessingDepth = 0;
const MAX_FALLBACK_PROCESSING_DEPTH = 2; // Maximum depth for fallback warning/critical handlers

/**
 * FIXED P2-4: Global notification rate limiter
 * Checks if notification can be shown based on global rate limit
 * @returns {boolean} - Whether notification can be shown
 */
function canShowGlobalNotification() {
  const now = Date.now();

  // Remove timestamps outside the window
  while (globalNotificationTimestamps.length > 0 &&
         now - globalNotificationTimestamps[0] > CONFIG.GLOBAL_NOTIFICATION_WINDOW_MS) {
    globalNotificationTimestamps.shift();
  }

  // Check if under limit
  return globalNotificationTimestamps.length < CONFIG.GLOBAL_NOTIFICATION_LIMIT;
}

/**
 * Records a notification timestamp for rate limiting
 * Limits array size to prevent unbounded growth
 *
 * CODE REVIEW FIX (P1-1): Enhanced memory leak prevention
 * - Aggressive cleanup of expired entries
 * - Hard cap at 50 entries (was 100) to reduce memory footprint
 * - Double window cleanup (2x GLOBAL_NOTIFICATION_WINDOW_MS) for safety
 */
function recordGlobalNotification() {
  const now = Date.now();

  // Aggressive cleanup: Remove all entries older than 2x the notification window
  // This ensures cleanup happens even if notifications are very frequent
  const cleanupWindow = CONFIG.GLOBAL_NOTIFICATION_WINDOW_MS * 2;
  while (globalNotificationTimestamps.length > 0 &&
         now - globalNotificationTimestamps[0] > cleanupWindow) {
    globalNotificationTimestamps.shift();
  }

  // SELF-REVIEW FIX: Use constant from VALIDATION_LIMITS instead of hardcoded value
  // Stricter cap at 50 entries (reduced from 100) to minimize memory usage
  // Even with aggressive spam, 50 entries = 50 * 8 bytes = 400 bytes maximum
  if (globalNotificationTimestamps.length >= VALIDATION_LIMITS.MAX_NOTIFICATION_ENTRIES) {
    // Remove oldest 25% of entries to avoid frequent cleanup operations
    const removeCount = Math.ceil(VALIDATION_LIMITS.MAX_NOTIFICATION_ENTRIES * 0.25);
    globalNotificationTimestamps.splice(0, removeCount);
  }

  globalNotificationTimestamps.push(now);
}

/**
 * Tracks quota operation depth to prevent infinite recursion
 * @param {Function} fn - Function to execute
 * @param {string} operationName - Name of operation for logging
 * @returns {Promise<any>} - Result of function
 */
async function withQuotaDepthTracking(fn, operationName = 'quota_operation') {
  // Check recursion depth before incrementing
  if (quotaOperationDepth >= MAX_QUOTA_OPERATION_DEPTH) {
    logError('QuotaManager', new Error(`Maximum quota operation depth exceeded: ${quotaOperationDepth}`), {
      operation: operationName,
      depth: quotaOperationDepth,
      maxDepth: MAX_QUOTA_OPERATION_DEPTH,
      preventingRecursion: true
    });
    throw new Error(`Quota operation depth limit exceeded (${quotaOperationDepth}/${MAX_QUOTA_OPERATION_DEPTH})`);
  }

  // FIXED P2-4: Monitor and warn when approaching maximum depth
  // This early warning helps detect potential infinite recursion before it happens
  if (quotaOperationDepth >= MAX_QUOTA_OPERATION_DEPTH - 1) {
    warn('[QuotaManager] Approaching maximum recursion depth', {
      operation: operationName,
      currentDepth: quotaOperationDepth,
      maxDepth: MAX_QUOTA_OPERATION_DEPTH,
      stack: new Error().stack
    });
  }

  quotaOperationDepth++;
  try {
    return await fn();
  } finally {
    quotaOperationDepth = Math.max(0, quotaOperationDepth - 1);
  }
}

/**
 * FIXED P2-6: Estimates the size of data with input validation
 * Prevents overflow and malicious inputs from causing incorrect cleanup
 * @param {Object|Array} data - Data to estimate
 * @returns {number} Estimated size in bytes
 */
function estimateDataSize(data) {
  if (!data) return 0;

  // For arrays, sum individual record sizes
  if (Array.isArray(data)) {
    // FIXED P2-6: Validate array size to prevent overflow/malicious input
    if (data.length > 100000) {
      warn('[QuotaManager] Suspicious large array detected in estimateDataSize', { length: data.length });
      // Cap estimate at 100k records to prevent overflow
      return 100000 * QUOTA_CONFIG.ESTIMATED_RECORD_SIZE;
    }

    return data.length * QUOTA_CONFIG.ESTIMATED_RECORD_SIZE;
  }

  // For single record
  return QUOTA_CONFIG.ESTIMATED_RECORD_SIZE;
}

/**
 * FIXED P2-6: Calculates cleanup count with input validation
 * Prevents infinity, NaN, and overflow from causing incorrect behavior
 * @param {number} estimatedNeededBytes - Bytes needed for the operation
 * @returns {number} Number of records to delete
 */
function calculateCleanupCount(estimatedNeededBytes) {
  // FIXED P2-6: Validate input to prevent infinity/NaN/overflow
  if (!Number.isFinite(estimatedNeededBytes) || estimatedNeededBytes < 0) {
    logError('QuotaManager', new Error('Invalid estimatedNeededBytes'), {
      value: estimatedNeededBytes,
      operation: 'calculateCleanupCount'
    });
    return QUOTA_CONFIG.MIN_CLEANUP_COUNT;
  }

  // FIXED P2-6: Validate ESTIMATED_RECORD_SIZE configuration value
  // Even though it's defined in constants.js, validate at runtime to prevent division by zero
  const recordSize = QUOTA_CONFIG.ESTIMATED_RECORD_SIZE;
  if (!Number.isFinite(recordSize) || recordSize <= 0) {
    logError('QuotaManager', new Error('Invalid ESTIMATED_RECORD_SIZE configuration'), {
      value: recordSize,
      operation: 'calculateCleanupCount',
      usingDefault: 200
    });
    // Use safe fallback value
    return Math.max(
      QUOTA_CONFIG.MIN_CLEANUP_COUNT,
      Math.min(QUOTA_CONFIG.MAX_CLEANUP_COUNT, Math.ceil(estimatedNeededBytes / 200))
    );
  }

  // Calculate records needed with safety margin
  const recordsNeeded = Math.ceil(
    (estimatedNeededBytes / recordSize) * QUOTA_CONFIG.CLEANUP_SAFETY_MARGIN
  );

  // FIXED P2-6: Additional safety check for infinity
  if (!Number.isFinite(recordsNeeded)) {
    warn('[QuotaManager] Calculated recordsNeeded is not finite', { estimatedNeededBytes });
    return QUOTA_CONFIG.MAX_CLEANUP_COUNT;
  }

  // Apply min/max bounds
  return Math.max(
    QUOTA_CONFIG.MIN_CLEANUP_COUNT,
    Math.min(QUOTA_CONFIG.MAX_CLEANUP_COUNT, recordsNeeded)
  );
}

/**
 * FIXED P3-2: Enhanced JSDoc with detailed tier documentation
 *
 * Checks fallback storage pressure level and triggers appropriate actions based on utilization
 *
 * FALLBACK STORAGE TIERS:
 * =======================
 * Fallback storage uses a tiered approach to handle increasing pressure:
 *
 * 🟢 NORMAL (0-80%):
 *    - No action needed
 *    - New records accepted normally
 *    - Background processing continues
 *
 * 🟡 WARNING (80-90%):
 *    - Triggers aggressive cleanup of main IndexedDB (5x normal cleanup)
 *    - Deletes 2x more records than currently in fallback storage
 *    - New records still accepted
 *    - User notification shown (rate-limited)
 *
 * 🟠 CRITICAL (90-95%):
 *    - Blocks new write operations to prevent overflow
 *    - Processes ALL fallback records aggressively
 *    - Deletes 3x more records from main DB
 *    - Shows critical warning notification
 *    - New records REJECTED (allowNewRecords: false)
 *
 * 🔴 EMERGENCY (95-100%):
 *    - Triggers automatic emergency export to file
 *    - Downloads backup file to user's computer
 *    - Deletes 5x more records from main DB
 *    - Shows emergency notification with instructions
 *    - New records REJECTED
 *
 * 🛑 MAX (100%):
 *    - All operations rejected
 *    - Manual intervention required
 *    - User must clear database or import exported file after cleanup
 *
 * DESIGN RATIONALE:
 * =================
 * Fallback storage limit (2000 records) is intentionally lower than IndexedDB
 * to prevent chrome.storage.local quota issues. The tiered approach provides
 * multiple safety nets before hitting the hard limit.
 *
 * NOTIFICATIONS:
 * =============
 * - All tiers use global rate limiting (max 3 notifications per 5 minutes)
 * - Per-tier rate limiting prevents spam within each level
 * - Exponential backoff applied to repeated notifications
 *
 * @param {number} currentCount - Current number of records in fallback storage
 *
 * @returns {Promise<Object>} Pressure status object
 * @returns {string} result.level - Pressure level: 'normal', 'warning', 'critical', 'emergency', 'max'
 * @returns {string} result.action - Action taken: 'none', 'aggressive_cleanup', 'block_operations', 'emergency_export', 'reject'
 * @returns {boolean} result.allowNewRecords - Whether new records can be added to fallback
 * @returns {number} result.utilization - Utilization ratio (0-1)
 *
 * @example
 * const pressure = await checkFallbackPressure(1500);
 * // pressure = { level: 'warning', action: 'aggressive_cleanup', allowNewRecords: true, utilization: 0.75 }
 *
 * @example
 * const pressure = await checkFallbackPressure(1900);
 * // pressure = { level: 'critical', action: 'block_operations', allowNewRecords: false, utilization: 0.95 }
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
  // FIXED P2-1: Separate depth tracking for fallback processing to prevent infinite loops
  if (fallbackProcessingDepth >= MAX_FALLBACK_PROCESSING_DEPTH) {
    logError('QuotaManager', new Error('Maximum fallback processing depth reached'), {
      operation: 'handleFallbackWarning',
      depth: fallbackProcessingDepth,
      maxDepth: MAX_FALLBACK_PROCESSING_DEPTH,
      preventingRecursion: true
    });
    return;
  }

  fallbackProcessingDepth++;
  try {
    return await withQuotaDepthTracking(async () => {
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
          cleanupTarget: aggressiveCleanupCount,
          quotaDepth: quotaOperationDepth,
          fallbackDepth: fallbackProcessingDepth
        });

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
          quotaDepth: quotaOperationDepth,
          fallbackDepth: fallbackProcessingDepth,
          fatal: true
        });
      }
    }, 'handleFallbackWarning');
  } finally {
    // FIXED P2-1: Always decrement fallbackProcessingDepth to prevent stuck depth counter
    fallbackProcessingDepth = Math.max(0, fallbackProcessingDepth - 1);
  }
}

/**
 * 🟠 CRITICAL (90%): Block operations + notification
 */
async function handleFallbackCritical(currentCount) {
  return withQuotaDepthTracking(async () => {
    try {
      logError('QuotaManager', new Error('Fallback CRITICAL threshold reached'), {
        operation: 'handleFallbackCritical',
        currentCount,
        utilization: `${(currentCount / QUOTA_CONFIG.MAX_FALLBACK_RECORDS * 100).toFixed(1)}%`,
        quotaDepth: quotaOperationDepth
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
        quotaDepth: quotaOperationDepth,
        fatal: true
      });
    }
  }, 'handleFallbackCritical');
}

/**
 * 🔴 EMERGENCY (95%): Auto-export fallback data
 */
async function handleFallbackEmergency(currentCount) {
  return withQuotaDepthTracking(async () => {
    try {
      logError('QuotaManager', new Error('Fallback EMERGENCY threshold reached'), {
        operation: 'handleFallbackEmergency',
        currentCount,
        utilization: `${(currentCount / QUOTA_CONFIG.MAX_FALLBACK_RECORDS * 100).toFixed(1)}%`,
        quotaDepth: quotaOperationDepth
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
      } finally {
        // Always revoke the object URL to prevent memory leaks
        URL.revokeObjectURL(url);
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
        quotaDepth: quotaOperationDepth,
        fatal: true
      });
    }
  }, 'handleFallbackEmergency');
}

/**
 * FIXED P3-2: Enhanced JSDoc with detailed documentation
 *
 * Aggressively processes fallback storage records with memory-efficient batch processing
 *
 * ALGORITHM:
 * ==========
 * Processes fallback records in batches to move data from chrome.storage.local
 * back to IndexedDB when quota becomes available. Uses splice() for in-place
 * array modification to avoid memory copies.
 *
 * MEMORY OPTIMIZATION:
 * ====================
 * - Processes in batches of AGGRESSIVE_BATCH_SIZE (default: 100) to limit memory footprint
 * - Uses splice() for in-place array modification to avoid creating array copies
 * - Yields to event loop between batches (10ms delay) to prevent UI blocking
 * - Memory usage: O(batch_size) instead of O(total_records)
 *
 * CIRCUIT BREAKER:
 * ===============
 * - Stops after MAX_CONSECUTIVE_FAILURES (3) to prevent infinite retry loops
 * - Per-record retry tracking prevents individual bad records from causing infinite loops
 * - Skips records that exceed MAX_RECORD_RETRIES (5) attempts
 *
 * EDGE CASES:
 * ===========
 * 1. Persistent quota errors: Stops after 3 consecutive failures
 * 2. Bad/corrupted records: Skips after 5 retry attempts per record
 * 3. Empty fallback storage: Returns immediately with success
 * 4. Partial batch failure: Continues with next batch (non-fatal error handling)
 *
 * ERROR RECOVERY:
 * ==============
 * - Consecutive failures reset to 0 on any successful batch
 * - Failed batches are re-queued to front of fallback storage
 * - Permanently failed records are logged but not re-queued
 * - Returns partial success metrics (processed, remaining, skipped)
 *
 * @returns {Promise<Object>} Result object
 * @returns {boolean} result.success - Overall success status
 * @returns {number} result.processed - Number of successfully processed records
 * @returns {number} result.remaining - Number of records still in fallback storage
 * @returns {number} result.skipped - Number of records that permanently failed
 *
 * @throws {Error} Only throws on critical errors (unlikely - designed to be resilient)
 *
 * @example
 * const result = await processFallbackStorageAggressively();
 * // result = { success: true, processed: 150, remaining: 50, skipped: 2 }
 */
async function processFallbackStorageAggressively() {
  let fallbackRecords = await getFromFallbackStorage();

  if (fallbackRecords.length === 0) {
    return { success: true, processed: 0, remaining: 0 };
  }

  // P1-1 FIX: Add retry limit to prevent infinite loop on persistent errors
  const MAX_CONSECUTIVE_FAILURES = 3;
  const MAX_RECORD_RETRIES = 5; // FIXED P1-5: Maximum retries per record
  const MAX_TOTAL_ATTEMPTS = 1000; // FIXED P2-15: Absolute cap on total operations
  const AGGRESSIVE_BATCH_SIZE = QUOTA_CONFIG.AGGRESSIVE_BATCH_SIZE;
  let processedCount = 0;
  let consecutiveFailures = 0;
  let skippedRecords = 0; // FIXED P1-5: Track permanently failed records
  let totalAttempts = 0; // FIXED P2-15: Track total operation attempts

  while (fallbackRecords.length > 0) {
    // FIXED P2-15: Check total attempts to prevent excessive processing time
    if (totalAttempts >= MAX_TOTAL_ATTEMPTS) {
      logError('QuotaManager', new Error('Maximum total attempts reached'), {
        operation: 'processFallbackStorageAggressively',
        totalAttempts,
        processedCount,
        remainingRecords: fallbackRecords.length,
        stopping: true
      });
      break;
    }
    totalAttempts++;
    // P1-1 FIX: Break if too many consecutive failures
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      logError('QuotaManager', new Error('Maximum consecutive failures reached'), {
        operation: 'processFallbackStorageAggressively',
        consecutiveFailures,
        processedCount,
        skippedRecords,
        remainingRecords: fallbackRecords.length,
        stopping: true
      });
      break;
    }

    // Use splice to remove from front (in-place, no copy)
    const batch = fallbackRecords.splice(0, Math.min(AGGRESSIVE_BATCH_SIZE, fallbackRecords.length));

    try {
      await upsertHiddenVideos(batch);
      processedCount += batch.length;
      consecutiveFailures = 0; // Reset on success

      // Give browser time to breathe
      // FIXED P3-4: Use constant instead of magic number
      await new Promise(resolve => setTimeout(resolve, UI_TIMING.BATCH_YIELD_MS));

    } catch (error) {
      consecutiveFailures++;

      // FIXED P1-5: Track retry count per record to prevent infinite retry
      const failedBatch = batch.map(record => {
        // Initialize or increment retry count
        const retryCount = (record._fallbackRetryCount || 0) + 1;

        // If record exceeded max retries, skip it permanently
        if (retryCount > MAX_RECORD_RETRIES) {
          logError('QuotaManager', new Error('Record exceeded max retries'), {
            operation: 'processFallbackStorageAggressively',
            videoId: record.videoId,
            retryCount,
            maxRetries: MAX_RECORD_RETRIES,
            action: 'skipping_permanently'
          });
          skippedRecords++;
          return null; // Mark for removal
        }

        // Otherwise, mark retry count and return for re-queue
        return { ...record, _fallbackRetryCount: retryCount };
      }).filter(r => r !== null); // Remove permanently failed records

      // On error, push failed batch back to the front (with updated retry counts)
      if (failedBatch.length > 0) {
        fallbackRecords.unshift(...failedBatch);
      }

      logError('QuotaManager', error, {
        operation: 'processFallbackStorageAggressively',
        processedBefore: processedCount,
        batchFailed: batch.length,
        requeuedCount: failedBatch.length,
        skippedCount: batch.length - failedBatch.length,
        consecutiveFailures,
        willRetry: consecutiveFailures < MAX_CONSECUTIVE_FAILURES
      });

      // Stop processing on error - save updated fallback storage
      break;
    }
  }

  // Save updated fallback storage once at the end
  await chrome.storage.local.set({ [FALLBACK_STORAGE_KEY]: fallbackRecords });

  return {
    success: processedCount > 0,
    processed: processedCount,
    remaining: fallbackRecords.length,
    skipped: skippedRecords // FIXED P1-5: Report skipped records
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
      eventType: event.type,
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

  // CODE REVIEW FIX (P2-5): Wait for existing lock with timeout to prevent deadlock
  // SELF-REVIEW FIX: Use constant from VALIDATION_LIMITS instead of hardcoded value
  // 3RD SELF-REVIEW FIX: Properly cleanup setTimeout to prevent timer leak
  // If lock takes longer than 30 seconds, it's likely stuck - abort and log error
  if (fallbackLock) {
    let timeoutId;
    try {
      await Promise.race([
        fallbackLock,
        new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Fallback lock timeout')), VALIDATION_LIMITS.FALLBACK_LOCK_TIMEOUT_MS);
        })
      ]);
      // Success - clear timeout to prevent it from firing
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    } catch (timeoutError) {
      // Timeout or lock error - clear timeout
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      logError('QuotaManager', timeoutError, {
        operation: 'saveToFallbackStorage',
        lockTimeout: true,
        fatal: true
      });
      // Force release stuck lock
      fallbackLock = null;
    }
  }

  // Create promise with exposed resolve/reject for atomic lock assignment
  let lockResolve, lockReject;
  const lockPromise = new Promise((resolve, reject) => {
    lockResolve = resolve;
    lockReject = reject;
  });

  // CRITICAL: Assign lock IMMEDIATELY before any async work starts
  // This prevents race condition where two calls could both pass the while check
  fallbackLock = lockPromise;

  // Now perform the actual storage operation
  try {
    const result = await (async () => {
      const storageResult = await withStorageTimeout(
        chrome.storage.local.get(FALLBACK_STORAGE_KEY),
        ERROR_CONFIG.STORAGE_TIMEOUT,
        'chrome.storage.local.get(FALLBACK_STORAGE_KEY)'
      );
      const fallbackData = storageResult[FALLBACK_STORAGE_KEY] || [];

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
    })();

    // Resolve the lock promise with result
    lockResolve(result);
    return result;

  } catch (error) {
    // Reject the lock promise with error
    lockReject(error);

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
  } finally {
    // Always clear lock, even on rejection
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
 * Calculates notification cooldown with exponential backoff
 *
 * FIXED P2-7: Comprehensive documentation of cooldown calculation
 *
 * Formula: min(BASE_COOLDOWN * (2 ^ consecutiveCount), MAX_COOLDOWN)
 *
 * Progression examples:
 * - Count 0: 15m * 2^0 = 15m
 * - Count 1: 15m * 2^1 = 30m
 * - Count 2: 15m * 2^2 = 60m
 * - Count 3: 15m * 2^3 = 120m (capped at MAX_COOLDOWN)
 * - Count 10: 15m * 2^10 = 15,360m (capped at MAX_COOLDOWN = 120m)
 *
 * Note: Although the formula can produce values up to 15,360 minutes for count=10,
 * the MAX_NOTIFICATION_COOLDOWN_MS cap of 2 hours (120 minutes) prevents this.
 * The effective progression is limited by MAX_CONSECUTIVE_NOTIFICATIONS (3),
 * which caps actual usage at 2^3 = 8x multiplier (120 minutes).
 *
 * The safeCount clamp to 10 prevents numeric overflow and performance issues
 * from corrupted storage values, not from normal operation.
 *
 * @param {number} consecutiveCount - Number of consecutive notifications
 * @returns {number} Cooldown in milliseconds (min: 15m, max: 2h)
 */
function calculateNotificationCooldown(consecutiveCount) {
  // Clamp to prevent numeric overflow and corrupted storage values
  // Max value of 10 prevents Math.pow from producing extremely large numbers
  const safeCount = Math.max(0, Math.min(consecutiveCount, 10));

  // Use Math.pow for consistency and compatibility (** operator not transpiled by webpack)
  const cooldown = CONFIG.BASE_NOTIFICATION_COOLDOWN_MS *
    Math.pow(CONFIG.NOTIFICATION_BACKOFF_MULTIPLIER, safeCount);

  // Cap at 2 hours to prevent indefinite notification silence
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
    // FIXED P2-4: Check global rate limit first
    if (!canShowGlobalNotification()) {
      await logQuotaEvent({
        type: 'notification_suppressed',
        reason: 'global_rate_limit_exceeded',
        recentNotifications: globalNotificationTimestamps.length,
        maxAllowed: CONFIG.GLOBAL_NOTIFICATION_LIMIT,
        windowMinutes: CONFIG.GLOBAL_NOTIFICATION_WINDOW_MS / 60000
      });
      return;
    }

    // FIXED P3-8: Check per-type cooldown to prevent notification spam
    const notificationType = options.type || 'default';
    const lastShown = lastNotificationByType.get(notificationType) || 0;
    const timeSinceLastShown = Date.now() - lastShown;

    if (timeSinceLastShown < PER_TYPE_COOLDOWN_MS) {
      await logQuotaEvent({
        type: 'notification_suppressed',
        reason: 'per_type_cooldown',
        notificationType,
        timeSinceLastShownSeconds: Math.round(timeSinceLastShown / 1000),
        cooldownSeconds: PER_TYPE_COOLDOWN_MS / 1000
      });
      return;
    }

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

    // FIXED P2-4: Record notification for global rate limiting
    recordGlobalNotification();

    // CODE REVIEW FIX (P2-1): Cleanup old notification types before adding new one
    // Time-based cleanup is more efficient than size-based O(n) search
    cleanupOldNotificationTypes();

    // Record per-type notification timestamp
    lastNotificationByType.set(notificationType, Date.now());

    await logQuotaEvent({
      type: 'notification_shown',
      title,
      message,
      notificationType,
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
    // But still respect global rate limit to prevent spam from bugs
    if (!canShowGlobalNotification()) {
      await logQuotaEvent({
        type: 'critical_notification_suppressed',
        reason: 'global_rate_limit_exceeded',
        title,
        message
      });
      return;
    }

    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title,
      message,
      priority: 2, // Maximum priority
      requireInteraction: true // Force user to dismiss
    });

    // FIXED P2-4: Record critical notification for global rate limiting
    recordGlobalNotification();

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
 * Creates a standardized quota result object
 * @param {Object} options - Result options
 * @returns {Object} Standardized result object
 */
function createQuotaResult({
  success,
  cleanupPerformed = false,
  fallbackSaved = false,
  rejected = false,
  level = null,
  recordsDeleted = null,
  fallbackRecords = null,
  pressureLevel = null,
  error = null,
  recommendation
}) {
  const result = {
    success,
    cleanupPerformed,
    fallbackSaved,
    recommendation
  };

  if (rejected) result.rejected = rejected;
  if (level) result.level = level;
  if (recordsDeleted !== null) result.recordsDeleted = recordsDeleted;
  if (fallbackRecords !== null) result.fallbackRecords = fallbackRecords;
  if (pressureLevel) result.pressureLevel = pressureLevel;
  if (error) result.error = error;

  return result;
}

/**
 * Logs initial quota exceeded event
 * @param {Object} context - Operation context
 * @param {number} estimatedBytes - Estimated bytes needed
 * @param {number} cleanupCount - Number of records to clean up
 */
async function logInitialQuotaEvent(context, estimatedBytes, cleanupCount) {
  const { data, operationType = 'unknown' } = context;

  await logQuotaEvent({
    type: 'quota_exceeded',
    operationType,
    dataSize: Array.isArray(data) ? data.length : 1,
    estimatedBytes,
    cleanupCount
  });
}

/**
 * FIXED P1-2: Emergency backup to prevent data loss when fallback is full
 * Saves data to third-tier emergency storage and triggers auto-export
 * @param {Array|Object} data - Data to save to emergency backup
 * @returns {Promise<Object>} Emergency backup result
 */
async function saveToEmergencyBackup(data) {
  try {
    const records = Array.isArray(data) ? data : [data];

    // Get existing emergency backup
    const result = await withStorageTimeout(
      chrome.storage.local.get(EMERGENCY_BACKUP_KEY),
      ERROR_CONFIG.STORAGE_TIMEOUT,
      'chrome.storage.local.get(EMERGENCY_BACKUP_KEY)'
    );

    // P2-6 FIX: Validate emergencyData is an array to prevent runtime errors
    const rawEmergencyData = result[EMERGENCY_BACKUP_KEY];
    const emergencyData = Array.isArray(rawEmergencyData) ? rawEmergencyData : [];

    const MAX_EMERGENCY_RECORDS = 500;

    // FIXED P1-4: Calculate exact space needed to fit new records
    // Remove oldest records to make space for all new records (or as many as possible)
    const totalNeeded = records.length;
    const currentSize = emergencyData.length;
    const spaceNeeded = Math.max(0, (currentSize + totalNeeded) - MAX_EMERGENCY_RECORDS);

    if (spaceNeeded > 0) {
      // Remove oldest records to make space
      emergencyData.splice(0, spaceNeeded);

      logError('QuotaManager', new Error('Emergency backup rotating old records'), {
        operation: 'saveToEmergencyBackup',
        recordsRemoved: spaceNeeded,
        recordsToAdd: totalNeeded,
        finalSize: emergencyData.length + totalNeeded,
        warning: true
      });
    }

    // All new records should fit now (or we'll take as many as possible)
    const recordsToAdd = records.slice(0, Math.min(records.length, MAX_EMERGENCY_RECORDS - emergencyData.length));

    // Add all new records (guaranteed to fit now)
    for (const record of recordsToAdd) {
      emergencyData.push(record);
    }

    // FIXED P1-4: Defensive check to ensure we didn't exceed limit
    if (emergencyData.length > MAX_EMERGENCY_RECORDS) {
      logError('QuotaManager', new Error('Emergency backup exceeded limit'), {
        operation: 'saveToEmergencyBackup',
        actualSize: emergencyData.length,
        maxSize: MAX_EMERGENCY_RECORDS,
        trimming: true
      });
      emergencyData.splice(0, emergencyData.length - MAX_EMERGENCY_RECORDS);
    }

    // Save back to storage
    await withStorageTimeout(
      chrome.storage.local.set({ [EMERGENCY_BACKUP_KEY]: emergencyData }),
      ERROR_CONFIG.STORAGE_TIMEOUT,
      'chrome.storage.local.set(EMERGENCY_BACKUP_KEY)'
    );

    // Trigger auto-export via downloads API
    const exportData = {
      exportType: 'emergency_backup',
      exportDate: new Date().toISOString(),
      recordCount: emergencyData.length,
      warning: 'CRITICAL: Storage exhausted. This is an automatic emergency backup.',
      records: emergencyData
    };

    const jsonBlob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(jsonBlob);

    try {
      await chrome.downloads.download({
        url: url,
        filename: `youtube-hidden-videos-EMERGENCY-${Date.now()}.json`,
        saveAs: true
      });

      // FIXED P2-8: Clear emergency backup after successful export with retry
      // This prevents wasting storage with orphaned backup data
      try {
        await chrome.storage.local.remove(EMERGENCY_BACKUP_KEY);
      } catch (removeError) {
        // Retry once after a short delay
        logError('QuotaManager', removeError, {
          operation: 'emergency_backup_cleanup',
          retrying: true
        });
        try {
          await new Promise(resolve => setTimeout(resolve, 1000));
          await chrome.storage.local.remove(EMERGENCY_BACKUP_KEY);
        } catch (retryError) {
          logError('QuotaManager', retryError, {
            operation: 'emergency_backup_cleanup_failed',
            warning: 'Emergency backup not cleared, will retry on next export',
            keepingData: true
          });
          // Don't throw - export succeeded, cleanup failure is not critical
        }
      }

      await logQuotaEvent({
        type: 'emergency_backup_cleared',
        recordCount: emergencyData.length,
        reason: 'export_successful'
      });

    } catch (downloadError) {
      // Keep backup if download failed - user can retry later
      logError('QuotaManager', downloadError, {
        operation: 'emergency_backup_download',
        recordCount: records.length,
        dataKept: true,
        note: 'Emergency backup retained in chrome.storage.local for retry'
      });
    } finally {
      URL.revokeObjectURL(url);
    }

    await logQuotaEvent({
      type: 'emergency_backup_created',
      recordCount: records.length,
      totalEmergencyRecords: emergencyData.length
    });

    return {
      success: true,
      recordsSaved: records.length,
      totalInEmergency: emergencyData.length
    };
  } catch (error) {
    logError('QuotaManager', error, {
      operation: 'saveToEmergencyBackup',
      fatal: true
    });
    return { success: false, error: error.message };
  }
}

/**
 * Handles the case when fallback storage rejected the records
 * FIXED P1-2: Now saves to emergency backup instead of losing data
 * @param {Object} fallbackResult - Result from fallback storage attempt
 * @param {Array|Object} data - Data that was attempted to be saved
 * @returns {Promise<Object>} Quota result object
 */
async function handleFallbackRejection(fallbackResult, data) {
  // Try emergency backup before giving up
  const emergencyResult = await saveToEmergencyBackup(data);

  if (emergencyResult.success) {
    await showCriticalNotification({
      title: '🆘 EMERGENCY BACKUP CREATED',
      message: `Storage is critically full (${fallbackResult.level}). Your ${Array.isArray(data) ? data.length : 1} video(s) have been saved to an emergency backup file. Please save the file and clear old videos in settings immediately to prevent data loss.`
    });

    return createQuotaResult({
      success: true, // Data was saved to emergency backup
      rejected: false,
      fallbackSaved: false,
      emergencyBackup: true,
      level: fallbackResult.level,
      recommendation: 'emergency_backup_created'
    });
  }

  // Emergency backup also failed - truly critical
  // FIXED P1-5: Fourth-tier protection - force auto-export without user prompt
  // This is the last line of defense against data loss
  try {
    const criticalData = {
      exportType: 'critical_auto_backup',
      exportDate: new Date().toISOString(),
      warning: 'CRITICAL: All storage tiers exhausted. Automatic emergency export.',
      records: Array.isArray(data) ? data : [data]
    };

    const jsonBlob = new Blob([JSON.stringify(criticalData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(jsonBlob);

    try {
      // FIXED P1-5: Auto-download WITHOUT user prompt (saveAs: false)
      // This ensures data is saved even if user is away
      await chrome.downloads.download({
        url: url,
        filename: `youtube-CRITICAL-AUTO-${Date.now()}.json`,
        saveAs: false, // Auto-save to Downloads folder without prompt
        conflictAction: 'uniquify'
      });

      await logQuotaEvent({
        type: 'critical_auto_export',
        recordCount: Array.isArray(data) ? data.length : 1
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch (autoExportError) {
    logError('QuotaManager', autoExportError, {
      operation: 'critical_auto_export',
      fatal: true
    });
  }

  // P3-4 FIX: Shortened error message to fit notification UI (< 120 chars)
  const recordCount = Array.isArray(data) ? data.length : 1;
  const errorMessage = `Storage full! ${recordCount} video(s) auto-saved to Downloads. Clear old videos now to prevent data loss.`;

  await showCriticalNotification({
    title: '🛑 Storage Critical',
    message: errorMessage
  });

  // Log error for bug reports (always logged, even in production)
  error('[CRITICAL] All storage tiers exhausted:', {
    dataLoss: Array.isArray(data) ? data.length : 1,
    fallbackResult,
    emergencyResult
  });

  return createQuotaResult({
    success: false,
    rejected: true,
    level: fallbackResult.level,
    error: 'All storage tiers exhausted - operation rejected',
    recommendation: 'critical_cleanup_required'
  });
}

/**
 * Handles generic fallback storage failure
 * @returns {Promise<Object>} Quota result object
 */
async function handleFallbackError() {
  await showQuotaNotification({
    title: 'Critical Storage Error',
    message: 'Unable to save video data. Please export your data and clear old videos in the extension settings.'
  });

  return createQuotaResult({
    success: false,
    error: 'Failed to save to fallback storage',
    recommendation: 'manual_intervention_required'
  });
}

/**
 * Performs cleanup operation with recursion protection
 * @param {Function} cleanupFunction - Function to delete old records
 * @param {number} cleanupCount - Number of records to delete
 * @returns {Promise<boolean>} Whether cleanup was performed
 */
async function performCleanupOperation(cleanupFunction, cleanupCount) {
  if (isCleaningUp) {
    return false;
  }

  isCleaningUp = true;
  try {
    await cleanupFunction(cleanupCount);
    return true;
  } finally {
    isCleaningUp = false;
  }
}

/**
 * Handles successful cleanup operation
 * @param {number} cleanupCount - Number of records deleted
 * @param {number} cleanupTime - Time taken for cleanup in ms
 * @param {Object} fallbackResult - Result from fallback storage
 * @returns {Promise<Object>} Quota result object
 */
async function handleCleanupSuccess(cleanupCount, cleanupTime, fallbackResult) {
  await logQuotaEvent({
    type: 'cleanup_success',
    recordsDeleted: cleanupCount,
    cleanupTimeMs: cleanupTime,
    fallbackPressureLevel: fallbackResult.pressureLevel
  });

  await showQuotaNotification({
    message: `Storage space optimized. Deleted ${cleanupCount} old videos. Your recent data has been preserved.`
  });

  return createQuotaResult({
    success: true,
    cleanupPerformed: true,
    recordsDeleted: cleanupCount,
    fallbackSaved: true,
    fallbackRecords: fallbackResult.recordsSaved,
    pressureLevel: fallbackResult.pressureLevel,
    recommendation: 'retry_operation'
  });
}

/**
 * Handles cleanup operation failure
 * @param {Error} error - The cleanup error
 * @param {number} cleanupCount - Number of records attempted to delete
 * @param {Object} fallbackResult - Result from fallback storage
 * @returns {Promise<Object>} Quota result object
 */
async function handleCleanupFailure(error, cleanupCount, fallbackResult) {
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

  await showQuotaNotification({
    title: 'Storage Cleanup Failed',
    message: 'Unable to free storage space. Please manually clear old videos in the extension settings.'
  });

  return createQuotaResult({
    success: false,
    fallbackSaved: true,
    fallbackRecords: fallbackResult.recordsSaved,
    pressureLevel: fallbackResult.pressureLevel,
    error: 'Cleanup failed',
    recommendation: 'manual_cleanup_required'
  });
}

/**
 * Main quota exceeded handler with multi-tier fallback protection
 *
 * CODE REVIEW FIX (P1-4): Protected by global lock to prevent race conditions
 * If another quota handling is in progress, this call will wait for it to complete
 * before proceeding. This prevents excessive data deletion from concurrent cleanup operations.
 *
 * @param {Error} error - The quota exceeded error
 * @param {Function} cleanupFunction - Function to delete old records (deleteOldestHiddenVideos)
 * @param {Object} operationContext - Context about the failed operation
 * @returns {Promise<Object>} Result with cleanup stats and recommendations
 */
export async function handleQuotaExceeded(error, cleanupFunction, operationContext = {}) {
  // CODE REVIEW FIX (P1-4): Wait for existing quota handling to complete
  // Prevents concurrent quota operations from deleting too much data
  // CRITICAL FIX (2nd self-review): Store result atomically with lock to prevent overwrite
  if (quotaHandlingLock) {
    debug('[QuotaManager] Quota handling already in progress, waiting...');
    const lockToWaitFor = quotaHandlingLock; // Capture current lock state
    await lockToWaitFor.promise;

    // Return the result that was captured WITH this specific lock
    // This prevents race where a new operation overwrites the result before we read it
    return lockToWaitFor.result || createQuotaResult({
      success: false,
      error: 'Previous quota handling completed but result unavailable',
      recommendation: 'retry_operation'
    });
  }

  const startTime = Date.now();

  logError('QuotaManager', error, {
    operation: 'handleQuotaExceeded',
    context: operationContext
  });

  // Create lock object that will store both promise and result
  let lockResolve;
  const lockPromise = new Promise((resolve) => {
    lockResolve = resolve;
  });

  // CRITICAL: Store lock as object with promise and result slot
  const currentLock = {
    promise: lockPromise,
    result: null  // Will be filled before releasing lock
  };
  quotaHandlingLock = currentLock;

  // Helper to cache result in the lock object (atomic with lock)
  const returnWithCache = (result) => {
    currentLock.result = result;  // Store in THIS lock's result
    return result;
  };

  try {
    // CODE REVIEW FIX (P1-2): Validate operationContext and data before use
    if (!operationContext || typeof operationContext !== 'object') {
      logError('QuotaManager', new Error('Invalid operationContext'), {
        operation: 'handleQuotaExceeded',
        contextType: typeof operationContext,
        fatal: true
      });
      throw new Error('Invalid operation context - expected object');
    }

    // Extract operation details with validation
    const { data } = operationContext;

    if (!data) {
      logError('QuotaManager', new Error('Missing operationContext.data'), {
        operation: 'handleQuotaExceeded',
        operationType: operationContext.operationType,
        fatal: true
      });
      throw new Error('Invalid operation context - missing data field');
    }

    // Estimate space needed and calculate cleanup count
    const estimatedBytes = estimateDataSize(data);
    const cleanupCount = calculateCleanupCount(estimatedBytes);

    // Log initial quota event
    await logInitialQuotaEvent(operationContext, estimatedBytes, cleanupCount);

    // Save data to fallback storage first (critical - before cleanup)
    const fallbackResult = await saveToFallbackStorage(data);

    // Handle fallback rejection (storage critically full)
    if (!fallbackResult.success && fallbackResult.rejected) {
      return returnWithCache(await handleFallbackRejection(fallbackResult, data));
    }

    // Handle other fallback failures
    if (!fallbackResult.success) {
      return returnWithCache(await handleFallbackError());
    }

    // Perform cleanup with recursion protection
    try {
      await performCleanupOperation(cleanupFunction, cleanupCount);
      const cleanupTime = Date.now() - startTime;

      return returnWithCache(await handleCleanupSuccess(cleanupCount, cleanupTime, fallbackResult));
    } catch (cleanupError) {
      return returnWithCache(await handleCleanupFailure(cleanupError, cleanupCount, fallbackResult));
    }
  } catch (error) {
    logError('QuotaManager', error, {
      operation: 'handleQuotaExceeded',
      fatal: true
    });

    return returnWithCache(createQuotaResult({
      success: false,
      error: error.message,
      recommendation: 'system_error'
    }));
  } finally {
    // CODE REVIEW FIX (P1-4): Always release lock to prevent deadlock
    // Even if operation fails, lock must be released so subsequent operations can proceed
    if (lockResolve) {
      lockResolve();
    }
    quotaHandlingLock = null;
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
