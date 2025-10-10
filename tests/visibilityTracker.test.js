import {
  getVisibleVideos,
  isVideoVisible,
  getVisibleVideoCount,
  markVisible,
  markHidden,
  clearVisibilityTracking,
  processIntersectionEntries,
  onVisibilityChange,
  __testing__
} from '../content/utils/visibilityTracker.js';

describe('visibilityTracker', () => {
  let mockElement1, mockElement2;

  beforeEach(() => {
    clearVisibilityTracking();
    mockElement1 = document.createElement('div');
    mockElement2 = document.createElement('div');
  });

  describe('markVisible and markHidden', () => {
    it('should track visible state transitions', () => {
      expect(isVideoVisible(mockElement1)).toBe(false);

      const wasAdded = markVisible(mockElement1);
      expect(wasAdded).toBe(true);
      expect(isVideoVisible(mockElement1)).toBe(true);

      const wasRemovedAgain = markVisible(mockElement1);
      expect(wasRemovedAgain).toBe(false); // Already visible

      const wasRemoved = markHidden(mockElement1);
      expect(wasRemoved).toBe(true);
      expect(isVideoVisible(mockElement1)).toBe(false);
    });

    it('should track multiple elements visibility', () => {
      markVisible(mockElement1);
      markVisible(mockElement2);

      expect(getVisibleVideoCount()).toBe(2);
      expect(isVideoVisible(mockElement1)).toBe(true);
      expect(isVideoVisible(mockElement2)).toBe(true);

      const visibleSet = getVisibleVideos();
      expect(visibleSet.has(mockElement1)).toBe(true);
      expect(visibleSet.has(mockElement2)).toBe(true);
    });
  });

  describe('clearVisibilityTracking', () => {
    it('should clear all visibility tracking', () => {
      markVisible(mockElement1);
      markVisible(mockElement2);
      expect(getVisibleVideoCount()).toBe(2);

      clearVisibilityTracking();
      expect(getVisibleVideoCount()).toBe(0);
      expect(isVideoVisible(mockElement1)).toBe(false);
      expect(isVideoVisible(mockElement2)).toBe(false);
    });
  });

  describe('getVisibleVideos', () => {
    it('should return a copy of visible videos set', () => {
      markVisible(mockElement1);

      const visibleSet = getVisibleVideos();
      expect(visibleSet.size).toBe(1);

      // Modifying returned set should not affect internal state
      visibleSet.clear();
      expect(getVisibleVideoCount()).toBe(1);
    });
  });

  describe('onVisibilityChange', () => {
    it('should register and notify callbacks', () => {
      const callback = jest.fn();
      const unsubscribe = onVisibilityChange(callback);

      const becameVisible = [mockElement1];
      const becameHidden = [mockElement2];

      __testing__.notifyVisibilityChange(becameVisible, becameHidden);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({ becameVisible, becameHidden });

      unsubscribe();
    });

    it('should handle callback cleanup', () => {
      const callback = jest.fn();
      const unsubscribe = onVisibilityChange(callback);

      unsubscribe();

      __testing__.notifyVisibilityChange([mockElement1], []);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle errors in callbacks gracefully', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });
      const successCallback = jest.fn();

      onVisibilityChange(errorCallback);
      onVisibilityChange(successCallback);

      // Should not throw
      expect(() => {
        __testing__.notifyVisibilityChange([mockElement1], []);
      }).not.toThrow();

      // Success callback should still be called
      expect(successCallback).toHaveBeenCalled();
    });
  });

  describe('processIntersectionEntries', () => {
    it('should process elements becoming visible', () => {
      const callback = jest.fn();
      onVisibilityChange(callback);

      const entries = [
        {
          target: mockElement1,
          isIntersecting: true,
          intersectionRatio: 0.5
        }
      ];

      processIntersectionEntries(entries);

      expect(isVideoVisible(mockElement1)).toBe(true);
      expect(callback).toHaveBeenCalledWith({
        becameVisible: [mockElement1],
        becameHidden: []
      });
    });

    it('should process elements becoming hidden', () => {
      markVisible(mockElement1);

      const callback = jest.fn();
      onVisibilityChange(callback);

      const entries = [
        {
          target: mockElement1,
          isIntersecting: false,
          intersectionRatio: 0
        }
      ];

      processIntersectionEntries(entries);

      expect(isVideoVisible(mockElement1)).toBe(false);
      expect(callback).toHaveBeenCalledWith({
        becameVisible: [],
        becameHidden: [mockElement1]
      });
    });

    it('should handle rapid visibility changes', () => {
      const callback = jest.fn();
      onVisibilityChange(callback);

      const entries = [
        {
          target: mockElement1,
          isIntersecting: true,
          intersectionRatio: 0.5
        },
        {
          target: mockElement2,
          isIntersecting: true,
          intersectionRatio: 0.3
        }
      ];

      processIntersectionEntries(entries);

      expect(getVisibleVideoCount()).toBe(2);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({
        becameVisible: [mockElement1, mockElement2],
        becameHidden: []
      });
    });

    it('should respect visibility threshold', () => {
      const entries = [
        {
          target: mockElement1,
          isIntersecting: true,
          intersectionRatio: 0.1 // Below default 0.25 threshold
        }
      ];

      processIntersectionEntries(entries);

      expect(isVideoVisible(mockElement1)).toBe(false);
    });

    it('should not notify if no changes occurred', () => {
      markVisible(mockElement1);

      const callback = jest.fn();
      onVisibilityChange(callback);

      const entries = [
        {
          target: mockElement1,
          isIntersecting: true,
          intersectionRatio: 0.5 // Already visible
        }
      ];

      processIntersectionEntries(entries);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('isElementVisible', () => {
    it('should correctly determine visibility based on threshold', () => {
      const { isElementVisible } = __testing__;

      expect(isElementVisible({
        isIntersecting: true,
        intersectionRatio: 0.5
      })).toBe(true);

      expect(isElementVisible({
        isIntersecting: true,
        intersectionRatio: 0.25
      })).toBe(true);

      expect(isElementVisible({
        isIntersecting: true,
        intersectionRatio: 0.24
      })).toBe(false);

      expect(isElementVisible({
        isIntersecting: false,
        intersectionRatio: 0.5
      })).toBe(false);
    });
  });
});
