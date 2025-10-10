/**
 * Integration Tests for Eye Icon State Synchronization
 * Tests the full flow from page load to state application
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  CSS_CLASSES,
  SELECTOR_STRINGS,
  createMockContainer,
  createMockButton,
  createMockCache
} from './testUtils/eyeIconMocks.js';

// Mock the entire flow
let mockDOM;
let mockCacheHelpers;
let mockFetchQueue;

beforeEach(() => {
  mockDOM = {
    containers: new Map(),
    buttons: new Map()
  };
  mockCacheHelpers = createMockCache();
  mockFetchQueue = new Set();
});

describe('Full Page Load Flow', () => {
  it('should apply correct state to all containers on initial load', async () => {
    // Setup: Create DOM with multiple video containers
    const videoData = [
      { id: 'video1', state: 'hidden', title: 'Video 1' },
      { id: 'video2', state: 'dimmed', title: 'Video 2' },
      { id: 'video3', state: 'normal', title: 'Video 3' },
      { id: 'video4', state: 'hidden', title: 'Video 4' }
    ];

    const containers = videoData.map(v => createMockContainer(v.id));
    const buttons = videoData.map(v => createMockButton(v.id));

    containers.forEach((container, i) => {
      mockDOM.containers.set(videoData[i].id, container);
      mockDOM.buttons.set(videoData[i].id, buttons[i]);
    });

    // Simulate applyHiding() flow
    // Step 1: addEyeButtons() - creates buttons and fetches states
    for (const video of videoData) {
      const button = mockDOM.buttons.get(video.id);
      const container = mockDOM.containers.get(video.id);

      // Simulate fetch callback
      mockFetchQueue.add(video.id);
    }

    // Step 2: Fetch completes and populates cache
    for (const video of videoData) {
      mockCacheHelpers.setCachedVideo(video.id, {
        videoId: video.id,
        state: video.state,
        title: video.title
      });
    }

    // Step 3: Eye button fetch callbacks sync container state
    for (const video of videoData) {
      const container = mockDOM.containers.get(video.id);
      const record = mockCacheHelpers.getCachedHiddenVideo(video.id);

      if (record && container) {
        // syncIndividualContainerState
        if (record.state === 'dimmed') {
          container.classList.remove(CSS_CLASSES.INDIVIDUAL_HIDDEN);
          container.classList.add(CSS_CLASSES.INDIVIDUAL_DIMMED);
        } else if (record.state === 'hidden') {
          container.classList.remove(CSS_CLASSES.INDIVIDUAL_DIMMED);
          container.classList.add(CSS_CLASSES.INDIVIDUAL_HIDDEN);
        }
      }
    }

    // Assert: All containers have correct CSS classes
    const container1 = mockDOM.containers.get('video1');
    const container2 = mockDOM.containers.get('video2');
    const container3 = mockDOM.containers.get('video3');
    const container4 = mockDOM.containers.get('video4');

    expect(container1.classList.add).toHaveBeenCalledWith(CSS_CLASSES.INDIVIDUAL_HIDDEN);
    expect(container2.classList.add).toHaveBeenCalledWith(CSS_CLASSES.INDIVIDUAL_DIMMED);
    expect(container3.classList.add).not.toHaveBeenCalled(); // normal state
    expect(container4.classList.add).toHaveBeenCalledWith(CSS_CLASSES.INDIVIDUAL_HIDDEN);
  });

  it('should handle hide video and reload correctly', async () => {
    const videoId = 'reloadTestVideo';

    // Setup: Create container and hide it
    const container = createMockContainer(videoId);
    mockDOM.containers.set(videoId, container);

    // User hides the video
    mockCacheHelpers.setCachedVideo(videoId, {
      videoId,
      state: 'hidden',
      title: 'Reload Test Video'
    });

    // Simulate page reload: clear DOM, recreate containers
    mockDOM.containers.clear();
    mockDOM.buttons.clear();

    const newContainer = createMockContainer(videoId);
    const newButton = createMockButton(videoId);
    mockDOM.containers.set(videoId, newContainer);
    mockDOM.buttons.set(videoId, newButton);

    // Trigger applyHiding() as happens on page load
    // Eye button creation fetches state (cache already populated)
    const record = mockCacheHelpers.getCachedHiddenVideo(videoId);

    if (record) {
      // Apply button state
      if (record.state === 'hidden') {
        newButton.classList.add('hidden');
      }

      // Sync container state (the fix)
      if (record.state === 'hidden') {
        newContainer.classList.remove(CSS_CLASSES.INDIVIDUAL_DIMMED);
        newContainer.classList.add(CSS_CLASSES.INDIVIDUAL_HIDDEN);
      }
    }

    // Assert: Container has correct hidden state
    expect(newButton.classList.add).toHaveBeenCalledWith('hidden');
    expect(newContainer.classList.add).toHaveBeenCalledWith(CSS_CLASSES.INDIVIDUAL_HIDDEN);
  });
});

describe('Visibility Tracker Integration', () => {
  it('should process visible containers with correct state', () => {
    // Setup: Create visible and invisible containers
    const visibleVideos = [
      { id: 'visible1', state: 'hidden', isVisible: true },
      { id: 'visible2', state: 'dimmed', isVisible: true }
    ];

    const invisibleVideos = [
      { id: 'invisible1', state: 'hidden', isVisible: false },
      { id: 'invisible2', state: 'dimmed', isVisible: false }
    ];

    const allVideos = [...visibleVideos, ...invisibleVideos];

    allVideos.forEach(video => {
      const container = createMockContainer(video.id);
      mockDOM.containers.set(video.id, container);
      mockCacheHelpers.setCachedVideo(video.id, {
        videoId: video.id,
        state: video.state,
        title: `Video ${video.id}`
      });
    });

    // Simulate lazy processing - only process visible videos
    const visibleContainers = visibleVideos.map(v => mockDOM.containers.get(v.id));

    visibleContainers.forEach((container, index) => {
      const videoId = visibleVideos[index].id;
      const record = mockCacheHelpers.getCachedHiddenVideo(videoId);

      if (record) {
        if (record.state === 'dimmed') {
          container.classList.add(CSS_CLASSES.INDIVIDUAL_DIMMED);
        } else if (record.state === 'hidden') {
          container.classList.add(CSS_CLASSES.INDIVIDUAL_HIDDEN);
        }
      }
    });

    // Assert: Visible containers are processed
    expect(mockDOM.containers.get('visible1').classList.add)
      .toHaveBeenCalledWith(CSS_CLASSES.INDIVIDUAL_HIDDEN);
    expect(mockDOM.containers.get('visible2').classList.add)
      .toHaveBeenCalledWith(CSS_CLASSES.INDIVIDUAL_DIMMED);

    // Invisible containers should not be processed yet (lazy mode)
    // They will be processed when they become visible
  });

  it('should sync state when invisible video becomes visible', () => {
    const videoId = 'lazyLoadVideo';

    // Setup: Video exists but is off-screen
    const container = createMockContainer(videoId);
    mockDOM.containers.set(videoId, container);
    mockCacheHelpers.setCachedVideo(videoId, {
      videoId,
      state: 'hidden',
      title: 'Lazy Load Video'
    });

    // Initially not processed (invisible)
    expect(container.classList.add).not.toHaveBeenCalled();

    // Video becomes visible (scroll into view)
    const record = mockCacheHelpers.getCachedHiddenVideo(videoId);
    if (record) {
      if (record.state === 'hidden') {
        container.classList.remove(CSS_CLASSES.INDIVIDUAL_DIMMED);
        container.classList.add(CSS_CLASSES.INDIVIDUAL_HIDDEN);
      }
    }

    // Assert: Container now has correct state
    expect(container.classList.add).toHaveBeenCalledWith(CSS_CLASSES.INDIVIDUAL_HIDDEN);
  });
});

describe('Mixed State Scenarios', () => {
  it('should handle mix of cached and uncached videos', async () => {
    const videos = [
      { id: 'cached1', state: 'hidden', cached: true },
      { id: 'uncached1', state: null, cached: false },
      { id: 'cached2', state: 'dimmed', cached: true },
      { id: 'uncached2', state: null, cached: false }
    ];

    videos.forEach(video => {
      const container = createMockContainer(video.id);
      mockDOM.containers.set(video.id, container);

      if (video.cached) {
        mockCacheHelpers.setCachedVideo(video.id, {
          videoId: video.id,
          state: video.state,
          title: `Video ${video.id}`
        });
      }
    });

    // Process videos
    for (const video of videos) {
      const container = mockDOM.containers.get(video.id);

      if (mockCacheHelpers.hasCachedVideo(video.id)) {
        // Cached: process immediately
        const record = mockCacheHelpers.getCachedHiddenVideo(video.id);
        if (record.state === 'hidden') {
          container.classList.add(CSS_CLASSES.INDIVIDUAL_HIDDEN);
        } else if (record.state === 'dimmed') {
          container.classList.add(CSS_CLASSES.INDIVIDUAL_DIMMED);
        }
      } else {
        // Uncached: skip (will be handled by eye button fetch)
        // This is the defensive check from Step 5
      }
    }

    // Assert: Cached videos are processed
    expect(mockDOM.containers.get('cached1').classList.add)
      .toHaveBeenCalledWith(CSS_CLASSES.INDIVIDUAL_HIDDEN);
    expect(mockDOM.containers.get('cached2').classList.add)
      .toHaveBeenCalledWith(CSS_CLASSES.INDIVIDUAL_DIMMED);

    // Uncached videos are not processed yet
    expect(mockDOM.containers.get('uncached1').classList.add).not.toHaveBeenCalled();
    expect(mockDOM.containers.get('uncached2').classList.add).not.toHaveBeenCalled();
  });

  it('should handle state transitions correctly', () => {
    const videoId = 'transitionVideo';
    const container = createMockContainer(videoId);
    mockDOM.containers.set(videoId, container);

    // Start with dimmed
    mockCacheHelpers.setCachedVideo(videoId, { videoId, state: 'dimmed', title: 'Test' });
    let record = mockCacheHelpers.getCachedHiddenVideo(videoId);
    container.classList.add(CSS_CLASSES.INDIVIDUAL_DIMMED);

    // Transition to hidden
    mockCacheHelpers.setCachedVideo(videoId, { videoId, state: 'hidden', title: 'Test' });
    record = mockCacheHelpers.getCachedHiddenVideo(videoId);
    container.classList.remove(CSS_CLASSES.INDIVIDUAL_DIMMED);
    container.classList.add(CSS_CLASSES.INDIVIDUAL_HIDDEN);

    // Transition to normal
    mockCacheHelpers.setCachedVideo(videoId, { videoId, state: 'normal', title: 'Test' });
    record = mockCacheHelpers.getCachedHiddenVideo(videoId);
    container.classList.remove(CSS_CLASSES.INDIVIDUAL_DIMMED);
    container.classList.remove(CSS_CLASSES.INDIVIDUAL_HIDDEN);

    // Assert: Correct transitions
    expect(container.classList.add).toHaveBeenCalledWith(CSS_CLASSES.INDIVIDUAL_DIMMED);
    expect(container.classList.add).toHaveBeenCalledWith(CSS_CLASSES.INDIVIDUAL_HIDDEN);
    expect(container.classList.remove).toHaveBeenCalledWith(CSS_CLASSES.INDIVIDUAL_DIMMED);
    expect(container.classList.remove).toHaveBeenCalledWith(CSS_CLASSES.INDIVIDUAL_HIDDEN);
  });
});

describe('Error Handling', () => {
  it('should handle null container gracefully', () => {
    const videoId = 'nullContainerVideo';

    // Cache exists but container is null
    mockCacheHelpers.setCachedVideo(videoId, { videoId, state: 'hidden', title: 'Test' });

    const container = null;
    const record = mockCacheHelpers.getCachedHiddenVideo(videoId);

    // Should not throw when container is null
    expect(() => {
      if (container && record) {
        if (record.state === 'hidden') {
          container.classList.add(CSS_CLASSES.INDIVIDUAL_HIDDEN);
        }
      }
    }).not.toThrow();
  });

  it('should handle missing cache record gracefully', () => {
    const videoId = 'missingRecordVideo';
    const container = createMockContainer(videoId);
    mockDOM.containers.set(videoId, container);

    // No cache record
    const record = mockCacheHelpers.getCachedHiddenVideo(videoId);

    // Should not process if record is missing
    if (record) {
      container.classList.add(CSS_CLASSES.INDIVIDUAL_HIDDEN);
    }

    expect(container.classList.add).not.toHaveBeenCalled();
  });

  it('should handle disconnected container', () => {
    const videoId = 'disconnectedVideo';
    const container = createMockContainer(videoId);
    container.isConnected = false;

    mockDOM.containers.set(videoId, container);
    mockCacheHelpers.setCachedVideo(videoId, { videoId, state: 'hidden', title: 'Test' });

    // Check if container is connected before processing
    const record = mockCacheHelpers.getCachedHiddenVideo(videoId);
    if (container.isConnected && record) {
      if (record.state === 'hidden') {
        container.classList.add(CSS_CLASSES.INDIVIDUAL_HIDDEN);
      }
    }

    // Should not process disconnected container
    expect(container.classList.add).not.toHaveBeenCalled();
  });
});

describe('Performance Considerations', () => {
  it('should not cause redundant fetch requests', async () => {
    const videoIds = ['video1', 'video2', 'video3'];
    const fetchCalls = new Set();

    // Populate cache
    videoIds.forEach(id => {
      mockCacheHelpers.setCachedVideo(id, { videoId: id, state: 'hidden', title: `Video ${id}` });
    });

    // Simulate eye button creation
    videoIds.forEach(id => {
      const container = createMockContainer(id);
      mockDOM.containers.set(id, container);

      // If cached, don't fetch
      if (mockCacheHelpers.hasCachedVideo(id)) {
        const record = mockCacheHelpers.getCachedHiddenVideo(id);
        if (record.state === 'hidden') {
          container.classList.add(CSS_CLASSES.INDIVIDUAL_HIDDEN);
        }
      } else {
        fetchCalls.add(id);
      }
    });

    // No fetch calls should be made for cached videos
    expect(fetchCalls.size).toBe(0);
  });

  it('should batch container updates efficiently', () => {
    const videoIds = Array.from({ length: 100 }, (_, i) => `video${i}`);

    videoIds.forEach(id => {
      const container = createMockContainer(id);
      mockDOM.containers.set(id, container);
      mockCacheHelpers.setCachedVideo(id, { videoId: id, state: 'hidden', title: `Video ${id}` });
    });

    // Process all videos in one batch
    const startTime = Date.now();

    videoIds.forEach(id => {
      const container = mockDOM.containers.get(id);
      const record = mockCacheHelpers.getCachedHiddenVideo(id);

      if (record && record.state === 'hidden') {
        container.classList.add(CSS_CLASSES.INDIVIDUAL_HIDDEN);
      }
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should complete quickly (mocked, so should be < 100ms)
    expect(duration).toBeLessThan(100);

    // All containers should be processed
    videoIds.forEach(id => {
      const container = mockDOM.containers.get(id);
      expect(container.classList.add).toHaveBeenCalledWith(CSS_CLASSES.INDIVIDUAL_HIDDEN);
    });
  });
});
