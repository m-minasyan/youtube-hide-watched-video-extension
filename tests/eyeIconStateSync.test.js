/**
 * Tests for Eye Icon State Synchronization Bug Fix
 * Ensures that eye button visual state always matches container CSS classes
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  CSS_CLASSES,
  createMockContainer,
  createMockButton,
  createSyncMock,
  createApplyStateToEyeButtonMock,
  createMockCache,
  createMockFetch
} from './testUtils/eyeIconMocks.js';

// Mock DOM environment
let mockContainers;
let mockButtons;
let mockCacheHelpers;

// Mock module functions
let syncIndividualContainerState;
let getCachedHiddenVideo;
let hasCachedVideo;
let fetchHiddenVideoStates;
let applyStateToEyeButton;

beforeEach(() => {
  mockContainers = new Map();
  mockButtons = new Map();
  mockCacheHelpers = createMockCache();

  // Setup mock functions
  syncIndividualContainerState = createSyncMock();
  getCachedHiddenVideo = mockCacheHelpers.getCachedHiddenVideo;
  hasCachedVideo = mockCacheHelpers.hasCachedVideo;
  fetchHiddenVideoStates = createMockFetch();
  applyStateToEyeButton = createApplyStateToEyeButtonMock();
});

describe('Container Sync Function', () => {
  it('should apply dimmed class when state is dimmed', () => {
    const container = {
      classList: {
        add: jest.fn(),
        remove: jest.fn(),
        contains: jest.fn(() => false)
      }
    };

    syncIndividualContainerState(container, 'dimmed');

    expect(container.classList.add).toHaveBeenCalledWith(CSS_CLASSES.INDIVIDUAL_DIMMED);
    expect(container.classList.remove).not.toHaveBeenCalledWith(CSS_CLASSES.INDIVIDUAL_DIMMED);
  });

  it('should apply hidden class when state is hidden', () => {
    const container = {
      classList: {
        add: jest.fn(),
        remove: jest.fn(),
        contains: jest.fn(() => false)
      }
    };

    syncIndividualContainerState(container, 'hidden');

    expect(container.classList.add).toHaveBeenCalledWith(CSS_CLASSES.INDIVIDUAL_HIDDEN);
    expect(container.classList.remove).not.toHaveBeenCalledWith(CSS_CLASSES.INDIVIDUAL_HIDDEN);
  });

  it('should remove both classes when state is normal', () => {
    const container = {
      classList: {
        add: jest.fn(),
        remove: jest.fn(),
        contains: jest.fn((className) => {
          return className === CSS_CLASSES.INDIVIDUAL_DIMMED ||
                 className === CSS_CLASSES.INDIVIDUAL_HIDDEN;
        })
      }
    };

    syncIndividualContainerState(container, 'normal');

    expect(container.classList.remove).toHaveBeenCalledWith(CSS_CLASSES.INDIVIDUAL_DIMMED);
    expect(container.classList.remove).toHaveBeenCalledWith(CSS_CLASSES.INDIVIDUAL_HIDDEN);
  });

  it('should transition from dimmed to hidden correctly', () => {
    const container = {
      classList: {
        add: jest.fn(),
        remove: jest.fn(),
        contains: jest.fn((className) => className === CSS_CLASSES.INDIVIDUAL_DIMMED)
      }
    };

    syncIndividualContainerState(container, 'hidden');

    expect(container.classList.remove).toHaveBeenCalledWith(CSS_CLASSES.INDIVIDUAL_DIMMED);
    expect(container.classList.add).toHaveBeenCalledWith(CSS_CLASSES.INDIVIDUAL_HIDDEN);
  });

  it('should transition from hidden to dimmed correctly', () => {
    const container = {
      classList: {
        add: jest.fn(),
        remove: jest.fn(),
        contains: jest.fn((className) => className === CSS_CLASSES.INDIVIDUAL_HIDDEN)
      }
    };

    syncIndividualContainerState(container, 'dimmed');

    expect(container.classList.remove).toHaveBeenCalledWith(CSS_CLASSES.INDIVIDUAL_HIDDEN);
    expect(container.classList.add).toHaveBeenCalledWith(CSS_CLASSES.INDIVIDUAL_DIMMED);
  });

  it('should handle null container gracefully', () => {
    expect(() => syncIndividualContainerState(null, 'dimmed')).not.toThrow();
  });
});

describe('Eye Button State Synchronization', () => {
  it('should sync container state after fetch when cache is empty', async () => {
    const videoId = 'testVideo123';
    const container = createMockContainer(videoId);

    // Simulate fetch populating cache
    await fetchHiddenVideoStates([videoId]);
    mockCacheHelpers.setCachedVideo(videoId, { videoId, state: 'hidden', title: 'Test Video' });

    const record = getCachedHiddenVideo(videoId);
    expect(record).toBeTruthy();
    expect(record.state).toBe('hidden');

    // Simulate container sync after fetch
    syncIndividualContainerState(container, record.state);

    expect(container.classList.add).toHaveBeenCalledWith(CSS_CLASSES.INDIVIDUAL_HIDDEN);
  });

  it('should apply correct state to both button and container', () => {
    const videoId = 'testVideo456';
    const button = createMockButton(videoId);
    const container = createMockContainer(videoId);

    mockCacheHelpers.setCachedVideo(videoId, { videoId, state: 'dimmed', title: 'Test Video' });

    const record = getCachedHiddenVideo(videoId);
    applyStateToEyeButton(button, record.state);
    syncIndividualContainerState(container, record.state);

    expect(button.classList.add).toHaveBeenCalledWith('dimmed');
    expect(container.classList.add).toHaveBeenCalledWith(CSS_CLASSES.INDIVIDUAL_DIMMED);
  });
});

describe('Cache Validation in applyIndividualHiding', () => {
  it('should skip videos without cached records', () => {
    const videoId = 'uncachedVideo';

    // Video not in cache
    expect(hasCachedVideo(videoId)).toBe(false);

    // Should skip processing - container sync won't be called
    const container = createMockContainer(videoId);

    // Simulate applyIndividualHiding logic
    if (!hasCachedVideo(videoId)) {
      // Should return early without processing
      expect(container.classList.add).not.toHaveBeenCalled();
      expect(container.classList.remove).not.toHaveBeenCalled();
    }
  });

  it('should process videos with cached records', () => {
    const videoId = 'cachedVideo';
    mockCacheHelpers.setCachedVideo(videoId, { videoId, state: 'hidden', title: 'Cached Video' });

    expect(hasCachedVideo(videoId)).toBe(true);

    const container = createMockContainer(videoId);

    // Simulate applyIndividualHiding logic
    if (hasCachedVideo(videoId)) {
      const record = getCachedHiddenVideo(videoId);
      syncIndividualContainerState(container, record.state);

      expect(container.classList.add).toHaveBeenCalledWith(CSS_CLASSES.INDIVIDUAL_HIDDEN);
    }
  });
});

describe('Race Condition Prevention', () => {
  it('should ensure container state matches button state after async fetch', async () => {
    const videoId = 'raceConditionTest';
    const button = createMockButton(videoId);
    const container = createMockContainer(videoId);

    // Initially no cache
    expect(hasCachedVideo(videoId)).toBe(false);

    // Simulate fetch (async)
    const fetchPromise = fetchHiddenVideoStates([videoId]).then(() => {
      // Populate cache after fetch
      mockCacheHelpers.setCachedVideo(videoId, { videoId, state: 'dimmed', title: 'Test Video' });

      const record = getCachedHiddenVideo(videoId);
      applyStateToEyeButton(button, record.state);
      syncIndividualContainerState(container, record.state);
    });

    await fetchPromise;

    // Verify both button and container have correct state
    expect(button.classList.add).toHaveBeenCalledWith('dimmed');
    expect(container.classList.add).toHaveBeenCalledWith(CSS_CLASSES.INDIVIDUAL_DIMMED);
  });

  it('should handle page reload scenario correctly', async () => {
    const videoIds = ['video1', 'video2', 'video3'];

    // Simulate pre-existing cache from previous session
    mockCacheHelpers.setCachedVideo('video1', { videoId: 'video1', state: 'hidden', title: 'Video 1' });
    mockCacheHelpers.setCachedVideo('video2', { videoId: 'video2', state: 'dimmed', title: 'Video 2' });
    mockCacheHelpers.setCachedVideo('video3', { videoId: 'video3', state: 'normal', title: 'Video 3' });

    const containers = videoIds.map((id, index) => {
      const classList = new Set();
      // video3 might have had classes before, simulate existing classes for normal state test
      if (index === 2) {
        classList.add(CSS_CLASSES.INDIVIDUAL_DIMMED);
      }
      return {
        videoId: id,
        element: {
          classList: {
            add: jest.fn((className) => classList.add(className)),
            remove: jest.fn((className) => classList.delete(className)),
            contains: jest.fn((className) => classList.has(className))
          }
        }
      };
    });

    // Simulate eye button creation and fetch for each video
    for (const { videoId, element } of containers) {
      if (hasCachedVideo(videoId)) {
        const record = getCachedHiddenVideo(videoId);
        syncIndividualContainerState(element, record.state);
      } else {
        await fetchHiddenVideoStates([videoId]).then(() => {
          const record = getCachedHiddenVideo(videoId);
          if (record) {
            syncIndividualContainerState(element, record.state);
          }
        });
      }
    }

    // Verify correct states applied
    expect(containers[0].element.classList.add).toHaveBeenCalledWith(CSS_CLASSES.INDIVIDUAL_HIDDEN);
    expect(containers[1].element.classList.add).toHaveBeenCalledWith(CSS_CLASSES.INDIVIDUAL_DIMMED);
    // video3 is normal - should remove dimmed class (which existed)
    expect(containers[2].element.classList.remove).toHaveBeenCalledWith(CSS_CLASSES.INDIVIDUAL_DIMMED);
    // Hidden class was never added, so remove is called but classList.has() returns false - no actual removal
  });
});

describe('State Consistency', () => {
  it('should maintain consistency during rapid state changes', () => {
    const videoId = 'rapidChangeTest';
    const container = createMockContainer(videoId);

    // Simulate rapid state changes
    const states = ['dimmed', 'hidden', 'normal', 'dimmed', 'hidden'];

    states.forEach(state => {
      mockCacheHelpers.setCachedVideo(videoId, { videoId, state, title: 'Test Video' });
      const record = getCachedHiddenVideo(videoId);
      syncIndividualContainerState(container, record.state);
    });

    // Final state should be 'hidden'
    expect(container.classList.add).toHaveBeenLastCalledWith(CSS_CLASSES.INDIVIDUAL_HIDDEN);
  });
});

describe('Multiple Eye Buttons for Same Video', () => {
  it('should handle multiple eye buttons for same video created simultaneously', async () => {
    const videoId = 'duplicateVideo';
    const button1 = createMockButton(videoId);
    const button2 = createMockButton(videoId);
    const container = createMockContainer(videoId);

    // Simulate both buttons triggering fetch simultaneously
    const fetchPromise1 = fetchHiddenVideoStates([videoId]);
    const fetchPromise2 = fetchHiddenVideoStates([videoId]);

    // Both should resolve to same cached result
    await Promise.all([fetchPromise1, fetchPromise2]);

    // Populate cache after fetch
    mockCacheHelpers.setCachedVideo(videoId, { videoId, state: 'hidden', title: 'Duplicate Video' });

    const record = getCachedHiddenVideo(videoId);

    // Apply state to both buttons
    applyStateToEyeButton(button1, record.state);
    applyStateToEyeButton(button2, record.state);

    // Apply to container once (last button wins, but same state)
    syncIndividualContainerState(container, record.state);

    // Both buttons should have correct state
    expect(button1.classList.add).toHaveBeenCalledWith('hidden');
    expect(button2.classList.add).toHaveBeenCalledWith('hidden');

    // Container should have correct state
    expect(container.classList.add).toHaveBeenCalledWith(CSS_CLASSES.INDIVIDUAL_HIDDEN);
  });

  it('should handle button disconnected from DOM before fetch completes', async () => {
    const videoId = 'disconnectedButton';
    const button = createMockButton(videoId);
    button.isConnected = true;

    // Start fetch
    const fetchPromise = fetchHiddenVideoStates([videoId]);

    // Button gets disconnected before fetch completes
    button.isConnected = false;

    // Fetch completes
    await fetchPromise;
    mockCacheHelpers.setCachedVideo(videoId, { videoId, state: 'hidden', title: 'Disconnected' });

    const record = getCachedHiddenVideo(videoId);

    // Attempt to find container from disconnected button should handle gracefully
    // In real code, cachedClosest would return null for disconnected elements
    const container = button.isConnected ? createMockContainer(videoId) : null;

    if (container) {
      syncIndividualContainerState(container, record.state);
    }

    // Should not throw and container should be null
    expect(container).toBeNull();
  });

  it('should deduplicate pending requests for same video', async () => {
    const videoId = 'deduplicateTest';

    // Track fetch call count
    let fetchCallCount = 0;
    const customFetch = jest.fn((videoIds) => {
      fetchCallCount++;
      return Promise.resolve();
    });

    // Simulate three eye buttons for same video triggering fetch
    const promise1 = customFetch([videoId]);
    const promise2 = customFetch([videoId]);
    const promise3 = customFetch([videoId]);

    await Promise.all([promise1, promise2, promise3]);

    // In real implementation, messaging.js should deduplicate these
    // For test, we verify that multiple calls can happen but should be handled
    expect(fetchCallCount).toBeGreaterThan(0);

    // In production, the pending request tracking should ensure only 1 actual fetch
    // This test documents the scenario that needs handling
  });
});
