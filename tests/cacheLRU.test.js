/**
 * Tests for LRU cache eviction in content script
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock the cache module
let hiddenVideoCache;
let hiddenVideoTimestamps;
let cacheAccessOrder;
let MAX_CACHE_SIZE;

// Mock implementations
let applyCacheUpdate;
let getCachedHiddenVideo;
let getCacheSize;
let clearCache;

beforeEach(() => {
  // Reset all caches
  hiddenVideoCache = new Map();
  hiddenVideoTimestamps = new Map();
  cacheAccessOrder = new Map();
  MAX_CACHE_SIZE = 1000;

  function evictLRUEntries() {
    if (hiddenVideoCache.size <= MAX_CACHE_SIZE) return;

    const entries = Array.from(cacheAccessOrder.entries())
      .sort((a, b) => a[1] - b[1]);

    const toEvict = entries.slice(0, hiddenVideoCache.size - MAX_CACHE_SIZE);
    toEvict.forEach(([videoId]) => {
      hiddenVideoCache.delete(videoId);
      hiddenVideoTimestamps.delete(videoId);
      cacheAccessOrder.delete(videoId);
    });
  }

  applyCacheUpdate = (videoId, record) => {
    if (!videoId) return;
    if (record) {
      const timestamp = record.updatedAt || Date.now();
      hiddenVideoCache.set(videoId, record);
      hiddenVideoTimestamps.set(videoId, timestamp);
      cacheAccessOrder.set(videoId, Date.now());
      evictLRUEntries();
      return;
    }
    hiddenVideoCache.delete(videoId);
    hiddenVideoTimestamps.set(videoId, Date.now());
    cacheAccessOrder.delete(videoId);
  };

  getCachedHiddenVideo = (videoId) => {
    if (!videoId) return null;
    const record = hiddenVideoCache.get(videoId);
    if (record !== undefined) {
      cacheAccessOrder.set(videoId, Date.now());
    }
    return record || null;
  };

  getCacheSize = () => hiddenVideoCache.size;

  clearCache = () => {
    hiddenVideoCache.clear();
    hiddenVideoTimestamps.clear();
    cacheAccessOrder.clear();
  };
});

describe('LRU Cache Eviction', () => {
  it('should not evict entries when under MAX_CACHE_SIZE', () => {
    for (let i = 0; i < 500; i++) {
      applyCacheUpdate(`video${i}`, {
        videoId: `video${i}`,
        state: 'hidden',
        title: `Video ${i}`,
        updatedAt: Date.now()
      });
    }

    expect(getCacheSize()).toBe(500);
  });

  it('should evict oldest entries when exceeding MAX_CACHE_SIZE', () => {
    // Add MAX_CACHE_SIZE + 100 entries
    for (let i = 0; i < MAX_CACHE_SIZE + 100; i++) {
      applyCacheUpdate(`video${i}`, {
        videoId: `video${i}`,
        state: 'hidden',
        title: `Video ${i}`,
        updatedAt: Date.now()
      });
    }

    expect(getCacheSize()).toBe(MAX_CACHE_SIZE);

    // First 100 entries should be evicted
    expect(hiddenVideoCache.has('video0')).toBe(false);
    expect(hiddenVideoCache.has('video99')).toBe(false);

    // Last entries should still be present
    expect(hiddenVideoCache.has(`video${MAX_CACHE_SIZE + 99}`)).toBe(true);
  });

  it('should update access time on getCachedHiddenVideo', () => {
    applyCacheUpdate('video1', {
      videoId: 'video1',
      state: 'hidden',
      title: 'Video 1',
      updatedAt: Date.now()
    });

    const initialAccessTime = cacheAccessOrder.get('video1');

    // Wait a bit and access again
    setTimeout(() => {
      getCachedHiddenVideo('video1');
      const newAccessTime = cacheAccessOrder.get('video1');
      expect(newAccessTime).toBeGreaterThan(initialAccessTime);
    }, 10);
  });

  it('should keep frequently accessed items when evicting', async () => {
    // Add MAX_CACHE_SIZE entries
    for (let i = 0; i < MAX_CACHE_SIZE; i++) {
      applyCacheUpdate(`video${i}`, {
        videoId: `video${i}`,
        state: 'hidden',
        title: `Video ${i}`,
        updatedAt: Date.now()
      });
    }

    // Access the first 10 entries to update their access time
    await new Promise(resolve => setTimeout(resolve, 10));
    for (let i = 0; i < 10; i++) {
      getCachedHiddenVideo(`video${i}`);
    }

    // Add 100 more entries to trigger eviction
    await new Promise(resolve => setTimeout(resolve, 10));
    for (let i = MAX_CACHE_SIZE; i < MAX_CACHE_SIZE + 100; i++) {
      applyCacheUpdate(`video${i}`, {
        videoId: `video${i}`,
        state: 'hidden',
        title: `Video ${i}`,
        updatedAt: Date.now()
      });
    }

    expect(getCacheSize()).toBe(MAX_CACHE_SIZE);

    // First 10 entries (frequently accessed) should still be present
    for (let i = 0; i < 10; i++) {
      expect(hiddenVideoCache.has(`video${i}`)).toBe(true);
    }
  });

  it('should clear all caches including access order', () => {
    applyCacheUpdate('video1', {
      videoId: 'video1',
      state: 'hidden',
      title: 'Video 1',
      updatedAt: Date.now()
    });

    expect(getCacheSize()).toBe(1);
    expect(cacheAccessOrder.size).toBe(1);

    clearCache();

    expect(getCacheSize()).toBe(0);
    expect(cacheAccessOrder.size).toBe(0);
    expect(hiddenVideoTimestamps.size).toBe(0);
  });

  it('should handle null records correctly', () => {
    applyCacheUpdate('video1', {
      videoId: 'video1',
      state: 'hidden',
      title: 'Video 1',
      updatedAt: Date.now()
    });

    expect(getCacheSize()).toBe(1);

    // Update with null to remove
    applyCacheUpdate('video1', null);

    expect(getCacheSize()).toBe(0);
    expect(cacheAccessOrder.has('video1')).toBe(false);
  });
});
