/**
 * Background cache layer for IndexedDB operations
 * Provides TTL-based caching with LRU eviction to reduce IndexedDB reads
 */

import { LRUCache } from '../shared/lruCache.js';

const CACHE_TTL = 30000; // 30 seconds
const MAX_CACHE_SIZE = 5000; // Maximum number of entries in background cache
const backgroundCache = new Map(); // videoId -> { record, timestamp }
const cacheAccessOrder = new Map(); // videoId -> lastAccessTime for LRU tracking

// Initialize LRU cache manager
const lruCache = new LRUCache({
  maxSize: MAX_CACHE_SIZE,
  mainCache: backgroundCache,
  accessOrderMap: cacheAccessOrder,
  auxiliaryMaps: [],
  cacheName: 'IndexedDbCache'
});

/**
 * Gets a cached record if it exists and hasn't expired
 * @param {string} videoId - Video identifier
 * @returns {Object|null|undefined} - Cached record, null for deleted records, or undefined if not cached
 */
export function getCachedRecord(videoId) {
  const entry = backgroundCache.get(videoId);
  if (!entry) return undefined; // Return undefined for "not cached"

  // Check TTL and clean up expired entries from all Maps to prevent memory leak
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    lruCache.removeEntry(videoId);
    return undefined; // Return undefined for expired cache
  }

  // Update access time for LRU tracking ONLY for valid (non-expired) entries
  // This prevents memory leak by ensuring cacheAccessOrder only tracks active cached items
  lruCache.updateAccessTime(videoId);
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
  lruCache.updateAccessTime(videoId);
  lruCache.evictLRUEntries(); // Evict old entries if cache is too large
}

/**
 * Invalidates a cached record
 * @param {string} videoId - Video identifier
 */
export function invalidateCache(videoId) {
  lruCache.removeEntry(videoId);
}

/**
 * Clears all cached records
 */
export function clearBackgroundCache() {
  lruCache.clear();
}

/**
 * Gets cache statistics for monitoring
 * @returns {Object} - Cache stats (size, maxSize, ttl)
 */
export function getCacheStats() {
  return {
    ...lruCache.getStats(),
    ttl: CACHE_TTL
  };
}

/**
 * Validates cache consistency between backgroundCache and cacheAccessOrder
 * @returns {Object} - Validation result with status and details
 */
export function validateCacheConsistency() {
  return lruCache.validateConsistency();
}

/**
 * Repairs cache inconsistencies by synchronizing both Map structures
 * @returns {Object} - Repair result with actions taken
 */
export function repairCacheConsistency() {
  return lruCache.repairConsistency();
}
