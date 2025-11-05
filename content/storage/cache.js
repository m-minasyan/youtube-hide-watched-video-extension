/**
 * Content script cache layer
 * Provides timestamp-based caching with LRU eviction and pending request tracking
 *
 * REFACTORED: Now uses UnifiedCacheManager for consistency with background script
 */

import { UnifiedCacheManager } from '../../shared/cache/UnifiedCacheManager.js';

const MAX_CACHE_SIZE = 1000;

// Initialize unified cache manager in 3-Map timestamp mode (content script mode)
const cacheManager = new UnifiedCacheManager({
  maxSize: MAX_CACHE_SIZE,
  cacheTTL: null, // No TTL, use timestamp-based merging instead
  separateTimestamps: true, // 3-Map mode: separate timestamps Map
  trackPendingRequests: true // Track pending requests to prevent duplicates
});

/**
 * Extracts timestamp from a record
 * @param {Object|null} record - Record to extract timestamp from
 * @returns {number} - Timestamp or -1 if not available
 */
export function getRecordTimestamp(record) {
  return record && Number.isFinite(record.updatedAt) ? record.updatedAt : -1;
}

/**
 * Applies a cache update unconditionally (for local modifications)
 * @param {string} videoId - Video identifier
 * @param {Object|null} record - Record to cache
 */
export function applyCacheUpdate(videoId, record) {
  cacheManager.applyUpdate(videoId, record);
}

/**
 * Merges a fetched record with existing cache (for remote fetches)
 * Only updates if incoming record is newer than cached record
 * @param {string} videoId - Video identifier
 * @param {Object|null} record - Fetched record
 */
export function mergeFetchedRecord(videoId, record) {
  cacheManager.mergeFetchedRecord(videoId, record);
}

/**
 * Gets a cached hidden video record and updates access tracking
 * @param {string} videoId - Video identifier
 * @returns {Object|null} - Cached record or null
 */
export function getCachedHiddenVideo(videoId) {
  const record = cacheManager.get(videoId);
  return record || null;
}

/**
 * Clears all cache entries
 */
export function clearCache() {
  cacheManager.clear();
}

/**
 * Checks if there is a pending request for a video
 * @param {string} videoId - Video identifier
 * @returns {boolean}
 */
export function hasPendingRequest(videoId) {
  return cacheManager.hasPendingRequest(videoId);
}

/**
 * Gets a pending request for a video
 * @param {string} videoId - Video identifier
 * @returns {Promise|undefined}
 */
export function getPendingRequest(videoId) {
  return cacheManager.getPendingRequest(videoId);
}

/**
 * Sets a pending request for a video
 * @param {string} videoId - Video identifier
 * @param {Promise} promise - Pending promise
 */
export function setPendingRequest(videoId, promise) {
  cacheManager.setPendingRequest(videoId, promise);
}

/**
 * Deletes a pending request for a video
 * @param {string} videoId - Video identifier
 */
export function deletePendingRequest(videoId) {
  cacheManager.deletePendingRequest(videoId);
}

/**
 * Clears all pending requests (useful for navigation events)
 */
export function clearPendingRequests() {
  cacheManager.clearPendingRequests();
}

/**
 * Checks if a video is cached
 * @param {string} videoId - Video identifier
 * @returns {boolean}
 */
export function hasCachedVideo(videoId) {
  return cacheManager.has(videoId);
}

/**
 * Gets current cache size for monitoring
 * @returns {number} - Number of entries in cache
 */
export function getCacheSize() {
  return cacheManager.getStats().size;
}

/**
 * Gets estimated cache memory usage in bytes
 * @returns {number} - Estimated memory usage
 */
export function getCacheMemoryUsage() {
  return cacheManager.getMemoryUsage();
}

/**
 * Validates cache consistency between all Map structures
 * @returns {Object} - Validation result with status and details
 */
export function validateCacheConsistency() {
  return cacheManager.validateConsistency();
}

/**
 * Repairs cache inconsistencies by synchronizing all Map structures
 * @returns {Object} - Repair result with actions taken
 */
export function repairCacheConsistency() {
  return cacheManager.repairConsistency();
}
