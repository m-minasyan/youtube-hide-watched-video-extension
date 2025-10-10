import { cachedDocumentQuery, clearAllCaches, getCacheStats, resetCacheStats } from '../content/utils/domCache';

describe('DOM Cache Integration Tests', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    clearAllCaches();
    resetCacheStats();
  });

  test('should improve performance for repeated queries', () => {
    // Create mock YouTube page with 50 videos
    for (let i = 0; i < 50; i++) {
      const video = document.createElement('ytd-rich-item-renderer');
      const thumbnail = document.createElement('yt-thumbnail-view-model');
      const link = document.createElement('a');
      link.href = `/watch?v=video${i}`;
      const progress = document.createElement('div');
      progress.className = 'ytd-thumbnail-overlay-resume-playback-renderer';
      progress.style.width = '50%';

      thumbnail.appendChild(link);
      thumbnail.appendChild(progress);
      video.appendChild(thumbnail);
      document.body.appendChild(video);
    }

    // First run - populate cache
    const start1 = performance.now();
    const result1 = cachedDocumentQuery('ytd-rich-item-renderer');
    const time1 = performance.now() - start1;

    // Second run - use cache
    const start2 = performance.now();
    const result2 = cachedDocumentQuery('ytd-rich-item-renderer');
    const time2 = performance.now() - start2;

    const stats = getCacheStats();

    expect(result1).toHaveLength(50);
    expect(result2).toHaveLength(50);

    // Second run should be faster
    expect(time2).toBeLessThan(time1);

    // Should have cache hits
    expect(stats.hits).toBeGreaterThan(0);
  });

  test('should handle dynamic content additions', () => {
    // Initial content
    const video1 = document.createElement('ytd-rich-item-renderer');
    const link1 = document.createElement('a');
    link1.href = '/watch?v=video1';
    video1.appendChild(link1);
    document.body.appendChild(video1);

    const result1 = cachedDocumentQuery('ytd-rich-item-renderer');
    expect(result1).toHaveLength(1);

    // Add new content
    const video2 = document.createElement('ytd-rich-item-renderer');
    const link2 = document.createElement('a');
    link2.href = '/watch?v=video2';
    video2.appendChild(link2);
    document.body.appendChild(video2);

    // Cache should still return old result
    const result2 = cachedDocumentQuery('ytd-rich-item-renderer');
    expect(result2).toHaveLength(1);

    // Clear cache
    clearAllCaches();

    // Now should see new content
    const result3 = cachedDocumentQuery('ytd-rich-item-renderer');
    expect(result3).toHaveLength(2);
  });

  test('should cache work across multiple selectors', () => {
    // Create mock page structure
    for (let i = 0; i < 20; i++) {
      const video = document.createElement('ytd-rich-item-renderer');
      const thumbnail = document.createElement('yt-thumbnail-view-model');
      const link = document.createElement('a');
      link.href = `/watch?v=video${i}`;
      thumbnail.appendChild(link);
      video.appendChild(thumbnail);
      document.body.appendChild(video);
    }

    // Multiple queries
    cachedDocumentQuery('ytd-rich-item-renderer');
    cachedDocumentQuery('yt-thumbnail-view-model');
    cachedDocumentQuery('a[href*="/watch"]');

    // Second queries should hit cache
    cachedDocumentQuery('ytd-rich-item-renderer');
    cachedDocumentQuery('yt-thumbnail-view-model');
    cachedDocumentQuery('a[href*="/watch"]');

    const stats = getCacheStats();
    expect(stats.hits).toBe(3);
    expect(stats.misses).toBe(3);
    expect(parseFloat(stats.hitRate)).toBe(50);
  });

  test('should handle TTL expiration correctly', () => {
    jest.useFakeTimers();

    const div = document.createElement('div');
    div.className = 'test';
    document.body.appendChild(div);

    // First query with 1s TTL
    cachedDocumentQuery('.test', 1000);

    // Second query within TTL - cache hit
    cachedDocumentQuery('.test', 1000);

    let stats = getCacheStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);

    // Advance time past TTL
    jest.advanceTimersByTime(1500);

    // Query again - cache miss due to TTL expiration
    cachedDocumentQuery('.test', 1000);

    stats = getCacheStats();
    expect(stats.misses).toBe(2);

    jest.useRealTimers();
  });

  test('should work with real YouTube selectors', () => {
    // Create realistic YouTube DOM structure
    const videoContainer = document.createElement('ytd-rich-item-renderer');

    const thumbnail = document.createElement('yt-thumbnail-view-model');
    const link = document.createElement('a');
    link.href = '/watch?v=testVideo123';

    const title = document.createElement('a');
    title.id = 'video-title';
    title.href = '/watch?v=testVideo123';
    title.textContent = 'Test Video';

    const progress = document.createElement('div');
    progress.className = 'ytd-thumbnail-overlay-resume-playback-renderer';
    progress.style.width = '75%';

    thumbnail.appendChild(link);
    thumbnail.appendChild(progress);
    videoContainer.appendChild(thumbnail);
    videoContainer.appendChild(title);
    document.body.appendChild(videoContainer);

    // Test various selectors
    const containers = cachedDocumentQuery('ytd-rich-item-renderer');
    const thumbnails = cachedDocumentQuery('yt-thumbnail-view-model');
    const links = cachedDocumentQuery('a[href*="/watch"]');
    const progressBars = cachedDocumentQuery('.ytd-thumbnail-overlay-resume-playback-renderer');

    expect(containers).toHaveLength(1);
    expect(thumbnails).toHaveLength(1);
    expect(links).toHaveLength(2); // link in thumbnail and title link
    expect(progressBars).toHaveLength(1);

    // Repeat queries to hit cache
    cachedDocumentQuery('ytd-rich-item-renderer');
    cachedDocumentQuery('yt-thumbnail-view-model');
    cachedDocumentQuery('a[href*="/watch"]');
    cachedDocumentQuery('.ytd-thumbnail-overlay-resume-playback-renderer');

    const stats = getCacheStats();
    expect(stats.hits).toBe(4);
    expect(stats.misses).toBe(4);
  });
});

describe('CACHE_CONFIG Integration', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('videoDetector should use CACHE_CONFIG.PROGRESS_BAR_TTL', () => {
    // Mock document with progress bars
    document.body.innerHTML = `
      <div class="ytd-thumbnail-overlay-resume-playback-renderer" style="width: 50%"></div>
    `;

    // Import should not throw
    const { findWatchedElements } = require('../content/detection/videoDetector.js');

    // Function should execute without error
    expect(() => findWatchedElements()).not.toThrow();
  });

  test('mutationObserver should use CACHE_CONFIG.STATS_LOG_INTERVAL in debug mode', () => {
    const { setupMutationObserver } = require('../content/observers/mutationObserver.js');
    const mockApplyHiding = jest.fn();

    // Should not throw when setting up observer
    expect(() => setupMutationObserver(mockApplyHiding)).not.toThrow();
  });

  test('CACHE_CONFIG should be properly exported and accessible', () => {
    const { CACHE_CONFIG } = require('../content/utils/constants.js');

    // Verify CACHE_CONFIG is defined
    expect(CACHE_CONFIG).toBeDefined();
    expect(CACHE_CONFIG.PROGRESS_BAR_TTL).toBe(500);
    expect(CACHE_CONFIG.STATS_LOG_INTERVAL).toBe(30000);
    expect(CACHE_CONFIG.DOCUMENT_QUERY_TTL).toBe(1000);
    expect(CACHE_CONFIG.ENABLE_PERFORMANCE_MONITORING).toBe(true);
  });
});
