/**
 * Tests for write batching functionality
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock write batcher
let pendingWrites;
let flushTimer;
let mockUpsertHiddenVideos;
const BATCH_FLUSH_DELAY = 100;
const BATCH_MAX_SIZE = 50;

let queueWrite;
let forceFlush;
let getPendingWriteCount;
let clearPendingWrites;

beforeEach(() => {
  jest.clearAllTimers();
  jest.useFakeTimers();

  pendingWrites = new Map();
  flushTimer = null;
  mockUpsertHiddenVideos = jest.fn().mockResolvedValue(undefined);

  const scheduleFlush = () => {
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(() => flushWrites(), BATCH_FLUSH_DELAY);
  };

  const flushWrites = async () => {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }

    if (pendingWrites.size === 0) return;

    const batch = Array.from(pendingWrites.values());
    pendingWrites.clear();

    await mockUpsertHiddenVideos(batch);
  };

  queueWrite = (videoId, record) => {
    pendingWrites.set(videoId, record);

    if (pendingWrites.size >= BATCH_MAX_SIZE) {
      return flushWrites();
    } else {
      scheduleFlush();
    }
  };

  forceFlush = () => flushWrites();

  getPendingWriteCount = () => pendingWrites.size;

  clearPendingWrites = () => {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    pendingWrites.clear();
  };
});

afterEach(() => {
  jest.useRealTimers();
});

describe('Write Batching', () => {
  it('should queue writes without immediate flush', () => {
    queueWrite('video1', { videoId: 'video1', state: 'hidden' });

    expect(getPendingWriteCount()).toBe(1);
    expect(mockUpsertHiddenVideos).not.toHaveBeenCalled();
  });

  it('should flush after BATCH_FLUSH_DELAY', async () => {
    queueWrite('video1', { videoId: 'video1', state: 'hidden' });
    queueWrite('video2', { videoId: 'video2', state: 'dimmed' });

    expect(getPendingWriteCount()).toBe(2);

    jest.advanceTimersByTime(BATCH_FLUSH_DELAY);
    await Promise.resolve(); // Wait for async flush

    expect(mockUpsertHiddenVideos).toHaveBeenCalledTimes(1);
    expect(mockUpsertHiddenVideos).toHaveBeenCalledWith([
      { videoId: 'video1', state: 'hidden' },
      { videoId: 'video2', state: 'dimmed' }
    ]);
    expect(getPendingWriteCount()).toBe(0);
  });

  it('should flush immediately when reaching BATCH_MAX_SIZE', async () => {
    for (let i = 0; i < BATCH_MAX_SIZE; i++) {
      queueWrite(`video${i}`, { videoId: `video${i}`, state: 'hidden' });
    }

    await Promise.resolve(); // Wait for async flush

    expect(mockUpsertHiddenVideos).toHaveBeenCalledTimes(1);
    expect(mockUpsertHiddenVideos.mock.calls[0][0]).toHaveLength(BATCH_MAX_SIZE);
    expect(getPendingWriteCount()).toBe(0);
  });

  it('should deduplicate writes by videoId', async () => {
    queueWrite('video1', { videoId: 'video1', state: 'hidden', updatedAt: 1000 });
    queueWrite('video1', { videoId: 'video1', state: 'dimmed', updatedAt: 2000 });

    expect(getPendingWriteCount()).toBe(1);

    jest.advanceTimersByTime(BATCH_FLUSH_DELAY);
    await Promise.resolve();

    expect(mockUpsertHiddenVideos).toHaveBeenCalledWith([
      { videoId: 'video1', state: 'dimmed', updatedAt: 2000 }
    ]);
  });

  it('should force flush all pending writes', async () => {
    queueWrite('video1', { videoId: 'video1', state: 'hidden' });
    queueWrite('video2', { videoId: 'video2', state: 'dimmed' });

    expect(getPendingWriteCount()).toBe(2);

    await forceFlush();

    expect(mockUpsertHiddenVideos).toHaveBeenCalledTimes(1);
    expect(getPendingWriteCount()).toBe(0);
  });

  it('should clear pending writes without flushing', () => {
    queueWrite('video1', { videoId: 'video1', state: 'hidden' });
    queueWrite('video2', { videoId: 'video2', state: 'dimmed' });

    expect(getPendingWriteCount()).toBe(2);

    clearPendingWrites();

    expect(getPendingWriteCount()).toBe(0);
    expect(mockUpsertHiddenVideos).not.toHaveBeenCalled();
  });

  it('should reset timer on new writes', async () => {
    queueWrite('video1', { videoId: 'video1', state: 'hidden' });

    jest.advanceTimersByTime(50); // Advance half way

    queueWrite('video2', { videoId: 'video2', state: 'dimmed' });

    jest.advanceTimersByTime(50); // Advance another half (total 100ms from first write)

    // Should not have flushed yet (timer was reset)
    expect(mockUpsertHiddenVideos).not.toHaveBeenCalled();

    jest.advanceTimersByTime(50); // Now 100ms from second write

    await Promise.resolve();

    expect(mockUpsertHiddenVideos).toHaveBeenCalledTimes(1);
  });

  it('should handle empty flush gracefully', async () => {
    await forceFlush();

    expect(mockUpsertHiddenVideos).not.toHaveBeenCalled();
  });

  it('should batch multiple rapid writes', async () => {
    for (let i = 0; i < 10; i++) {
      queueWrite(`video${i}`, { videoId: `video${i}`, state: 'hidden' });
    }

    expect(getPendingWriteCount()).toBe(10);

    jest.advanceTimersByTime(BATCH_FLUSH_DELAY);
    await Promise.resolve();

    expect(mockUpsertHiddenVideos).toHaveBeenCalledTimes(1);
    expect(mockUpsertHiddenVideos.mock.calls[0][0]).toHaveLength(10);
  });
});
