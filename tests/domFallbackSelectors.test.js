import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  trackSelectorQuery,
  getSelectorHealth,
  checkCriticalSelectorsHealth,
  getAllSelectorStats,
  resetSelectorStats
} from '../content/utils/domSelectorHealth.js';
import {
  cachedDocumentQueryWithFallback,
  cachedQuerySelectorWithFallback
} from '../content/utils/domCache.js';
import * as notifications from '../shared/notifications.js';

describe('DOM Fallback Selectors', () => {
  beforeEach(() => {
    resetSelectorStats();
    document.body.innerHTML = '';
    // Clear DOM cache to prevent test pollution
    const { clearAllCaches } = require('../content/utils/domCache.js');
    clearAllCaches();
  });

  afterEach(() => {
    resetSelectorStats();
    // Clear DOM cache after each test
    const { clearAllCaches } = require('../content/utils/domCache.js');
    clearAllCaches();
  });

  describe('Selector Health Tracking', () => {
    it('should track successful queries', () => {
      trackSelectorQuery('TEST', '.test', true, 5);
      const health = getSelectorHealth('TEST');

      expect(health).not.toBeNull();
      expect(health.queries).toBe(1);
      expect(health.successes).toBe(1);
      expect(health.failures).toBe(0);
      expect(health.successRate).toBe(1.0);
      expect(health.avgElementCount).toBe(5);
    });

    it('should track failed queries', () => {
      trackSelectorQuery('TEST', '.test', false, 0);
      const health = getSelectorHealth('TEST');

      expect(health).not.toBeNull();
      expect(health.queries).toBe(1);
      expect(health.successes).toBe(0);
      expect(health.failures).toBe(1);
      expect(health.successRate).toBe(0);
    });

    it('should calculate success rate correctly with mixed results', () => {
      // 7 successes, 3 failures = 70% success rate
      for (let i = 0; i < 7; i++) {
        trackSelectorQuery('TEST', '.test', true, 2);
      }
      for (let i = 0; i < 3; i++) {
        trackSelectorQuery('TEST', '.test', false, 0);
      }

      const health = getSelectorHealth('TEST');
      expect(health.successRate).toBe(0.7);
      expect(health.queries).toBe(10);
    });

    it('should identify unhealthy selectors', () => {
      // Simulate 10 failures (0% success rate, should be unhealthy)
      for (let i = 0; i < 10; i++) {
        trackSelectorQuery('TEST', '.test', false, 0);
      }
      const health = getSelectorHealth('TEST');

      expect(health.isHealthy).toBe(false);
      expect(health.successRate).toBe(0);
    });

    it('should identify healthy selectors', () => {
      // Simulate 9 successes, 1 failure (90% success rate, should be healthy)
      for (let i = 0; i < 9; i++) {
        trackSelectorQuery('TEST', '.test', true, 3);
      }
      trackSelectorQuery('TEST', '.test', false, 0);

      const health = getSelectorHealth('TEST');
      expect(health.isHealthy).toBe(true);
      expect(health.successRate).toBe(0.9);
    });

    it('should not mark selector healthy with insufficient queries', () => {
      // Only 5 queries (< 10 minimum)
      for (let i = 0; i < 5; i++) {
        trackSelectorQuery('TEST', '.test', true, 2);
      }

      const health = getSelectorHealth('TEST');
      expect(health.successRate).toBe(1.0);
      expect(health.isHealthy).toBe(false); // Not enough queries yet
    });

    it('should limit element count history to 100 entries', () => {
      for (let i = 0; i < 150; i++) {
        trackSelectorQuery('TEST', '.test', true, i);
      }

      const health = getSelectorHealth('TEST');
      expect(health.elementCounts.length).toBe(100);
    });

    it('should return null for non-existent selector', () => {
      const health = getSelectorHealth('NON_EXISTENT');
      expect(health).toBeNull();
    });
  });

  describe('Critical Selector Health Checks', () => {
    it('should identify unhealthy critical selectors', () => {
      // Make PROGRESS_BAR unhealthy
      for (let i = 0; i < 20; i++) {
        trackSelectorQuery('PROGRESS_BAR', '.test', i < 2, 0); // 10% success rate
      }

      const unhealthy = checkCriticalSelectorsHealth();

      expect(unhealthy.length).toBeGreaterThan(0);
      expect(unhealthy.some(s => s.key === 'PROGRESS_BAR')).toBe(true);
    });

    it('should return empty array when all selectors healthy', () => {
      // Make all critical selectors healthy
      const criticalSelectors = ['PROGRESS_BAR', 'VIDEO_CONTAINERS', 'THUMBNAILS', 'SHORTS_CONTAINERS'];

      criticalSelectors.forEach(key => {
        for (let i = 0; i < 15; i++) {
          trackSelectorQuery(key, '.test', true, 5);
        }
      });

      const unhealthy = checkCriticalSelectorsHealth();
      expect(unhealthy.length).toBe(0);
    });
  });

  describe('Fallback Chain Queries - Document Level', () => {
    it('should use primary selector when available', () => {
      document.body.innerHTML = '<div class="primary">Test</div>';

      const result = cachedDocumentQueryWithFallback(
        'TEST',
        ['.primary', '.fallback'],
        100
      );

      expect(result.length).toBe(1);
      expect(result[0].className).toBe('primary');

      const health = getSelectorHealth('TEST');
      expect(health.successes).toBe(1);
    });

    it('should fall back to secondary selector', () => {
      document.body.innerHTML = '<div class="fallback">Test</div>';

      const result = cachedDocumentQueryWithFallback(
        'TEST',
        ['.primary', '.fallback'],
        100
      );

      expect(result.length).toBe(1);
      expect(result[0].className).toBe('fallback');
    });

    it('should return empty array when all selectors fail', () => {
      document.body.innerHTML = '<div class="none">Test</div>';

      const result = cachedDocumentQueryWithFallback(
        'TEST',
        ['.primary', '.fallback'],
        100
      );

      expect(result.length).toBe(0);

      const health = getSelectorHealth('TEST');
      expect(health.failures).toBe(1);
    });

    it('should handle empty selector array', () => {
      const result = cachedDocumentQueryWithFallback('TEST', [], 100);

      expect(result.length).toBe(0);

      const health = getSelectorHealth('TEST');
      expect(health.failures).toBe(1);
    });

    it('should handle invalid selectors gracefully', () => {
      const result = cachedDocumentQueryWithFallback(
        'TEST',
        [':::invalid:::', '.valid'],
        100
      );

      // Should skip invalid and continue to next
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should try all selectors in order', () => {
      document.body.innerHTML = '<div class="third">Test</div>';

      const result = cachedDocumentQueryWithFallback(
        'TEST',
        ['.first', '.second', '.third'],
        100
      );

      expect(result.length).toBe(1);
      expect(result[0].className).toBe('third');
    });
  });

  describe('Fallback Chain Queries - Element Level', () => {
    it('should find element with primary selector', () => {
      document.body.innerHTML = '<div><span class="primary">Test</span></div>';
      const parent = document.querySelector('div');

      const result = cachedQuerySelectorWithFallback(
        parent,
        'TEST',
        ['.primary', '.fallback']
      );

      expect(result).not.toBeNull();
      expect(result.className).toBe('primary');
    });

    it('should use fallback selector on element query', () => {
      document.body.innerHTML = '<div><span class="fallback">Test</span></div>';
      const parent = document.querySelector('div');

      const result = cachedQuerySelectorWithFallback(
        parent,
        'TEST',
        ['.primary', '.fallback']
      );

      expect(result).not.toBeNull();
      expect(result.className).toBe('fallback');
    });

    it('should return null when element query fails', () => {
      document.body.innerHTML = '<div><span class="none">Test</span></div>';
      const parent = document.querySelector('div');

      const result = cachedQuerySelectorWithFallback(
        parent,
        'TEST',
        ['.primary', '.fallback']
      );

      expect(result).toBeNull();
    });

    it('should handle null element', () => {
      const result = cachedQuerySelectorWithFallback(
        null,
        'TEST',
        ['.primary']
      );

      expect(result).toBeNull();
    });

    it('should handle empty selector array for element', () => {
      document.body.innerHTML = '<div></div>';
      const parent = document.querySelector('div');

      const result = cachedQuerySelectorWithFallback(parent, 'TEST', []);

      expect(result).toBeNull();
    });
  });

  describe('Statistics and Reporting', () => {
    it('should get all selector statistics', () => {
      trackSelectorQuery('TEST1', '.test1', true, 5);
      trackSelectorQuery('TEST2', '.test2', false, 0);
      trackSelectorQuery('TEST3', '.test3', true, 3);

      const allStats = getAllSelectorStats();

      expect(Object.keys(allStats).length).toBe(3);
      expect(allStats.TEST1).toBeDefined();
      expect(allStats.TEST2).toBeDefined();
      expect(allStats.TEST3).toBeDefined();
    });

    it('should reset all statistics', () => {
      trackSelectorQuery('TEST1', '.test1', true, 5);
      trackSelectorQuery('TEST2', '.test2', true, 3);

      let allStats = getAllSelectorStats();
      expect(Object.keys(allStats).length).toBe(2);

      resetSelectorStats();

      allStats = getAllSelectorStats();
      expect(Object.keys(allStats).length).toBe(0);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle rapid successive queries', () => {
      for (let i = 0; i < 100; i++) {
        trackSelectorQuery('TEST', '.test', true, 2);
      }

      const health = getSelectorHealth('TEST');
      expect(health.queries).toBe(100);
      expect(health.successRate).toBe(1.0);
    });

    it('should handle multiple selector types simultaneously', () => {
      const selectors = ['PROGRESS_BAR', 'VIDEO_CONTAINERS', 'THUMBNAILS'];

      selectors.forEach(key => {
        for (let i = 0; i < 10; i++) {
          trackSelectorQuery(key, `.${key}`, true, 5);
        }
      });

      const allStats = getAllSelectorStats();
      expect(Object.keys(allStats).length).toBe(3);

      selectors.forEach(key => {
        expect(allStats[key].queries).toBe(10);
        expect(allStats[key].successRate).toBe(1.0);
      });
    });

    it('should track lastSuccess and lastFailure timestamps', () => {
      const before = Date.now();

      trackSelectorQuery('TEST', '.test', true, 5);

      const health = getSelectorHealth('TEST');
      expect(health.lastSuccess).toBeGreaterThanOrEqual(before);
      expect(health.lastSuccess).toBeLessThanOrEqual(Date.now());
      expect(health.lastFailure).toBeNull();
    });

    it('should update timestamps on subsequent queries', () => {
      trackSelectorQuery('TEST', '.test', true, 5);
      const health1 = getSelectorHealth('TEST');

      // Wait a bit
      const wait = new Promise(resolve => setTimeout(resolve, 10));
      return wait.then(() => {
        trackSelectorQuery('TEST', '.test', false, 0);
        const health2 = getSelectorHealth('TEST');

        expect(health2.lastFailure).toBeGreaterThan(health1.lastSuccess);
      });
    });
  });
});
