import { error } from '../logger.js';

/**
 * Unified Cache Manager
 *
 * Simplified caching layer with LRU eviction, consistency validation, and repair mechanisms.
 * Uses a 3-Map architecture for optimal performance and clarity.
 *
 * Architecture:
 * - cache: Map<videoId, record> - Stores actual video records
 * - timestamps: Map<videoId, timestamp> - Stores update timestamps for record freshness
 * - accessOrder: Map<videoId, accessTime> - Tracks access times for LRU eviction
 *
 * @example
 * // Background script usage
 * const cache = new UnifiedCacheManager({ maxSize: 5000 });
 *
 * @example
 * // Content script usage with pending requests
 * const cache = new UnifiedCacheManager({
 *   maxSize: 1000,
 *   trackPendingRequests: true
 * });
 */
export class UnifiedCacheManager {
  /**
   * Creates a new cache manager instance
   * @param {Object} config - Configuration options
   * @param {number} config.maxSize - Maximum number of cache entries
   * @param {boolean} [config.trackPendingRequests=false] - Track pending requests
   */
  constructor(config = {}) {
    this.maxSize = config.maxSize || 1000;
    this.trackPendingRequests = config.trackPendingRequests || false;

    // 3-Map architecture
    this.cache = new Map(); // videoId -> record
    this.timestamps = new Map(); // videoId -> timestamp
    this.accessOrder = new Map(); // videoId -> lastAccessTime

    // Optional pending requests tracking
    this.pendingRequests = this.trackPendingRequests ? new Map() : null;

    // Concurrency control
    this.isEvicting = false;
  }

  /**
   * Evicts least recently used entries when cache exceeds maxSize
   */
  evictLRUEntries() {
    if (this.cache.size <= this.maxSize || this.isEvicting) return;

    try {
      this.isEvicting = true;

      // Re-check size after acquiring lock
      if (this.cache.size <= this.maxSize) return;

      // Sort by access time (oldest first)
      const entries = Array.from(this.accessOrder.entries())
        .sort((a, b) => a[1] - b[1]);

      const numToEvict = this.cache.size - this.maxSize;
      const videoIdsToEvict = entries.slice(0, numToEvict).map(([id]) => id);

      // Delete from all Maps atomically
      videoIdsToEvict.forEach((videoId) => {
        this.cache.delete(videoId);
        this.timestamps.delete(videoId);
        this.accessOrder.delete(videoId);
      });
    } finally {
      this.isEvicting = false;
    }
  }

  /**
   * Extracts timestamp from a record
   * @param {Object|null} record - Record to extract timestamp from
   * @returns {number} - Timestamp or -1 if not available
   */
  _getRecordTimestamp(record) {
    if (!record) return -1;
    if (Number.isFinite(record.updatedAt)) return record.updatedAt;
    if (Number.isFinite(record.timestamp)) return record.timestamp;
    return -1;
  }

  /**
   * Gets a cached record
   * @param {string} videoId - Video identifier
   * @returns {Object|null|undefined} - Cached record, null for deleted, undefined for not cached
   */
  get(videoId) {
    if (!videoId) return null;

    const record = this.cache.get(videoId);
    if (record === undefined) return undefined;

    // Update access time for LRU
    this.accessOrder.set(videoId, Date.now());

    return record;
  }

  /**
   * Sets a cached record
   * @param {string} videoId - Video identifier
   * @param {Object|null} record - Record to cache (null for deleted records)
   */
  set(videoId, record) {
    if (!videoId) return;

    const now = Date.now();
    const recordTimestamp = this._getRecordTimestamp(record);

    this.cache.set(videoId, record);
    this.timestamps.set(videoId, recordTimestamp === -1 ? now : recordTimestamp);
    this.accessOrder.set(videoId, now);

    this.evictLRUEntries();
  }

  /**
   * Applies a cache update unconditionally (for local modifications)
   * @param {string} videoId - Video identifier
   * @param {Object|null} record - Record to cache
   */
  applyUpdate(videoId, record) {
    if (!videoId) return;

    if (record) {
      this.set(videoId, record);
    } else {
      // Mark as deleted - keep timestamp to track deletion
      this.cache.delete(videoId);
      this.timestamps.set(videoId, Date.now());
      this.accessOrder.delete(videoId);
    }
  }

  /**
   * Merges a fetched record with existing cache
   * Only updates if incoming record is newer than cached record
   * @param {string} videoId - Video identifier
   * @param {Object|null} record - Fetched record
   */
  mergeFetchedRecord(videoId, record) {
    if (!videoId) return;

    const incomingTimestamp = this._getRecordTimestamp(record);

    // Check if we have an existing timestamp
    if (this.timestamps.has(videoId)) {
      const currentTimestamp = this.timestamps.get(videoId);
      if (incomingTimestamp <= currentTimestamp) {
        // Update access time even if not updating record
        this.accessOrder.set(videoId, Date.now());
        return;
      }
    }

    // Update with newer record or delete if null
    if (record) {
      this.set(videoId, record);
    } else {
      this.cache.delete(videoId);
      this.timestamps.delete(videoId);
      this.accessOrder.delete(videoId);
    }
  }

  /**
   * Invalidates a cached record
   * @param {string} videoId - Video identifier
   */
  invalidate(videoId) {
    if (!videoId) return;

    this.cache.delete(videoId);
    this.timestamps.delete(videoId);
    this.accessOrder.delete(videoId);
  }

  /**
   * Checks if a video is cached
   * @param {string} videoId - Video identifier
   * @returns {boolean}
   */
  has(videoId) {
    return this.cache.has(videoId);
  }

  /**
   * Clears all cached records
   */
  clear() {
    this.isEvicting = false;
    this.cache.clear();
    this.timestamps.clear();
    this.accessOrder.clear();
    if (this.pendingRequests) {
      this.pendingRequests.clear();
    }
  }

  /**
   * Gets cache statistics
   * @returns {Object} - Cache stats
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      timestampsSize: this.timestamps.size,
      accessOrderSize: this.accessOrder.size,
      pendingRequestsSize: this.pendingRequests ? this.pendingRequests.size : 0
    };
  }

  /**
   * Gets estimated cache memory usage in bytes
   * @returns {number} - Estimated memory usage
   */
  getMemoryUsage() {
    let estimatedSize = 0;
    this.cache.forEach((record, videoId) => {
      // Estimate: videoId (11 chars * 2 bytes)
      estimatedSize += videoId.length * 2;

      if (record) {
        estimatedSize += (record.title?.length || 0) * 2;
        estimatedSize += 32; // Overhead for state + updatedAt + object structure
      }
    });
    return estimatedSize;
  }

  /**
   * Validates cache consistency between all Map structures
   * @returns {Object} - Validation result with status and details
   */
  validateConsistency() {
    const issues = [];

    // Check size consistency
    if (this.cache.size !== this.timestamps.size) {
      issues.push({
        type: 'size_mismatch',
        message: `cache size (${this.cache.size}) !== timestamps size (${this.timestamps.size})`
      });
    }

    // Check that all cache keys have timestamps
    for (const videoId of this.cache.keys()) {
      if (!this.timestamps.has(videoId)) {
        issues.push({
          type: 'missing_timestamp',
          videoId,
          message: `Video ${videoId} in cache but missing timestamp`
        });
      }
    }

    // Check for orphaned access order entries
    for (const videoId of this.accessOrder.keys()) {
      if (!this.cache.has(videoId) && !this.timestamps.has(videoId)) {
        issues.push({
          type: 'orphaned_access_order',
          videoId,
          message: `Video ${videoId} in access order but not in cache or timestamps`
        });
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      sizes: {
        cache: this.cache.size,
        timestamps: this.timestamps.size,
        accessOrder: this.accessOrder.size
      }
    };
  }

  /**
   * Repairs cache inconsistencies by synchronizing all Map structures
   * @returns {Object} - Repair result with actions taken
   */
  repairConsistency() {
    const actions = [];

    // Remove orphaned access order entries
    for (const videoId of this.accessOrder.keys()) {
      if (!this.cache.has(videoId) && !this.timestamps.has(videoId)) {
        this.accessOrder.delete(videoId);
        actions.push({ action: 'removed_orphaned_access_order', videoId });
      }
    }

    // Remove orphaned timestamps
    for (const videoId of this.timestamps.keys()) {
      if (!this.cache.has(videoId) && !this.accessOrder.has(videoId)) {
        this.timestamps.delete(videoId);
        actions.push({ action: 'removed_orphaned_timestamp', videoId });
      }
    }

    // Add missing timestamps for cached videos
    for (const videoId of this.cache.keys()) {
      if (!this.timestamps.has(videoId)) {
        this.timestamps.set(videoId, Date.now());
        actions.push({ action: 'added_missing_timestamp', videoId });
      }
    }

    // Add missing access order for cached videos
    for (const videoId of this.cache.keys()) {
      if (!this.accessOrder.has(videoId)) {
        this.accessOrder.set(videoId, Date.now());
        actions.push({ action: 'added_missing_access_order', videoId });
      }
    }

    return {
      actionsCount: actions.length,
      actions,
      finalSizes: {
        cache: this.cache.size,
        timestamps: this.timestamps.size,
        accessOrder: this.accessOrder.size
      }
    };
  }

  // ============================================================================
  // Pending Requests Management
  // ============================================================================

  /**
   * Checks if there is a pending request for a video
   * @param {string} videoId - Video identifier
   * @returns {boolean}
   */
  hasPendingRequest(videoId) {
    return this.pendingRequests ? this.pendingRequests.has(videoId) : false;
  }

  /**
   * Gets a pending request for a video
   * @param {string} videoId - Video identifier
   * @returns {Promise|undefined}
   */
  getPendingRequest(videoId) {
    return this.pendingRequests ? this.pendingRequests.get(videoId) : undefined;
  }

  /**
   * Sets a pending request for a video
   * @param {string} videoId - Video identifier
   * @param {Promise} promise - Pending promise
   */
  setPendingRequest(videoId, promise) {
    if (this.pendingRequests) {
      this.pendingRequests.set(videoId, promise);
    }
  }

  /**
   * Deletes a pending request for a video
   * @param {string} videoId - Video identifier
   */
  deletePendingRequest(videoId) {
    if (this.pendingRequests) {
      this.pendingRequests.delete(videoId);
    }
  }

  /**
   * Clears all pending requests
   */
  clearPendingRequests() {
    if (this.pendingRequests) {
      this.pendingRequests.clear();
    }
  }
}
