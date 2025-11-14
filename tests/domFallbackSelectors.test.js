import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  cachedDocumentQueryWithFallback,
  cachedQuerySelectorWithFallback
} from '../content/utils/domCache.js';

describe('DOM Fallback Selectors', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    // Clear DOM cache to prevent test pollution
    const { clearAllCaches } = require('../content/utils/domCache.js');
    clearAllCaches();
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
    });

    it('should handle empty selector array', () => {
      const result = cachedDocumentQueryWithFallback('TEST', [], 100);

      expect(result.length).toBe(0);
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
});
