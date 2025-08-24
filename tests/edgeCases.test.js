const { STORAGE_KEYS, DEFAULT_SETTINGS, mockChromeStorage, createMockVideoElement } = require('./testUtils');

describe('Edge Cases and Complex Scenarios', () => {
  let storageData;

  beforeEach(() => {
    jest.clearAllMocks();
    storageData = mockChromeStorage();
    document.body.innerHTML = '';
  });

  describe('Concurrent Operations', () => {
    test('should handle multiple simultaneous storage operations', async () => {
      const operations = [
        chrome.storage.sync.set({ [STORAGE_KEYS.THRESHOLD]: 50 }),
        chrome.storage.sync.set({ [STORAGE_KEYS.INDIVIDUAL_MODE]: 'hidden' }),
        chrome.storage.sync.set({ [STORAGE_KEYS.THEME]: 'dark' })
      ];
      
      await Promise.all(operations);
      
      const result = await chrome.storage.sync.get(null);
      expect(result[STORAGE_KEYS.THRESHOLD]).toBe(50);
      expect(result[STORAGE_KEYS.INDIVIDUAL_MODE]).toBe('hidden');
      expect(result[STORAGE_KEYS.THEME]).toBe('dark');
    });

    test('should handle race conditions in video processing', async () => {
      const processVideo = async (videoId, delay) => {
        await new Promise(resolve => setTimeout(resolve, delay));
        
        const current = await chrome.storage.sync.get(STORAGE_KEYS.HIDDEN_VIDEOS);
        const videos = current[STORAGE_KEYS.HIDDEN_VIDEOS] || {};
        
        videos[videoId] = {
          state: 'dimmed',
          timestamp: Date.now()
        };
        
        await chrome.storage.sync.set({ [STORAGE_KEYS.HIDDEN_VIDEOS]: videos });
        return videos;
      };
      
      const results = await Promise.all([
        processVideo('video1', 10),
        processVideo('video2', 5),
        processVideo('video3', 15)
      ]);
      
      const finalResult = results[results.length - 1];
      expect(Object.keys(finalResult)).toHaveLength(3);
    });
  });

  describe('Large Data Handling', () => {
    test('should handle large number of hidden videos', async () => {
      const largeVideoSet = {};
      for (let i = 0; i < 1000; i++) {
        largeVideoSet[`video${i}`] = {
          state: i % 2 === 0 ? 'dimmed' : 'hidden',
          title: `Test Video ${i}`,
          timestamp: Date.now()
        };
      }
      
      await chrome.storage.sync.set({ [STORAGE_KEYS.HIDDEN_VIDEOS]: largeVideoSet });
      const result = await chrome.storage.sync.get(STORAGE_KEYS.HIDDEN_VIDEOS);
      
      expect(Object.keys(result[STORAGE_KEYS.HIDDEN_VIDEOS])).toHaveLength(1000);
    });

    test('should efficiently filter large video lists', () => {
      const videos = [];
      for (let i = 0; i < 500; i++) {
        const video = createMockVideoElement({
          videoId: `video${i}`,
          hasProgressBar: i % 3 === 0
        });
        videos.push(video);
      }
      
      const watchedVideos = videos.filter(v => 
        v.querySelector('.ytd-thumbnail-overlay-resume-playback-progress-renderer')
      );
      
      expect(watchedVideos.length).toBeGreaterThan(150);
    });
  });

  describe('DOM Mutation Edge Cases', () => {
    test('should handle rapid DOM changes', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      
      const mutations = [];
      for (let i = 0; i < 100; i++) {
        const video = createMockVideoElement({ videoId: `rapid${i}` });
        container.appendChild(video);
        mutations.push(video);
        
        if (i % 10 === 0 && mutations.length > 0) {
          // Safely remove a random element that is still a child of container
          const existingChildren = Array.from(container.children);
          if (existingChildren.length > 0) {
            const randomIndex = Math.floor(Math.random() * existingChildren.length);
            container.removeChild(existingChildren[randomIndex]);
          }
        }
      }
      
      const remainingVideos = container.querySelectorAll('[class*="renderer"]');
      expect(remainingVideos.length).toBeLessThan(100);
      expect(remainingVideos.length).toBeGreaterThan(0);
    });

    test('should handle nested video containers', () => {
      const parent = document.createElement('div');
      const wrapper = document.createElement('div');
      const video = createMockVideoElement({ videoId: 'nested' });
      
      parent.appendChild(wrapper);
      wrapper.appendChild(video);
      document.body.appendChild(parent);
      
      const foundVideo = document.querySelector('a[href*="/watch"]')?.closest('[class*="renderer"]');
      expect(foundVideo).toBeTruthy();
    });
  });
});

describe('Error Recovery and Resilience', () => {
  let storageData;

  beforeEach(() => {
    jest.clearAllMocks();
    storageData = mockChromeStorage();
  });

  describe('Network and Storage Failures', () => {
    test('should gracefully handle storage quota exceeded', async () => {
      const handleStorageError = async (data) => {
        try {
          await chrome.storage.sync.set(data);
          return { success: true };
        } catch (error) {
          if (error.message.includes('QUOTA_BYTES')) {
            // Fallback: Remove old entries
            const current = await chrome.storage.sync.get(STORAGE_KEYS.HIDDEN_VIDEOS);
            const videos = current[STORAGE_KEYS.HIDDEN_VIDEOS] || {};
            
            // Remove oldest 25% of videos
            const sorted = Object.entries(videos).sort((a, b) => 
              (a[1].timestamp || 0) - (b[1].timestamp || 0)
            );
            
            const toRemove = Math.floor(sorted.length * 0.25);
            for (let i = 0; i < toRemove; i++) {
              delete videos[sorted[i][0]];
            }
            
            await chrome.storage.sync.set({ [STORAGE_KEYS.HIDDEN_VIDEOS]: videos });
            return { success: true, cleaned: toRemove };
          }
          return { success: false, error: error.message };
        }
      };
      
      chrome.storage.sync.set.mockRejectedValueOnce(
        new Error('QUOTA_BYTES quota exceeded')
      );
      
      storageData[STORAGE_KEYS.HIDDEN_VIDEOS] = {
        'old1': { state: 'hidden', timestamp: 1000 },
        'old2': { state: 'dimmed', timestamp: 2000 },
        'new1': { state: 'hidden', timestamp: 9000 },
        'new2': { state: 'dimmed', timestamp: 10000 }
      };
      
      const result = await handleStorageError({ test: 'data' });
      expect(result.success).toBe(true);
      expect(result.cleaned).toBe(1);
    });

    test('should handle corrupted storage data', async () => {
      const loadSafeSettings = async () => {
        try {
          const data = await chrome.storage.sync.get(null);
          
          // Validate data structure
          const validated = {};
          
          // Validate threshold
          const threshold = parseInt(data[STORAGE_KEYS.THRESHOLD], 10);
          validated.threshold = (threshold >= 0 && threshold <= 100) ? threshold : DEFAULT_SETTINGS.threshold;
          
          // Validate individual mode
          const validModes = ['normal', 'dimmed', 'hidden'];
          validated.individualMode = validModes.includes(data[STORAGE_KEYS.INDIVIDUAL_MODE]) 
            ? data[STORAGE_KEYS.INDIVIDUAL_MODE] 
            : DEFAULT_SETTINGS.individualMode;
          
          // Validate hidden videos
          if (typeof data[STORAGE_KEYS.HIDDEN_VIDEOS] === 'object') {
            validated.hiddenVideos = data[STORAGE_KEYS.HIDDEN_VIDEOS];
          } else {
            validated.hiddenVideos = {};
          }
          
          return validated;
        } catch (error) {
          return DEFAULT_SETTINGS;
        }
      };
      
      storageData[STORAGE_KEYS.THRESHOLD] = 'invalid';
      storageData[STORAGE_KEYS.INDIVIDUAL_MODE] = 'corrupted';
      storageData[STORAGE_KEYS.HIDDEN_VIDEOS] = 'not an object';
      
      const settings = await loadSafeSettings();
      
      expect(settings.threshold).toBe(DEFAULT_SETTINGS.threshold);
      expect(settings.individualMode).toBe(DEFAULT_SETTINGS.individualMode);
      expect(settings.hiddenVideos).toEqual({});
    });
  });

  describe('DOM Integrity Issues', () => {
    test('should handle malformed video elements', () => {
      const processVideoSafely = (element) => {
        try {
          if (!element || !element.nodeType) {
            return { processed: false, reason: 'Invalid element' };
          }
          
          const videoId = element.querySelector('a[href*="/watch"]')?.href?.match(/v=([^&]+)/)?.[1];
          if (!videoId) {
            return { processed: false, reason: 'No video ID found' };
          }
          
          element.classList.add('processed');
          return { processed: true, videoId };
        } catch (error) {
          return { processed: false, error: error.message };
        }
      };
      
      // Test with null
      expect(processVideoSafely(null).processed).toBe(false);
      
      // Test with malformed element
      const badElement = document.createElement('div');
      expect(processVideoSafely(badElement).processed).toBe(false);
      
      // Test with valid element
      const goodElement = createMockVideoElement({ videoId: 'test123' });
      document.body.appendChild(goodElement);
      
      const result = processVideoSafely(goodElement);
      expect(result.processed).toBe(true);
      expect(result.videoId).toBe('test123');
    });

    test('should recover from detached DOM nodes', () => {
      const element = createMockVideoElement({ videoId: 'detached' });
      document.body.appendChild(element);
      
      // Store reference
      const elementRef = element;
      
      // Remove from DOM
      element.remove();
      
      // Try to operate on detached node
      const safeOperation = () => {
        try {
          if (!elementRef.isConnected) {
            return { success: false, reason: 'Element not connected to DOM' };
          }
          elementRef.classList.add('test');
          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      };
      
      const result = safeOperation();
      expect(result.success).toBe(false);
      expect(result.reason).toBe('Element not connected to DOM');
    });
  });

  describe('Timing and Async Issues', () => {
    test('should handle timeout scenarios', async () => {
      const fetchWithTimeout = async (operation, timeout = 1000) => {
        return Promise.race([
          operation(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Operation timed out')), timeout)
          )
        ]);
      };
      
      const slowOperation = () => new Promise(resolve => 
        setTimeout(() => resolve('done'), 2000)
      );
      
      await expect(fetchWithTimeout(slowOperation, 100)).rejects.toThrow('Operation timed out');
    });
  });
});
