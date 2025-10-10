/**
 * Tests for background cache layer
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock cache implementation
let backgroundCache;
const CACHE_TTL = 30000; // 30 seconds

let getCachedRecord;
let setCachedRecord;
let invalidateCache;
let clearBackgroundCache;
let getCacheStats;

beforeEach(() => {
  backgroundCache = new Map();

  getCachedRecord = (videoId) => {
    const entry = backgroundCache.get(videoId);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > CACHE_TTL) {
      backgroundCache.delete(videoId);
      return null;
    }

    return entry.record;
  };

  setCachedRecord = (videoId, record) => {
    backgroundCache.set(videoId, {
      record,
      timestamp: Date.now()
    });
  };

  invalidateCache = (videoId) => {
    backgroundCache.delete(videoId);
  };

  clearBackgroundCache = () => {
    backgroundCache.clear();
  };

  getCacheStats = () => ({
    size: backgroundCache.size,
    ttl: CACHE_TTL
  });
});

describe('Background Cache Layer', () => {
  it('should cache and retrieve records', () => {
    const record = {
      videoId: 'abc123',
      state: 'hidden',
      title: 'Test Video',
      updatedAt: Date.now()
    };

    setCachedRecord('abc123', record);
    const cached = getCachedRecord('abc123');

    expect(cached).toEqual(record);
  });

  it('should return null for non-existent records', () => {
    const cached = getCachedRecord('nonexistent');
    expect(cached).toBeNull();
  });

  it('should expire records after TTL', () => {
    const record = {
      videoId: 'abc123',
      state: 'hidden',
      title: 'Test Video',
      updatedAt: Date.now()
    };

    // Manually set with old timestamp
    backgroundCache.set('abc123', {
      record,
      timestamp: Date.now() - CACHE_TTL - 1000
    });

    const cached = getCachedRecord('abc123');
    expect(cached).toBeNull();
    expect(backgroundCache.has('abc123')).toBe(false);
  });

  it('should not expire records within TTL', () => {
    const record = {
      videoId: 'abc123',
      state: 'hidden',
      title: 'Test Video',
      updatedAt: Date.now()
    };

    setCachedRecord('abc123', record);

    // Immediately retrieve (well within TTL)
    const cached = getCachedRecord('abc123');
    expect(cached).toEqual(record);
  });

  it('should invalidate specific records', () => {
    const record1 = {
      videoId: 'abc123',
      state: 'hidden',
      title: 'Test Video 1',
      updatedAt: Date.now()
    };
    const record2 = {
      videoId: 'def456',
      state: 'dimmed',
      title: 'Test Video 2',
      updatedAt: Date.now()
    };

    setCachedRecord('abc123', record1);
    setCachedRecord('def456', record2);

    expect(backgroundCache.size).toBe(2);

    invalidateCache('abc123');

    expect(getCachedRecord('abc123')).toBeNull();
    expect(getCachedRecord('def456')).toEqual(record2);
  });

  it('should clear all cached records', () => {
    setCachedRecord('abc123', { videoId: 'abc123', state: 'hidden' });
    setCachedRecord('def456', { videoId: 'def456', state: 'dimmed' });

    expect(backgroundCache.size).toBe(2);

    clearBackgroundCache();

    expect(backgroundCache.size).toBe(0);
    expect(getCachedRecord('abc123')).toBeNull();
    expect(getCachedRecord('def456')).toBeNull();
  });

  it('should cache null values for deleted records', () => {
    setCachedRecord('abc123', null);

    const entry = backgroundCache.get('abc123');
    expect(entry).toBeDefined();
    expect(entry.record).toBeNull();

    const cached = getCachedRecord('abc123');
    expect(cached).toBeNull();
  });

  it('should return correct cache stats', () => {
    setCachedRecord('abc123', { videoId: 'abc123', state: 'hidden' });
    setCachedRecord('def456', { videoId: 'def456', state: 'dimmed' });

    const stats = getCacheStats();

    expect(stats.size).toBe(2);
    expect(stats.ttl).toBe(CACHE_TTL);
  });

  it('should handle rapid cache updates', () => {
    const record1 = { videoId: 'abc123', state: 'hidden', updatedAt: Date.now() };
    const record2 = { videoId: 'abc123', state: 'dimmed', updatedAt: Date.now() + 1000 };

    setCachedRecord('abc123', record1);
    setCachedRecord('abc123', record2);

    const cached = getCachedRecord('abc123');
    expect(cached).toEqual(record2);
  });
});
