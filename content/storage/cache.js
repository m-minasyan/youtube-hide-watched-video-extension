import { LRUCache } from '../../shared/lruCache.js';

const MAX_CACHE_SIZE = 1000;

const hiddenVideoCache = new Map();
const hiddenVideoTimestamps = new Map();
const cacheAccessOrder = new Map(); // videoId -> lastAccessTime
const pendingHiddenVideoRequests = new Map();

// Initialize LRU cache manager with timestamps as auxiliary Map
const lruCache = new LRUCache({
  maxSize: MAX_CACHE_SIZE,
  mainCache: hiddenVideoCache,
  accessOrderMap: cacheAccessOrder,
  auxiliaryMaps: [hiddenVideoTimestamps],
  cacheName: 'HiddenVideoCache'
});

export function getRecordTimestamp(record) {
  return record && Number.isFinite(record.updatedAt) ? record.updatedAt : -1;
}

export function applyCacheUpdate(videoId, record) {
  if (!videoId) return;
  if (record) {
    const timestamp = getRecordTimestamp(record);
    hiddenVideoCache.set(videoId, record);
    hiddenVideoTimestamps.set(videoId, timestamp === -1 ? Date.now() : timestamp);
    lruCache.updateAccessTime(videoId);
    lruCache.evictLRUEntries();
    return;
  }
  hiddenVideoCache.delete(videoId);
  hiddenVideoTimestamps.set(videoId, Date.now());
  cacheAccessOrder.delete(videoId);
}

export function mergeFetchedRecord(videoId, record) {
  if (!videoId) return;
  const incomingTimestamp = getRecordTimestamp(record);
  if (hiddenVideoTimestamps.has(videoId)) {
    const currentTimestamp = hiddenVideoTimestamps.get(videoId);
    if (incomingTimestamp <= currentTimestamp) {
      // Update access time even if not updating record
      lruCache.updateAccessTime(videoId);
      return;
    }
  }
  if (record) {
    hiddenVideoCache.set(videoId, record);
    hiddenVideoTimestamps.set(videoId, incomingTimestamp === -1 ? Date.now() : incomingTimestamp);
    lruCache.updateAccessTime(videoId);
    lruCache.evictLRUEntries();
    return;
  }
  hiddenVideoCache.delete(videoId);
  cacheAccessOrder.delete(videoId);
}

/**
 * Gets a cached hidden video record and updates access tracking
 * @param {string} videoId - Video identifier
 * @returns {Object|null} - Cached record or null
 */
export function getCachedHiddenVideo(videoId) {
  if (!videoId) return null;
  const record = hiddenVideoCache.get(videoId);

  // MEMORY LEAK PREVENTION: Only update access time for cache hits
  // This ensures cacheAccessOrder Map only tracks videos that exist in hiddenVideoCache
  // Cache misses (when record is undefined) should NOT populate cacheAccessOrder
  // This prevents orphaned entries in cacheAccessOrder that would never be evicted
  if (record) {
    lruCache.updateAccessTime(videoId);
  }

  return record || null;
}

export function clearCache() {
  lruCache.clear();
}

export function hasPendingRequest(videoId) {
  return pendingHiddenVideoRequests.has(videoId);
}

export function getPendingRequest(videoId) {
  return pendingHiddenVideoRequests.get(videoId);
}

export function setPendingRequest(videoId, promise) {
  pendingHiddenVideoRequests.set(videoId, promise);
}

export function deletePendingRequest(videoId) {
  pendingHiddenVideoRequests.delete(videoId);
}

/**
 * Clears all pending requests (useful for navigation events)
 */
export function clearPendingRequests() {
  pendingHiddenVideoRequests.clear();
}

export function hasCachedVideo(videoId) {
  return hiddenVideoCache.has(videoId);
}

/**
 * Gets current cache size for monitoring
 * @returns {number} - Number of entries in cache
 */
export function getCacheSize() {
  return hiddenVideoCache.size;
}

/**
 * Gets estimated cache memory usage in bytes
 * @returns {number} - Estimated memory usage
 */
export function getCacheMemoryUsage() {
  let estimatedSize = 0;
  hiddenVideoCache.forEach((record, videoId) => {
    // Estimate: videoId (11 chars * 2 bytes) + record (state, title, updatedAt)
    estimatedSize += videoId.length * 2;
    if (record) {
      estimatedSize += (record.title?.length || 0) * 2;
      estimatedSize += 32; // Approximate overhead for state + updatedAt + object structure
    }
  });
  return estimatedSize;
}

/**
 * Validates cache consistency between all Map structures
 * @returns {Object} - Validation result with status and details
 */
export function validateCacheConsistency() {
  return lruCache.validateConsistency();
}

/**
 * Repairs cache inconsistencies by synchronizing all Map structures
 * @returns {Object} - Repair result with actions taken
 */
export function repairCacheConsistency() {
  return lruCache.repairConsistency();
}
