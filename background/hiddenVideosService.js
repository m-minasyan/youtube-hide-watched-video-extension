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
import { IMPORT_EXPORT_CONFIG } from '../shared/constants.js';

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

async function handleExportAll(message) {
  const allRecords = [];
  let cursor = null;
  let hasMore = true;

  // Fetch all records using pagination
  while (hasMore) {
    const result = await getHiddenVideosPage({
      state: null,
      cursor,
      limit: 500
    });

    allRecords.push(...result.items);
    hasMore = result.hasMore;
    cursor = result.nextCursor;
  }

  // Build export data structure
  const exportData = {
    version: IMPORT_EXPORT_CONFIG.FORMAT_VERSION,
    exportDate: new Date().toISOString(),
    count: allRecords.length,
    records: allRecords.map(record => ({
      videoId: record.videoId,
      state: record.state,
      title: record.title || '',
      updatedAt: record.updatedAt
    }))
  };

  return exportData;
}

/**
 * Validates and sanitizes an import record
 *
 * IMPORTANT: This function mutates the input record object by normalizing
 * videoId, state, and title fields. This is intentional for import processing
 * where we need to sanitize user-provided data before insertion.
 *
 * @param {Object} record - Record to validate (will be mutated)
 * @returns {Array<string>} Array of validation error messages (empty if valid)
 */
function validateRecord(record) {
  const errors = [];

  if (!record || typeof record !== 'object') {
    errors.push('Record is not an object');
    return errors;
  }

  // Validate and sanitize videoId (mutates record)
  if (!record.videoId || typeof record.videoId !== 'string') {
    errors.push('Missing or invalid videoId');
  } else {
    const sanitizedVideoId = String(record.videoId).trim();
    if (sanitizedVideoId.length === 0) {
      errors.push('Empty videoId');
    }
    // Mutation: Update record with sanitized value for import processing
    record.videoId = sanitizedVideoId;
  }

  // Validate and sanitize state (mutates record)
  if (!record.state || typeof record.state !== 'string') {
    errors.push('Missing state');
  } else {
    const sanitizedState = sanitizeState(record.state);
    if (sanitizedState !== 'dimmed' && sanitizedState !== 'hidden') {
      errors.push('Invalid state (must be "dimmed" or "hidden")');
    }
    // Mutation: Update record with sanitized value for import processing
    record.state = sanitizedState;
  }

  // Validate and sanitize title (mutates record)
  if (record.title !== undefined && record.title !== null) {
    record.title = sanitizeTitle(record.title);
  }

  // Validate updatedAt timestamp with range checking
  if (record.updatedAt !== undefined) {
    if (!Number.isFinite(record.updatedAt)) {
      errors.push('Invalid updatedAt timestamp');
    } else {
      // Validate timestamp is reasonable (not negative, not too far in future)
      const now = Date.now();
      const tenYearsInFuture = now + (10 * 365 * 24 * 60 * 60 * 1000);

      if (record.updatedAt < 0) {
        errors.push('updatedAt timestamp cannot be negative');
      } else if (record.updatedAt > tenYearsInFuture) {
        errors.push('updatedAt timestamp is too far in the future');
      }
    }
  }

  return errors;
}

function validateImportData(data) {
  const errors = [];

  // Check for required fields
  if (!data || typeof data !== 'object') {
    errors.push('Invalid data format: not an object');
    return { valid: false, errors };
  }

  if (!data.version || typeof data.version !== 'number') {
    errors.push('Missing or invalid version field');
  }

  if (data.version > IMPORT_EXPORT_CONFIG.FORMAT_VERSION) {
    errors.push(`Unsupported format version ${data.version}. Current version: ${IMPORT_EXPORT_CONFIG.FORMAT_VERSION}`);
  }

  if (!Array.isArray(data.records)) {
    errors.push('Records field must be an array');
    return { valid: false, errors };
  }

  // Backend validation for record count (prevents frontend bypass)
  if (data.records.length > IMPORT_EXPORT_CONFIG.MAX_IMPORT_RECORDS) {
    errors.push(`Too many records. Maximum: ${IMPORT_EXPORT_CONFIG.MAX_IMPORT_RECORDS}, received: ${data.records.length}`);
  }

  // Backend validation for estimated data size (prevents memory exhaustion)
  // Approximate size check: each record roughly ~100-500 bytes
  // For 50MB limit, this allows ~100k-500k records depending on content
  const estimatedSizeBytes = JSON.stringify(data).length;
  const maxSizeBytes = IMPORT_EXPORT_CONFIG.MAX_IMPORT_SIZE_MB * 1024 * 1024;
  if (estimatedSizeBytes > maxSizeBytes) {
    errors.push(`Import data too large. Maximum: ${IMPORT_EXPORT_CONFIG.MAX_IMPORT_SIZE_MB}MB, estimated: ${(estimatedSizeBytes / 1024 / 1024).toFixed(2)}MB`);
  }

  // Validate individual records
  const invalidRecords = [];
  data.records.forEach((record, index) => {
    const recordErrors = validateRecord(record);
    if (recordErrors.length > 0) {
      invalidRecords.push({ index, errors: recordErrors });
    }
  });

  if (invalidRecords.length > 0 && invalidRecords.length === data.records.length) {
    errors.push('All records are invalid');
  } else if (invalidRecords.length > 0) {
    errors.push(`${invalidRecords.length} invalid records found`);
  }

  return {
    valid: errors.length === 0,
    errors,
    invalidRecords,
    validRecordCount: data.records.length - invalidRecords.length
  };
}

async function handleValidateImport(message) {
  const data = message.data;
  const validation = validateImportData(data);

  if (!validation.valid) {
    return {
      valid: false,
      errors: validation.errors,
      invalidRecords: validation.invalidRecords
    };
  }

  // Get current stats for display purposes
  // Note: We don't validate quota here because the actual number of records added
  // depends on the conflict strategy selected by the user
  const currentStats = await getHiddenVideosStats();

  return {
    valid: true,
    validRecordCount: validation.validRecordCount,
    invalidRecordCount: validation.invalidRecords.length,
    currentTotal: currentStats.total,
    // Projected total is only shown as a maximum possible value
    projectedTotal: currentStats.total + validation.validRecordCount
  };
}

async function handleImportRecords(message) {
  const { data, conflictStrategy = IMPORT_EXPORT_CONFIG.CONFLICT_STRATEGIES.SKIP } = message;

  // Validate first
  const validation = validateImportData(data);
  if (!validation.valid) {
    throw new Error(`Invalid import data: ${validation.errors.join(', ')}`);
  }

  const validRecords = data.records.filter((record, index) => {
    return !validation.invalidRecords.some(ir => ir.index === index);
  });

  const results = {
    total: validRecords.length,
    added: 0,
    updated: 0,
    skipped: 0,
    errors: []
  };

  // Get existing records for conflict resolution
  const videoIds = validRecords.map(r => r.videoId);
  let existingRecords = {};

  // Fetch in batches to avoid overwhelming the system
  for (let i = 0; i < videoIds.length; i += BATCH_SIZE) {
    const batchIds = videoIds.slice(i, i + BATCH_SIZE);
    const batchRecords = await getHiddenVideosByIds(batchIds);
    existingRecords = { ...existingRecords, ...batchRecords };
  }

  // Process records based on conflict strategy
  const recordsToUpsert = [];

  for (const record of validRecords) {
    const existing = existingRecords[record.videoId];

    if (!existing) {
      // New record - values already sanitized during validation
      recordsToUpsert.push(buildRecord(
        record.videoId,
        record.state,
        record.title || '',
        record.updatedAt || Date.now()
      ));
      results.added++;
    } else {
      // Existing record - apply conflict strategy
      if (conflictStrategy === IMPORT_EXPORT_CONFIG.CONFLICT_STRATEGIES.SKIP) {
        results.skipped++;
        continue;
      } else if (conflictStrategy === IMPORT_EXPORT_CONFIG.CONFLICT_STRATEGIES.OVERWRITE) {
        recordsToUpsert.push(buildRecord(
          record.videoId,
          record.state,
          record.title || existing.title || '',
          Date.now() // Update timestamp to now
        ));
        results.updated++;
      } else if (conflictStrategy === IMPORT_EXPORT_CONFIG.CONFLICT_STRATEGIES.MERGE) {
        // Keep record with newer timestamp
        const importTimestamp = record.updatedAt || 0;
        const existingTimestamp = existing.updatedAt || 0;

        if (importTimestamp > existingTimestamp) {
          recordsToUpsert.push(buildRecord(
            record.videoId,
            record.state,
            record.title || existing.title || '',
            record.updatedAt
          ));
          results.updated++;
        } else {
          results.skipped++;
        }
      }
    }
  }

  // Check if import would exceed quota before executing
  const currentStats = await getHiddenVideosStats();
  const projectedTotal = currentStats.total + results.added;

  if (projectedTotal > MAX_RECORDS) {
    throw new Error(`Import would exceed maximum record limit. Current: ${currentStats.total}, New records: ${results.added}, Maximum: ${MAX_RECORDS}`);
  }

  // Batch upsert records
  for (let i = 0; i < recordsToUpsert.length; i += BATCH_SIZE) {
    const batch = recordsToUpsert.slice(i, i + BATCH_SIZE);
    try {
      await upsertHiddenVideos(batch);
    } catch (error) {
      results.errors.push(`Failed to import batch ${i / BATCH_SIZE + 1}: ${error.message}`);
    }
  }

  // Check if pruning is needed
  await pruneIfNeeded();

  // Broadcast update event
  await broadcastHiddenVideosEvent({ type: 'imported', count: results.added + results.updated });

  return results;
}

const MESSAGE_HANDLERS = {
  HIDDEN_VIDEOS_HEALTH_CHECK: handleHealthCheck,
  HIDDEN_VIDEOS_GET_MANY: handleGetMany,
  HIDDEN_VIDEOS_SET_STATE: handleSetState,
  HIDDEN_VIDEOS_GET_PAGE: handleGetPage,
  HIDDEN_VIDEOS_GET_STATS: handleGetStats,
  HIDDEN_VIDEOS_CLEAR_ALL: handleClearAll,
  HIDDEN_VIDEOS_EXPORT_ALL: handleExportAll,
  HIDDEN_VIDEOS_VALIDATE_IMPORT: handleValidateImport,
  HIDDEN_VIDEOS_IMPORT_RECORDS: handleImportRecords
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
