import { error } from '../logger.js';

/**
 * Unified Cache Manager
 *
 * Provides a unified caching layer that supports both TTL-based and timestamp-based caching
 * with LRU eviction, consistency validation, and repair mechanisms.
 *
 * This module addresses cache inconsistency between background and content scripts by:
 * - Unifying cache architecture (supports both 2-Map and 3-Map modes)
 * - Providing single source of truth for eviction logic
 * - Ensuring consistent validation and repair across all cache instances
 * - Preventing memory leaks and orphaned entries
 *
 * @example
 * // Background script usage (TTL-based, 2-Map mode)
 * const cache = new UnifiedCacheManager({
 *   maxSize: 5000,
 *   cacheTTL: 30000,
 *   separateTimestamps: false
 * });
 *
 * @example
 * // Content script usage (timestamp-based, 3-Map mode)
 * const cache = new UnifiedCacheManager({
 *   maxSize: 1000,
 *   separateTimestamps: true,
 *   trackPendingRequests: true
 * });
 */
export class UnifiedCacheManager {
  /**
   * Creates a new cache manager instance
   * @param {Object} config - Configuration options
   * @param {number} config.maxSize - Maximum number of cache entries
   * @param {number} [config.cacheTTL] - TTL in milliseconds (optional, for TTL-based caching)
   * @param {boolean} [config.separateTimestamps=false] - Use separate timestamps Map (3-Map mode)
   * @param {boolean} [config.trackPendingRequests=false] - Track pending requests
   */
  constructor(config = {}) {
    this.maxSize = config.maxSize || 1000;
    this.cacheTTL = config.cacheTTL || null; // null = no TTL
    this.separateTimestamps = config.separateTimestamps || false;
    this.trackPendingRequests = config.trackPendingRequests || false;

    // Core cache Maps
    this.cache = new Map(); // videoId -> record (or {record, timestamp} in 2-Map mode)
    this.cacheAccessOrder = new Map(); // videoId -> lastAccessTime for LRU

    // Optional Maps based on configuration
    this.timestamps = this.separateTimestamps ? new Map() : null; // videoId -> timestamp (3-Map mode)
    this.pendingRequests = this.trackPendingRequests ? new Map() : null; // videoId -> Promise

    // Concurrency control
    this.isEvicting = false;
  }

  /**
   * Evicts least recently used entries when cache exceeds maxSize
   * Uses synchronization to prevent race conditions and ensure cache consistency
   */
  evictLRUEntries() {
    // Early exit if cache is within limits
    if (this.cache.size <= this.maxSize) return;

    // Prevent concurrent eviction operations
    if (this.isEvicting) return;

    try {
      this.isEvicting = true;

      // Re-check size after acquiring lock (might have changed)
      if (this.cache.size <= this.maxSize) return;

      // Create snapshot of entries to evict (oldest first)
      const entries = Array.from(this.cacheAccessOrder.entries())
        .sort((a, b) => a[1] - b[1]); // Sort by access time (oldest first)

      const numToEvict = this.cache.size - this.maxSize;
      const toEvict = entries.slice(0, numToEvict);

      // Batch delete: collect IDs first, then delete atomically
      // This minimizes the window for inconsistency
      const videoIdsToEvict = toEvict.map(([videoId]) => videoId);

      // Delete from all Maps in a single pass to maintain consistency
      videoIdsToEvict.forEach((videoId) => {
        this.cache.delete(videoId);
        this.cacheAccessOrder.delete(videoId);
        if (this.timestamps) {
          this.timestamps.delete(videoId);
        }
      });

      // Validate consistency after eviction
      this._validateSizeConsistency();
    } finally {
      // Always release lock, even if error occurs
      this.isEvicting = false;
    }
  }

  /**
   * Internal validation of size consistency between Maps
   */
  _validateSizeConsistency() {
    if (this.separateTimestamps && this.cache.size !== this.timestamps.size) {
      error('[UnifiedCacheManager] Inconsistency detected: cache size', this.cache.size,
            'vs timestamps size', this.timestamps.size);
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
   * @returns {Object|null|undefined} - Cached record, null for deleted, undefined for not cached/expired
   */
  get(videoId) {
    if (!videoId) return null;

    const entry = this.cache.get(videoId);
    if (!entry) return undefined; // Not cached

    let record;
    let timestamp;

    // Extract record and timestamp based on mode
    if (this.separateTimestamps) {
      // 3-Map mode: record stored directly, timestamp in separate Map
      record = entry;
      timestamp = this.timestamps.get(videoId);
    } else {
      // 2-Map mode: record and timestamp stored together
      record = entry.record;
      timestamp = entry.timestamp;
    }

    // Check TTL if enabled
    if (this.cacheTTL !== null && timestamp) {
      if (Date.now() - timestamp > this.cacheTTL) {
        // Expired - clean up from ALL Maps
        this.cache.delete(videoId);
        this.cacheAccessOrder.delete(videoId);
        if (this.timestamps) {
          this.timestamps.delete(videoId);
        }
        return undefined; // Expired
      }
    }

    // Update access time for LRU tracking ONLY for valid (non-expired) entries
    // This prevents memory leak by ensuring cacheAccessOrder only tracks active cached items
    this.cacheAccessOrder.set(videoId, Date.now());

    return record; // Can be null for deleted records or an object
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

    if (this.separateTimestamps) {
      // 3-Map mode: store record and timestamp separately
      this.cache.set(videoId, record);
      this.timestamps.set(videoId, recordTimestamp === -1 ? now : recordTimestamp);
    } else {
      // 2-Map mode: store record and timestamp together
      this.cache.set(videoId, {
        record,
        timestamp: now
      });
    }

    this.cacheAccessOrder.set(videoId, now);
    this.evictLRUEntries(); // Evict old entries if cache is too large
  }

  /**
   * Applies a cache update (for content script use case)
   * Updates cache unconditionally without timestamp comparison
   * @param {string} videoId - Video identifier
   * @param {Object|null} record - Record to cache
   */
  applyUpdate(videoId, record) {
    if (!videoId) return;

    if (record) {
      this.set(videoId, record);
      return;
    }

    // Record is null/undefined - mark as deleted
    if (this.separateTimestamps) {
      this.cache.delete(videoId);
      this.timestamps.set(videoId, Date.now()); // Keep timestamp to track deletion
      this.cacheAccessOrder.delete(videoId);
    } else {
      this.cache.delete(videoId);
      this.cacheAccessOrder.delete(videoId);
    }
  }

  /**
   * Merges a fetched record with existing cache (for content script use case)
   * Only updates if incoming record is newer than cached record
   * @param {string} videoId - Video identifier
   * @param {Object|null} record - Fetched record
   */
  mergeFetchedRecord(videoId, record) {
    if (!videoId) return;

    const incomingTimestamp = this._getRecordTimestamp(record);

    // Check if we have an existing timestamp
    if (this.separateTimestamps && this.timestamps.has(videoId)) {
      const currentTimestamp = this.timestamps.get(videoId);
      if (incomingTimestamp <= currentTimestamp) {
        // Update access time even if not updating record
        this.cacheAccessOrder.set(videoId, Date.now());
        return; // Don't update, current is newer or same
      }
    }

    // Update with newer record or delete if null
    if (record) {
      this.set(videoId, record);
    } else {
      this.cache.delete(videoId);
      this.cacheAccessOrder.delete(videoId);
      if (this.timestamps) {
        this.timestamps.delete(videoId);
      }
    }
  }

  /**
   * Invalidates a cached record
   * @param {string} videoId - Video identifier
   */
  invalidate(videoId) {
    if (!videoId) return;

    this.cache.delete(videoId);
    this.cacheAccessOrder.delete(videoId);
    if (this.timestamps) {
      this.timestamps.delete(videoId);
    }
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
    // Reset eviction flag to prevent deadlock
    this.isEvicting = false;

    this.cache.clear();
    this.cacheAccessOrder.clear();
    if (this.timestamps) {
      this.timestamps.clear();
    }
    if (this.pendingRequests) {
      this.pendingRequests.clear();
    }
  }

  /**
   * Gets cache statistics for monitoring
   * @returns {Object} - Cache stats
   */
  getStats() {
    const stats = {
      size: this.cache.size,
      maxSize: this.maxSize,
      mode: this.separateTimestamps ? '3-Map' : '2-Map',
      accessOrderSize: this.cacheAccessOrder.size
    };

    if (this.cacheTTL !== null) {
      stats.ttl = this.cacheTTL;
    }

    if (this.timestamps) {
      stats.timestampsSize = this.timestamps.size;
    }

    if (this.pendingRequests) {
      stats.pendingRequestsSize = this.pendingRequests.size;
    }

    return stats;
  }

  /**
   * Gets estimated cache memory usage in bytes
   * @returns {number} - Estimated memory usage
   */
  getMemoryUsage() {
    let estimatedSize = 0;
    this.cache.forEach((entry, videoId) => {
      // Estimate: videoId (11 chars * 2 bytes)
      estimatedSize += videoId.length * 2;

      const record = this.separateTimestamps ? entry : entry.record;
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
  validateConsistency() {
    const issues = [];

    // Check size consistency for 3-Map mode
    if (this.separateTimestamps && this.cache.size !== this.timestamps.size) {
      issues.push({
        type: 'size_mismatch',
        message: `cache size (${this.cache.size}) !== timestamps size (${this.timestamps.size})`
      });
    }

    // Check that all keys in cache exist in timestamps (3-Map mode)
    if (this.separateTimestamps) {
      for (const videoId of this.cache.keys()) {
        if (!this.timestamps.has(videoId)) {
          issues.push({
            type: 'missing_timestamp',
            videoId,
            message: `Video ${videoId} in cache but missing timestamp`
          });
        }
      }
    }

    // Check that all keys in cacheAccessOrder exist in cache
    for (const videoId of this.cacheAccessOrder.keys()) {
      if (!this.cache.has(videoId)) {
        // Special case: in 3-Map mode, deleted videos might have timestamp but no cache entry
        if (!this.separateTimestamps || !this.timestamps.has(videoId)) {
          issues.push({
            type: 'orphaned_access_order',
            videoId,
            message: `Video ${videoId} in access order but not in cache`
          });
        }
      }
    }

    // Check for orphaned timestamps (3-Map mode)
    if (this.separateTimestamps) {
      for (const videoId of this.timestamps.keys()) {
        if (!this.cache.has(videoId) && this.cacheAccessOrder.has(videoId)) {
          // This is actually valid for deleted records with timestamps
          // Only flag if access order exists without cache
        }
      }
    }

    const sizes = {
      cache: this.cache.size,
      accessOrder: this.cacheAccessOrder.size
    };

    if (this.timestamps) {
      sizes.timestamps = this.timestamps.size;
    }

    return {
      isValid: issues.length === 0,
      issues,
      sizes
    };
  }

  /**
   * Repairs cache inconsistencies by synchronizing all Map structures
   * @returns {Object} - Repair result with actions taken
   */
  repairConsistency() {
    const actions = [];

    // Remove orphaned entries from cacheAccessOrder
    for (const videoId of this.cacheAccessOrder.keys()) {
      if (!this.cache.has(videoId)) {
        // In 3-Map mode, check if it's a deleted record with timestamp
        if (this.separateTimestamps && this.timestamps.has(videoId)) {
          // Keep access order for deleted records
          continue;
        }
        this.cacheAccessOrder.delete(videoId);
        actions.push({ action: 'removed_orphaned_access_order', videoId });
      }
    }

    // Remove orphaned entries from timestamps (3-Map mode)
    if (this.separateTimestamps) {
      for (const videoId of this.timestamps.keys()) {
        if (!this.cache.has(videoId) && !this.cacheAccessOrder.has(videoId)) {
          // Timestamp without cache or access order - orphaned
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
    }

    // Add missing access order for cached videos
    for (const videoId of this.cache.keys()) {
      if (!this.cacheAccessOrder.has(videoId)) {
        this.cacheAccessOrder.set(videoId, Date.now());
        actions.push({ action: 'added_missing_access_order', videoId });
      }
    }

    const finalSizes = {
      cache: this.cache.size,
      accessOrder: this.cacheAccessOrder.size
    };

    if (this.timestamps) {
      finalSizes.timestamps = this.timestamps.size;
    }

    return {
      actionsCount: actions.length,
      actions,
      finalSizes
    };
  }

  // ============================================================================
  // Pending Requests Management (for content script)
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
