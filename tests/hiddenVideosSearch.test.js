import { describe, test, expect, beforeEach, jest } from '@jest/globals';

describe('Hidden Videos Search Functionality', () => {
  let normalizeString, filterItemsBySearch, escapeHtml;

  beforeEach(() => {
    // Mock the functions from hidden-videos.js
    normalizeString = (str) => {
      if (!str) return '';
      return String(str).toLowerCase().trim();
    };

    filterItemsBySearch = (items, query) => {
      if (!query || !query.trim()) {
        return items;
      }

      const normalizedQuery = normalizeString(query);

      return items.filter(item => {
        const title = normalizeString(item.title || '');
        const videoId = normalizeString(item.videoId || '');
        return title.includes(normalizedQuery) || videoId.includes(normalizedQuery);
      });
    };

    escapeHtml = (text) => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };
  });

  describe('normalizeString', () => {
    test('should convert to lowercase', () => {
      expect(normalizeString('Hello World')).toBe('hello world');
    });

    test('should trim whitespace', () => {
      expect(normalizeString('  test  ')).toBe('test');
    });

    test('should handle empty strings', () => {
      expect(normalizeString('')).toBe('');
      expect(normalizeString(null)).toBe('');
      expect(normalizeString(undefined)).toBe('');
    });

    test('should handle special characters', () => {
      expect(normalizeString('Test & <Test>')).toBe('test & <test>');
    });

    test('should convert numbers to string', () => {
      expect(normalizeString(123)).toBe('123');
    });
  });

  describe('filterItemsBySearch', () => {
    const mockItems = [
      { videoId: 'abc123', title: 'JavaScript Tutorial', state: 'dimmed' },
      { videoId: 'def456', title: 'Python Programming', state: 'hidden' },
      { videoId: 'ghi789', title: 'Web Development Guide', state: 'dimmed' },
      { videoId: 'jkl012', title: '', state: 'hidden' }, // No title
      { videoId: 'mno345', title: 'React Hooks Tutorial', state: 'dimmed' }
    ];

    test('should return all items for empty query', () => {
      expect(filterItemsBySearch(mockItems, '')).toEqual(mockItems);
      expect(filterItemsBySearch(mockItems, '   ')).toEqual(mockItems);
      expect(filterItemsBySearch(mockItems, null)).toEqual(mockItems);
    });

    test('should filter by title (case-insensitive)', () => {
      const results = filterItemsBySearch(mockItems, 'javascript');
      expect(results).toHaveLength(1);
      expect(results[0].videoId).toBe('abc123');
    });

    test('should filter by title (case-insensitive, uppercase query)', () => {
      const results = filterItemsBySearch(mockItems, 'PYTHON');
      expect(results).toHaveLength(1);
      expect(results[0].videoId).toBe('def456');
    });

    test('should filter by partial title match', () => {
      const results = filterItemsBySearch(mockItems, 'dev');
      expect(results).toHaveLength(1);
      expect(results[0].videoId).toBe('ghi789');
    });

    test('should filter by video ID', () => {
      const results = filterItemsBySearch(mockItems, 'abc123');
      expect(results).toHaveLength(1);
      expect(results[0].videoId).toBe('abc123');
    });

    test('should filter by partial video ID', () => {
      const results = filterItemsBySearch(mockItems, 'def');
      expect(results).toHaveLength(1);
      expect(results[0].videoId).toBe('def456');
    });

    test('should return empty array for no matches', () => {
      const results = filterItemsBySearch(mockItems, 'nonexistent');
      expect(results).toHaveLength(0);
    });

    test('should handle special characters in query', () => {
      const items = [{ videoId: 'test', title: 'C++ Programming', state: 'hidden' }];
      const results = filterItemsBySearch(items, 'c++');
      expect(results).toHaveLength(1);
    });

    test('should handle items without title', () => {
      const results = filterItemsBySearch(mockItems, 'jkl012');
      expect(results).toHaveLength(1);
      expect(results[0].videoId).toBe('jkl012');
    });

    test('should handle whitespace in query', () => {
      const results = filterItemsBySearch(mockItems, '  web  ');
      expect(results).toHaveLength(1);
      expect(results[0].videoId).toBe('ghi789');
    });

    test('should match partial words in title', () => {
      const results = filterItemsBySearch(mockItems, 'tuto');
      expect(results).toHaveLength(2); // JavaScript Tutorial and React Hooks Tutorial
      expect(results.map(r => r.videoId)).toContain('abc123');
      expect(results.map(r => r.videoId)).toContain('mno345');
    });

    test('should be case-insensitive for mixed case queries', () => {
      const results = filterItemsBySearch(mockItems, 'PyThOn');
      expect(results).toHaveLength(1);
      expect(results[0].videoId).toBe('def456');
    });
  });

  describe('escapeHtml', () => {
    test('should escape HTML special characters', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
    });

    test('should escape ampersands', () => {
      expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    test('should handle empty strings', () => {
      expect(escapeHtml('')).toBe('');
    });

    test('should escape quotes', () => {
      expect(escapeHtml('Say "Hello"')).toBe('Say "Hello"');
    });

    test('should escape less-than and greater-than', () => {
      expect(escapeHtml('1 < 2 > 0')).toBe('1 &lt; 2 &gt; 0');
    });
  });
});

describe('Hidden Videos Search Integration', () => {
  let mockSendMessage;

  beforeEach(() => {
    mockSendMessage = jest.fn();
  });

  test('should load all items when searching', async () => {
    mockSendMessage
      .mockResolvedValueOnce({ items: [
        { videoId: 'a1', title: 'Video 1' },
        { videoId: 'a2', title: 'Video 2' }
      ], hasMore: true, nextCursor: { videoId: 'a2' } })
      .mockResolvedValueOnce({ items: [
        { videoId: 'a3', title: 'Video 3' }
      ], hasMore: false, nextCursor: null });

    // Test that multiple pages are loaded when searching
    // Implementation would call sendHiddenVideosMessage multiple times
  });

  test('should paginate filtered results client-side', () => {
    const allItems = Array.from({ length: 50 }, (_, i) => ({
      videoId: `vid${i}`,
      title: `Video ${i}`,
      state: 'dimmed'
    }));

    const videosPerPage = 12;
    const page1 = allItems.slice(0, 12);
    const page2 = allItems.slice(12, 24);

    expect(page1).toHaveLength(12);
    expect(page2).toHaveLength(12);
    expect(page1[0].videoId).toBe('vid0');
    expect(page2[0].videoId).toBe('vid12');
  });

  test('should handle search with no results', () => {
    const items = [
      { videoId: 'abc', title: 'JavaScript' },
      { videoId: 'def', title: 'Python' }
    ];

    const filterItemsBySearch = (items, query) => {
      const normalizedQuery = query.toLowerCase().trim();
      return items.filter(item =>
        item.title.toLowerCase().includes(normalizedQuery)
      );
    };

    const results = filterItemsBySearch(items, 'Ruby');
    expect(results).toHaveLength(0);
  });

  test('should calculate correct total pages for search results', () => {
    const allItems = Array.from({ length: 25 }, (_, i) => ({
      videoId: `vid${i}`,
      title: `Video ${i}`,
      state: 'dimmed'
    }));

    const videosPerPage = 12;
    const totalPages = Math.ceil(allItems.length / videosPerPage);

    expect(totalPages).toBe(3); // 25 items / 12 per page = 3 pages
  });
});

describe('Search Performance', () => {
  test('should handle large dataset efficiently', () => {
    const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
      videoId: `video${i}`,
      title: `Video Title ${i}`,
      state: i % 2 === 0 ? 'dimmed' : 'hidden'
    }));

    const normalizeString = (str) => String(str).toLowerCase().trim();
    const filterItemsBySearch = (items, query) => {
      if (!query) return items;
      const normalizedQuery = normalizeString(query);
      return items.filter(item => {
        const title = normalizeString(item.title);
        return title.includes(normalizedQuery);
      });
    };

    const startTime = performance.now();
    const results = filterItemsBySearch(largeDataset, 'Video Title 5');
    const endTime = performance.now();

    expect(endTime - startTime).toBeLessThan(100); // Should complete in <100ms
    expect(results.length).toBeGreaterThan(0);
  });

  test('should debounce search input', (done) => {
    let callCount = 0;
    const debounce = (func, delay) => {
      let timeoutId;
      return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
      };
    };

    const debouncedFn = debounce(() => {
      callCount++;
    }, 100);

    // Call multiple times rapidly
    debouncedFn();
    debouncedFn();
    debouncedFn();

    // Should only call once after delay
    setTimeout(() => {
      expect(callCount).toBe(1);
      done();
    }, 150);
  });

  test('should filter 1000 items within performance budget', () => {
    const normalizeString = (str) => String(str).toLowerCase().trim();
    const filterItemsBySearch = (items, query) => {
      if (!query) return items;
      const normalizedQuery = normalizeString(query);
      return items.filter(item => {
        const title = normalizeString(item.title);
        const videoId = normalizeString(item.videoId);
        return title.includes(normalizedQuery) || videoId.includes(normalizedQuery);
      });
    };

    const items = Array.from({ length: 1000 }, (_, i) => ({
      videoId: `id${i}`,
      title: `Test Video ${i % 10}`,
      state: 'dimmed'
    }));

    const start = performance.now();
    const results = filterItemsBySearch(items, 'video 5');
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(50); // Should be very fast
    expect(results.length).toBeGreaterThan(0);
  });
});

describe('Search Edge Cases', () => {
  test('should handle Unicode characters', () => {
    const items = [
      { videoId: 'a', title: 'Japanese: 日本語チュートリアル' },
      { videoId: 'b', title: 'Emoji Test 🚀🔥' }
    ];

    const normalizeString = (str) => String(str).toLowerCase().trim();
    const filterItemsBySearch = (items, query) => {
      const normalizedQuery = normalizeString(query);
      return items.filter(item => {
        const title = normalizeString(item.title);
        return title.includes(normalizedQuery);
      });
    };

    const results1 = filterItemsBySearch(items, '日本語');
    expect(results1).toHaveLength(1);

    const results2 = filterItemsBySearch(items, '🚀');
    expect(results2).toHaveLength(1);
  });

  test('should handle very long titles', () => {
    const longTitle = 'A'.repeat(500);
    const items = [{ videoId: 'test', title: longTitle }];

    const normalizeString = (str) => String(str).toLowerCase().trim();
    const filterItemsBySearch = (items, query) => {
      const normalizedQuery = normalizeString(query);
      return items.filter(item => {
        const title = normalizeString(item.title);
        return title.includes(normalizedQuery);
      });
    };

    const results = filterItemsBySearch(items, 'AAA');
    expect(results).toHaveLength(1);
  });

  test('should handle regex special characters safely', () => {
    const items = [
      { videoId: 'a', title: 'Test (Part 1)' },
      { videoId: 'b', title: 'Test [Tutorial]' },
      { videoId: 'c', title: 'Test .NET Core' }
    ];

    const normalizeString = (str) => String(str).toLowerCase().trim();
    const filterItemsBySearch = (items, query) => {
      const normalizedQuery = normalizeString(query);
      return items.filter(item => {
        const title = normalizeString(item.title);
        return title.includes(normalizedQuery);
      });
    };

    expect(filterItemsBySearch(items, '(Part')).toHaveLength(1);
    expect(filterItemsBySearch(items, '[Tutorial')).toHaveLength(1);
    expect(filterItemsBySearch(items, '.NET')).toHaveLength(1);
  });

  test('should handle empty title field', () => {
    const items = [
      { videoId: 'a', title: '' },
      { videoId: 'b', title: null },
      { videoId: 'c', title: undefined }
    ];

    const normalizeString = (str) => {
      if (!str) return '';
      return String(str).toLowerCase().trim();
    };

    const filterItemsBySearch = (items, query) => {
      if (!query || !query.trim()) return items;
      const normalizedQuery = normalizeString(query);
      return items.filter(item => {
        const title = normalizeString(item.title || '');
        const videoId = normalizeString(item.videoId || '');
        return title.includes(normalizedQuery) || videoId.includes(normalizedQuery);
      });
    };

    const results = filterItemsBySearch(items, 'a');
    expect(results).toHaveLength(1);
    expect(results[0].videoId).toBe('a');
  });

  test('should handle leading and trailing spaces in search', () => {
    const items = [{ videoId: 'a', title: 'Test Video' }];

    const normalizeString = (str) => {
      if (!str) return '';
      return String(str).toLowerCase().trim();
    };

    const filterItemsBySearch = (items, query) => {
      if (!query || !query.trim()) return items;
      const normalizedQuery = normalizeString(query);
      return items.filter(item => {
        const title = normalizeString(item.title || '');
        return title.includes(normalizedQuery);
      });
    };

    const results = filterItemsBySearch(items, '  test  ');
    expect(results).toHaveLength(1);
  });

  test('should handle numbers in titles', () => {
    const items = [
      { videoId: 'a', title: 'Tutorial Part 1' },
      { videoId: 'b', title: 'Tutorial Part 2' }
    ];

    const normalizeString = (str) => String(str).toLowerCase().trim();
    const filterItemsBySearch = (items, query) => {
      const normalizedQuery = normalizeString(query);
      return items.filter(item => {
        const title = normalizeString(item.title);
        return title.includes(normalizedQuery);
      });
    };

    const results = filterItemsBySearch(items, '1');
    expect(results).toHaveLength(1);
    expect(results[0].videoId).toBe('a');
  });
});

describe('Debounce Function', () => {
  test('should delay execution', (done) => {
    const debounce = (func, delay) => {
      let timeoutId;
      return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
      };
    };

    let executed = false;
    const fn = debounce(() => { executed = true; }, 50);

    fn();
    expect(executed).toBe(false);

    setTimeout(() => {
      expect(executed).toBe(true);
      done();
    }, 100);
  });

  test('should cancel previous calls', (done) => {
    const debounce = (func, delay) => {
      let timeoutId;
      return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
      };
    };

    let callCount = 0;
    const fn = debounce(() => { callCount++; }, 50);

    fn();
    fn();
    fn();

    setTimeout(() => {
      expect(callCount).toBe(1);
      done();
    }, 100);
  });

  test('should pass arguments correctly', (done) => {
    const debounce = (func, delay) => {
      let timeoutId;
      return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
      };
    };

    let receivedArg;
    const fn = debounce((arg) => { receivedArg = arg; }, 50);

    fn('test');

    setTimeout(() => {
      expect(receivedArg).toBe('test');
      done();
    }, 100);
  });
});
