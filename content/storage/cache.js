const MAX_CACHE_SIZE = 1000;

const hiddenVideoCache = new Map();
const hiddenVideoTimestamps = new Map();
const cacheAccessOrder = new Map(); // videoId -> lastAccessTime
const pendingHiddenVideoRequests = new Map();

export function getRecordTimestamp(record) {
  return record && Number.isFinite(record.updatedAt) ? record.updatedAt : -1;
}

/**
 * Evicts least recently used entries when cache exceeds MAX_CACHE_SIZE
 */
function evictLRUEntries() {
  if (hiddenVideoCache.size <= MAX_CACHE_SIZE) return;

  const entries = Array.from(cacheAccessOrder.entries())
    .sort((a, b) => a[1] - b[1]); // Sort by access time (oldest first)

  const toEvict = entries.slice(0, hiddenVideoCache.size - MAX_CACHE_SIZE);
  toEvict.forEach(([videoId]) => {
    hiddenVideoCache.delete(videoId);
    hiddenVideoTimestamps.delete(videoId);
    cacheAccessOrder.delete(videoId);
  });
}

export function applyCacheUpdate(videoId, record) {
  if (!videoId) return;
  if (record) {
    const timestamp = getRecordTimestamp(record);
    hiddenVideoCache.set(videoId, record);
    hiddenVideoTimestamps.set(videoId, timestamp === -1 ? Date.now() : timestamp);
    cacheAccessOrder.set(videoId, Date.now());
    evictLRUEntries();
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
      cacheAccessOrder.set(videoId, Date.now());
      return;
    }
  }
  if (record) {
    hiddenVideoCache.set(videoId, record);
    hiddenVideoTimestamps.set(videoId, incomingTimestamp === -1 ? Date.now() : incomingTimestamp);
    cacheAccessOrder.set(videoId, Date.now());
    evictLRUEntries();
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
  // Only update access time for cache hits to prevent memory leak
  // Cache misses should not populate cacheAccessOrder
  if (record) {
    cacheAccessOrder.set(videoId, Date.now());
  }
  return record || null;
}

export function clearCache() {
  hiddenVideoCache.clear();
  hiddenVideoTimestamps.clear();
  cacheAccessOrder.clear();
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
