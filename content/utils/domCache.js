// WeakMap caches for different query types
const elementParentCache = new WeakMap();
const elementChildrenCache = new WeakMap();
const elementSelectorCache = new WeakMap();
const querySelectorAllCache = new Map();

// Performance metrics
const cacheStats = {
  hits: 0,
  misses: 0,
  invalidations: 0
};

// Maximum cache size for document queries (LRU behavior)
const MAX_DOCUMENT_CACHE_SIZE = 100;

/**
 * Cache the result of element.closest(selector)
 * @param {Element} element - The starting element
 * @param {string} selector - The selector to match
 * @returns {Element|null} The matched parent element or null
 */
export function cachedClosest(element, selector) {
  if (!element || !selector) return null;

  try {
    // Check cache
    if (!elementParentCache.has(element)) {
      elementParentCache.set(element, new Map());
    }

    const selectorCache = elementParentCache.get(element);

    if (selectorCache.has(selector)) {
      cacheStats.hits++;
      return selectorCache.get(selector);
    }

    // Cache miss - perform query
    cacheStats.misses++;
    const result = element.closest(selector);
    selectorCache.set(selector, result);

    return result;
  } catch (error) {
    // Invalid selector or element - fall back to uncached query
    console.warn('[YT-HWV Cache] Error in cachedClosest:', error);
    try {
      return element.closest(selector);
    } catch (fallbackError) {
      return null;
    }
  }
}

/**
 * Cache the result of element.querySelector(selector)
 * @param {Element} element - The parent element
 * @param {string} selector - The selector to match
 * @returns {Element|null} The matched child element or null
 */
export function cachedQuerySelector(element, selector) {
  if (!element || !selector) return null;

  try {
    if (!elementChildrenCache.has(element)) {
      elementChildrenCache.set(element, new Map());
    }

    const selectorCache = elementChildrenCache.get(element);

    if (selectorCache.has(selector)) {
      cacheStats.hits++;
      return selectorCache.get(selector);
    }

    cacheStats.misses++;
    const result = element.querySelector(selector);
    selectorCache.set(selector, result);

    return result;
  } catch (error) {
    // Invalid selector or element - fall back to uncached query
    console.warn('[YT-HWV Cache] Error in cachedQuerySelector:', error);
    try {
      return element.querySelector(selector);
    } catch (fallbackError) {
      return null;
    }
  }
}

/**
 * Cache the result of element.querySelectorAll(selector)
 * Returns array for consistency and easier manipulation
 * @param {Element} element - The parent element
 * @param {string} selector - The selector to match
 * @returns {Array<Element>} Array of matched elements
 */
export function cachedQuerySelectorAll(element, selector) {
  if (!element || !selector) return [];

  try {
    if (!elementSelectorCache.has(element)) {
      elementSelectorCache.set(element, new Map());
    }

    const selectorCache = elementSelectorCache.get(element);

    if (selectorCache.has(selector)) {
      cacheStats.hits++;
      return selectorCache.get(selector);
    }

    cacheStats.misses++;
    const result = Array.from(element.querySelectorAll(selector));
    selectorCache.set(selector, result);

    return result;
  } catch (error) {
    // Invalid selector or element - fall back to uncached query
    console.warn('[YT-HWV Cache] Error in cachedQuerySelectorAll:', error);
    try {
      return Array.from(element.querySelectorAll(selector));
    } catch (fallbackError) {
      return [];
    }
  }
}

/**
 * Cache document-level querySelectorAll with TTL
 * Uses Map instead of WeakMap since document is always present
 * @param {string} selector - The selector to match
 * @param {number} ttl - Time to live in milliseconds (default 1000ms)
 * @returns {Array<Element>} Array of matched elements
 */
export function cachedDocumentQuery(selector, ttl = 1000) {
  if (!selector) return [];

  try {
    const now = Date.now();

    // Clean up expired entries if cache is getting large
    if (querySelectorAllCache.size > MAX_DOCUMENT_CACHE_SIZE) {
      cleanupExpiredCacheEntries();
    }

    const cached = querySelectorAllCache.get(selector);

    if (cached && (now - cached.timestamp) < ttl) {
      cacheStats.hits++;
      return cached.results;
    }

    cacheStats.misses++;
    const results = Array.from(document.querySelectorAll(selector));
    querySelectorAllCache.set(selector, {
      results,
      timestamp: now
    });

    return results;
  } catch (error) {
    // Invalid selector - fall back to uncached query
    console.warn('[YT-HWV Cache] Error in cachedDocumentQuery:', error);
    try {
      return Array.from(document.querySelectorAll(selector));
    } catch (fallbackError) {
      return [];
    }
  }
}

/**
 * Clean up expired cache entries to prevent unbounded growth
 * @private
 */
function cleanupExpiredCacheEntries() {
  const now = Date.now();
  const entriesToDelete = [];

  // Identify expired entries (using default TTL of 1000ms)
  for (const [selector, entry] of querySelectorAllCache.entries()) {
    if (now - entry.timestamp > 1000) {
      entriesToDelete.push(selector);
    }
  }

  // Delete expired entries
  entriesToDelete.forEach(selector => {
    querySelectorAllCache.delete(selector);
  });
}

/**
 * Invalidate cache for a specific element
 * Called when an element is modified or removed
 * @param {Element} element - The element to invalidate
 */
export function invalidateElementCache(element) {
  if (!element) return;

  // Explicitly clear nested Maps before deletion to ensure proper cleanup
  const parentMap = elementParentCache.get(element);
  if (parentMap) {
    parentMap.clear();
  }

  const childrenMap = elementChildrenCache.get(element);
  if (childrenMap) {
    childrenMap.clear();
  }

  const selectorMap = elementSelectorCache.get(element);
  if (selectorMap) {
    selectorMap.clear();
  }

  elementParentCache.delete(element);
  elementChildrenCache.delete(element);
  elementSelectorCache.delete(element);
  cacheStats.invalidations++;
}

/**
 * Invalidate document-level query cache for specific selector or pattern
 * @param {string|RegExp} selectorPattern - The selector to invalidate (string or regex pattern)
 */
export function invalidateDocumentQuery(selectorPattern) {
  if (!selectorPattern) {
    querySelectorAllCache.clear();
    cacheStats.invalidations++;
    return;
  }

  if (typeof selectorPattern === 'string') {
    // Exact match
    querySelectorAllCache.delete(selectorPattern);
    cacheStats.invalidations++;
  } else if (selectorPattern instanceof RegExp) {
    // Pattern match - invalidate all matching selectors
    const keysToDelete = [];
    for (const key of querySelectorAllCache.keys()) {
      if (selectorPattern.test(key)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => querySelectorAllCache.delete(key));
    if (keysToDelete.length > 0) {
      cacheStats.invalidations++;
    }
  }
}

/**
 * Invalidate cache entries related to video containers
 * More efficient than clearing all caches
 */
export function invalidateVideoContainerCaches() {
  // Invalidate common video-related selectors
  const videoSelectors = [
    /ytd-rich-item-renderer/,
    /ytd-video-renderer/,
    /ytd-grid-video-renderer/,
    /ytd-compact-video-renderer/,
    /yt-thumbnail/,
    /progress.*bar/i,
    /watch\?v=/,
    /shorts\//
  ];

  videoSelectors.forEach(pattern => {
    invalidateDocumentQuery(pattern);
  });
}

/**
 * Clear all caches (called on major DOM changes)
 */
export function clearAllCaches() {
  querySelectorAllCache.clear();
  // WeakMaps will be garbage collected automatically
  cacheStats.invalidations++;
}

/**
 * Get cache performance statistics
 * @returns {Object} Cache statistics
 */
export function getCacheStats() {
  const total = cacheStats.hits + cacheStats.misses;
  return {
    ...cacheStats,
    hitRate: total > 0 ? ((cacheStats.hits / total) * 100).toFixed(2) : 0,
    totalQueries: total
  };
}

/**
 * Reset cache statistics
 */
export function resetCacheStats() {
  cacheStats.hits = 0;
  cacheStats.misses = 0;
  cacheStats.invalidations = 0;
}

/**
 * Log cache statistics (debug mode only)
 */
export function logCacheStats() {
  const stats = getCacheStats();
  console.log('[YT-HWV DOM Cache]', {
    'Hit Rate': `${stats.hitRate}%`,
    'Hits': stats.hits,
    'Misses': stats.misses,
    'Invalidations': stats.invalidations,
    'Total Queries': stats.totalQueries
  });
}
