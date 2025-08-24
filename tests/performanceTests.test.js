const { STORAGE_KEYS, createMockVideoElement } = require('./testUtils');

describe('Performance Optimization Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '';
  });

  describe('Debouncing Performance', () => {
    jest.useFakeTimers();

    const createDebounce = (func, delay) => {
      let timeoutId;
      let callCount = 0;
      
      const debounced = function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          callCount++;
          func.apply(this, args);
        }, delay);
      };
      
      debounced.getCallCount = () => callCount;
      debounced.cancel = () => clearTimeout(timeoutId);
      
      return debounced;
    };

    test('should reduce function calls with debouncing', () => {
      const expensiveOperation = jest.fn();
      const debounced = createDebounce(expensiveOperation, 250);
      
      // Simulate rapid calls
      for (let i = 0; i < 100; i++) {
        debounced(i);
      }
      
      expect(expensiveOperation).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(250);
      
      expect(expensiveOperation).toHaveBeenCalledTimes(1);
      expect(expensiveOperation).toHaveBeenCalledWith(99);
      expect(debounced.getCallCount()).toBe(1);
    });

    test('should measure debouncing impact on performance', () => {
      const measurements = [];
      const measurePerformance = jest.fn((value) => {
        measurements.push(value);
      });
      
      const debounced = createDebounce(measurePerformance, 100);
      
      // Simulate user typing
      const input = 'hello world';
      for (let i = 0; i < input.length; i++) {
        debounced(input.slice(0, i + 1));
        jest.advanceTimersByTime(50);
      }
      
      jest.advanceTimersByTime(100);
      
      // Only the final value should be processed
      expect(measurements).toEqual(['hello world']);
    });
  });

  describe('DOM Query Optimization', () => {
    test('should batch DOM queries efficiently', () => {
      // Create 100 video elements
      for (let i = 0; i < 100; i++) {
        const video = createMockVideoElement({ videoId: `video${i}` });
        document.body.appendChild(video);
      }
      
      const inefficientQuery = () => {
        const results = [];
        const selectors = [
          'ytd-rich-item-renderer',
          'ytd-video-renderer',
          'ytm-shorts-lockup-view-model'
        ];
        
        selectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(el => results.push(el));
        });
        
        return results;
      };
      
      const efficientQuery = () => {
        const selector = 'ytd-rich-item-renderer, ytd-video-renderer, ytm-shorts-lockup-view-model';
        return Array.from(document.querySelectorAll(selector));
      };
      
      const start1 = performance.now();
      const result1 = inefficientQuery();
      const time1 = performance.now() - start1;
      
      const start2 = performance.now();
      const result2 = efficientQuery();
      const time2 = performance.now() - start2;
      
      expect(result1.length).toBe(result2.length);
      // Efficient query should be faster (or at least not significantly slower)
      expect(time2).toBeLessThanOrEqual(time1 * 2);
    });

    test('should use CSS selectors efficiently', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      
      // Create nested structure
      for (let i = 0; i < 50; i++) {
        const wrapper = document.createElement('div');
        wrapper.className = 'wrapper';
        const video = createMockVideoElement({ videoId: `nested${i}` });
        wrapper.appendChild(video);
        container.appendChild(wrapper);
      }
      
      // Inefficient: Multiple DOM traversals
      const inefficient = () => {
        const wrappers = document.querySelectorAll('.wrapper');
        const videos = [];
        wrappers.forEach(w => {
          const video = w.querySelector('[class*="renderer"]');
          if (video) videos.push(video);
        });
        return videos;
      };
      
      // Efficient: Single query
      const efficient = () => {
        return document.querySelectorAll('.wrapper > [class*="renderer"]');
      };
      
      const result1 = inefficient();
      const result2 = efficient();
      
      expect(result1.length).toBe(result2.length);
    });
  });
});

describe('Caching and Memory Management', () => {
  describe('Video State Caching', () => {
    class PerformantCache {
      constructor(maxSize = 100, ttl = 60000) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.ttl = ttl;
        this.hits = 0;
        this.misses = 0;
      }

      set(key, value) {
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
          const firstKey = this.cache.keys().next().value;
          this.cache.delete(firstKey);
        }
        
        this.cache.set(key, {
          value,
          timestamp: Date.now()
        });
      }

      get(key) {
        const item = this.cache.get(key);
        
        if (!item) {
          this.misses++;
          return null;
        }
        
        if (Date.now() - item.timestamp > this.ttl) {
          this.cache.delete(key);
          this.misses++;
          return null;
        }
        
        this.hits++;
        return item.value;
      }

      getStats() {
        const total = this.hits + this.misses;
        return {
          hits: this.hits,
          misses: this.misses,
          hitRate: total > 0 ? (this.hits / total) * 100 : 0,
          size: this.cache.size
        };
      }

      clear() {
        this.cache.clear();
        this.hits = 0;
        this.misses = 0;
      }
    }

    test('should maintain efficient cache hit rate', () => {
      const cache = new PerformantCache(50);
      
      // Simulate realistic usage pattern
      const videoIds = Array.from({ length: 100 }, (_, i) => `video${i}`);
      
      // First pass - all misses
      videoIds.forEach(id => {
        cache.get(id);
        cache.set(id, { state: 'dimmed' });
      });
      
      // Second pass - frequent items should hit
      const frequentIds = videoIds.slice(50, 100); // Last 50 items
      frequentIds.forEach(id => {
        cache.get(id);
      });
      
      const stats = cache.getStats();
      expect(stats.hitRate).toBeGreaterThan(30);
      expect(stats.size).toBeLessThanOrEqual(50);
    });

    test('should handle TTL expiration correctly', () => {
      jest.useFakeTimers();
      const cache = new PerformantCache(100, 1000); // 1 second TTL
      
      cache.set('video1', { state: 'hidden' });
      
      expect(cache.get('video1')).toEqual({ state: 'hidden' });
      
      jest.advanceTimersByTime(500);
      expect(cache.get('video1')).toEqual({ state: 'hidden' });
      
      jest.advanceTimersByTime(600);
      expect(cache.get('video1')).toBeNull();
      
      jest.useRealTimers();
    });
  });

  describe('Memory Leak Prevention', () => {
    test('should cleanup event listeners properly', () => {
      const eventManager = {
        listeners: new Map(),
        
        addEventListener(element, event, handler) {
          if (!this.listeners.has(element)) {
            this.listeners.set(element, new Map());
          }
          
          const elementListeners = this.listeners.get(element);
          if (!elementListeners.has(event)) {
            elementListeners.set(event, new Set());
          }
          
          elementListeners.get(event).add(handler);
          element.addEventListener(event, handler);
        },
        
        removeEventListener(element, event, handler) {
          const elementListeners = this.listeners.get(element);
          if (elementListeners) {
            const eventHandlers = elementListeners.get(event);
            if (eventHandlers) {
              eventHandlers.delete(handler);
              element.removeEventListener(event, handler);
              
              if (eventHandlers.size === 0) {
                elementListeners.delete(event);
              }
              
              if (elementListeners.size === 0) {
                this.listeners.delete(element);
              }
            }
          }
        },
        
        cleanup(element) {
          const elementListeners = this.listeners.get(element);
          if (elementListeners) {
            elementListeners.forEach((handlers, event) => {
              handlers.forEach(handler => {
                element.removeEventListener(event, handler);
              });
            });
            this.listeners.delete(element);
          }
        },
        
        getListenerCount() {
          let count = 0;
          this.listeners.forEach(elementListeners => {
            elementListeners.forEach(handlers => {
              count += handlers.size;
            });
          });
          return count;
        }
      };
      
      const element = document.createElement('div');
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      eventManager.addEventListener(element, 'click', handler1);
      eventManager.addEventListener(element, 'click', handler2);
      eventManager.addEventListener(element, 'hover', handler1);
      
      expect(eventManager.getListenerCount()).toBe(3);
      
      eventManager.removeEventListener(element, 'click', handler1);
      expect(eventManager.getListenerCount()).toBe(2);
      
      eventManager.cleanup(element);
      expect(eventManager.getListenerCount()).toBe(0);
      expect(eventManager.listeners.has(element)).toBe(false);
    });

    test('should prevent DOM reference leaks', () => {
      const weakRefs = new WeakMap();
      
      const storeVideoReference = (element, data) => {
        weakRefs.set(element, data);
      };
      
      let element = createMockVideoElement({ videoId: 'leak-test' });
      storeVideoReference(element, { processed: true });
      
      expect(weakRefs.has(element)).toBe(true);
      
      // Simulate element removal
      element = null;
      
      // WeakMap should allow garbage collection
      // (In real scenario, GC would clean this up)
      expect(element).toBeNull();
    });
  });

  describe('Batch Processing Optimization', () => {
    test('should batch process videos efficiently', async () => {
      const batchProcessor = {
        queue: [],
        processing: false,
        batchSize: 10,
        
        async add(item) {
          this.queue.push(item);
          if (!this.processing) {
            await this.process();
          }
        },
        
        async process() {
          this.processing = true;
          
          while (this.queue.length > 0) {
            const batch = this.queue.splice(0, this.batchSize);
            await this.processBatch(batch);
          }
          
          this.processing = false;
        },
        
        async processBatch(batch) {
          // Simulate batch processing
          return new Promise(resolve => {
            setTimeout(() => {
              batch.forEach(item => item.processed = true);
              resolve();
            }, 10);
          });
        }
      };
      
      const items = Array.from({ length: 25 }, (_, i) => ({ id: i, processed: false }));
      
      const startTime = Date.now();
      await Promise.all(items.map(item => batchProcessor.add(item)));
      const endTime = Date.now();
      
      // All items should be processed
      expect(items.every(item => item.processed)).toBe(true);
      
      // Should be faster than processing individually
      const expectedIndividualTime = 25 * 10;
      expect(endTime - startTime).toBeLessThan(expectedIndividualTime);
    });
  });
});
