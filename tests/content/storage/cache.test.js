/**
 * @jest-environment jsdom
 */

import {
  getCachedHiddenVideo,
  applyCacheUpdate,
  mergeFetchedRecord,
  clearCache
} from '../../../content/storage/cache.js';

describe('Cache Module', () => {
  beforeEach(() => {
    clearCache();
  });

  describe('getCachedHiddenVideo', () => {
    test('should return null for uncached video', () => {
      const result = getCachedHiddenVideo('test-video-id');
      expect(result).toBeNull();
    });

    test('should return cached record after update', () => {
      const record = { videoId: 'test-id', state: 'dimmed', timestamp: Date.now() };
      applyCacheUpdate('test-id', record);

      const result = getCachedHiddenVideo('test-id');
      expect(result).toEqual(record);
    });

    test('should return null after record removal', () => {
      const record = { videoId: 'test-id', state: 'dimmed', timestamp: Date.now() };
      applyCacheUpdate('test-id', record);
      applyCacheUpdate('test-id', null);

      const result = getCachedHiddenVideo('test-id');
      expect(result).toBeNull();
    });
  });

  describe('applyCacheUpdate', () => {
    test('should cache a new record', () => {
      const record = { videoId: 'vid-1', state: 'hidden', timestamp: Date.now() };
      applyCacheUpdate('vid-1', record);

      expect(getCachedHiddenVideo('vid-1')).toEqual(record);
    });

    test('should update existing record', () => {
      const record1 = { videoId: 'vid-1', state: 'dimmed', timestamp: 1000 };
      const record2 = { videoId: 'vid-1', state: 'hidden', timestamp: 2000 };

      applyCacheUpdate('vid-1', record1);
      applyCacheUpdate('vid-1', record2);

      expect(getCachedHiddenVideo('vid-1')).toEqual(record2);
    });

    test('should remove record when passed null', () => {
      const record = { videoId: 'vid-1', state: 'dimmed', timestamp: Date.now() };
      applyCacheUpdate('vid-1', record);
      applyCacheUpdate('vid-1', null);

      expect(getCachedHiddenVideo('vid-1')).toBeNull();
    });
  });

  describe('mergeFetchedRecord', () => {
    test('should add new record to cache', () => {
      const record = { videoId: 'new-vid', state: 'dimmed', timestamp: Date.now() };
      mergeFetchedRecord('new-vid', record);

      expect(getCachedHiddenVideo('new-vid')).toEqual(record);
    });

    test('should keep newer timestamp when merging', () => {
      const older = { videoId: 'vid', state: 'dimmed', updatedAt: 1000 };
      const newer = { videoId: 'vid', state: 'hidden', updatedAt: 2000 };

      applyCacheUpdate('vid', older);
      mergeFetchedRecord('vid', newer);

      const result = getCachedHiddenVideo('vid');
      expect(result.updatedAt).toBe(2000);
      expect(result.state).toBe('hidden');
    });

    test('should ignore older fetched records', () => {
      const newer = { videoId: 'vid', state: 'hidden', updatedAt: 2000 };
      const older = { videoId: 'vid', state: 'dimmed', updatedAt: 1000 };

      applyCacheUpdate('vid', newer);
      mergeFetchedRecord('vid', older);

      const result = getCachedHiddenVideo('vid');
      expect(result.updatedAt).toBe(2000);
      expect(result.state).toBe('hidden');
    });
  });

  describe('clearCache', () => {
    test('should clear all cached records', () => {
      applyCacheUpdate('vid-1', { videoId: 'vid-1', state: 'dimmed', timestamp: 1000 });
      applyCacheUpdate('vid-2', { videoId: 'vid-2', state: 'hidden', timestamp: 2000 });

      clearCache();

      expect(getCachedHiddenVideo('vid-1')).toBeNull();
      expect(getCachedHiddenVideo('vid-2')).toBeNull();
    });

    test('should allow new records after clear', () => {
      applyCacheUpdate('vid-1', { videoId: 'vid-1', state: 'dimmed', timestamp: 1000 });
      clearCache();

      const newRecord = { videoId: 'vid-2', state: 'hidden', timestamp: 2000 };
      applyCacheUpdate('vid-2', newRecord);

      expect(getCachedHiddenVideo('vid-2')).toEqual(newRecord);
    });
  });
});
