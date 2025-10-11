import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { findWatchedElements, getVideoId } from '../content/detection/videoDetector.js';
import { addEyeButtons } from '../content/ui/eyeButtonManager.js';
import { resetSelectorStats } from '../content/utils/domSelectorHealth.js';
import { CSS_CLASSES } from '../shared/constants.js';
import { clearAllCaches } from '../content/utils/domCache.js';

// Import settings module to initialize it
import * as settingsModule from '../content/storage/settings.js';

describe('DOM Selector Integration', () => {
  beforeEach(async () => {
    resetSelectorStats();
    clearAllCaches();
    document.body.innerHTML = '';

    // Mock Chrome APIs with complete extension context
    global.chrome = {
      storage: {
        sync: {
          get: jest.fn((keys, callback) => {
            const result = {
              YTHWV_THRESHOLD: 10,
              YTHWV_INDIVIDUAL_MODE_ENABLED: true,
              YTHWV_INDIVIDUAL_MODE: 'dimmed'
            };
            if (callback) callback(result);
            return Promise.resolve(result);
          })
        },
        local: {
          get: jest.fn((keys, callback) => {
            const result = {};
            if (callback) callback(result);
            return Promise.resolve(result);
          })
        }
      },
      runtime: {
        sendMessage: jest.fn((message, callback) => {
          if (callback) callback({ ok: true, result: {} });
          return Promise.resolve({ ok: true, result: {} });
        }),
        lastError: null, // Required for extension context validation
        id: 'test-extension-id'
      }
    };

    // Initialize settings module with mocked Chrome API
    await settingsModule.loadSettings();
  });

  afterEach(() => {
    resetSelectorStats();
    clearAllCaches();
    document.body.innerHTML = '';
  });

  describe('Watched Video Detection with Fallbacks', () => {
    it('should detect watched videos with primary selector', () => {
      document.body.innerHTML = `
        <div class="ytd-thumbnail-overlay-resume-playback-renderer"
             style="width: 50%"></div>
      `;

      const watched = findWatchedElements();
      expect(watched.length).toBeGreaterThan(0);
    });

    it('should detect watched videos with fallback selector', () => {
      document.body.innerHTML = `
        <div class="ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment"
             style="width: 50%"></div>
      `;

      const watched = findWatchedElements();
      expect(watched.length).toBeGreaterThan(0);
    });

    it('should respect threshold setting', () => {
      document.body.innerHTML = `
        <div class="ytd-thumbnail-overlay-resume-playback-renderer"
             style="width: 5%"></div>
        <div class="ytd-thumbnail-overlay-resume-playback-renderer"
             style="width: 50%"></div>
      `;

      const watched = findWatchedElements();
      // Only the 50% watched video should be included (threshold is 10%)
      expect(watched.length).toBe(1);
    });

    it('should return empty array when no watched videos found', () => {
      document.body.innerHTML = '<div class="some-other-class"></div>';

      const watched = findWatchedElements();
      expect(watched.length).toBe(0);
    });
  });

  describe('Video ID Extraction with Fallbacks', () => {
    it('should extract video ID from watch URL', () => {
      document.body.innerHTML = `
        <div class="video-container">
          <a href="/watch?v=dQw4w9WgXcQ">Video</a>
        </div>
      `;

      const container = document.querySelector('.video-container');
      const videoId = getVideoId(container);
      expect(videoId).toBe('dQw4w9WgXcQ');
    });

    it('should extract video ID from shorts URL', () => {
      document.body.innerHTML = `
        <div class="video-container">
          <a href="/shorts/abcXYZ123">Short</a>
        </div>
      `;

      const container = document.querySelector('.video-container');
      const videoId = getVideoId(container);
      expect(videoId).toBe('abcXYZ123');
    });

    it('should return null when no video link found', () => {
      document.body.innerHTML = `
        <div class="video-container">
          <span>No link here</span>
        </div>
      `;

      const container = document.querySelector('.video-container');
      const videoId = getVideoId(container);
      expect(videoId).toBeNull();
    });

    it('should extract video ID with query parameters', () => {
      document.body.innerHTML = `
        <div class="video-container">
          <a href="/watch?v=dQw4w9WgXcQ&list=PLtest">Video</a>
        </div>
      `;

      const container = document.querySelector('.video-container');
      const videoId = getVideoId(container);
      expect(videoId).toBe('dQw4w9WgXcQ');
    });
  });

  describe('Eye Button Creation with Fallback Selectors', () => {
    it('should add eye buttons to primary thumbnail selector', () => {
      document.body.innerHTML = `
        <yt-thumbnail-view-model>
          <a href="/watch?v=test123">Video</a>
        </yt-thumbnail-view-model>
      `;

      addEyeButtons();

      const button = document.querySelector(`.${CSS_CLASSES.EYE_BUTTON}`);
      expect(button).not.toBeNull();
    });

    it('should add eye buttons to fallback thumbnail selector', () => {
      document.body.innerHTML = `
        <ytd-thumbnail>
          <a href="/watch?v=test456">Video</a>
        </ytd-thumbnail>
      `;

      addEyeButtons();

      const button = document.querySelector(`.${CSS_CLASSES.EYE_BUTTON}`);
      expect(button).not.toBeNull();
    });

    it('should not add duplicate eye buttons', () => {
      document.body.innerHTML = `
        <yt-thumbnail-view-model>
          <a href="/watch?v=test789">Video</a>
        </yt-thumbnail-view-model>
      `;

      addEyeButtons();
      addEyeButtons(); // Call twice

      const buttons = document.querySelectorAll(`.${CSS_CLASSES.EYE_BUTTON}`);
      expect(buttons.length).toBe(1);
    });

    it('should mark thumbnails with has-eye-button class', () => {
      document.body.innerHTML = `
        <yt-thumbnail-view-model>
          <a href="/watch?v=testABC">Video</a>
        </yt-thumbnail-view-model>
      `;

      addEyeButtons();

      const thumbnail = document.querySelector('yt-thumbnail-view-model');
      expect(thumbnail.classList.contains(CSS_CLASSES.HAS_EYE_BUTTON)).toBe(true);
    });

    it('should not add buttons when individual mode disabled', async () => {
      // Update mock to disable individual mode
      global.chrome.storage.sync.get = jest.fn((keys, callback) => {
        const result = {
          YTHWV_THRESHOLD: 10,
          YTHWV_INDIVIDUAL_MODE_ENABLED: false,
          YTHWV_INDIVIDUAL_MODE: 'dimmed'
        };
        if (callback) callback(result);
        return Promise.resolve(result);
      });

      // Reload settings to apply the new mock
      await settingsModule.loadSettings();

      document.body.innerHTML = `
        <yt-thumbnail-view-model>
          <a href="/watch?v=testDEF">Video</a>
        </yt-thumbnail-view-model>
      `;

      addEyeButtons();

      const button = document.querySelector(`.${CSS_CLASSES.EYE_BUTTON}`);
      expect(button).toBeNull();
    });
  });

  describe('Multiple Video Container Types', () => {
    it('should handle ytd-rich-item-renderer containers', () => {
      document.body.innerHTML = `
        <ytd-rich-item-renderer>
          <a href="/watch?v=test1">Video 1</a>
        </ytd-rich-item-renderer>
      `;

      const container = document.querySelector('ytd-rich-item-renderer');
      const videoId = getVideoId(container);
      expect(videoId).toBe('test1');
    });

    it('should handle ytd-video-renderer containers', () => {
      document.body.innerHTML = `
        <ytd-video-renderer>
          <a href="/watch?v=test2">Video 2</a>
        </ytd-video-renderer>
      `;

      const container = document.querySelector('ytd-video-renderer');
      const videoId = getVideoId(container);
      expect(videoId).toBe('test2');
    });

    it('should handle ytd-grid-video-renderer containers', () => {
      document.body.innerHTML = `
        <ytd-grid-video-renderer>
          <a href="/watch?v=test3">Video 3</a>
        </ytd-grid-video-renderer>
      `;

      const container = document.querySelector('ytd-grid-video-renderer');
      const videoId = getVideoId(container);
      expect(videoId).toBe('test3');
    });
  });

  describe('Shorts Detection with Fallbacks', () => {
    it('should extract shorts video ID from primary selector', () => {
      document.body.innerHTML = `
        <div class="shorts-container">
          <a href="/shorts/shortID1">Short</a>
        </div>
      `;

      const container = document.querySelector('.shorts-container');
      const videoId = getVideoId(container);
      expect(videoId).toBe('shortID1');
    });

    it('should handle shorts with query parameters', () => {
      document.body.innerHTML = `
        <div class="shorts-container">
          <a href="/shorts/shortID2?feature=share">Short</a>
        </div>
      `;

      const container = document.querySelector('.shorts-container');
      const videoId = getVideoId(container);
      expect(videoId).toBe('shortID2');
    });
  });

  describe('Complex DOM Structures', () => {
    it('should handle nested video links', () => {
      document.body.innerHTML = `
        <div class="video-container">
          <div class="thumbnail-wrapper">
            <div class="thumbnail-inner">
              <a href="/watch?v=nested123">Nested Video</a>
            </div>
          </div>
        </div>
      `;

      const container = document.querySelector('.video-container');
      const videoId = getVideoId(container);
      expect(videoId).toBe('nested123');
    });

    it('should handle multiple progress bars with different percentages', () => {
      document.body.innerHTML = `
        <div class="ytd-thumbnail-overlay-resume-playback-renderer"
             style="width: 5%"></div>
        <div class="ytd-thumbnail-overlay-resume-playback-renderer"
             style="width: 25%"></div>
        <div class="ytd-thumbnail-overlay-resume-playback-renderer"
             style="width: 75%"></div>
        <div class="ytd-thumbnail-overlay-resume-playback-renderer"
             style="width: 95%"></div>
      `;

      const watched = findWatchedElements();
      // Should find 3 videos (25%, 75%, 95%) since threshold is 10%
      expect(watched.length).toBe(3);
    });

    it('should handle mixed watch and shorts links', () => {
      document.body.innerHTML = `
        <div class="container1">
          <a href="/watch?v=video1">Regular Video</a>
        </div>
        <div class="container2">
          <a href="/shorts/short1">Short Video</a>
        </div>
      `;

      const container1 = document.querySelector('.container1');
      const container2 = document.querySelector('.container2');

      expect(getVideoId(container1)).toBe('video1');
      expect(getVideoId(container2)).toBe('short1');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid video IDs gracefully', () => {
      document.body.innerHTML = `
        <div class="video-container">
          <a href="/invalid/url">Not a video</a>
        </div>
      `;

      const container = document.querySelector('.video-container');
      const videoId = getVideoId(container);
      expect(videoId).toBeNull();
    });

    it('should handle empty containers', () => {
      document.body.innerHTML = '<div class="empty-container"></div>';

      const container = document.querySelector('.empty-container');
      const videoId = getVideoId(container);
      expect(videoId).toBeNull();
    });

    it('should handle malformed HTML', () => {
      document.body.innerHTML = `
        <div class="malformed">
          <a>No href attribute</a>
        </div>
      `;

      const container = document.querySelector('.malformed');
      const videoId = getVideoId(container);
      expect(videoId).toBeNull();
    });

    it('should not crash on null elements', () => {
      expect(() => {
        getVideoId(null);
      }).not.toThrow();

      expect(getVideoId(null)).toBeNull();
    });
  });
});
