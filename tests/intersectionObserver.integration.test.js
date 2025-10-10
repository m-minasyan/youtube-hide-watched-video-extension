import {
  setupIntersectionObserver,
  disconnectIntersectionObserver,
  observeVideoContainers,
  unobserveVideoContainers,
  getIntersectionObserver
} from '../content/observers/intersectionObserver.js';
import {
  getVisibleVideos,
  isVideoVisible,
  clearVisibilityTracking,
  onVisibilityChange
} from '../content/utils/visibilityTracker.js';
import { clearAllCaches } from '../content/utils/domCache.js';

// Mock IntersectionObserver with realistic behavior
class RealisticMockIntersectionObserver {
  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
    this.elements = new Set();
    this.elementStates = new Map();
  }

  observe(element) {
    this.elements.add(element);
    this.elementStates.set(element, { isIntersecting: false, intersectionRatio: 0 });
  }

  unobserve(element) {
    this.elements.delete(element);
    this.elementStates.delete(element);
  }

  disconnect() {
    this.elements.clear();
    this.elementStates.clear();
  }

  // Test helper to simulate scroll
  simulateScroll(visibleElements) {
    const entries = [];

    // Mark elements as visible or hidden
    this.elementStates.forEach((state, element) => {
      const isVisible = visibleElements.includes(element);
      entries.push({
        target: element,
        isIntersecting: isVisible,
        intersectionRatio: isVisible ? 0.5 : 0
      });
    });

    if (entries.length > 0) {
      this.callback(entries);
    }
  }
}

describe('IntersectionObserver Integration Tests', () => {
  let originalIntersectionObserver;
  let mockContainers;

  beforeEach(() => {
    // Clear all mocks and caches to prevent test interference
    jest.clearAllMocks();
    clearAllCaches();
    clearVisibilityTracking();

    // Save and mock IntersectionObserver
    originalIntersectionObserver = global.IntersectionObserver;
    global.IntersectionObserver = jest.fn((callback, options) => {
      return new RealisticMockIntersectionObserver(callback, options);
    });

    // Create mock video containers
    mockContainers = [];
    for (let i = 0; i < 10; i++) {
      const container = document.createElement('ytd-rich-item-renderer');
      container.setAttribute('data-test-id', `video-${i}`);
      document.body.appendChild(container);
      mockContainers.push(container);
    }
  });

  afterEach(() => {
    disconnectIntersectionObserver();
    global.IntersectionObserver = originalIntersectionObserver;
    document.body.innerHTML = '';
  });

  describe('Page Load Workflow', () => {
    it('should observe containers on initial setup', () => {
      setupIntersectionObserver();
      const observer = getIntersectionObserver();

      expect(observer).toBeDefined();
      expect(observer.elements.size).toBeGreaterThan(0);
    });

    it('should track only visible videos initially', async () => {
      setupIntersectionObserver();
      const observer = getIntersectionObserver();

      // Simulate only first 3 videos visible
      const visibleContainers = mockContainers.slice(0, 3);
      observer.simulateScroll(visibleContainers);

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 150));

      const visibleVideos = getVisibleVideos();
      expect(visibleVideos.size).toBe(3);

      visibleContainers.forEach(container => {
        expect(isVideoVisible(container)).toBe(true);
      });

      mockContainers.slice(3).forEach(container => {
        expect(isVideoVisible(container)).toBe(false);
      });
    });
  });

  describe('Scroll Behavior', () => {
    it('should update visibility on scroll', async () => {
      setupIntersectionObserver();
      const observer = getIntersectionObserver();

      // Initial state: first 3 visible
      observer.simulateScroll(mockContainers.slice(0, 3));
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(getVisibleVideos().size).toBe(3);

      // Scroll: now videos 3-6 visible
      observer.simulateScroll(mockContainers.slice(3, 6));
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should have 3 new visible videos
      expect(getVisibleVideos().size).toBe(3);

      mockContainers.slice(3, 6).forEach(container => {
        expect(isVideoVisible(container)).toBe(true);
      });
    });

    it('should trigger callbacks on visibility changes', async () => {
      const callback = jest.fn();
      onVisibilityChange(callback);

      setupIntersectionObserver();
      const observer = getIntersectionObserver();

      // Simulate visibility change
      observer.simulateScroll(mockContainers.slice(0, 2));
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(callback).toHaveBeenCalled();
      const callArgs = callback.mock.calls[0][0];
      expect(callArgs.becameVisible.length).toBeGreaterThan(0);
    });
  });

  describe('Dynamic Content Addition', () => {
    it('should observe newly added containers', async () => {
      setupIntersectionObserver();

      // Add new containers dynamically
      const newContainers = [];
      for (let i = 0; i < 5; i++) {
        const container = document.createElement('ytd-video-renderer');
        container.setAttribute('data-test-id', `new-video-${i}`);
        document.body.appendChild(container);
        newContainers.push(container);
      }

      observeVideoContainers(newContainers);

      const observer = getIntersectionObserver();
      expect(observer.elements.size).toBeGreaterThan(mockContainers.length);
    });

    it('should unobserve removed containers', async () => {
      setupIntersectionObserver();
      const observer = getIntersectionObserver();

      const initialSize = observer.elements.size;

      // Remove some containers
      const containersToRemove = mockContainers.slice(0, 2);
      unobserveVideoContainers(containersToRemove);

      expect(observer.elements.size).toBe(initialSize - 2);
    });
  });

  describe('Page Navigation', () => {
    it('should clear state on disconnect and reconnect', async () => {
      setupIntersectionObserver();
      const observer = getIntersectionObserver();

      // Make some videos visible
      observer.simulateScroll(mockContainers.slice(0, 3));
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(getVisibleVideos().size).toBe(3);

      // Disconnect (simulating page navigation)
      disconnectIntersectionObserver();

      expect(getVisibleVideos().size).toBe(0);
      expect(getIntersectionObserver()).toBe(null);
    });
  });

  describe('Performance with Many Videos', () => {
    it('should handle 100+ video containers efficiently', () => {
      // Create many containers
      const manyContainers = [];
      for (let i = 0; i < 100; i++) {
        const container = document.createElement('ytd-rich-item-renderer');
        container.setAttribute('data-test-id', `perf-video-${i}`);
        document.body.appendChild(container);
        manyContainers.push(container);
      }

      const startTime = performance.now();
      setupIntersectionObserver();
      const setupTime = performance.now() - startTime;

      // Setup should be fast (under 100ms)
      expect(setupTime).toBeLessThan(100);

      const observer = getIntersectionObserver();
      expect(observer.elements.size).toBeGreaterThanOrEqual(100);
    });

    it('should batch process many visibility changes', async () => {
      setupIntersectionObserver();
      const observer = getIntersectionObserver();

      const callback = jest.fn();
      onVisibilityChange(callback);

      // Simulate many videos becoming visible at once
      observer.simulateScroll(mockContainers);
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should batch into single callback
      expect(callback.mock.calls.length).toBeLessThanOrEqual(2);
    });
  });

  // Note: Configuration flag tests for ENABLE_LAZY_PROCESSING are skipped because
  // the constant is set at module load time and cannot be mocked at runtime.

  describe('Error Handling', () => {
    it('should handle observer errors gracefully', () => {
      setupIntersectionObserver();

      // Force an error in observe
      const observer = getIntersectionObserver();
      const originalObserve = observer.observe.bind(observer);
      observer.observe = jest.fn(() => {
        throw new Error('Observer error');
      });

      const newContainer = document.createElement('div');

      expect(() => {
        observeVideoContainers([newContainer]);
      }).not.toThrow();

      observer.observe = originalObserve;
    });

    it('should handle callback errors without breaking', async () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });
      const successCallback = jest.fn();

      onVisibilityChange(errorCallback);
      onVisibilityChange(successCallback);

      setupIntersectionObserver();
      const observer = getIntersectionObserver();

      observer.simulateScroll(mockContainers.slice(0, 1));
      await new Promise(resolve => setTimeout(resolve, 150));

      // Both callbacks should be attempted
      expect(errorCallback).toHaveBeenCalled();
      expect(successCallback).toHaveBeenCalled();
    });
  });

  describe('Memory Management', () => {
    it('should clean up properly on disconnect', () => {
      setupIntersectionObserver();
      const observer = getIntersectionObserver();

      observeVideoContainers(mockContainers.slice(0, 5));
      expect(observer.elements.size).toBeGreaterThan(0);

      disconnectIntersectionObserver();

      expect(getIntersectionObserver()).toBe(null);
      expect(getVisibleVideos().size).toBe(0);
    });

    it('should not leak memory with multiple reconnections', () => {
      for (let i = 0; i < 10; i++) {
        setupIntersectionObserver();
        disconnectIntersectionObserver();
      }

      // Final setup should work correctly
      setupIntersectionObserver();
      const observer = getIntersectionObserver();
      expect(observer).not.toBe(null);
    });
  });
});
