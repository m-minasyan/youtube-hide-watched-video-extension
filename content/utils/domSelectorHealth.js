// Track selector usage and success/failure rates
const selectorStats = new Map();

/**
 * Track selector query result for health monitoring
 * @param {string} selectorKey - Key identifying the selector type
 * @param {string} selector - The actual selector string used
 * @param {boolean} success - Whether the query succeeded (found elements)
 * @param {number} elementCount - Number of elements found
 */
export function trackSelectorQuery(selectorKey, selector, success, elementCount = 0) {
  if (!selectorStats.has(selectorKey)) {
    selectorStats.set(selectorKey, {
      queries: 0,
      successes: 0,
      failures: 0,
      lastSuccess: null,
      lastFailure: null,
      elementCounts: []
    });
  }

  const stats = selectorStats.get(selectorKey);
  stats.queries++;

  if (success && elementCount > 0) {
    stats.successes++;
    stats.lastSuccess = Date.now();
    stats.elementCounts.push(elementCount);
  } else {
    stats.failures++;
    stats.lastFailure = Date.now();
  }

  // Keep only last 100 counts to prevent unbounded memory growth
  if (stats.elementCounts.length > 100) {
    stats.elementCounts.shift();
  }
}

/**
 * Get health status for a specific selector
 * @param {string} selectorKey - Key identifying the selector type
 * @returns {Object|null} Health statistics or null if no data
 */
export function getSelectorHealth(selectorKey) {
  const stats = selectorStats.get(selectorKey);
  if (!stats) return null;

  const successRate = stats.queries > 0 ? (stats.successes / stats.queries) : 0;
  const avgElementCount = stats.elementCounts.length > 0
    ? stats.elementCounts.reduce((a, b) => a + b, 0) / stats.elementCounts.length
    : 0;

  return {
    ...stats,
    successRate,
    avgElementCount,
    isHealthy: successRate > 0.7 && stats.queries >= 10
  };
}

/**
 * Check health of critical selectors
 * @returns {Array} Array of unhealthy selectors with their health data
 */
export function checkCriticalSelectorsHealth() {
  const criticalSelectors = [
    'PROGRESS_BAR',
    'VIDEO_CONTAINERS',
    'THUMBNAILS',
    'SHORTS_CONTAINERS'
  ];

  const unhealthySelectors = [];

  for (const key of criticalSelectors) {
    const health = getSelectorHealth(key);
    if (health && !health.isHealthy) {
      unhealthySelectors.push({ key, health });
    }
  }

  return unhealthySelectors;
}

/**
 * Get all selector statistics
 * @returns {Object} Statistics for all selectors
 */
export function getAllSelectorStats() {
  const stats = {};
  for (const [key, value] of selectorStats.entries()) {
    stats[key] = getSelectorHealth(key);
  }
  return stats;
}

/**
 * Reset all selector statistics
 */
export function resetSelectorStats() {
  selectorStats.clear();
}

// Expose for debugging in browser console
if (typeof window !== 'undefined') {
  window.YTHWV_SelectorHealth = {
    getStats: getAllSelectorStats,
    getHealth: getSelectorHealth,
    checkCritical: checkCriticalSelectorsHealth,
    reset: resetSelectorStats
  };
}
