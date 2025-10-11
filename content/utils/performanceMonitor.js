import { getCacheStats, resetCacheStats } from './domCache.js';
import { DEBUG } from '../../shared/constants.js';
import { debug } from './logger.js';

const performanceMetrics = {
  domQueryTime: 0,
  hidingOperations: 0,
  mutationCallbacks: 0,
  startTime: Date.now()
};

/**
 * Measure DOM query performance
 * @param {Function} queryFn - The query function to measure
 * @param {string} label - Label for the measurement
 * @returns {*} Result of the query function
 */
export function measureQuery(queryFn, label = 'Query') {
  if (!DEBUG) return queryFn();

  const start = performance.now();
  const result = queryFn();
  const duration = performance.now() - start;

  performanceMetrics.domQueryTime += duration;

  if (duration > 10) { // Log slow queries
    debug(`[YT-HWV Performance] Slow ${label}: ${duration.toFixed(2)}ms`);
  }

  return result;
}

/**
 * Get comprehensive performance report
 * @returns {Object} Performance metrics
 */
export function getPerformanceReport() {
  const cacheStats = getCacheStats();
  const uptime = Date.now() - performanceMetrics.startTime;

  return {
    uptime: (uptime / 1000).toFixed(2) + 's',
    totalDOMQueryTime: performanceMetrics.domQueryTime.toFixed(2) + 'ms',
    hidingOperations: performanceMetrics.hidingOperations,
    mutationCallbacks: performanceMetrics.mutationCallbacks,
    averageQueryTime: performanceMetrics.hidingOperations > 0
      ? (performanceMetrics.domQueryTime / performanceMetrics.hidingOperations).toFixed(2) + 'ms'
      : '0ms',
    cacheHitRate: cacheStats.hitRate + '%',
    cacheHits: cacheStats.hits,
    cacheMisses: cacheStats.misses,
    cacheInvalidations: cacheStats.invalidations
  };
}

/**
 * Log performance report to console
 */
export function logPerformanceReport() {
  if (!DEBUG) return;

  const report = getPerformanceReport();
  console.table(report);
}

/**
 * Increment hiding operation counter
 */
export function incrementHidingOps() {
  performanceMetrics.hidingOperations++;
}

/**
 * Increment mutation callback counter
 */
export function incrementMutationCallbacks() {
  performanceMetrics.mutationCallbacks++;
}

/**
 * Reset all performance metrics
 */
export function resetPerformanceMetrics() {
  performanceMetrics.domQueryTime = 0;
  performanceMetrics.hidingOperations = 0;
  performanceMetrics.mutationCallbacks = 0;
  performanceMetrics.startTime = Date.now();
  resetCacheStats();
}

// Expose performance monitoring in debug mode
if (DEBUG && typeof window !== 'undefined') {
  window.YTHWV_Performance = {
    getReport: getPerformanceReport,
    logReport: logPerformanceReport,
    reset: resetPerformanceMetrics
  };
}
