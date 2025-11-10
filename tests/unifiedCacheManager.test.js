/**
 * Integration tests for UnifiedCacheManager
 * Verifies unified 3-Map cache architecture with LRU eviction
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { UnifiedCacheManager } from '../shared/cache/UnifiedCacheManager.js';

describe('UnifiedCacheManager - Core Functionality', () => {
  let cache;

  beforeEach(() => {
    cache = new UnifiedCacheManager({
      maxSize: 5000
    });
  });

  it('should store and retrieve records', () => {
    const record = { videoId: 'vid1', state: 'hidden', title: 'Test Video' };
    cache.set('vid1', record);

    const retrieved = cache.get('vid1');
    expect(retrieved).toEqual(record);
  });

  it('should evict LRU entries when exceeding maxSize', () => {
    const smallCache = new UnifiedCacheManager({
      maxSize: 3
    });

    smallCache.set('vid1', { videoId: 'vid1' });
    smallCache.set('vid2', { videoId: 'vid2' });
    smallCache.set('vid3', { videoId: 'vid3' });
    smallCache.set('vid4', { videoId: 'vid4' }); // Should evict vid1

    expect(smallCache.get('vid1')).toBeUndefined();
    expect(smallCache.get('vid2')).toBeDefined();
    expect(smallCache.get('vid3')).toBeDefined();
    expect(smallCache.get('vid4')).toBeDefined();
  });

  it('should maintain consistency after eviction', () => {
    const smallCache = new UnifiedCacheManager({
      maxSize: 2
    });

    for (let i = 0; i < 10; i++) {
      smallCache.set(`vid${i}`, { videoId: `vid${i}` });
    }

    const validation = smallCache.validateConsistency();
    expect(validation.isValid).toBe(true);
    expect(smallCache.getStats().size).toBe(2);
  });

  it('should invalidate records correctly', () => {
    cache.set('vid1', { videoId: 'vid1' });
    cache.invalidate('vid1');

    expect(cache.get('vid1')).toBeUndefined();
  });

  it('should clear all records', () => {
    cache.set('vid1', { videoId: 'vid1' });
    cache.set('vid2', { videoId: 'vid2' });
    cache.clear();

    expect(cache.getStats().size).toBe(0);
  });
});

describe('UnifiedCacheManager - Timestamp-based Merging', () => {
  let cache;

  beforeEach(() => {
    cache = new UnifiedCacheManager({
      maxSize: 1000,
      trackPendingRequests: true
    });
  });

  it('should store and retrieve records with timestamps', () => {
    const record = { videoId: 'vid1', state: 'hidden', updatedAt: 1000 };
    cache.set('vid1', record);

    const retrieved = cache.get('vid1');
    expect(retrieved).toEqual(record);
  });

  it('should merge records based on timestamp', () => {
    const older = { videoId: 'vid1', state: 'dimmed', updatedAt: 1000 };
    const newer = { videoId: 'vid1', state: 'hidden', updatedAt: 2000 };

    cache.set('vid1', older);
    cache.mergeFetchedRecord('vid1', newer);

    const retrieved = cache.get('vid1');
    expect(retrieved).toEqual(newer);
  });

  it('should reject older fetched records', () => {
    const newer = { videoId: 'vid1', state: 'hidden', updatedAt: 2000 };
    const older = { videoId: 'vid1', state: 'dimmed', updatedAt: 1000 };

    cache.set('vid1', newer);
    cache.mergeFetchedRecord('vid1', older);

    const retrieved = cache.get('vid1');
    expect(retrieved).toEqual(newer);
  });

  it('should apply updates unconditionally', () => {
    const record1 = { videoId: 'vid1', state: 'dimmed', updatedAt: 2000 };
    const record2 = { videoId: 'vid1', state: 'hidden', updatedAt: 1000 };

    cache.set('vid1', record1);
    cache.applyUpdate('vid1', record2);

    const retrieved = cache.get('vid1');
    expect(retrieved).toEqual(record2);
  });

  it('should track pending requests', () => {
    const promise = Promise.resolve();
    cache.setPendingRequest('vid1', promise);

    expect(cache.hasPendingRequest('vid1')).toBe(true);
    expect(cache.getPendingRequest('vid1')).toBe(promise);

    cache.deletePendingRequest('vid1');
    expect(cache.hasPendingRequest('vid1')).toBe(false);
  });

  it('should maintain consistency between all three Maps', () => {
    for (let i = 0; i < 10; i++) {
      cache.set(`vid${i}`, { videoId: `vid${i}`, updatedAt: i * 1000 });
    }

    const validation = cache.validateConsistency();
    expect(validation.isValid).toBe(true);
    expect(validation.sizes.cache).toBe(validation.sizes.timestamps);
  });

  it('should evict from all three Maps consistently', () => {
    const smallCache = new UnifiedCacheManager({
      maxSize: 2,
      trackPendingRequests: true
    });

    for (let i = 0; i < 5; i++) {
      smallCache.set(`vid${i}`, { videoId: `vid${i}`, updatedAt: i * 1000 });
    }

    const validation = smallCache.validateConsistency();
    expect(validation.isValid).toBe(true);
    expect(smallCache.getStats().size).toBe(2);
  });
});

describe('UnifiedCacheManager - Consistency Validation and Repair', () => {
  it('should validate consistency correctly', () => {
    const cache = new UnifiedCacheManager({
      maxSize: 100
    });

    cache.set('vid1', { videoId: 'vid1', updatedAt: 1000 });
    cache.set('vid2', { videoId: 'vid2', updatedAt: 2000 });

    const validation = cache.validateConsistency();
    expect(validation.isValid).toBe(true);
    expect(validation.issues.length).toBe(0);
  });

  it('should detect inconsistencies', () => {
    const cache = new UnifiedCacheManager({
      maxSize: 100
    });

    // Manually create inconsistency by accessing internal Maps
    cache.cache.set('vid1', { videoId: 'vid1' });
    // Missing timestamp - creates inconsistency

    const validation = cache.validateConsistency();
    expect(validation.isValid).toBe(false);
    expect(validation.issues.length).toBeGreaterThan(0);
  });

  it('should repair inconsistencies', () => {
    const cache = new UnifiedCacheManager({
      maxSize: 100
    });

    // Create inconsistency
    cache.cache.set('vid1', { videoId: 'vid1' });
    // Missing timestamp

    const repairResult = cache.repairConsistency();
    expect(repairResult.actionsCount).toBeGreaterThan(0);

    const validation = cache.validateConsistency();
    expect(validation.isValid).toBe(true);
  });
});

describe('UnifiedCacheManager - Stats and Monitoring', () => {
  it('should return correct stats', () => {
    const cache = new UnifiedCacheManager({
      maxSize: 5000
    });

    cache.set('vid1', { videoId: 'vid1' });
    cache.set('vid2', { videoId: 'vid2' });

    const stats = cache.getStats();
    expect(stats.size).toBe(2);
    expect(stats.maxSize).toBe(5000);
    expect(stats.timestampsSize).toBe(2);
    expect(stats.accessOrderSize).toBe(2);
  });

  it('should return correct stats with pending requests', () => {
    const cache = new UnifiedCacheManager({
      maxSize: 1000,
      trackPendingRequests: true
    });

    cache.set('vid1', { videoId: 'vid1', updatedAt: 1000 });
    cache.setPendingRequest('vid2', Promise.resolve());

    const stats = cache.getStats();
    expect(stats.size).toBe(1);
    expect(stats.maxSize).toBe(1000);
    expect(stats.timestampsSize).toBe(1);
    expect(stats.pendingRequestsSize).toBe(1);
  });

  it('should calculate memory usage', () => {
    const cache = new UnifiedCacheManager({
      maxSize: 100
    });

    cache.set('vid1', { videoId: 'vid1', title: 'Test Video', state: 'hidden' });

    const memoryUsage = cache.getMemoryUsage();
    expect(memoryUsage).toBeGreaterThan(0);
  });
});
