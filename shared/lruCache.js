/**
 * Generic LRU (Least Recently Used) Cache implementation
 * Provides core LRU eviction, consistency validation, and repair functionality
 * Can be extended or composed by specific cache implementations
 */
export class LRUCache {
  /**
   * @param {Object} config - Cache configuration
   * @param {number} config.maxSize - Maximum number of entries
   * @param {Map} config.mainCache - Main cache Map (key -> value)
   * @param {Map} config.accessOrderMap - Access order tracking Map (key -> timestamp)
   * @param {Map[]} [config.auxiliaryMaps] - Additional Maps to sync (e.g., timestamps Map)
   * @param {string} [config.cacheName] - Name for logging/debugging
   */
  constructor({ maxSize, mainCache, accessOrderMap, auxiliaryMaps = [], cacheName = 'Cache' }) {
    this.maxSize = maxSize;
    this.mainCache = mainCache;
    this.accessOrderMap = accessOrderMap;
    this.auxiliaryMaps = auxiliaryMaps;
    this.cacheName = cacheName;
    this.isEvicting = false;
  }

  /**
   * Evicts least recently used entries when cache exceeds maxSize
   * Uses synchronization to prevent race conditions and ensure cache consistency
   */
  evictLRUEntries() {
    // Early exit if cache is within limits
    if (this.mainCache.size <= this.maxSize) return;

    // Prevent concurrent eviction operations
    if (this.isEvicting) return;

    try {
      this.isEvicting = true;

      // Re-check size after acquiring lock (might have changed)
      if (this.mainCache.size <= this.maxSize) return;

      // Create snapshot of entries to evict (oldest first)
      const entries = Array.from(this.accessOrderMap.entries())
        .sort((a, b) => a[1] - b[1]); // Sort by access time (oldest first)

      const numToEvict = this.mainCache.size - this.maxSize;
      const toEvict = entries.slice(0, numToEvict);

      // Batch delete: collect IDs first, then delete atomically
      // This minimizes the window for inconsistency
      const keysToEvict = toEvict.map(([key]) => key);

      // Delete from all Maps in a single pass to maintain consistency
      keysToEvict.forEach((key) => {
        this.mainCache.delete(key);
        this.accessOrderMap.delete(key);
        this.auxiliaryMaps.forEach(map => map.delete(key));
      });

      // Validate consistency: all Maps should have same size
      const allMaps = [this.mainCache, ...this.auxiliaryMaps];
      const sizes = allMaps.map(map => map.size);
      const allEqual = sizes.every(size => size === this.mainCache.size);

      if (!allEqual) {
        console.error(`[${this.cacheName}] Inconsistency detected after eviction:`,
          'mainCache size:', this.mainCache.size,
          'auxiliary sizes:', this.auxiliaryMaps.map(m => m.size));
      }
    } finally {
      // Always release lock, even if error occurs
      this.isEvicting = false;
    }
  }

  /**
   * Updates access time for LRU tracking
   * @param {string} key - Cache key
   */
  updateAccessTime(key) {
    this.accessOrderMap.set(key, Date.now());
  }

  /**
   * Removes an entry from all cache Maps
   * @param {string} key - Cache key
   */
  removeEntry(key) {
    this.mainCache.delete(key);
    this.accessOrderMap.delete(key);
    this.auxiliaryMaps.forEach(map => map.delete(key));
  }

  /**
   * Clears all cache Maps and resets eviction flag
   */
  clear() {
    // Reset eviction flag to prevent deadlock
    this.isEvicting = false;

    this.mainCache.clear();
    this.accessOrderMap.clear();
    this.auxiliaryMaps.forEach(map => map.clear());
  }

  /**
   * Validates cache consistency between all Map structures
   * @returns {Object} - Validation result with status and details
   */
  validateConsistency() {
    const issues = [];

    // Check size consistency between mainCache and auxiliary Maps
    this.auxiliaryMaps.forEach((auxMap, index) => {
      if (this.mainCache.size !== auxMap.size) {
        issues.push({
          type: 'size_mismatch',
          message: `mainCache size (${this.mainCache.size}) !== auxiliary map ${index} size (${auxMap.size})`
        });
      }
    });

    // Check that all keys in mainCache exist in auxiliary Maps
    for (const key of this.mainCache.keys()) {
      this.auxiliaryMaps.forEach((auxMap, index) => {
        if (!auxMap.has(key)) {
          issues.push({
            type: 'missing_auxiliary_entry',
            key,
            auxiliaryIndex: index,
            message: `Key ${key} in mainCache but missing in auxiliary map ${index}`
          });
        }
      });
    }

    // Check that all keys in accessOrderMap exist in mainCache
    for (const key of this.accessOrderMap.keys()) {
      if (!this.mainCache.has(key)) {
        issues.push({
          type: 'orphaned_access_order',
          key,
          message: `Key ${key} in access order but not in mainCache`
        });
      }
    }

    // Collect sizes for reporting
    const sizes = {
      mainCache: this.mainCache.size,
      accessOrder: this.accessOrderMap.size
    };
    this.auxiliaryMaps.forEach((auxMap, index) => {
      sizes[`auxiliary_${index}`] = auxMap.size;
    });

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

    // Remove orphaned entries from accessOrderMap
    for (const key of this.accessOrderMap.keys()) {
      if (!this.mainCache.has(key)) {
        this.accessOrderMap.delete(key);
        actions.push({ action: 'removed_orphaned_access_order', key });
      }
    }

    // Remove orphaned entries from auxiliary Maps
    this.auxiliaryMaps.forEach((auxMap, index) => {
      for (const key of auxMap.keys()) {
        if (!this.mainCache.has(key)) {
          auxMap.delete(key);
          actions.push({ action: `removed_orphaned_auxiliary_${index}`, key });
        }
      }
    });

    // Add missing entries to auxiliary Maps (use current timestamp as default)
    for (const key of this.mainCache.keys()) {
      this.auxiliaryMaps.forEach((auxMap, index) => {
        if (!auxMap.has(key)) {
          auxMap.set(key, Date.now());
          actions.push({ action: `added_missing_auxiliary_${index}`, key });
        }
      });
    }

    // Collect final sizes for reporting
    const finalSizes = {
      mainCache: this.mainCache.size,
      accessOrder: this.accessOrderMap.size
    };
    this.auxiliaryMaps.forEach((auxMap, index) => {
      finalSizes[`auxiliary_${index}`] = auxMap.size;
    });

    return {
      actionsCount: actions.length,
      actions,
      finalSizes
    };
  }

  /**
   * Gets cache statistics for monitoring
   * @returns {Object} - Cache stats
   */
  getStats() {
    return {
      size: this.mainCache.size,
      maxSize: this.maxSize,
      accessOrderSize: this.accessOrderMap.size,
      auxiliarySizes: this.auxiliaryMaps.map(m => m.size)
    };
  }
}
