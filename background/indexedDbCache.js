/**
 * Background cache layer for IndexedDB operations
 * Provides TTL-based caching with LRU eviction to reduce IndexedDB reads
 */

const CACHE_TTL = 30000; // 30 seconds
const MAX_CACHE_SIZE = 5000; // Maximum number of entries in background cache
const backgroundCache = new Map(); // videoId -> { record, timestamp }
const cacheAccessOrder = new Map(); // videoId -> lastAccessTime for LRU tracking

/**
 * Evicts least recently used entries when cache exceeds MAX_CACHE_SIZE
 */
function evictLRUEntries() {
  if (backgroundCache.size <= MAX_CACHE_SIZE) return;

  const entries = Array.from(cacheAccessOrder.entries())
    .sort((a, b) => a[1] - b[1]); // Sort by access time (oldest first)

  const toEvict = entries.slice(0, backgroundCache.size - MAX_CACHE_SIZE);
  toEvict.forEach(([videoId]) => {
    backgroundCache.delete(videoId);
    cacheAccessOrder.delete(videoId);
  });
}

/**
 * Gets a cached record if it exists and hasn't expired
 * @param {string} videoId - Video identifier
 * @returns {Object|null|undefined} - Cached record, null for deleted records, or undefined if not cached
 */
export function getCachedRecord(videoId) {
  const entry = backgroundCache.get(videoId);
  if (!entry) return undefined; // Return undefined for "not cached"

  if (Date.now() - entry.timestamp > CACHE_TTL) {
    backgroundCache.delete(videoId);
    cacheAccessOrder.delete(videoId);
    return undefined; // Return undefined for expired cache
  }

  // Update access time for LRU tracking
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
