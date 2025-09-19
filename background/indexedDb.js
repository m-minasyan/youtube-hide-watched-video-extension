const DB_NAME = 'ythwvHiddenVideos';
const DB_VERSION = 1;
const STORE_NAME = 'hiddenVideos';
const UPDATED_AT_INDEX = 'byUpdatedAt';
const STATE_INDEX = 'byState';
const STATE_UPDATED_AT_INDEX = 'byStateUpdatedAt';

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
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
      resolve(db);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
  return dbPromise;
}

async function withStore(mode, handler) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
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
    tx.onabort = () => reject(tx.error);
  });
}

export async function initializeDb() {
  await openDb();
}
export async function upsertHiddenVideos(records) {
  if (!records || records.length === 0) return;
  await withStore('readwrite', (store) => {
    records.forEach((record) => {
      store.put(record);
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
}
export async function getHiddenVideosByIds(ids) {
  if (!ids || ids.length === 0) return {};
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return {};
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
      const result = {};
      entries.forEach(([videoId, value]) => {
        if (value) {
          result[videoId] = value;
        }
      });
      return result;
    });
  });
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
export async function getHiddenVideosStats() {
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

export async function deleteOldestHiddenVideos(count) {
  if (!Number.isFinite(count) || count <= 0) return;
  const target = Math.min(Math.floor(count), 1000000);
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
      cursor.delete();
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
}

export async function clearHiddenVideosStore() {
  await withStore('readwrite', (store) => {
    store.clear();
  });
}
