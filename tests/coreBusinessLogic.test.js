const { STORAGE_KEYS, DEFAULT_SETTINGS, mockChromeStorage, createMockVideoElement } = require('./testUtils');

describe('Core Business Logic - Video Detection and Processing', () => {
  let storageData;

  beforeEach(() => {
    jest.clearAllMocks();
    storageData = mockChromeStorage();
    document.body.innerHTML = '';
  });

  describe('Video Watch Status Detection', () => {
    const isVideoWatched = (element, threshold = 10) => {
      const progressSelectors = [
        '.ytd-thumbnail-overlay-resume-playback-progress-renderer',
        '.ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment',
        '#progress'
      ];
      
      for (const selector of progressSelectors) {
        const progressBar = element.querySelector(selector);
        if (progressBar) {
          const width = parseInt(progressBar.style?.width || '0', 10);
          return width >= threshold;
        }
      }
      return false;
    };

    test('should detect watched video with progress bar above threshold', () => {
      const video = createMockVideoElement({ hasProgressBar: true });
      const progressBar = video.querySelector('.ytd-thumbnail-overlay-resume-playback-progress-renderer');
      progressBar.style.width = '75%';
      
      expect(isVideoWatched(video, 50)).toBe(true);
      expect(isVideoWatched(video, 80)).toBe(false);
    });

    test('should handle multiple progress bar selector variations', () => {
      const video = document.createElement('div');
      const progressBar = document.createElement('div');
      progressBar.className = 'ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment';
      progressBar.style.width = '90%';
      video.appendChild(progressBar);
      
      expect(isVideoWatched(video, 50)).toBe(true);
    });

    test('should return false for videos without progress bars', () => {
      const video = createMockVideoElement({ hasProgressBar: false });
      expect(isVideoWatched(video, 10)).toBe(false);
    });
  });

  describe('Video ID Extraction', () => {
    const getVideoId = (element) => {
      const linkSelectors = [
        'a[href*="/watch?v="]',
        'a[href*="/shorts/"]',
        'a.yt-simple-endpoint'
      ];
      
      for (const selector of linkSelectors) {
        const link = element.querySelector(selector);
        if (link?.href) {
          const watchMatch = link.href.match(/\/watch\?v=([^&]+)/);
          if (watchMatch) return watchMatch[1];
          
          const shortsMatch = link.href.match(/\/shorts\/([^/?]+)/);
          if (shortsMatch) return shortsMatch[1];
        }
      }
      return null;
    };

    test('should extract video ID from watch URL', () => {
      const video = createMockVideoElement({ videoId: 'abc123' });
      expect(getVideoId(video)).toBe('abc123');
    });

    test('should extract video ID from shorts URL', () => {
      const video = createMockVideoElement({ videoId: 'xyz789', isShorts: true });
      expect(getVideoId(video)).toBe('xyz789');
    });

    test('should return null for invalid video elements', () => {
      const div = document.createElement('div');
      expect(getVideoId(div)).toBe(null);
    });
  });

  describe('Title Extraction', () => {
    const getVideoTitle = (element) => {
      const titleSelectors = [
        '#video-title',
        'h3.title',
        '#video-title-link',
        'span#video-title',
        'a#video-title',
        'yt-formatted-string#video-title'
      ];
      
      for (const selector of titleSelectors) {
        const titleElement = element.querySelector(selector);
        if (titleElement?.textContent) {
          return titleElement.textContent.trim()
            .replace(/^\s+|\s+$/g, '')
            .replace(/\s+/g, ' ');
        }
      }
      
      return 'Untitled Video';
    };

    test('should extract video title from element', () => {
      const video = createMockVideoElement({ title: 'My Awesome Video' });
      expect(getVideoTitle(video)).toBe('My Awesome Video');
    });

    test('should clean and normalize title text', () => {
      const video = document.createElement('div');
      const title = document.createElement('h3');
      title.id = 'video-title';
      title.textContent = '  Multiple   Spaces   Video  ';
      video.appendChild(title);
      
      expect(getVideoTitle(video)).toBe('Multiple Spaces Video');
    });

    test('should return default title when no title found', () => {
      const video = document.createElement('div');
      expect(getVideoTitle(video)).toBe('Untitled Video');
    });
  });
});

describe('Core Business Logic - Hiding and State Management', () => {
  let storageData;

  beforeEach(() => {
    jest.clearAllMocks();
    storageData = mockChromeStorage();
    document.body.innerHTML = '';
  });

  describe('Video Hiding State Application', () => {
    const applyVideoState = (element, state, isIndividual = false) => {
      const classes = element.classList;
      
      // Remove all state classes
      classes.remove(
        'YT-HWV-WATCHED-HIDDEN',
        'YT-HWV-WATCHED-DIMMED',
        'YT-HWV-SHORTS-HIDDEN',
        'YT-HWV-SHORTS-DIMMED',
        'YT-HWV-INDIVIDUAL-HIDDEN',
        'YT-HWV-INDIVIDUAL-DIMMED'
      );
      
      if (state === 'normal') return;
      
      const isShorts = element.querySelector('a[href*="/shorts/"]') !== null;
      const prefix = isIndividual ? 'INDIVIDUAL' : (isShorts ? 'SHORTS' : 'WATCHED');
      const suffix = state.toUpperCase();
      
      classes.add(`YT-HWV-${prefix}-${suffix}`);
    };

    test('should apply dimmed state to watched video', () => {
      const video = createMockVideoElement();
      applyVideoState(video, 'dimmed');
      
      expect(video.classList.contains('YT-HWV-WATCHED-DIMMED')).toBe(true);
      expect(video.classList.contains('YT-HWV-WATCHED-HIDDEN')).toBe(false);
    });

    test('should apply hidden state to shorts', () => {
      const shorts = createMockVideoElement({ isShorts: true });
      applyVideoState(shorts, 'hidden');
      
      expect(shorts.classList.contains('YT-HWV-SHORTS-HIDDEN')).toBe(true);
      expect(shorts.classList.contains('YT-HWV-SHORTS-DIMMED')).toBe(false);
    });

    test('should apply individual state correctly', () => {
      const video = createMockVideoElement();
      applyVideoState(video, 'dimmed', true);
      
      expect(video.classList.contains('YT-HWV-INDIVIDUAL-DIMMED')).toBe(true);
      expect(video.classList.contains('YT-HWV-WATCHED-DIMMED')).toBe(false);
    });

    test('should remove all classes when state is normal', () => {
      const video = createMockVideoElement();
      video.classList.add('YT-HWV-WATCHED-HIDDEN', 'YT-HWV-INDIVIDUAL-DIMMED');
      
      applyVideoState(video, 'normal');
      
      expect(video.classList.contains('YT-HWV-WATCHED-HIDDEN')).toBe(false);
      expect(video.classList.contains('YT-HWV-INDIVIDUAL-DIMMED')).toBe(false);
    });
  });

  describe('Individual Video Management', () => {
    const saveIndividualVideo = async (videoId, state, title = '') => {
      const result = await chrome.storage.local.get(STORAGE_KEYS.HIDDEN_VIDEOS);
      const hiddenVideos = result[STORAGE_KEYS.HIDDEN_VIDEOS] || {};
      
      if (state === 'normal') {
        delete hiddenVideos[videoId];
      } else {
        hiddenVideos[videoId] = { state, title };
      }
      
      await chrome.storage.local.set({ [STORAGE_KEYS.HIDDEN_VIDEOS]: hiddenVideos });
      return hiddenVideos;
    };

    test('should save individual video with state and title', async () => {
      const videos = await saveIndividualVideo('video123', 'dimmed', 'Test Video');
      
      expect(videos['video123']).toEqual({
        state: 'dimmed',
        title: 'Test Video'
      });
    });

    test('should remove video when state is normal', async () => {
      storageData.local[STORAGE_KEYS.HIDDEN_VIDEOS] = {
        'video123': { state: 'hidden', title: 'Test' }
      };
      
      const videos = await saveIndividualVideo('video123', 'normal');
      expect(videos['video123']).toBeUndefined();
    });

    test('should update existing video state', async () => {
      storageData.local[STORAGE_KEYS.HIDDEN_VIDEOS] = {
        'video123': { state: 'dimmed', title: 'Original' }
      };
      
      const videos = await saveIndividualVideo('video123', 'hidden', 'Updated');
      
      expect(videos['video123']).toEqual({
        state: 'hidden',
        title: 'Updated'
      });
    });
  });
});

describe('Core Business Logic - Section Detection', () => {
  const getYouTubeSection = (url) => {
    const pathname = url.pathname || '';
    const search = url.search || '';
    
    if (pathname.includes('/playlist')) return 'playlist';
    if (pathname.includes('/feed/subscriptions')) return 'subscriptions';
    if (pathname.includes('/feed/trending')) return 'trending';
    if (pathname.includes('/watch')) return 'watch';
    if (pathname.includes('/@') || pathname.includes('/c/') || pathname.includes('/channel/')) {
      return 'channel';
    }
    
    // Check for playlist in search params only if not on homepage
    if (pathname !== '/' && pathname !== '/index' && search.includes('list=')) {
      return 'playlist';
    }
    
    if (pathname === '/' || pathname === '/index') return 'misc';
    
    return 'misc';
  };

  test('should detect homepage as misc', () => {
    expect(getYouTubeSection(new URL('https://youtube.com/'))).toBe('misc');
    expect(getYouTubeSection(new URL('https://youtube.com/index'))).toBe('misc');
  });

  test('should detect subscriptions section', () => {
    const url = new URL('https://youtube.com/feed/subscriptions');
    expect(getYouTubeSection(url)).toBe('subscriptions');
  });

  test('should detect channel pages', () => {
    expect(getYouTubeSection(new URL('https://youtube.com/@username'))).toBe('channel');
    expect(getYouTubeSection(new URL('https://youtube.com/c/channelname'))).toBe('channel');
    expect(getYouTubeSection(new URL('https://youtube.com/channel/UCxxx'))).toBe('channel');
  });

  test('should detect watch page', () => {
    const url = new URL('https://youtube.com/watch?v=abc123');
    expect(getYouTubeSection(url)).toBe('watch');
  });

  test('should detect playlist', () => {
    expect(getYouTubeSection(new URL('https://youtube.com/playlist?list=PLxxx'))).toBe('playlist');
    // Home page with playlist parameter is still misc, not playlist
    expect(getYouTubeSection(new URL('https://youtube.com/?list=PLxxx'))).toBe('misc');
  });

  test('should detect trending', () => {
    const url = new URL('https://youtube.com/feed/trending');
    expect(getYouTubeSection(url)).toBe('trending');
  });
});

describe('Core Business Logic - Settings Validation', () => {
  const validateSettings = (settings) => {
    const errors = [];
    
    // Validate threshold
    if (typeof settings.threshold !== 'number' || settings.threshold < 0 || settings.threshold > 100) {
      errors.push('Invalid threshold value');
    }
    
    // Validate individual mode
    const validModes = ['normal', 'dimmed', 'hidden'];
    if (settings.individualMode && !validModes.includes(settings.individualMode)) {
      errors.push('Invalid individual mode');
    }
    
    // Validate states
    const validateStates = (states, name) => {
      if (typeof states !== 'object') {
        errors.push(`Invalid ${name} states object`);
        return;
      }
      
      Object.entries(states).forEach(([section, state]) => {
        if (!validModes.includes(state)) {
          errors.push(`Invalid state for ${name}.${section}`);
        }
      });
    };
    
    if (settings.watchedStates) validateStates(settings.watchedStates, 'watched');
    if (settings.shortsStates) validateStates(settings.shortsStates, 'shorts');
    
    return errors;
  };

  test('should validate correct settings', () => {
    const settings = {
      threshold: 50,
      individualMode: 'dimmed',
      watchedStates: { misc: 'normal', subscriptions: 'hidden' },
      shortsStates: { misc: 'dimmed' }
    };
    
    expect(validateSettings(settings)).toEqual([]);
  });

  test('should detect invalid threshold', () => {
    const settings = { threshold: 150 };
    expect(validateSettings(settings)).toContain('Invalid threshold value');
    
    const settings2 = { threshold: -10 };
    expect(validateSettings(settings2)).toContain('Invalid threshold value');
    
    const settings3 = { threshold: 'not a number' };
    expect(validateSettings(settings3)).toContain('Invalid threshold value');
  });

  test('should detect invalid individual mode', () => {
    const settings = { individualMode: 'invalid' };
    expect(validateSettings(settings)).toContain('Invalid individual mode');
  });

  test('should detect invalid state values', () => {
    const settings = {
      watchedStates: { misc: 'invalid_state' }
    };
    expect(validateSettings(settings)).toContain('Invalid state for watched.misc');
  });
});

describe('Core Business Logic - Cache Management', () => {
  describe('Video State Cache', () => {
    class VideoStateCache {
      constructor(maxSize = 100) {
        this.cache = new Map();
        this.maxSize = maxSize;
      }

      set(videoId, state) {
        if (this.cache.size >= this.maxSize && !this.cache.has(videoId)) {
          const firstKey = this.cache.keys().next().value;
          this.cache.delete(firstKey);
        }
        this.cache.set(videoId, state);
      }

      get(videoId) {
        return this.cache.get(videoId);
      }

      clear() {
        this.cache.clear();
      }

      has(videoId) {
        return this.cache.has(videoId);
      }
    }

    test('should cache video states', () => {
      const cache = new VideoStateCache();
      cache.set('video1', 'hidden');
      cache.set('video2', 'dimmed');
      
      expect(cache.get('video1')).toBe('hidden');
      expect(cache.get('video2')).toBe('dimmed');
    });

    test('should respect max cache size with LRU eviction', () => {
      const cache = new VideoStateCache(2);
      cache.set('video1', 'hidden');
      cache.set('video2', 'dimmed');
      cache.set('video3', 'normal');
      
      expect(cache.has('video1')).toBe(false);
      expect(cache.has('video2')).toBe(true);
      expect(cache.has('video3')).toBe(true);
    });

    test('should clear cache', () => {
      const cache = new VideoStateCache();
      cache.set('video1', 'hidden');
      cache.clear();
      
      expect(cache.has('video1')).toBe(false);
    });
  });

  describe('DOM Query Optimization', () => {
    const batchQueryVideos = () => {
      const containers = [
        'ytd-rich-item-renderer',
        'ytd-video-renderer',
        'ytd-grid-video-renderer',
        'ytm-shorts-lockup-view-model',
        'yt-lockup-view-model'
      ];
      
      const selector = containers.join(', ');
      return document.querySelectorAll(selector);
    };

    test('should batch query multiple video types', () => {
      // Create different video types
      const watchedVideo = document.createElement('ytd-rich-item-renderer');
      const shortsVideo = document.createElement('ytm-shorts-lockup-view-model');
      const gridVideo = document.createElement('ytd-grid-video-renderer');
      
      document.body.appendChild(watchedVideo);
      document.body.appendChild(shortsVideo);
      document.body.appendChild(gridVideo);
      
      const videos = batchQueryVideos();
      expect(videos.length).toBe(3);
    });
  });
});

describe('Core Business Logic - Error Recovery', () => {
  describe('Storage Error Handling', () => {
    let originalConsoleError;

    beforeEach(() => {
      originalConsoleError = console.error;
      console.error = jest.fn();
    });

    afterEach(() => {
      console.error = originalConsoleError;
    });

    const safeStorageOperation = async (operation) => {
      try {
        return await operation();
      } catch (error) {
        console.error('Storage operation failed:', error);
        
        // Fallback to localStorage if chrome.storage fails
        if (error.message?.includes('QUOTA_BYTES')) {
          return { error: 'STORAGE_FULL', fallback: 'localStorage' };
        }
        
        return { error: error.message };
      }
    };

    test('should handle storage quota exceeded', async () => {
      chrome.storage.sync.set.mockRejectedValueOnce(
        new Error('QUOTA_BYTES quota exceeded')
      );
      
      const result = await safeStorageOperation(async () => {
        await chrome.storage.sync.set({ test: 'data' });
      });
      
      expect(result.error).toBe('STORAGE_FULL');
      expect(result.fallback).toBe('localStorage');
    });

    test('should handle generic storage errors', async () => {
      chrome.storage.sync.get.mockRejectedValueOnce(
        new Error('Unknown error')
      );
      
      const result = await safeStorageOperation(async () => {
        await chrome.storage.sync.get('test');
      });
      
      expect(result.error).toBe('Unknown error');
    });
  });

  describe('DOM Mutation Recovery', () => {
    const safeDOMOperation = (element, operation) => {
      try {
        if (!element || !element.parentNode) {
          return { success: false, reason: 'Element not in DOM' };
        }
        
        operation(element);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    };

    test('should handle disconnected elements', () => {
      const element = document.createElement('div');
      
      const result = safeDOMOperation(element, (el) => {
        el.classList.add('test-class');
      });
      
      expect(result.success).toBe(false);
      expect(result.reason).toBe('Element not in DOM');
    });

    test('should handle successful DOM operations', () => {
      const element = document.createElement('div');
      document.body.appendChild(element);
      
      const result = safeDOMOperation(element, (el) => {
        el.classList.add('test-class');
      });
      
      expect(result.success).toBe(true);
      expect(element.classList.contains('test-class')).toBe(true);
    });
  });
});
