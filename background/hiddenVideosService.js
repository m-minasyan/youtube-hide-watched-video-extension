import {
  initializeDb,
  upsertHiddenVideo,
  upsertHiddenVideos,
  deleteHiddenVideo,
  getHiddenVideosByIds,
  getHiddenVideosPage,
  getHiddenVideosStats,
  clearHiddenVideosStore,
  deleteOldestHiddenVideos
} from './indexedDb.js';
import { getCacheStats } from './indexedDbCache.js';
import { ensurePromise, queryYoutubeTabs } from '../shared/utils.js';

const STORAGE_KEYS = {
  HIDDEN_VIDEOS: 'YTHWV_HIDDEN_VIDEOS',
  MIGRATION_PROGRESS: 'YTHWV_IDB_MIGRATION_PROGRESS'
};

const BATCH_SIZE = 500;
const MAX_RECORDS = 200000;
const PRUNE_TARGET = 150000;

let migrationPromise = null;
let initialized = false;
let initializationComplete = false;
let initializationError = null;
let dbInitialized = false;
let migrationComplete = false;
let initializationLock = null; // Prevents concurrent initialization calls
function delay(ms = 0) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeState(state) {
  if (state === 'hidden' || state === 'dimmed') return state;
  if (state === 'normal') return 'normal';
  return 'hidden';
}

function sanitizeTitle(title) {
  if (!title) return '';
  const value = String(title);
  if (value.length <= 512) return value;
  return value.slice(0, 512);
}

function buildRecord(videoId, state, title, updatedAt) {
  return {
    videoId,
    state,
    title: sanitizeTitle(title),
    updatedAt
  };
}

async function broadcastHiddenVideosEvent(event) {
  try {
    ensurePromise(chrome.runtime.sendMessage({ type: 'HIDDEN_VIDEOS_EVENT', event })).catch(() => {});
  } catch (error) {
    console.error('Failed to broadcast runtime event', error);
  }
  try {
    const tabs = await queryYoutubeTabs();
    await Promise.all(tabs.map((tab) => ensurePromise(chrome.tabs.sendMessage(tab.id, { type: 'HIDDEN_VIDEOS_EVENT', event })).catch(() => {})));
  } catch (error) {
    console.error('Failed to broadcast tab event', error);
  }
}
function extractLegacyEntries(source) {
  if (!source || typeof source !== 'object') return [];
  return Object.entries(source);
}

function normalizeLegacyRecord(videoId, raw, fallbackTimestamp) {
  const normalizedId = String(videoId).trim();
  if (!normalizedId) return null;
  let state;
  let title = '';
  let updatedAt = fallbackTimestamp;
  if (typeof raw === 'string') {
    state = sanitizeState(raw);
  } else if (raw && typeof raw === 'object') {
    state = sanitizeState(raw.state);
    title = sanitizeTitle(raw.title);
    if (Number.isFinite(raw.updatedAt)) {
      updatedAt = raw.updatedAt;
    }
  } else {
    state = 'hidden';
  }
  if (state === 'normal') {
    state = 'hidden';
  }
  return buildRecord(normalizedId, state, title, updatedAt);
}
async function migrateLegacyHiddenVideos() {
  const [progressResult, localResult, syncResult] = await Promise.all([
    chrome.storage.local.get(STORAGE_KEYS.MIGRATION_PROGRESS),
    chrome.storage.local.get(STORAGE_KEYS.HIDDEN_VIDEOS),
    chrome.storage.sync.get(STORAGE_KEYS.HIDDEN_VIDEOS)
  ]);
  const legacyProgress = progressResult[STORAGE_KEYS.MIGRATION_PROGRESS] || {};
  const localEntries = extractLegacyEntries(localResult[STORAGE_KEYS.HIDDEN_VIDEOS]);
  const syncEntriesRaw = extractLegacyEntries(syncResult[STORAGE_KEYS.HIDDEN_VIDEOS]);
  const localMap = new Map(localEntries.map(([videoId]) => [videoId, true]));
  const syncEntries = syncEntriesRaw.filter(([videoId]) => !localMap.has(videoId));
  const progressState = {
    syncIndex: Math.min(legacyProgress.syncIndex || 0, syncEntries.length),
    localIndex: Math.min(legacyProgress.localIndex || 0, localEntries.length),
    completed: legacyProgress.completed || false
  };
  const timestampBase = Date.now();
  if (syncEntries.length === 0 && localEntries.length === 0) {
    if (!progressState.completed) {
      await chrome.storage.local.set({
        [STORAGE_KEYS.MIGRATION_PROGRESS]: {
          completed: true,
          completedAt: Date.now()
        }
      });
    }
    await chrome.storage.local.remove(STORAGE_KEYS.HIDDEN_VIDEOS);
    await chrome.storage.sync.remove(STORAGE_KEYS.HIDDEN_VIDEOS);
    migrationComplete = true;
    return;
  }
  if (progressState.syncIndex < syncEntries.length) {
    await processLegacyBatch(syncEntries, 'syncIndex', timestampBase, progressState);
  }
  if (progressState.localIndex < localEntries.length) {
    await processLegacyBatch(localEntries, 'localIndex', timestampBase + syncEntries.length, progressState);
  }
  const remainingLocal = extractLegacyEntries((await chrome.storage.local.get(STORAGE_KEYS.HIDDEN_VIDEOS))[STORAGE_KEYS.HIDDEN_VIDEOS]);
  const remainingSync = extractLegacyEntries((await chrome.storage.sync.get(STORAGE_KEYS.HIDDEN_VIDEOS))[STORAGE_KEYS.HIDDEN_VIDEOS]);
  if (remainingLocal.length === 0) {
    await chrome.storage.local.remove(STORAGE_KEYS.HIDDEN_VIDEOS);
  }
  if (remainingSync.length === 0) {
    await chrome.storage.sync.remove(STORAGE_KEYS.HIDDEN_VIDEOS);
  }
  await pruneIfNeeded();
  await chrome.storage.local.set({
    [STORAGE_KEYS.MIGRATION_PROGRESS]: {
      completed: true,
      completedAt: Date.now()
    }
  });
  migrationComplete = true;
}
async function processLegacyBatch(entries, progressKey, timestampSeed, progressState) {
  if (!entries || entries.length === 0) return;
  let index = progressState[progressKey] || 0;
  while (index < entries.length) {
    const slice = entries.slice(index, index + BATCH_SIZE);
    const records = [];
    slice.forEach(([videoId, raw], offset) => {
      const record = normalizeLegacyRecord(videoId, raw, timestampSeed + index + offset);
      if (record) {
        records.push(record);
      }
    });
    if (records.length > 0) {
      await upsertHiddenVideos(records);
    }
    index += slice.length;
    progressState[progressKey] = index;
    progressState.completed = false;
    await chrome.storage.local.set({
      [STORAGE_KEYS.MIGRATION_PROGRESS]: {
        syncIndex: progressState.syncIndex,
        localIndex: progressState.localIndex,
        completed: false,
        updatedAt: Date.now()
      }
    });
    await delay(0);
  }
}
async function pruneIfNeeded() {
  const stats = await getHiddenVideosStats();
  if (!stats || typeof stats.total !== 'number') return;
  if (stats.total <= MAX_RECORDS) return;
  const excess = stats.total - PRUNE_TARGET;
  if (excess <= 0) return;
  if (typeof deleteOldestHiddenVideos === 'function') {
    await deleteOldestHiddenVideos(excess);
  }
}
async function handleGetMany(message) {
  const ids = Array.isArray(message.ids) ? message.ids : [];
  const records = await getHiddenVideosByIds(ids);
  return { records };
}

async function handleSetState(message) {
  const rawId = message.videoId;
  if (!rawId && rawId !== 0) return { records: {} };
  const videoId = String(rawId).trim();
  if (!videoId) return { records: {} };
  const desiredState = sanitizeState(message.state);
  if (desiredState === 'normal') {
    await deleteHiddenVideo(videoId);
    await broadcastHiddenVideosEvent({ type: 'removed', videoId });
    return { removed: true, videoId };
  }
  const existing = await getHiddenVideosByIds([videoId]);
  const previous = existing[videoId];
  const title = sanitizeTitle(message.title) || (previous ? previous.title : '');
  const record = buildRecord(videoId, desiredState, title, Date.now());
  await upsertHiddenVideo(record);
  await pruneIfNeeded();
  await broadcastHiddenVideosEvent({ type: 'updated', record });
  return { record };
}

async function handleGetPage(message) {
  const state = typeof message.state === 'string' ? message.state : null;
  const cursor = message.cursor && typeof message.cursor === 'object' ? message.cursor : null;
  const limit = Number.isFinite(message.limit) ? message.limit : 100;
  return getHiddenVideosPage({ state, cursor, limit });
}

async function handleGetStats() {
  return getHiddenVideosStats();
}

async function handleClearAll() {
  await clearHiddenVideosStore();
  await broadcastHiddenVideosEvent({ type: 'cleared' });
  return { cleared: true };
}

async function handleHealthCheck() {
  let cacheStats;
  try {
    cacheStats = getCacheStats();
  } catch (error) {
    console.error('Failed to get cache stats', error);
    cacheStats = { error: 'Failed to retrieve cache stats' };
  }

  return {
    ready: initializationComplete,
    error: initializationError ? initializationError.message : null,
    components: {
      messageListener: initialized,
      database: dbInitialized,
      migration: migrationComplete
    },
    cache: cacheStats
  };
}

const MESSAGE_HANDLERS = {
  HIDDEN_VIDEOS_HEALTH_CHECK: handleHealthCheck,
  HIDDEN_VIDEOS_GET_MANY: handleGetMany,
  HIDDEN_VIDEOS_SET_STATE: handleSetState,
  HIDDEN_VIDEOS_GET_PAGE: handleGetPage,
  HIDDEN_VIDEOS_GET_STATS: handleGetStats,
  HIDDEN_VIDEOS_CLEAR_ALL: handleClearAll
};

function registerMessageListener() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || typeof message.type !== 'string') return;
    const handler = MESSAGE_HANDLERS[message.type];
    if (!handler) return;

    // Wait for initialization before processing (except health check)
    const promise = message.type === 'HIDDEN_VIDEOS_HEALTH_CHECK'
      ? Promise.resolve().then(() => handler(message, sender))
      : ensureMigration()
          .then(() => handler(message, sender))
          .catch((initError) => {
            // If initialization failed, return meaningful error
            if (initializationError) {
              throw new Error('Background service initialization failed: ' + initError.message);
            }
            throw initError;
          });

    promise.then((result) => {
      sendResponse({ ok: true, result });
    }).catch((error) => {
      console.error('Hidden videos handler error', error);
      sendResponse({ ok: false, error: error.message });
    });
    return true;
  });
}
async function ensureMigration() {
  // If initialization failed, throw the error
  if (initializationError) {
    throw initializationError;
  }

  if (!migrationPromise) {
    migrationPromise = migrateLegacyHiddenVideos().catch((error) => {
      console.error('Hidden videos migration failed', error);
      throw error;
    });
  }
  return migrationPromise;
}

export async function initializeHiddenVideosService() {
  // Register listener FIRST, before any async operations
  if (!initialized) {
    registerMessageListener();
    initialized = true;
  }

  // Prevent concurrent initialization calls using a lock
  if (initializationLock) {
    return initializationLock;
  }

  if (initializationComplete) {
    if (initializationError) {
      throw initializationError;
    }
    return;
  }

  initializationLock = (async () => {
    try {
      await initializeDb();
      dbInitialized = true;
      await ensureMigration();
      initializationComplete = true;
    } catch (error) {
      initializationError = error;
      initializationComplete = true; // Mark as complete even on error
      throw error;
    } finally {
      initializationLock = null;
    }
  })();

  return initializationLock;
}
