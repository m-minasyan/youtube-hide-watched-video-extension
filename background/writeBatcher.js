/**
 * Write-behind batching for IndexedDB operations
 * Collects multiple write operations and flushes in batches to reduce transaction overhead
 */

import { upsertHiddenVideos } from './indexedDb.js';

const BATCH_FLUSH_DELAY = 100; // 100ms
const BATCH_MAX_SIZE = 50; // Flush after 50 operations

const pendingWrites = new Map(); // videoId -> record
let flushTimer = null;
let flushPromise = null;

/**
 * Queues a write operation for batch processing
 * @param {string} videoId - Video identifier
 * @param {Object} record - Video record to write
 * @returns {void}
 *
 * @example
 * queueWrite('abc123', { videoId: 'abc123', state: 'hidden', title: 'Video', updatedAt: Date.now() });
 *
 * @note Writes are automatically flushed after BATCH_FLUSH_DELAY ms
 * or when BATCH_MAX_SIZE operations are queued
 */
export function queueWrite(videoId, record) {
  pendingWrites.set(videoId, record);

  if (pendingWrites.size >= BATCH_MAX_SIZE) {
    return flushWrites();
  } else {
    scheduleFlush();
  }
}

/**
 * Schedules a flush of pending writes
 */
function scheduleFlush() {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => flushWrites(), BATCH_FLUSH_DELAY);
}

/**
 * Flushes all pending writes to IndexedDB
 * @returns {Promise<void>}
 */
async function flushWrites() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (pendingWrites.size === 0) return;

  // If a flush is already in progress, wait for it
  if (flushPromise) {
    await flushPromise;
    // After the previous flush completes, check if there are new writes
    if (pendingWrites.size === 0) return;
  }

  const batch = Array.from(pendingWrites.values());
  pendingWrites.clear();

  flushPromise = upsertHiddenVideos(batch).finally(() => {
    flushPromise = null;
  });

  return flushPromise;
}

/**
 * Forces an immediate flush of all pending writes
 * @returns {Promise<void>}
 */
export async function forceFlush() {
  return flushWrites();
}

/**
 * Gets the number of pending writes
 * @returns {number}
 */
export function getPendingWriteCount() {
  return pendingWrites.size;
}

/**
 * Clears all pending writes without flushing
 * @returns {void}
 */
export function clearPendingWrites() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  pendingWrites.clear();
}
