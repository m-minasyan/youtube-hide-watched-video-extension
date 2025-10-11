import { retryOperation, logError, classifyError, ErrorType } from '../shared/errorHandler.js';
import { getCachedRecord, setCachedRecord, invalidateCache, clearBackgroundCache } from './indexedDbCache.js';
import { INDEXEDDB_CONFIG } from '../shared/constants.js';

const DB_NAME = 'ythwvHiddenVideos';
const DB_VERSION = 1;
const STORE_NAME = 'hiddenVideos';
const UPDATED_AT_INDEX = 'byUpdatedAt';
const STATE_INDEX = 'byState';
const STATE_UPDATED_AT_INDEX = 'byStateUpdatedAt';

let dbPromise = null;
let dbResetInProgress = false;
let dbResetPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;

  dbPromise = retryOperation(
    () => new Promise((resolve, reject) => {
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
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
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
    throw error;
  });

  return dbPromise;
}

async function withStore(mode, handler) {
  try {
    const db = await openDb();
    return await retryOperation(
      () => new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        const handlerPromise = Promise.resolve().then(() => handler(store, tx));

        tx.oncomplete = async () => {
          try {
            const value = await handlerPromise;
            resolve(value);
          } catch (error) {
            reject(error);
          }
        };

        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
      }),
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

    // Handle quota exceeded
    if (errorType === ErrorType.QUOTA_EXCEEDED) {
      logError('IndexedDB', error, { operation: 'withStore', quotaExceeded: true });

      // Attempt to free space by deleting oldest records
      try {
        await deleteOldestHiddenVideos(1000);
        // Retry the operation once after cleanup
        return await withStore(mode, handler);
      } catch (cleanupError) {
        logError('IndexedDB', cleanupError, { operation: 'quota_cleanup', fatal: true });
        throw error;
      }
    }

    // Handle corruption
    if (errorType === ErrorType.CORRUPTION) {
      logError('IndexedDB', error, { operation: 'withStore', corruption: true });
      await attemptDatabaseReset();
      throw error;
    }

    logError('IndexedDB', error, { operation: 'withStore', mode, fatal: true });
    throw error;
  }
}

export async function initializeDb() {
  await openDb();
}
export async function upsertHiddenVideos(records) {
  if (!records || records.length === 0) return;
  await withStore('readwrite', (store) => {
    records.forEach((record) => {
      store.put(record);
      // Update background cache
      setCachedRecord(record.videoId, record);
    });
  });
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

  await withStore('readonly', (store) => new Promise((resolve, reject) => {
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
  }));

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
  return withStore('readonly', (store) => new Promise((resolve, reject) => {
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
  }));
}
// Use cursor for stats calculation on large databases (configurable threshold)
const STATS_CURSOR_THRESHOLD = INDEXEDDB_CONFIG.STATS_CURSOR_THRESHOLD;

/**
 * Gets stats using separate count operations (faster for small databases)
 * @returns {Promise<Object>} - Stats object with total, dimmed, hidden counts
 */
async function getHiddenVideosStatsCount() {
  return withStore('readonly', (store) => new Promise((resolve, reject) => {
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
  }));
}

/**
 * Gets stats using single cursor scan (faster for large databases)
 * @returns {Promise<Object>} - Stats object with total, dimmed, hidden counts
 */
async function getHiddenVideosStatsCursor() {
  return withStore('readonly', (store) => new Promise((resolve, reject) => {
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
  }));
}

/**
 * Gets hidden videos statistics
 * Uses cursor scan for large databases (100+ records) for better performance
 * Uses separate count operations for small databases
 * @returns {Promise<Object>} - Stats object with total, dimmed, hidden counts
 */
export async function getHiddenVideosStats() {
  // First, get a quick count to decide which method to use
  const total = await withStore('readonly', (store) => new Promise((resolve, reject) => {
    const request = store.count();
    request.onsuccess = () => resolve(request.result || 0);
    request.onerror = () => reject(request.error);
  }));

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

  await withStore('readwrite', (store) => new Promise((resolve, reject) => {
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
  }));

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
      }

      // Delete and recreate database
      await new Promise((resolve, reject) => {
        const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => reject(deleteRequest.error);
        deleteRequest.onblocked = () => {
          logError('IndexedDB', new Error('Delete blocked'), { operation: 'reset' });
          // Continue anyway
          resolve();
        };
      });

      // Reopen database
      await openDb();

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
