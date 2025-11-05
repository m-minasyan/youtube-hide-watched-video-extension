/**
 * Background cache layer for IndexedDB operations
 * Provides TTL-based caching with LRU eviction to reduce IndexedDB reads
 *
 * REFACTORED: Now uses UnifiedCacheManager for consistency with content script
 */

import { UnifiedCacheManager } from '../shared/cache/UnifiedCacheManager.js';

const CACHE_TTL = 30000; // 30 seconds
const MAX_CACHE_SIZE = 5000; // Maximum number of entries in background cache

// Initialize unified cache manager in 2-Map TTL mode (background script mode)
const cacheManager = new UnifiedCacheManager({
  maxSize: MAX_CACHE_SIZE,
  cacheTTL: CACHE_TTL,
  separateTimestamps: false, // 2-Map mode: {record, timestamp} stored together
  trackPendingRequests: false // Not needed in background script
});

/**
 * Gets a cached record if it exists and hasn't expired
 * @param {string} videoId - Video identifier
 * @returns {Object|null|undefined} - Cached record, null for deleted records, or undefined if not cached
 */
export function getCachedRecord(videoId) {
  return cacheManager.get(videoId);
}

/**
 * Caches a record with current timestamp
 * @param {string} videoId - Video identifier
 * @param {Object|null} record - Record to cache (null for deleted records)
 */
export function setCachedRecord(videoId, record) {
  cacheManager.set(videoId, record);
}

/**
 * Invalidates a cached record
 * @param {string} videoId - Video identifier
 */
export function invalidateCache(videoId) {
  cacheManager.invalidate(videoId);
}

/**
 * Clears all cached records
 */
export function clearBackgroundCache() {
  cacheManager.clear();
}

/**
 * Gets cache statistics for monitoring
 * @returns {Object} - Cache stats (size, maxSize, ttl)
 */
export function getCacheStats() {
  return cacheManager.getStats();
}

/**
 * Validates cache consistency between backgroundCache and cacheAccessOrder
 * @returns {Object} - Validation result with status and details
 */
export function validateCacheConsistency() {
  return cacheManager.validateConsistency();
}

/**
 * Repairs cache inconsistencies by synchronizing both Map structures
 * @returns {Object} - Repair result with actions taken
 */
export function repairCacheConsistency() {
  return cacheManager.repairConsistency();
}
