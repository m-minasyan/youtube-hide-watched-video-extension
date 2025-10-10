import {
  cachedClosest,
  cachedQuerySelector,
  cachedQuerySelectorAll,
  cachedDocumentQuery,
  invalidateElementCache,
  invalidateDocumentQuery,
  clearAllCaches,
  getCacheStats,
  resetCacheStats
} from '../content/utils/domCache';

describe('DOM Cache - cachedClosest', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    clearAllCaches();
    resetCacheStats();
  });

  test('should cache closest results', () => {
    const parent = document.createElement('div');
    parent.className = 'parent';
    const child = document.createElement('span');
    parent.appendChild(child);
    document.body.appendChild(parent);

    // First call - cache miss
    const result1 = cachedClosest(child, '.parent');
    expect(result1).toBe(parent);

    const stats1 = getCacheStats();
    expect(stats1.misses).toBe(1);
    expect(stats1.hits).toBe(0);

    // Second call - cache hit
    const result2 = cachedClosest(child, '.parent');
    expect(result2).toBe(parent);

    const stats2 = getCacheStats();
    expect(stats2.hits).toBe(1);
    expect(stats2.misses).toBe(1);
  });

  test('should return null for non-matching selector', () => {
    const child = document.createElement('span');
    document.body.appendChild(child);

    const result = cachedClosest(child, '.non-existent');
    expect(result).toBeNull();
  });

  test('should handle null element', () => {
    const result = cachedClosest(null, '.parent');
    expect(result).toBeNull();
  });

  test('should cache different selectors separately', () => {
    const grandparent = document.createElement('div');
    grandparent.className = 'grandparent';
    const parent = document.createElement('div');
    parent.className = 'parent';
    const child = document.createElement('span');

    grandparent.appendChild(parent);
    parent.appendChild(child);
    document.body.appendChild(grandparent);

    const result1 = cachedClosest(child, '.parent');
    const result2 = cachedClosest(child, '.grandparent');

    expect(result1).toBe(parent);
    expect(result2).toBe(grandparent);

    const stats = getCacheStats();
    expect(stats.misses).toBe(2); // Two different selectors
  });
});

describe('DOM Cache - cachedQuerySelector', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    clearAllCaches();
    resetCacheStats();
  });

  test('should cache querySelector results', () => {
    const parent = document.createElement('div');
    const child = document.createElement('span');
    child.className = 'target';
    parent.appendChild(child);
    document.body.appendChild(parent);

    const result1 = cachedQuerySelector(parent, '.target');
    expect(result1).toBe(child);

    const stats1 = getCacheStats();
    expect(stats1.misses).toBe(1);

    const result2 = cachedQuerySelector(parent, '.target');
    expect(result2).toBe(child);

    const stats2 = getCacheStats();
    expect(stats2.hits).toBe(1);
  });

  test('should return null for non-matching selector', () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);

    const result = cachedQuerySelector(parent, '.non-existent');
    expect(result).toBeNull();
  });
});

describe('DOM Cache - cachedQuerySelectorAll', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    clearAllCaches();
    resetCacheStats();
  });

  test('should cache querySelectorAll results as array', () => {
    const parent = document.createElement('div');
    const child1 = document.createElement('span');
    const child2 = document.createElement('span');
    child1.className = 'target';
    child2.className = 'target';
    parent.appendChild(child1);
    parent.appendChild(child2);
    document.body.appendChild(parent);

    const result1 = cachedQuerySelectorAll(parent, '.target');
    expect(result1).toHaveLength(2);
    expect(Array.isArray(result1)).toBe(true);

    const stats1 = getCacheStats();
    expect(stats1.misses).toBe(1);

    const result2 = cachedQuerySelectorAll(parent, '.target');
    expect(result2).toHaveLength(2);

    const stats2 = getCacheStats();
    expect(stats2.hits).toBe(1);
  });

  test('should return empty array for no matches', () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);

    const result = cachedQuerySelectorAll(parent, '.non-existent');
    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('DOM Cache - cachedDocumentQuery', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    clearAllCaches();
    resetCacheStats();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should cache document queries with TTL', () => {
    const div1 = document.createElement('div');
    div1.className = 'target';
    document.body.appendChild(div1);

    const result1 = cachedDocumentQuery('.target', 1000);
    expect(result1).toHaveLength(1);

    const stats1 = getCacheStats();
    expect(stats1.misses).toBe(1);

    const result2 = cachedDocumentQuery('.target', 1000);
    expect(result2).toHaveLength(1);

    const stats2 = getCacheStats();
    expect(stats2.hits).toBe(1);
  });

  test('should invalidate cache after TTL expires', () => {
    const div1 = document.createElement('div');
    div1.className = 'target';
    document.body.appendChild(div1);

    const result1 = cachedDocumentQuery('.target', 1000);
    expect(result1).toHaveLength(1);

    // Advance time past TTL
    jest.advanceTimersByTime(1500);

    const result2 = cachedDocumentQuery('.target', 1000);
    expect(result2).toHaveLength(1);

    const stats = getCacheStats();
    expect(stats.misses).toBe(2); // Both were misses due to TTL expiration
  });

  test('should handle new elements added to DOM', () => {
    const div1 = document.createElement('div');
    div1.className = 'target';
    document.body.appendChild(div1);

    const result1 = cachedDocumentQuery('.target', 1000);
    expect(result1).toHaveLength(1);

    // Add another element (cache still valid)
    const div2 = document.createElement('div');
    div2.className = 'target';
    document.body.appendChild(div2);

    const result2 = cachedDocumentQuery('.target', 1000);
    expect(result2).toHaveLength(1); // Still returns cached result

    // Wait for TTL to expire
    jest.advanceTimersByTime(1500);

    const result3 = cachedDocumentQuery('.target', 1000);
    expect(result3).toHaveLength(2); // Now sees both elements
  });
});

describe('DOM Cache - Invalidation', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    clearAllCaches();
    resetCacheStats();
  });

  test('should invalidate element cache', () => {
    const parent = document.createElement('div');
    parent.className = 'parent';
    const child = document.createElement('span');
    parent.appendChild(child);
    document.body.appendChild(parent);

    cachedClosest(child, '.parent');
    const stats1 = getCacheStats();
    expect(stats1.misses).toBe(1);

    cachedClosest(child, '.parent');
    const stats2 = getCacheStats();
    expect(stats2.hits).toBe(1);

    // Invalidate cache for child
    invalidateElementCache(child);

    cachedClosest(child, '.parent');
    const stats3 = getCacheStats();
    expect(stats3.misses).toBe(2); // New miss after invalidation
  });

  test('should invalidate document query cache', () => {
    const div = document.createElement('div');
    div.className = 'target';
    document.body.appendChild(div);

    cachedDocumentQuery('.target');
    const stats1 = getCacheStats();
    expect(stats1.misses).toBe(1);

    cachedDocumentQuery('.target');
    const stats2 = getCacheStats();
    expect(stats2.hits).toBe(1);

    invalidateDocumentQuery('.target');

    cachedDocumentQuery('.target');
    const stats3 = getCacheStats();
    expect(stats3.misses).toBe(2);
  });

  test('should clear document-level caches', () => {
    const parent = document.createElement('div');
    const child = document.createElement('span');
    parent.appendChild(child);
    document.body.appendChild(parent);

    cachedClosest(child, 'div');
    cachedQuerySelector(parent, 'span');
    cachedDocumentQuery('div');

    const stats1 = getCacheStats();
    expect(stats1.misses).toBe(3);

    clearAllCaches();

    // Element caches (WeakMap) still exist, only document cache is cleared
    cachedClosest(child, 'div'); // Hit (WeakMap cache)
    cachedQuerySelector(parent, 'span'); // Hit (WeakMap cache)
    cachedDocumentQuery('div'); // Miss (Map cache was cleared)

    const stats2 = getCacheStats();
    expect(stats2.misses).toBe(4); // Only document query is a miss
    expect(stats2.hits).toBe(2); // Element queries hit cache
  });
});

describe('DOM Cache - Statistics', () => {
  beforeEach(() => {
    clearAllCaches();
    resetCacheStats();
  });

  test('should calculate hit rate correctly', () => {
    const parent = document.createElement('div');
    const child = document.createElement('span');
    parent.appendChild(child);
    document.body.appendChild(parent);

    // 1 miss
    cachedClosest(child, 'div');

    // 3 hits
    cachedClosest(child, 'div');
    cachedClosest(child, 'div');
    cachedClosest(child, 'div');

    const stats = getCacheStats();
    expect(stats.hits).toBe(3);
    expect(stats.misses).toBe(1);
    expect(stats.totalQueries).toBe(4);
    expect(parseFloat(stats.hitRate)).toBe(75);
  });

  test('should track invalidations', () => {
    const element = document.createElement('div');

    invalidateElementCache(element);
    invalidateDocumentQuery('.test');
    clearAllCaches();

    const stats = getCacheStats();
    expect(stats.invalidations).toBe(3);
  });

  test('should reset statistics', () => {
    const parent = document.createElement('div');
    const child = document.createElement('span');
    parent.appendChild(child);
    document.body.appendChild(parent);

    cachedClosest(child, 'div');
    cachedClosest(child, 'div');

    const stats1 = getCacheStats();
    expect(stats1.totalQueries).toBe(2);

    resetCacheStats();

    const stats2 = getCacheStats();
    expect(stats2.hits).toBe(0);
    expect(stats2.misses).toBe(0);
    expect(stats2.totalQueries).toBe(0);
  });
});

describe('DOM Cache - Edge Cases', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    clearAllCaches();
    resetCacheStats();
  });

  test('should handle empty selectors', () => {
    const element = document.createElement('div');

    expect(cachedClosest(element, '')).toBeNull();
    expect(cachedQuerySelector(element, '')).toBeNull();
    expect(cachedQuerySelectorAll(element, '')).toEqual([]);
    expect(cachedDocumentQuery('')).toEqual([]);
  });

  test('should handle null elements gracefully', () => {
    expect(cachedClosest(null, '.test')).toBeNull();
    expect(cachedQuerySelector(null, '.test')).toBeNull();
    expect(cachedQuerySelectorAll(null, '.test')).toEqual([]);
  });

  test('should handle complex selectors', () => {
    const container = document.createElement('div');
    container.className = 'container';
    const item = document.createElement('div');
    item.className = 'item';
    item.setAttribute('data-id', '123');
    container.appendChild(item);
    document.body.appendChild(container);

    const result = cachedQuerySelector(container, '.item[data-id="123"]');
    expect(result).toBe(item);

    const result2 = cachedQuerySelector(container, '.item[data-id="123"]');
    expect(result2).toBe(item);

    const stats = getCacheStats();
    expect(stats.hits).toBe(1);
  });

  test('should handle detached DOM elements', () => {
    const parent = document.createElement('div');
    const child = document.createElement('span');
    parent.appendChild(child);
    // Not appended to document

    const result = cachedClosest(child, 'div');
    expect(result).toBe(parent);
  });
});
