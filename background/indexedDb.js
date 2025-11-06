import { retryOperation, logError, classifyError, ErrorType } from '../shared/errorHandler.js';
import { getCachedRecord, setCachedRecord, invalidateCache, clearBackgroundCache } from './indexedDbCache.js';
import { INDEXEDDB_CONFIG, QUOTA_CONFIG } from '../shared/constants.js';
import { handleQuotaExceeded, getFromFallbackStorage, removeFromFallbackStorage } from './quotaManager.js';

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
let activeOperations = 0;
let shutdownRequested = false;
let pendingCloseCallback = null;

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

  // If there are active operations, let them complete gracefully
  // The finally block in withStore() will close the database automatically
  if (activeOperations > 0) {
    logError('IndexedDB', new Error('Graceful shutdown initiated - waiting for active operations'), {
      operation: 'closeDbSync',
      activeOperations,
      shutdownRequested: true
    });
    return;
  }

  // No active operations - close immediately and SYNCHRONOUSLY
  // Use the resolved database instance for synchronous closing
  // This prevents race condition where Chrome kills Service Worker before async .then() executes
  if (resolvedDb) {
    try {
      resolvedDb.close();
      logError('IndexedDB', new Error('Database closed synchronously'), {
        operation: 'closeDbSync',
        success: true,
        synchronous: true
      });
    } catch (error) {
      logError('IndexedDB', error, {
        operation: 'closeDbSync',
        phase: 'close',
        synchronous: true
      });
    }
  }

  // Clear state immediately (synchronously)
  dbPromise = null;
  resolvedDb = null;
  clearBackgroundCache();
}

async function withStore(mode, handler, operationContext = null) {
  // Track active operations for graceful shutdown
  activeOperations++;

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

    const db = await openDb();
    return await retryOperation(
      () => withTimeout(
        new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, mode);
          const store = tx.objectStore(STORE_NAME);
          let handlerPromise;
          let handlerRejected = false;
          let handlerError = null;

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
            // If handler was rejected, reject promise even if transaction completed
            // (shouldn't happen if abort() worked, but defensive programming)
            if (handlerRejected) {
              reject(handlerError);
              return;
            }

            try {
              const value = await handlerPromise;
              resolve(value);
            } catch (error) {
              // Handler failed after transaction completed
              reject(error);
            }
          };

          tx.onerror = () => reject(tx.error);

          tx.onabort = () => {
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
      const maxQuotaRetryDepth = 1; // Only allow one level of quota retry

      if (quotaRetryDepth >= maxQuotaRetryDepth) {
        // Already in a quota retry - don't create nested retry loops
        logError('IndexedDB', error, {
          operation: 'withStore',
          quotaExceeded: true,
          quotaRetryDepth,
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
          // Retry the operation with up to QUOTA_CONFIG.MAX_RETRY_ATTEMPTS attempts
          // Validate retry attempts to prevent excessive retries (1-10 range)
          const maxRetries = Math.max(1, Math.min(QUOTA_CONFIG.MAX_RETRY_ATTEMPTS || 3, 10));
          let lastError = error;

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
                logError('IndexedDB', retryError, {
                  operation: 'quota_retry',
                  attempt,
                  quotaRetryDepth,
                  performingAdditionalCleanup: true
                });

                // Progressive cleanup - delete more records each retry
                const additionalCleanup = quotaResult.recordsDeleted * 0.5; // 50% more each time
                await deleteOldestHiddenVideos(Math.floor(additionalCleanup));
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
    // Decrement active operations counter
    activeOperations--;

    // If shutdown was requested and no operations are active, close the database
    if (shutdownRequested && activeOperations === 0) {
      if (dbPromise) {
        try {
          dbPromise.then(db => {
            db.close();
            dbPromise = null;
            resolvedDb = null;
            clearBackgroundCache();
          }).catch(() => {
            // Database may already be closed or in error state
            dbPromise = null;
            resolvedDb = null;
            clearBackgroundCache();
          });
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

  // Pass operation context for quota management
  const operationContext = {
    operationType: 'upsert_batch',
    data: records,
    recordCount: records.length
  };

  await withStore('readwrite', (store) => {
    records.forEach((record) => {
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

  await withStore('readwrite', (store) => {
    unique.forEach(videoId => store.delete(videoId));
  });

  // Invalidate background cache for all deleted videos
  unique.forEach(videoId => invalidateCache(videoId));
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

  await withStore('readonly', (store) => withTimeout(
    new Promise((resolve, reject) => {
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
    INDEXEDDB_CONFIG.CURSOR_TIMEOUT,
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
  return withStore('readonly', (store) => withTimeout(
    new Promise((resolve, reject) => {
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
    INDEXEDDB_CONFIG.CURSOR_TIMEOUT,
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
  return withStore('readonly', (store) => withTimeout(
    new Promise((resolve, reject) => {
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
    INDEXEDDB_CONFIG.CURSOR_TIMEOUT,
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
  const target = Math.min(Math.floor(count), 1000000);
  const deletedIds = [];

  await withStore('readwrite', (store) => withTimeout(
    new Promise((resolve, reject) => {
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
    INDEXEDDB_CONFIG.CURSOR_TIMEOUT,
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
