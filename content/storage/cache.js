const MAX_CACHE_SIZE = 1000;

const hiddenVideoCache = new Map();
const hiddenVideoTimestamps = new Map();
const cacheAccessOrder = new Map(); // videoId -> lastAccessTime
const pendingHiddenVideoRequests = new Map();

// Flag to prevent concurrent eviction operations
let isEvicting = false;

export function getRecordTimestamp(record) {
  return record && Number.isFinite(record.updatedAt) ? record.updatedAt : -1;
}

/**
 * Evicts least recently used entries when cache exceeds MAX_CACHE_SIZE
 * Uses synchronization to prevent race conditions and ensure cache consistency
 */
function evictLRUEntries() {
  // Early exit if cache is within limits
  if (hiddenVideoCache.size <= MAX_CACHE_SIZE) return;

  // Prevent concurrent eviction operations
  if (isEvicting) return;

  try {
    isEvicting = true;

    // Re-check size after acquiring lock (might have changed)
    if (hiddenVideoCache.size <= MAX_CACHE_SIZE) return;

    // Create snapshot of entries to evict (oldest first)
    const entries = Array.from(cacheAccessOrder.entries())
      .sort((a, b) => a[1] - b[1]); // Sort by access time (oldest first)

    const numToEvict = hiddenVideoCache.size - MAX_CACHE_SIZE;
    const toEvict = entries.slice(0, numToEvict);

    // Batch delete: collect IDs first, then delete atomically
    // This minimizes the window for inconsistency
    const videoIdsToEvict = toEvict.map(([videoId]) => videoId);

    // Delete from all Maps in a single pass to maintain consistency
    videoIdsToEvict.forEach((videoId) => {
      hiddenVideoCache.delete(videoId);
      hiddenVideoTimestamps.delete(videoId);
      cacheAccessOrder.delete(videoId);
    });

    // Validate consistency: all three Maps should have same size
    if (hiddenVideoCache.size !== hiddenVideoTimestamps.size) {
      console.error('[Cache] Inconsistency detected: hiddenVideoCache size', hiddenVideoCache.size,
                    'vs hiddenVideoTimestamps size', hiddenVideoTimestamps.size);
    }
  } finally {
    // Always release lock, even if error occurs
    isEvicting = false;
  }
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
  // Always update access time, even for cache misses
  // This ensures LRU tracking works correctly for all queries
  cacheAccessOrder.set(videoId, Date.now());
  return record || null;
}

export function clearCache() {
  // Reset eviction flag to prevent deadlock
  isEvicting = false;

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

/**
 * Validates cache consistency between all Map structures
 * @returns {Object} - Validation result with status and details
 */
export function validateCacheConsistency() {
  const issues = [];

  // Check size consistency
  if (hiddenVideoCache.size !== hiddenVideoTimestamps.size) {
    issues.push({
      type: 'size_mismatch',
      message: `hiddenVideoCache size (${hiddenVideoCache.size}) !== hiddenVideoTimestamps size (${hiddenVideoTimestamps.size})`
    });
  }

  // Check that all keys in hiddenVideoCache exist in hiddenVideoTimestamps
  for (const videoId of hiddenVideoCache.keys()) {
    if (!hiddenVideoTimestamps.has(videoId)) {
      issues.push({
        type: 'missing_timestamp',
        videoId,
        message: `Video ${videoId} in cache but missing timestamp`
      });
    }
  }

  // Check that all keys in cacheAccessOrder exist in hiddenVideoCache
  for (const videoId of cacheAccessOrder.keys()) {
    if (!hiddenVideoCache.has(videoId) && !hiddenVideoTimestamps.has(videoId)) {
      issues.push({
        type: 'orphaned_access_order',
        videoId,
        message: `Video ${videoId} in access order but not in cache`
      });
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
    sizes: {
      cache: hiddenVideoCache.size,
      timestamps: hiddenVideoTimestamps.size,
      accessOrder: cacheAccessOrder.size
    }
  };
}

/**
 * Repairs cache inconsistencies by synchronizing all Map structures
 * @returns {Object} - Repair result with actions taken
 */
export function repairCacheConsistency() {
  const actions = [];

  // Remove orphaned entries from hiddenVideoTimestamps
  for (const videoId of hiddenVideoTimestamps.keys()) {
    if (!hiddenVideoCache.has(videoId)) {
      hiddenVideoTimestamps.delete(videoId);
      actions.push({ action: 'removed_orphaned_timestamp', videoId });
    }
  }

  // Remove orphaned entries from cacheAccessOrder
  for (const videoId of cacheAccessOrder.keys()) {
    if (!hiddenVideoCache.has(videoId)) {
      cacheAccessOrder.delete(videoId);
      actions.push({ action: 'removed_orphaned_access_order', videoId });
    }
  }

  // Add missing timestamps for cached videos
  for (const videoId of hiddenVideoCache.keys()) {
    if (!hiddenVideoTimestamps.has(videoId)) {
      hiddenVideoTimestamps.set(videoId, Date.now());
      actions.push({ action: 'added_missing_timestamp', videoId });
    }
  }

  return {
    actionsCount: actions.length,
    actions,
    finalSizes: {
      cache: hiddenVideoCache.size,
      timestamps: hiddenVideoTimestamps.size,
      accessOrder: cacheAccessOrder.size
    }
  };
}
