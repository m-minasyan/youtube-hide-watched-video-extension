/**
 * Background cache layer for IndexedDB operations
 * Provides TTL-based caching with LRU eviction to reduce IndexedDB reads
 */

const CACHE_TTL = 30000; // 30 seconds
const MAX_CACHE_SIZE = 5000; // Maximum number of entries in background cache
const backgroundCache = new Map(); // videoId -> { record, timestamp }
const cacheAccessOrder = new Map(); // videoId -> lastAccessTime for LRU tracking

// Flag to prevent concurrent eviction operations
let isEvicting = false;

/**
 * Evicts least recently used entries when cache exceeds MAX_CACHE_SIZE
 * Uses synchronization to prevent race conditions and ensure cache consistency
 */
function evictLRUEntries() {
  // Early exit if cache is within limits
  if (backgroundCache.size <= MAX_CACHE_SIZE) return;

  // Prevent concurrent eviction operations
  if (isEvicting) return;

  try {
    isEvicting = true;

    // Re-check size after acquiring lock (might have changed)
    if (backgroundCache.size <= MAX_CACHE_SIZE) return;

    // Create snapshot of entries to evict (oldest first)
    const entries = Array.from(cacheAccessOrder.entries())
      .sort((a, b) => a[1] - b[1]); // Sort by access time (oldest first)

    const numToEvict = backgroundCache.size - MAX_CACHE_SIZE;
    const toEvict = entries.slice(0, numToEvict);

    // Batch delete: collect IDs first, then delete atomically
    // This minimizes the window for inconsistency
    const videoIdsToEvict = toEvict.map(([videoId]) => videoId);

    // Delete from both Maps in a single pass to maintain consistency
    videoIdsToEvict.forEach((videoId) => {
      backgroundCache.delete(videoId);
      cacheAccessOrder.delete(videoId);
    });

    // Validate consistency: both Maps should have same size
    if (backgroundCache.size !== cacheAccessOrder.size) {
      console.error('[IndexedDbCache] Inconsistency detected: backgroundCache size', backgroundCache.size,
                    'vs cacheAccessOrder size', cacheAccessOrder.size);
    }
  } finally {
    // Always release lock, even if error occurs
    isEvicting = false;
  }
}

/**
 * Gets a cached record if it exists and hasn't expired
 * @param {string} videoId - Video identifier
 * @returns {Object|null|undefined} - Cached record, null for deleted records, or undefined if not cached
 */
export function getCachedRecord(videoId) {
  const entry = backgroundCache.get(videoId);
  if (!entry) return undefined; // Return undefined for "not cached"

  // Check TTL and clean up expired entries from BOTH Maps to prevent memory leak
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    backgroundCache.delete(videoId);
    cacheAccessOrder.delete(videoId); // Critical: Remove from access order to prevent orphaned entries
    return undefined; // Return undefined for expired cache
  }

  // Update access time for LRU tracking ONLY for valid (non-expired) entries
  // This prevents memory leak by ensuring cacheAccessOrder only tracks active cached items
  cacheAccessOrder.set(videoId, Date.now());
  return entry.record; // Can be null for deleted records or an object
}

/**
 * Caches a record with current timestamp
 * @param {string} videoId - Video identifier
 * @param {Object|null} record - Record to cache (null for deleted records)
 */
export function setCachedRecord(videoId, record) {
  backgroundCache.set(videoId, {
    record,
    timestamp: Date.now()
  });
  cacheAccessOrder.set(videoId, Date.now());
  evictLRUEntries(); // Evict old entries if cache is too large
}

/**
 * Invalidates a cached record
 * @param {string} videoId - Video identifier
 */
export function invalidateCache(videoId) {
  backgroundCache.delete(videoId);
  cacheAccessOrder.delete(videoId);
}

/**
 * Clears all cached records
 */
export function clearBackgroundCache() {
  // Reset eviction flag to prevent deadlock
  isEvicting = false;

  backgroundCache.clear();
  cacheAccessOrder.clear();
}

/**
 * Gets cache statistics for monitoring
 * @returns {Object} - Cache stats (size, maxSize, ttl)
 */
export function getCacheStats() {
  return {
    size: backgroundCache.size,
    maxSize: MAX_CACHE_SIZE,
    ttl: CACHE_TTL
  };
}

/**
 * Validates cache consistency between backgroundCache and cacheAccessOrder
 * @returns {Object} - Validation result with status and details
 */
export function validateCacheConsistency() {
  const issues = [];

  // Check size consistency
  if (backgroundCache.size !== cacheAccessOrder.size) {
    issues.push({
      type: 'size_mismatch',
      message: `backgroundCache size (${backgroundCache.size}) !== cacheAccessOrder size (${cacheAccessOrder.size})`
    });
  }

  // Check that all keys in backgroundCache exist in cacheAccessOrder
  for (const videoId of backgroundCache.keys()) {
    if (!cacheAccessOrder.has(videoId)) {
      issues.push({
        type: 'missing_access_order',
        videoId,
        message: `Video ${videoId} in cache but missing access order`
      });
    }
  }

  // Check that all keys in cacheAccessOrder exist in backgroundCache
  for (const videoId of cacheAccessOrder.keys()) {
    if (!backgroundCache.has(videoId)) {
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
      cache: backgroundCache.size,
      accessOrder: cacheAccessOrder.size
    }
  };
}

/**
 * Repairs cache inconsistencies by synchronizing both Map structures
 * @returns {Object} - Repair result with actions taken
 */
export function repairCacheConsistency() {
  const actions = [];

  // Remove orphaned entries from cacheAccessOrder
  for (const videoId of cacheAccessOrder.keys()) {
    if (!backgroundCache.has(videoId)) {
      cacheAccessOrder.delete(videoId);
      actions.push({ action: 'removed_orphaned_access_order', videoId });
    }
  }

  // Add missing access order for cached videos
  for (const videoId of backgroundCache.keys()) {
    if (!cacheAccessOrder.has(videoId)) {
      cacheAccessOrder.set(videoId, Date.now());
      actions.push({ action: 'added_missing_access_order', videoId });
    }
  }

  return {
    actionsCount: actions.length,
    actions,
    finalSizes: {
      cache: backgroundCache.size,
      accessOrder: cacheAccessOrder.size
    }
  };
}
