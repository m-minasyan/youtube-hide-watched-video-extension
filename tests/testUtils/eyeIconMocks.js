/**
 * Shared mock utilities for eye icon state synchronization tests
 * Centralizes mock implementations to maintain DRY principle
 */

import { jest } from '@jest/globals';

export const CSS_CLASSES = {
  INDIVIDUAL_DIMMED: 'ythwv-individual-dimmed',
  INDIVIDUAL_HIDDEN: 'ythwv-individual-hidden',
  EYE_BUTTON: 'ythwv-eye-button',
  HAS_EYE_BUTTON: 'yt-hwv-has-eye-button'
};

export const SELECTOR_STRINGS = {
  VIDEO_CONTAINERS: 'ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer'
};

/**
 * Creates a mock container element with classList tracking
 */
export function createMockContainer(videoId) {
  const classList = new Set();
  return {
    videoId,
    getAttribute: jest.fn((attr) => {
      if (attr === 'data-ythwv-video-id') return videoId;
      return null;
    }),
    setAttribute: jest.fn(),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(() => []),
    classList: {
      add: jest.fn((className) => classList.add(className)),
      remove: jest.fn((className) => classList.delete(className)),
      contains: jest.fn((className) => classList.has(className))
    },
    style: {},
    appendChild: jest.fn(),
    isConnected: true
  };
}

/**
 * Creates a mock eye button element with classList tracking
 */
export function createMockButton(videoId) {
  const classList = new Set();
  return {
    videoId,
    getAttribute: jest.fn(() => videoId),
    setAttribute: jest.fn(),
    classList: {
      add: jest.fn((className) => classList.add(className)),
      remove: jest.fn((className) => classList.delete(className)),
      contains: jest.fn((className) => classList.has(className))
    },
    innerHTML: '',
    addEventListener: jest.fn()
  };
}

/**
 * Mock implementation of syncIndividualContainerState
 * Replicates the actual function's behavior for testing
 */
export function createSyncMock() {
  return (container, state) => {
    if (!container) return;
    const hasDimmed = container.classList.contains(CSS_CLASSES.INDIVIDUAL_DIMMED);
    const hasHidden = container.classList.contains(CSS_CLASSES.INDIVIDUAL_HIDDEN);

    if (state === 'dimmed') {
      if (hasHidden) {
        container.classList.remove(CSS_CLASSES.INDIVIDUAL_HIDDEN);
      }
      if (!hasDimmed) {
        container.classList.add(CSS_CLASSES.INDIVIDUAL_DIMMED);
      }
      return;
    }
    if (state === 'hidden') {
      if (hasDimmed) {
        container.classList.remove(CSS_CLASSES.INDIVIDUAL_DIMMED);
      }
      if (!hasHidden) {
        container.classList.add(CSS_CLASSES.INDIVIDUAL_HIDDEN);
      }
      return;
    }
    if (hasDimmed) {
      container.classList.remove(CSS_CLASSES.INDIVIDUAL_DIMMED);
    }
    if (hasHidden) {
      container.classList.remove(CSS_CLASSES.INDIVIDUAL_HIDDEN);
    }
  };
}

/**
 * Mock implementation of applyStateToEyeButton
 */
export function createApplyStateToEyeButtonMock() {
  return (button, state) => {
    if (!button) return;
    button.classList.remove('dimmed');
    button.classList.remove('hidden');
    if (state === 'dimmed') {
      button.classList.add('dimmed');
    } else if (state === 'hidden') {
      button.classList.add('hidden');
    }
  };
}

/**
 * Creates a mock cache with get/set/has functionality
 */
export function createMockCache() {
  const cache = new Map();

  return {
    getCachedHiddenVideo: (videoId) => cache.get(videoId) || null,
    hasCachedVideo: (videoId) => cache.has(videoId),
    setCachedVideo: (videoId, record) => cache.set(videoId, record),
    deleteCachedVideo: (videoId) => cache.delete(videoId),
    clearCache: () => cache.clear(),
    getCache: () => cache
  };
}

/**
 * Creates a mock fetch function that can be configured per test
 */
export function createMockFetch() {
  return jest.fn((videoIds) => Promise.resolve());
}
