import { retryOperation, logError, classifyError, ErrorType } from '../shared/errorHandler.js';
import { getCachedRecord, setCachedRecord, invalidateCache, clearBackgroundCache } from './indexedDbCache.js';
import { INDEXEDDB_CONFIG, QUOTA_CONFIG, UI_TIMING } from '../shared/constants.js'; // FIXED P3-4: Import UI_TIMING
import { handleQuotaExceeded, getFromFallbackStorage, removeFromFallbackStorage } from './quotaManager.js';
import { isValidVideoId } from '../shared/utils.js';
import { warn } from '../shared/logger.js';

const DB_NAME = 'ythwvHiddenVideos';
const DB_VERSION = 1;
const STORE_NAME = 'hiddenVideos';
const UPDATED_AT_INDEX = 'byUpdatedAt';
const STATE_INDEX = 'byState';
const STATE_UPDATED_AT_INDEX = 'byStateUpdatedAt';

let dbPromise = null;
let resolvedDb = null; // Resolved database instance for synchronous access
let dbResetInProgress = false;
let dbResetPromise = null;

// Active operations tracking for graceful shutdown
// FIXED P1-3: Simplified to synchronous operations for Service Worker safety
// Synchronous operations ensure cleanup completes before SW termination
let activeOperations = 0;
let shutdownRequested = false;
let pendingCloseCallback = null;

// FIXED P3-1: Use config value instead of hardcoded constant
// Maximum concurrent operations to prevent resource exhaustion
const MAX_ACTIVE_OPERATIONS = INDEXEDDB_CONFIG.MAX_ACTIVE_OPERATIONS;

/**
 * FIXED P1-3: Synchronously increments the active operations counter
 * Must be synchronous to prevent Service Worker termination race conditions
 * @returns {number} - New operation count
 */
function incrementOperations() {
  activeOperations++;
  return activeOperations;
}

/**
 * FIXED P1-3: Synchronously decrements the active operations counter
 * Must be synchronous to ensure cleanup completes before SW termination
 * @returns {number} - New operation count
 */
function decrementOperations() {
  activeOperations = Math.max(0, activeOperations - 1);
  return activeOperations;
}

// Fallback storage processing lock to prevent race conditions
let fallbackProcessingInProgress = false;
let fallbackProcessingPromise = null;

/**
 * Wraps a promise with a timeout to prevent indefinite hanging
 * @param {Promise} promise - The promise to wrap
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} operationName - Name of the operation for error messages
 * @returns {Promise} - Promise that rejects if timeout is exceeded
 */
function withTimeout(promise, timeoutMs, operationName = 'Operation') {
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
 * Wraps a cursor operation with progressive timeout and retry mechanism
 * Progressive timeout: 30s -> 60s -> 90s (optimizes for 99% users while handling edge cases)
 * @param {Function} cursorOperationFactory - Factory function that creates cursor operation (receives attempt number)
 * @param {string} operationName - Name of the operation for error messages
 * @returns {Promise} - Promise that resolves with cursor operation result
 */
function withProgressiveCursorTimeout(cursorOperationFactory, operationName = 'Cursor operation') {
  // Feature flag check - if disabled, use original behavior with single timeout
  if (!INDEXEDDB_CONFIG.ENABLE_CURSOR_PROGRESSIVE_TIMEOUT) {
    return cursorOperationFactory(1);
  }

  /**
   * Gets progressive timeout value for cursor operations based on attempt number
   * Expected range: 1-3 attempts (configured via CURSOR_MAX_RETRIES)
   * @param {number} attempt - The current attempt number (1-indexed)
   * @returns {number} - Timeout in milliseconds
   */
  const getTimeoutForAttempt = (attempt) => {
    // FIXED P2-2: Simplified validation and normalization
    let normalized = attempt;

    // Validate and normalize attempt number
    if (!Number.isFinite(attempt)) {
      logError('IndexedDB', new Error(`Non-finite attempt number: ${attempt}`), {
        operation: 'getTimeoutForAttempt',
        attemptValue: attempt,
        attemptType: typeof attempt,
        defaulting: 1
      });
      normalized = 1;
    } else if (attempt < 1) {
      normalized = 1;
    } else if (attempt > 3) {
      normalized = 3;
    } else {
      normalized = Math.floor(attempt);
    }

    switch (normalized) {
      case 1: return INDEXEDDB_CONFIG.CURSOR_TIMEOUT; // 30s - covers 99% of cases
      case 2: return INDEXEDDB_CONFIG.CURSOR_TIMEOUT_RETRY_1; // 60s - handles slower devices
      case 3: return INDEXEDDB_CONFIG.CURSOR_TIMEOUT_RETRY_2; // 90s - edge cases (200k+ records)
      default:
        // Should never reach here due to normalization, but safety fallback
        return INDEXEDDB_CONFIG.CURSOR_TIMEOUT_RETRY_2;
    }
  };

  return retryOperation(
    async (attempt) => {
      const timeout = getTimeoutForAttempt(attempt);
      const operation = cursorOperationFactory(attempt);
      return withTimeout(operation, timeout, `${operationName} (attempt ${attempt})`);
    },
    {
      maxAttempts: INDEXEDDB_CONFIG.CURSOR_MAX_RETRIES + 1, // +1 for initial attempt
      initialDelay: 100,
      maxDelay: 1000,
      shouldRetry: (error) => {
        const errorType = classifyError(error);
        // Retry on timeout or transient errors
        return errorType === ErrorType.TIMEOUT || errorType === ErrorType.TRANSIENT;
      },
      onRetry: (attempt, error) => {
        logError('IndexedDB', error, {
          operation: operationName,
          attempt,
          message: 'Cursor operation timeout, retrying with increased timeout'
        });
      },
      getTimeoutForAttempt: true // Signal that operation receives attempt number
    }
  );
}

function openDb() {
  if (dbPromise) return dbPromise;

  // Reset shutdown flag when opening database
  // This handles service worker restart after suspension
  shutdownRequested = false;
  activeOperations = 0;
  pendingCloseCallback = null;
  resolvedDb = null;

  dbPromise = retryOperation(
    () => withTimeout(
      new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
          const db = request.result;
          let store;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            store = db.createObjectStore(STORE_NAME, { keyPath: 'videoId' });
          } else {
            store = request.transaction.objectStore(STORE_NAME);
          }
          if (!store.indexNames.contains(UPDATED_AT_INDEX)) {
            store.createIndex(UPDATED_AT_INDEX, 'updatedAt');
          }
          if (!store.indexNames.contains(STATE_INDEX)) {
            store.createIndex(STATE_INDEX, 'state');
          }
          if (!store.indexNames.contains(STATE_UPDATED_AT_INDEX)) {
            store.createIndex(STATE_UPDATED_AT_INDEX, ['state', 'updatedAt']);
          }
        };

        request.onsuccess = () => {
          const db = request.result;
          resolvedDb = db; // Store resolved instance for synchronous access
          db.onversionchange = () => {
            db.close();
            dbPromise = null;
            resolvedDb = null;
          };
          db.onerror = (event) => {
            logError('IndexedDB', event.target.error, { operation: 'db.onerror' });
          };
          resolve(db);
        };

        request.onerror = () => {
          reject(request.error);
        };

        request.onblocked = () => {
          logError('IndexedDB', new Error('Database blocked'), { operation: 'open' });
          // Continue waiting, don't reject
        };
      }),
      INDEXEDDB_CONFIG.DB_OPEN_TIMEOUT,
      'IndexedDB open'
    ),
    {
      maxAttempts: 3,
      initialDelay: 100,
      onRetry: (attempt, error) => {
        logError('IndexedDB', error, {
          operation: 'openDb',
          attempt,
          retrying: true
        });
      }
    }
  ).catch((error) => {
    logError('IndexedDB', error, { operation: 'openDb', fatal: true });
    dbPromise = null;
    resolvedDb = null;
    throw error;
  });

  return dbPromise;
}

/**
 * Closes the database connection and clears the cache
 * Should be called when the service worker is about to suspend
 * @returns {Promise<void>}
 */
export async function closeDb() {
  if (dbPromise) {
    try {
      const db = await dbPromise;
      db.close();
    } catch (error) {
      logError('IndexedDB', error, { operation: 'closeDb', phase: 'close' });
    } finally {
      dbPromise = null;
      resolvedDb = null;
      // Clear the cache when closing the database
      clearBackgroundCache();
    }
  }
}

/**
 * Synchronously closes the database connection if possible
 * This is the SAFE version to use in chrome.runtime.onSuspend
 *
 * Chrome can terminate the service worker before async operations complete in onSuspend.
 * This function handles graceful shutdown:
 *
 * 1. If no active operations: Closes connection immediately (if already resolved)
 * 2. If active operations exist: Sets shutdown flag for auto-close after completion
 *
 * This prevents:
 * - Blocking database on next startup
 * - Data corruption from interrupted operations
 * - Timeout errors from orphaned connections
 *
 * @returns {void} - Synchronous operation, no promise
 */
export function closeDbSync() {
  // Set shutdown flag to prevent new operations
  shutdownRequested = true;

  if (!dbPromise && !resolvedDb) {
    // No database connection to close
    clearBackgroundCache();
    return;
  }

  // If there are active operations, force-close immediately
  // FIXED P1-4: Removed setTimeout - Chrome does NOT wait for it in onSuspend
  // Service Worker can be terminated before setTimeout fires, leaving DB connections open
  if (activeOperations > 0) {
    logError('IndexedDB', new Error('Force-closing database with active operations'), {
      operation: 'closeDbSync',
      activeOperations,
      shutdownRequested: true,
      warning: 'Active operations will be interrupted'
    });

    // Force-close immediately and SYNCHRONOUSLY
    // This may interrupt active operations, but it's better than leaving connections open
    // which would block the database on next startup
    if (resolvedDb) {
      try {
        resolvedDb.close();
        logError('IndexedDB', new Error('Database force-closed with active operations'), {
          operation: 'closeDbSync',
          forceClose: true,
          activeOperationsAtForce: activeOperations
        });
      } catch (error) {
        // Ignore errors during force close
      }
    }

    // Clear state immediately
    dbPromise = null;
    resolvedDb = null;
    clearBackgroundCache();
    return;
  }

  // No active operations - close immediately and SYNCHRONOUSLY
  // Use the resolved database instance for synchronous closing
  // This prevents race condition where Chrome kills Service Worker before async .then() executes
  if (resolvedDb) {
    try {
      // FIXED P1-4: Check if database is in a valid state before closing
      // readyState is 'pending' or 'done'. Only close if done.
      // Note: IDBDatabase doesn't have readyState, so we just try-catch
      // The error catch below handles any exceptions from active transactions
      resolvedDb.close();
      logError('IndexedDB', new Error('Database closed synchronously'), {
        operation: 'closeDbSync',
        success: true,
        synchronous: true
      });
    } catch (error) {
      // This catch handles:
      // 1. InvalidStateError if database is already closed
      // 2. Any other exceptions from active transactions (shouldn't happen with activeOperations check)
      // We continue anyway as we're shutting down
      logError('IndexedDB', error, {
        operation: 'closeDbSync',
        phase: 'close',
        synchronous: true,
        recovered: true
      });
    }
  }

  // Clear state immediately (synchronously)
  dbPromise = null;
  resolvedDb = null;
  clearBackgroundCache();
}

async function withStore(mode, handler, operationContext = null) {
  // Check for maximum concurrent operations to prevent resource exhaustion
  if (activeOperations >= MAX_ACTIVE_OPERATIONS) {
    const error = new Error('Too many concurrent operations');
    logError('IndexedDB', error, {
      operation: 'withStore',
      mode,
      activeOperations,
      maxActiveOperations: MAX_ACTIVE_OPERATIONS
    });
    throw error;
  }

  // Track active operations for graceful shutdown
  // FIXED P1-3: Synchronous increment for SW safety
  incrementOperations();

  try {
    // Check if shutdown has been requested
    if (shutdownRequested) {
      logError('IndexedDB', new Error('Operation rejected - shutdown in progress'), {
        operation: 'withStore',
        mode,
        shutdownRequested: true
      });
      throw new Error('Database is shutting down');
    }

    // FIXED P2-14: Check if database reset is in progress
    // Prevents new operations from starting during reset, avoiding race conditions
    if (dbResetInProgress) {
      logError('IndexedDB', new Error('Operation rejected - database reset in progress'), {
        operation: 'withStore',
        mode,
        dbResetInProgress: true
      });
      throw new Error('Database reset in progress');
    }

    const db = await openDb();
    return await retryOperation(
      () => withTimeout(
        new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, mode);
          const store = tx.objectStore(STORE_NAME);
          let handlerPromise;
          let handlerRejected = false;
          let handlerError = null;
          // FIXED P2-1: Add isAborted flag to prevent race condition
          // between tx.onabort and tx.oncomplete handlers
          let isAborted = false;

          // Wrap handler call to catch synchronous errors
          try {
            handlerPromise = Promise.resolve().then(() => handler(store, tx));
          } catch (error) {
            // Handler threw synchronously - abort transaction immediately
            try {
              tx.abort();
            } catch (abortError) {
              // Transaction may already be inactive
            }
            reject(error);
            return;
          }

          // Handle handler promise rejection - abort transaction explicitly
          handlerPromise.catch((error) => {
            handlerRejected = true;
            handlerError = error;
            // Abort transaction if handler fails
            try {
              tx.abort();
            } catch (abortError) {
              // Transaction may already be finishing/finished, or inactive
              // Continue with error propagation through onabort handler
            }
          });

          tx.oncomplete = async () => {
            // FIXED P2-1: Check isAborted flag to prevent execution after abort
            if (isAborted) {
              // Transaction was aborted - oncomplete shouldn't execute
              // This can happen in race conditions, just return
              return;
            }

            // FIXED P2-1: If handler was rejected but transaction committed, log warning
            // This indicates data was saved despite handler rejection
            if (handlerRejected) {
              logError('IndexedDB', handlerError, {
                operation: 'withStore',
                phase: 'post-commit-handler-rejection',
                warning: 'Transaction committed successfully but handler rejected',
                dataState: 'saved',
                returnValue: 'error_after_commit'
              });
              reject(handlerError);
              return;
            }

            try {
              // FIXED P2-3: Add timeout to prevent hung handler after transaction complete
              // Transaction is already committed, but handler may have async cleanup
              const value = await Promise.race([
                handlerPromise,
                new Promise((_, rej) =>
                  setTimeout(() => rej(new Error('Handler timeout after transaction complete')), 5000)
                )
              ]);
              resolve(value);
            } catch (error) {
              // FIXED P2-1: Handler failed after transaction completed
              // Transaction cannot be aborted at this point - data is already saved
              // Log warning to indicate data state
              logError('IndexedDB', error, {
                operation: 'withStore',
                phase: 'post-commit-handler-error',
                warning: 'Transaction committed successfully but handler failed',
                dataState: 'saved'
              });
              reject(error);
            }
          };

          tx.onerror = () => reject(tx.error);

          tx.onabort = () => {
            // FIXED P2-1: Set isAborted flag to prevent oncomplete from executing
            isAborted = true;

            // If handler was rejected, use that error instead of generic abort error
            if (handlerRejected) {
              reject(handlerError);
            } else {
              reject(tx.error || new Error('Transaction aborted'));
            }
          };
        }),
        INDEXEDDB_CONFIG.OPERATION_TIMEOUT,
        `IndexedDB ${mode} transaction`
      ),
      {
        maxAttempts: 3,
        shouldRetry: (error) => {
          const errorType = classifyError(error);
          return errorType === ErrorType.TRANSIENT;
        },
        onRetry: (attempt, error) => {
          logError('IndexedDB', error, {
            operation: 'withStore',
            mode,
            attempt,
            retrying: true
          });
        }
      }
    );
  } catch (error) {
    const errorType = classifyError(error);

    // Handle quota exceeded with comprehensive quota manager
    if (errorType === ErrorType.QUOTA_EXCEEDED) {
      // Check if we're already in a quota retry loop to prevent infinite recursion
      const quotaRetryDepth = (operationContext?.quotaRetryDepth || 0);
      // FIXED: Increased from 1 to 2 to allow sufficient retry attempts
      // Rationale: For large databases (100k+ records), one retry may not free enough space
      // This gives the quota manager 2 chances to clean up before giving up
      const maxQuotaRetryDepth = 2;

      if (quotaRetryDepth >= maxQuotaRetryDepth) {
        // Already exhausted quota retries - don't create nested retry loops
        logError('IndexedDB', error, {
          operation: 'withStore',
          quotaExceeded: true,
          quotaRetryDepth,
          maxQuotaRetryDepth,
          preventingNestedRetry: true,
          operationContext
        });
        throw error;
      }

      logError('IndexedDB', error, {
        operation: 'withStore',
        quotaExceeded: true,
        quotaRetryDepth,
        operationContext
      });

      // Use the comprehensive quota manager
      const quotaResult = await handleQuotaExceeded(
        error,
        deleteOldestHiddenVideos,
        operationContext || { operationType: 'unknown' }
      );

      // If cleanup was successful, retry the operation
      if (quotaResult.success && quotaResult.cleanupPerformed) {
        try {
          // FIXED P2-7: Added defensive validation for config value
          // Even though QUOTA_CONFIG.MAX_RETRY_ATTEMPTS is defined in constants.js,
          // clamp to sane range [1,10] to prevent infinite loops or zero retries
          const maxRetries = Math.max(1, Math.min(10, QUOTA_CONFIG.MAX_RETRY_ATTEMPTS || 3));
          let lastError = error;

          // FIXED P2-3: Track total cleanup across all retries to prevent excessive deletion
          // Prevents nested retries from deleting more than 2x MAX_CLEANUP_COUNT total
          const maxTotalCleanup = QUOTA_CONFIG.MAX_CLEANUP_COUNT * 2; // 10,000 total budget
          let totalCleaned = quotaResult.recordsDeleted || 0;

          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              // Pass increased quota retry depth to prevent nested loops
              return await withStore(mode, handler, {
                ...operationContext,
                retryAttempt: attempt,
                quotaRetryDepth: quotaRetryDepth + 1
              });
            } catch (retryError) {
              lastError = retryError;
              const retryErrorType = classifyError(retryError);

              // If still quota exceeded, perform additional cleanup
              if (retryErrorType === ErrorType.QUOTA_EXCEEDED && attempt < maxRetries) {
                // FIXED P2-3: Check total cleanup budget before performing more cleanup
                const remainingBudget = maxTotalCleanup - totalCleaned;
                if (remainingBudget <= 0) {
                  warn('[IndexedDB] Total cleanup budget exhausted, stopping retries', {
                    operation: 'quota_retry',
                    attempt,
                    totalCleaned,
                    maxBudget: maxTotalCleanup
                  });
                  break; // Exit retry loop - budget exhausted
                }

                logError('IndexedDB', retryError, {
                  operation: 'quota_retry',
                  attempt,
                  quotaRetryDepth,
                  performingAdditionalCleanup: true,
                  remainingBudget
                });

                // FIXED P2-4: Conservative multiplicative cleanup strategy
                // Uses 1.5x growth instead of 2x to prevent excessive deletion
                // Example progression for 1000 initial: 1000 -> 1500 -> 2250 -> 3375
                const additionalCleanup = quotaResult.recordsDeleted * Math.pow(1.5, attempt);
                const cappedCleanup = Math.min(
                  Math.floor(additionalCleanup),
                  QUOTA_CONFIG.MAX_CLEANUP_COUNT, // Cap at 5000 per retry
                  remainingBudget // Don't exceed total budget
                );

                if (cappedCleanup <= 0) {
                  warn('[IndexedDB] No cleanup budget remaining, stopping retries');
                  break;
                }

                logError('IndexedDB', new Error('Performing progressive cleanup'), {
                  operation: 'quota_retry',
                  attempt,
                  initialCleanup: quotaResult.recordsDeleted,
                  additionalCleanup: cappedCleanup,
                  totalDeleted: totalCleaned + cappedCleanup,
                  budgetRemaining: remainingBudget - cappedCleanup
                });

                await deleteOldestHiddenVideos(cappedCleanup);
                totalCleaned += cappedCleanup;
              } else if (retryErrorType !== ErrorType.QUOTA_EXCEEDED) {
                // Different error - throw immediately
                throw retryError;
              }
            }
          }

          // All retries exhausted - data is safely in fallback storage
          logError('IndexedDB', lastError, {
            operation: 'quota_retry_exhausted',
            quotaRetryDepth,
            dataInFallbackStorage: quotaResult.fallbackSaved,
            fallbackRecords: quotaResult.fallbackRecords,
            fatal: true
          });

          throw lastError;
        } catch (retryError) {
          throw retryError;
        }
      }

      // Cleanup failed - data is in fallback storage if available
      logError('IndexedDB', error, {
        operation: 'quota_cleanup_failed',
        quotaRetryDepth,
        quotaResult,
        fatal: true
      });

      throw error;
    }

    // Handle corruption
    if (errorType === ErrorType.CORRUPTION) {
      logError('IndexedDB', error, { operation: 'withStore', corruption: true });
      await attemptDatabaseReset();
      throw error;
    }

    logError('IndexedDB', error, { operation: 'withStore', mode, fatal: true });
    throw error;
  } finally {
    // FIXED P1-1: Synchronous decrement prevents SW termination race
    // Must complete before Chrome can terminate Service Worker
    decrementOperations();

    // CRITICAL: Re-read activeOperations atomically to prevent race condition
    // Don't use return value from decrementOperations() - it's a stale snapshot!
    // Between decrement and this check, another operation may have incremented
    if (shutdownRequested && activeOperations === 0) {
      // Use resolvedDb for synchronous cleanup to prevent race condition
      // where Chrome terminates Service Worker before async operations complete
      if (resolvedDb) {
        try {
          resolvedDb.close();
          dbPromise = null;
          resolvedDb = null;
          clearBackgroundCache();
        } catch (error) {
          // Ignore errors during shutdown cleanup
          dbPromise = null;
          resolvedDb = null;
          clearBackgroundCache();
        }
      }

      // Call pending close callback if registered
      if (pendingCloseCallback) {
        const callback = pendingCloseCallback;
        pendingCloseCallback = null;
        try {
          callback();
        } catch (error) {
          logError('IndexedDB', error, { operation: 'pendingCloseCallback' });
        }
      }
    }
  }
}

export async function initializeDb() {
  await openDb();
}
export async function upsertHiddenVideos(records) {
  if (!records || records.length === 0) return;

  // Validate all videoIds before processing
  const validRecords = records.filter(record => {
    if (!record || !record.videoId) {
      logError('IndexedDB', new Error('Record missing videoId'), {
        operation: 'upsertHiddenVideos',
        record
      });
      return false;
    }
    if (!isValidVideoId(record.videoId)) {
      logError('IndexedDB', new Error('Invalid videoId format'), {
        operation: 'upsertHiddenVideos',
        videoId: record.videoId
      });
      return false;
    }
    return true;
  });

  if (validRecords.length === 0) return;

  // Pass operation context for quota management
  const operationContext = {
    operationType: 'upsert_batch',
    data: validRecords,
    recordCount: validRecords.length
  };

  await withStore('readwrite', (store) => {
    validRecords.forEach((record) => {
      store.put(record);
      // Update background cache
      setCachedRecord(record.videoId, record);
    });
  }, operationContext);
}

export async function upsertHiddenVideo(record) {
  if (!record) return;
  await upsertHiddenVideos([record]);
}

export async function deleteHiddenVideo(videoId) {
  if (!videoId) return;

  // Validate videoId format for security
  if (!isValidVideoId(videoId)) {
    logError('IndexedDB', new Error('Invalid videoId format'), {
      operation: 'deleteHiddenVideo',
      videoId
    });
    return;
  }

  await withStore('readwrite', (store) => {
    store.delete(videoId);
  });
  // Invalidate background cache
  invalidateCache(videoId);
}

/**
 * Deletes multiple hidden videos in a single transaction
 * @param {string[]} videoIds - Array of video IDs to delete
 * @returns {Promise<void>}
 */
export async function deleteHiddenVideos(videoIds) {
  if (!videoIds || videoIds.length === 0) return;
  const unique = Array.from(new Set(videoIds.filter(Boolean)));
  if (unique.length === 0) return;

  // Validate all videoIds for security
  const validIds = unique.filter(videoId => {
    if (!isValidVideoId(videoId)) {
      logError('IndexedDB', new Error('Invalid videoId format'), {
        operation: 'deleteHiddenVideos',
        videoId
      });
      return false;
    }
    return true;
  });

  if (validIds.length === 0) return;

  await withStore('readwrite', (store) => {
    validIds.forEach(videoId => store.delete(videoId));
  });

  // Invalidate background cache for all deleted videos
  validIds.forEach(videoId => invalidateCache(videoId));
}

// Use cursor for large batches (configurable threshold)
const GET_CURSOR_THRESHOLD = INDEXEDDB_CONFIG.GET_CURSOR_THRESHOLD;

/**
 * Gets hidden videos by IDs using individual get requests (for small batches)
 * @param {string[]} unique - Array of unique video IDs
 * @returns {Promise<Object>} - Map of videoId -> record
 */
async function getHiddenVideosByIdsIndividual(unique) {
  return withStore('readonly', (store) => {
    const promises = unique.map((videoId) => new Promise((resolve) => {
      const request = store.get(videoId);
      request.onsuccess = () => {
        resolve([videoId, request.result || null]);
      };
      request.onerror = () => {
        resolve([videoId, null]);
      };
    }));
    return Promise.all(promises).then((entries) => {
      const fetched = {};
      entries.forEach(([videoId, value]) => {
        // Cache the fetched record
        setCachedRecord(videoId, value);
        if (value) {
          fetched[videoId] = value;
        }
      });
      return fetched;
    });
  });
}

/**
 * Gets hidden videos by IDs using cursor scan (for large batches)
 * @param {string[]} ids - Array of video IDs
 * @returns {Promise<Object>} - Map of videoId -> record
 */
async function getHiddenVideosByIdsCursor(ids) {
  const idSet = new Set(ids);
  const result = {};

  await withStore('readonly', (store) => withProgressiveCursorTimeout(
    () => new Promise((resolve, reject) => {
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (!cursor) {
          resolve();
          return;
        }

        if (idSet.has(cursor.value.videoId)) {
          result[cursor.value.videoId] = cursor.value;
          // Cache the fetched record
          setCachedRecord(cursor.value.videoId, cursor.value);
        }

        cursor.continue();
      };

      request.onerror = () => reject(request.error);
    }),
    'Cursor scan for video IDs'
  ));

  return result;
}
export async function getHiddenVideosByIds(ids) {
  if (!ids || ids.length === 0) return {};
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return {};

  // Check background cache first
  const result = {};
  const missing = [];

  unique.forEach((videoId) => {
    const cached = getCachedRecord(videoId);
    if (cached !== undefined) {
      // cached can be an object (found) or null (explicitly deleted)
      if (cached) { // Only add non-null records to result
        result[videoId] = cached;
      }
    } else {
      // undefined means not in cache - need to fetch from IndexedDB
      missing.push(videoId);
    }
  });

  // Fetch missing records from IndexedDB
  if (missing.length === 0) return result;

  // For small batches, use individual get requests
  // For large batches, use cursor scan
  const fetchedRecords = missing.length < GET_CURSOR_THRESHOLD
    ? await getHiddenVideosByIdsIndividual(missing)
    : await getHiddenVideosByIdsCursor(missing);

  return { ...result, ...fetchedRecords };
}
export async function getHiddenVideosPage(options = {}) {
  const { state = null, cursor = null, limit = 100 } = options;
  const pageSize = Math.max(1, Math.min(limit, 500));
  const limitPlusOne = pageSize + 1;
  return withStore('readonly', (store) => withProgressiveCursorTimeout(
    () => new Promise((resolve, reject) => {
      const items = [];
      let hasMore = false;
      let nextCursor = null;
      let resolved = false;
      const skip = cursor && cursor.videoId ? cursor : null;
      let skipping = Boolean(skip);
      const direction = 'prev';
      function finish(payload) {
        if (resolved) return;
        resolved = true;
        resolve(payload);
      }
      function fail(error) {
        if (resolved) return;
        resolved = true;
        reject(error);
      }
      let request;
      if (state) {
        const index = store.index(STATE_UPDATED_AT_INDEX);
        const lower = [state, 0];
        const upper = [state, Number.MAX_SAFE_INTEGER];
        const range = IDBKeyRange.bound(lower, upper);
        request = index.openCursor(range, direction);
      } else {
        const index = store.index(UPDATED_AT_INDEX);
        request = index.openCursor(null, direction);
      }
      request.onsuccess = (event) => {
        const cursorObject = event.target.result;
        if (!cursorObject) {
          finish({ items, hasMore, nextCursor });
          return;
        }
        const value = cursorObject.value;
        if (skipping) {
          const matchesState = !skip || !skip.state || value.state === skip.state;
          if (matchesState && value.updatedAt === skip.updatedAt && value.videoId === skip.videoId) {
            skipping = false;
          }
          cursorObject.continue();
          return;
        }
        items.push(value);
        if (items.length === limitPlusOne) {
          const lastItem = items[pageSize - 1];
          items.pop();
          nextCursor = {
            state: state || null,
            updatedAt: lastItem.updatedAt,
            videoId: lastItem.videoId
          };
          hasMore = true;
          finish({ items, hasMore, nextCursor });
          return;
        }
        cursorObject.continue();
      };
      request.onerror = () => {
        fail(request.error);
      };
    }),
    'Pagination cursor'
  ));
}
// Use cursor for stats calculation on large databases (configurable threshold)
const STATS_CURSOR_THRESHOLD = INDEXEDDB_CONFIG.STATS_CURSOR_THRESHOLD;

/**
 * Gets stats using separate count operations (faster for small databases)
 * @returns {Promise<Object>} - Stats object with total, dimmed, hidden counts
 */
async function getHiddenVideosStatsCount() {
  return withStore('readonly', (store) => withTimeout(
    new Promise((resolve, reject) => {
      const counts = { total: 0, dimmed: 0, hidden: 0 };
      let remaining = 3;
      function handleSuccess(key, request) {
        counts[key] = request.result || 0;
        remaining -= 1;
        if (remaining === 0) {
          resolve(counts);
        }
      }
      function handleError(request) {
        reject(request.error);
      }
      const totalRequest = store.count();
      totalRequest.onsuccess = () => handleSuccess('total', totalRequest);
      totalRequest.onerror = () => handleError(totalRequest);
      const stateIndex = store.index(STATE_INDEX);
      const dimmedRequest = stateIndex.count('dimmed');
      dimmedRequest.onsuccess = () => handleSuccess('dimmed', dimmedRequest);
      dimmedRequest.onerror = () => handleError(dimmedRequest);
      const hiddenRequest = stateIndex.count('hidden');
      hiddenRequest.onsuccess = () => handleSuccess('hidden', hiddenRequest);
      hiddenRequest.onerror = () => handleError(hiddenRequest);
    }),
    INDEXEDDB_CONFIG.OPERATION_TIMEOUT,
    'Stats count operations'
  ));
}

/**
 * Gets stats using single cursor scan (faster for large databases)
 * @returns {Promise<Object>} - Stats object with total, dimmed, hidden counts
 */
async function getHiddenVideosStatsCursor() {
  return withStore('readonly', (store) => withProgressiveCursorTimeout(
    () => new Promise((resolve, reject) => {
      const counts = { total: 0, dimmed: 0, hidden: 0 };
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (!cursor) {
          resolve(counts);
          return;
        }

        counts.total++;
        if (cursor.value.state === 'dimmed') counts.dimmed++;
        if (cursor.value.state === 'hidden') counts.hidden++;

        cursor.continue();
      };

      request.onerror = () => reject(request.error);
    }),
    'Stats cursor scan'
  ));
}

/**
 * Gets hidden videos statistics
 * Uses cursor scan for large databases (100+ records) for better performance
 * Uses separate count operations for small databases
 * @returns {Promise<Object>} - Stats object with total, dimmed, hidden counts
 */
export async function getHiddenVideosStats() {
  // First, get a quick count to decide which method to use
  const total = await withStore('readonly', (store) => withTimeout(
    new Promise((resolve, reject) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result || 0);
      request.onerror = () => reject(request.error);
    }),
    INDEXEDDB_CONFIG.OPERATION_TIMEOUT,
    'Count operation for stats'
  ));

  // For small databases, use separate count operations (faster)
  // For large databases, use cursor scan (single pass)
  if (total < STATS_CURSOR_THRESHOLD) {
    return getHiddenVideosStatsCount();
  } else {
    return getHiddenVideosStatsCursor();
  }
}

export async function deleteOldestHiddenVideos(count) {
  if (!Number.isFinite(count) || count <= 0) return;
  // FIXED P3-4: Use constant instead of magic number
  const target = Math.min(Math.floor(count), UI_TIMING.MAX_DELETE_COUNT);
  const deletedIds = [];

  await withStore('readwrite', (store) => withProgressiveCursorTimeout(
    () => new Promise((resolve, reject) => {
      const index = store.index(UPDATED_AT_INDEX);
      let removed = 0;
      let resolved = false;
      function finish() {
        if (resolved) return;
        resolved = true;
        resolve();
      }
      const request = index.openCursor(null, 'next');
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (!cursor) {
          finish();
          return;
        }
        const videoId = cursor.value.videoId;
        cursor.delete();
        deletedIds.push(videoId);
        removed += 1;
        if (removed >= target) {
          finish();
          return;
        }
        cursor.continue();
      };
      request.onerror = () => {
        if (resolved) return;
        resolved = true;
        reject(request.error);
      };
    }),
    'Delete oldest videos cursor'
  ));

  // Invalidate cache for all deleted videos
  deletedIds.forEach(videoId => invalidateCache(videoId));
}

export async function clearHiddenVideosStore() {
  await withStore('readwrite', (store) => {
    store.clear();
  });
  // Clear the entire background cache since all records are deleted
  clearBackgroundCache();
}

// Database reset for corruption recovery
async function attemptDatabaseReset() {
  // If reset is already in progress, wait for it to complete
  if (dbResetInProgress && dbResetPromise) {
    return dbResetPromise;
  }

  // Set flag and create promise before any async operations
  dbResetInProgress = true;

  dbResetPromise = (async () => {
    try {
      logError('IndexedDB', new Error('Attempting database reset'), {
        operation: 'reset',
        reason: 'corruption'
      });

      // FIXED P1-1: Wait for all active operations to complete before reset
      // This prevents race conditions where operations try to use dbPromise
      // while it's being set to null during reset
      // FIXED P3-4: Use constant instead of magic number
      const MAX_WAIT_TIME = UI_TIMING.DB_RESET_MAX_WAIT_MS;
      const startTime = Date.now();
      while (activeOperations > 0 && (Date.now() - startTime) < MAX_WAIT_TIME) {
        logError('IndexedDB', new Error('Waiting for active operations to complete before reset'), {
          operation: 'reset',
          activeOperations,
          waitedMs: Date.now() - startTime
        });
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (activeOperations > 0) {
        logError('IndexedDB', new Error('Proceeding with reset despite active operations'), {
          operation: 'reset',
          activeOperations,
          warning: 'Some operations may fail'
        });
      }

      // Close existing connection
      if (dbPromise) {
        try {
          const db = await dbPromise;
          db.close();
        } catch (closeError) {
          logError('IndexedDB', closeError, { operation: 'reset', phase: 'close' });
        }
        dbPromise = null;
        resolvedDb = null;
      }

      // Delete and recreate database
      await withTimeout(
        new Promise((resolve, reject) => {
          const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
          deleteRequest.onsuccess = () => resolve();
          deleteRequest.onerror = () => reject(deleteRequest.error);
          deleteRequest.onblocked = () => {
            logError('IndexedDB', new Error('Delete blocked'), { operation: 'reset' });
            // Continue anyway
            resolve();
          };
        }),
        INDEXEDDB_CONFIG.RESET_TIMEOUT,
        'Database delete for reset'
      );

      // Reopen database
      await openDb();

      // Clear the entire background cache since database was reset
      clearBackgroundCache();

      logError('IndexedDB', new Error('Database reset successful'), {
        operation: 'reset',
        success: true
      });
    } catch (error) {
      logError('IndexedDB', error, { operation: 'reset', fatal: true });
      throw error;
    } finally {
      dbResetInProgress = false;
      dbResetPromise = null;
    }
  })();

  return dbResetPromise;
}

// Export reset function for external use
export { attemptDatabaseReset };

/**
 * Processes fallback storage and attempts to save pending records to IndexedDB
 * Should be called periodically or when quota is likely available
 * Uses a lock to prevent race conditions when multiple alarm callbacks trigger simultaneously
 * @returns {Promise<Object>} Result with success count and remaining records
 */
export async function processFallbackStorage() {
  // Prevent race condition: if already processing, return the existing promise
  if (fallbackProcessingInProgress && fallbackProcessingPromise) {
    logError('IndexedDB', new Error('Fallback processing already in progress'), {
      operation: 'processFallbackStorage',
      skipped: true
    });
    return fallbackProcessingPromise;
  }

  // Set lock flag and create promise
  fallbackProcessingInProgress = true;

  fallbackProcessingPromise = (async () => {
    try {
      const fallbackRecords = await getFromFallbackStorage();

      if (fallbackRecords.length === 0) {
        return {
          success: true,
          processed: 0,
          remaining: 0,
          message: 'No fallback records to process'
        };
      }

      logError('IndexedDB', new Error('Processing fallback storage'), {
        operation: 'processFallbackStorage',
        recordCount: fallbackRecords.length
      });

      // Process in batches to avoid overwhelming IndexedDB
      const BATCH_SIZE = 100;
      let processedCount = 0;
      let failedAtBatch = -1;

      for (let i = 0; i < fallbackRecords.length; i += BATCH_SIZE) {
        const batch = fallbackRecords.slice(i, Math.min(i + BATCH_SIZE, fallbackRecords.length));

        try {
          await upsertHiddenVideos(batch);
          processedCount += batch.length;

          // Successfully saved this batch - remove from fallback storage
          await removeFromFallbackStorage(batch.length);
        } catch (error) {
          const errorType = classifyError(error);

          if (errorType === ErrorType.QUOTA_EXCEEDED) {
            // Still quota exceeded - stop processing
            failedAtBatch = i;
            logError('IndexedDB', error, {
              operation: 'processFallbackStorage',
              quotaStillExceeded: true,
              processedCount,
              remainingCount: fallbackRecords.length - processedCount
            });
            break;
          } else {
            // Other error - log and continue with next batch
            logError('IndexedDB', error, {
              operation: 'processFallbackStorage',
              batchIndex: i,
              batchSize: batch.length,
              continuing: true
            });
          }
        }
      }

      const remaining = fallbackRecords.length - processedCount;

      return {
        success: processedCount > 0,
        processed: processedCount,
        remaining,
        message: processedCount > 0
          ? `Successfully processed ${processedCount} records from fallback storage. ${remaining} remaining.`
          : 'Failed to process fallback records - quota may still be exceeded.'
      };
    } catch (error) {
      logError('IndexedDB', error, {
        operation: 'processFallbackStorage',
        fatal: true
      });

      return {
        success: false,
        processed: 0,
        remaining: 0,
        error: error.message
      };
    } finally {
      // Release lock
      fallbackProcessingInProgress = false;
      fallbackProcessingPromise = null;
    }
  })();

  return fallbackProcessingPromise;
}

/**
 * Returns the current shutdown state for monitoring and testing
 * This is useful for debugging graceful shutdown behavior
 * @returns {Object} Current state of shutdown mechanism
 */
export function getShutdownState() {
  return {
    shutdownRequested,
    activeOperations,
    hasPendingCallback: !!pendingCloseCallback,
    hasDbConnection: !!dbPromise,
    hasResolvedDb: !!resolvedDb
  };
}
