import {
  cachedClosest,
  cachedDocumentQuery,
  clearAllCaches,
  getCacheStats,
  resetCacheStats
} from '../content/utils/domCache';

describe('DOM Cache Performance Tests', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    clearAllCaches();
    resetCacheStats();
  });

  test('should significantly improve performance for repeated closest calls', () => {
    // Create deep DOM tree
    let current = document.body;
    for (let i = 0; i < 20; i++) {
      const div = document.createElement('div');
      div.className = `level-${i}`;
      current.appendChild(div);
      current = div;
    }
    const deepestChild = current;

    // Measure uncached performance
    clearAllCaches();
    const start1 = performance.now();
    for (let i = 0; i < 100; i++) {
      deepestChild.closest('.level-0');
    }
    const uncachedTime = performance.now() - start1;

    // Measure cached performance
    clearAllCaches();
    cachedClosest(deepestChild, '.level-0'); // Prime cache
    const start2 = performance.now();
    for (let i = 0; i < 100; i++) {
      cachedClosest(deepestChild, '.level-0');
    }
    const cachedTime = performance.now() - start2;

    console.log(`Uncached: ${uncachedTime.toFixed(2)}ms, Cached: ${cachedTime.toFixed(2)}ms`);

    // Cached should be at least 2x faster
    expect(cachedTime).toBeLessThan(uncachedTime / 2);

    const stats = getCacheStats();
    expect(parseFloat(stats.hitRate)).toBeGreaterThan(98); // >98% hit rate
  });

  test('should handle large number of elements efficiently', () => {
    // Create 1000 video elements
    for (let i = 0; i < 1000; i++) {
      const video = document.createElement('ytd-rich-item-renderer');
      video.setAttribute('data-id', i);
      document.body.appendChild(video);
    }

    const start = performance.now();

    // First query - cache miss
    const result1 = cachedDocumentQuery('ytd-rich-item-renderer');
    expect(result1).toHaveLength(1000);

    // Subsequent queries - cache hits
    for (let i = 0; i < 10; i++) {
      cachedDocumentQuery('ytd-rich-item-renderer');
    }

    const totalTime = performance.now() - start;
    const stats = getCacheStats();

    expect(totalTime).toBeLessThan(100); // Should complete in <100ms
    expect(stats.hits).toBe(10);
    expect(stats.misses).toBe(1);
  });

  test('should demonstrate cache benefit with real-world scenario', () => {
    // Simulate YouTube homepage with 48 videos
    for (let i = 0; i < 48; i++) {
      const container = document.createElement('ytd-rich-item-renderer');

      const thumbnail = document.createElement('yt-thumbnail-view-model');
      const link = document.createElement('a');
      link.href = `/watch?v=video${i}`;

      const progress = document.createElement('div');
      progress.className = 'ytd-thumbnail-overlay-resume-playback-renderer';
      progress.style.width = '75%';

      const title = document.createElement('a');
      title.id = 'video-title';
      title.textContent = `Video ${i}`;

      thumbnail.appendChild(link);
      thumbnail.appendChild(progress);
      container.appendChild(thumbnail);
      container.appendChild(title);
      document.body.appendChild(container);
    }

    // Simulate extension processing page multiple times
    const iterations = 5;
    const times = [];

    for (let i = 0; i < iterations; i++) {
      if (i === 1) clearAllCaches(); // Clear after first iteration to measure

      const start = performance.now();

      // Simulate typical extension operations
      cachedDocumentQuery('ytd-rich-item-renderer');
      cachedDocumentQuery('.ytd-thumbnail-overlay-resume-playback-renderer');
      cachedDocumentQuery('a[href*="/watch"]');
      cachedDocumentQuery('#video-title');

      const time = performance.now() - start;
      times.push(time);
    }

    // Later iterations should be faster than first
    const avgCachedTime = times.slice(2).reduce((a, b) => a + b) / (times.length - 2);
    expect(avgCachedTime).toBeLessThan(times[1] * 0.8);

    console.log('Query times:', times.map(t => t.toFixed(2) + 'ms').join(', '));

    const stats = getCacheStats();
    console.log('Cache stats:', stats);
  });

  test('should measure cache hit rate in realistic usage', () => {
    // Create realistic page
    for (let i = 0; i < 50; i++) {
      const video = document.createElement('ytd-rich-item-renderer');
      const thumbnail = document.createElement('yt-thumbnail-view-model');
      const link = document.createElement('a');
      link.href = `/watch?v=video${i}`;
      thumbnail.appendChild(link);
      video.appendChild(thumbnail);
      document.body.appendChild(video);
    }

    // Simulate multiple passes over the same elements
    for (let pass = 0; pass < 3; pass++) {
      cachedDocumentQuery('ytd-rich-item-renderer');
      cachedDocumentQuery('yt-thumbnail-view-model');
      cachedDocumentQuery('a[href*="/watch"]');
    }

    const stats = getCacheStats();

    // Should have good hit rate (66% after 3 passes)
    expect(parseFloat(stats.hitRate)).toBeGreaterThan(60);
    expect(stats.hits).toBeGreaterThan(stats.misses);

    console.log('Cache performance:', {
      hitRate: stats.hitRate,
      hits: stats.hits,
      misses: stats.misses
    });
  });

  test('should benchmark against native querySelector', () => {
    // Create test elements
    for (let i = 0; i < 100; i++) {
      const div = document.createElement('div');
      div.className = 'test-element';
      div.setAttribute('data-index', i);
      document.body.appendChild(div);
    }

    // Native querySelector benchmark
    const nativeStart = performance.now();
    for (let i = 0; i < 50; i++) {
      document.querySelectorAll('.test-element');
    }
    const nativeTime = performance.now() - nativeStart;

    // Cached query benchmark
    clearAllCaches();
    const cachedStart = performance.now();
    for (let i = 0; i < 50; i++) {
      cachedDocumentQuery('.test-element');
    }
    const cachedTime = performance.now() - cachedStart;

    console.log(`Native: ${nativeTime.toFixed(2)}ms, Cached: ${cachedTime.toFixed(2)}ms`);
    console.log(`Speedup: ${(nativeTime / cachedTime).toFixed(2)}x`);

    // Cached should be faster for repeated queries
    // First query is a miss, but subsequent 49 are hits
    const stats = getCacheStats();
    expect(stats.hits).toBe(49);
    expect(stats.misses).toBe(1);
  });
});
