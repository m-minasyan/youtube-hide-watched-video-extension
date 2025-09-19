const { STORAGE_KEYS, DEFAULT_SETTINGS, mockChromeStorage, createMockVideoElement, setLocation } = require('./testUtils');

describe('Business Logic - Settings Management', () => {
  let storageData;

  beforeEach(() => {
    jest.clearAllMocks();
    storageData = mockChromeStorage();
  });

  describe('Settings Initialization', () => {
    test('should initialize all default settings correctly', async () => {
      const initializeSettings = async () => {
        const defaultData = {
          [STORAGE_KEYS.THRESHOLD]: DEFAULT_SETTINGS.threshold,
          [STORAGE_KEYS.INDIVIDUAL_MODE]: DEFAULT_SETTINGS.individualMode,
          [STORAGE_KEYS.THEME]: DEFAULT_SETTINGS.theme
        };
        
        Object.keys(DEFAULT_SETTINGS.states.watched).forEach(section => {
          defaultData[`${STORAGE_KEYS.WATCHED_STATE}_${section}`] = DEFAULT_SETTINGS.states.watched[section];
        });
        
        Object.keys(DEFAULT_SETTINGS.states.shorts).forEach(section => {
          defaultData[`${STORAGE_KEYS.SHORTS_STATE}_${section}`] = DEFAULT_SETTINGS.states.shorts[section];
        });
        
        await chrome.storage.sync.set(defaultData);
        return defaultData;
      };

      const settings = await initializeSettings();
      
      expect(settings[STORAGE_KEYS.THRESHOLD]).toBe(10);
      expect(settings[STORAGE_KEYS.INDIVIDUAL_MODE]).toBe('dimmed');
      expect(settings[STORAGE_KEYS.THEME]).toBe('auto');
    });

    test('should handle partial settings correctly', async () => {
      storageData.sync[STORAGE_KEYS.THRESHOLD] = 50;
      
      const loadSettings = async () => {
        const result = await chrome.storage.sync.get(null);
        return {
          threshold: result[STORAGE_KEYS.THRESHOLD] || DEFAULT_SETTINGS.threshold,
          individualMode: result[STORAGE_KEYS.INDIVIDUAL_MODE] || DEFAULT_SETTINGS.individualMode
        };
      };
      
      const settings = await loadSettings();
      expect(settings.threshold).toBe(50);
      expect(settings.individualMode).toBe('dimmed');
    });
  });

  describe('Settings Reset', () => {
    test('should reset all settings to defaults', async () => {
      storageData.sync[STORAGE_KEYS.THRESHOLD] = 75;
      storageData.sync[STORAGE_KEYS.INDIVIDUAL_MODE] = 'hidden';
      
      const resetSettings = async () => {
        await chrome.storage.sync.clear();
        const defaultData = {
          [STORAGE_KEYS.THRESHOLD]: DEFAULT_SETTINGS.threshold,
          [STORAGE_KEYS.INDIVIDUAL_MODE]: DEFAULT_SETTINGS.individualMode
        };
        await chrome.storage.sync.set(defaultData);
        return await chrome.storage.sync.get(null);
      };
      
      const settings = await resetSettings();
      expect(settings[STORAGE_KEYS.THRESHOLD]).toBe(10);
      expect(settings[STORAGE_KEYS.INDIVIDUAL_MODE]).toBe('dimmed');
    });
  });
});

describe('Business Logic - Video Detection', () => {
  describe('Watched Video Detection', () => {
    const detectWatchedVideos = (threshold = 10) => {
      const progressBars = document.querySelectorAll('.ytd-thumbnail-overlay-resume-playback-progress-renderer');
      const watched = [];
      
      progressBars.forEach(bar => {
        const width = parseInt(bar.style.width, 10);
        if (width >= threshold) {
          const container = bar.closest('.video-container');
          if (container) watched.push(container);
        }
      });
      
      return watched;
    };

    beforeEach(() => {
      document.body.innerHTML = '';
    });

    test('should detect videos with progress above threshold', () => {
      const container = document.createElement('div');
      container.className = 'video-container';
      const progressBar = document.createElement('div');
      progressBar.className = 'ytd-thumbnail-overlay-resume-playback-progress-renderer';
      progressBar.style.width = '50%';
      container.appendChild(progressBar);
      document.body.appendChild(container);
      
      const watched = detectWatchedVideos(10);
      expect(watched.length).toBe(1);
    });

    test('should ignore videos below threshold', () => {
      const container = document.createElement('div');
      container.className = 'video-container';
      const progressBar = document.createElement('div');
      progressBar.className = 'ytd-thumbnail-overlay-resume-playback-progress-renderer';
      progressBar.style.width = '5%';
      container.appendChild(progressBar);
      document.body.appendChild(container);
      
      const watched = detectWatchedVideos(10);
      expect(watched.length).toBe(0);
    });

    test('should handle different threshold values', () => {
      const container = document.createElement('div');
      container.className = 'video-container';
      const progressBar = document.createElement('div');
      progressBar.className = 'ytd-thumbnail-overlay-resume-playback-progress-renderer';
      progressBar.style.width = '30%';
      container.appendChild(progressBar);
      document.body.appendChild(container);
      
      expect(detectWatchedVideos(20).length).toBe(1);
      expect(detectWatchedVideos(40).length).toBe(0);
    });
  });

  describe('Shorts Detection', () => {
    const detectShorts = () => {
      const shorts = [];
      const links = document.querySelectorAll('a[href*="/shorts/"]');
      links.forEach(link => {
        const container = link.closest('.video-container');
        if (container && !shorts.includes(container)) {
          shorts.push(container);
        }
      });
      return shorts;
    };

    test('should detect shorts videos', () => {
      document.body.innerHTML = '';
      const container = document.createElement('div');
      container.className = 'video-container';
      const link = document.createElement('a');
      link.href = '/shorts/abc123';
      container.appendChild(link);
      document.body.appendChild(container);
      
      const shorts = detectShorts();
      expect(shorts.length).toBe(1);
    });

    test('should not detect regular videos as shorts', () => {
      document.body.innerHTML = '';
      const container = document.createElement('div');
      container.className = 'video-container';
      const link = document.createElement('a');
      link.href = '/watch?v=abc123';
      container.appendChild(link);
      document.body.appendChild(container);
      
      const shorts = detectShorts();
      expect(shorts.length).toBe(0);
    });
  });
});

describe('Business Logic - Hiding/Dimming States', () => {
  describe('State Transitions', () => {
    const transitionState = (currentState, individualMode = 'dimmed') => {
      const states = ['normal', individualMode];
      const currentIndex = states.indexOf(currentState);
      const nextIndex = (currentIndex + 1) % states.length;
      return states[nextIndex];
    };

    test('should transition from normal to dimmed', () => {
      expect(transitionState('normal', 'dimmed')).toBe('dimmed');
    });

    test('should transition from dimmed to normal', () => {
      expect(transitionState('dimmed', 'dimmed')).toBe('normal');
    });

    test('should transition from normal to hidden when mode is hidden', () => {
      expect(transitionState('normal', 'hidden')).toBe('hidden');
    });

    test('should handle invalid states gracefully', () => {
      expect(transitionState('invalid', 'dimmed')).toBe('normal');
    });
  });

  describe('Section-Specific Hiding', () => {
    const applyHidingForSection = (section, state) => {
      const sectionMap = {
        'watch': '.watch-page-video',
        'subscriptions': '.subscriptions-video',
        'channel': '.channel-video',
        'misc': '.misc-video'
      };
      
      const selector = sectionMap[section] || '.misc-video';
      const elements = document.querySelectorAll(selector);
      
      elements.forEach(el => {
        el.classList.remove('YT-HWV-WATCHED-DIMMED', 'YT-HWV-WATCHED-HIDDEN');
        if (state === 'dimmed') {
          el.classList.add('YT-HWV-WATCHED-DIMMED');
        } else if (state === 'hidden') {
          el.classList.add('YT-HWV-WATCHED-HIDDEN');
        }
      });
      
      return elements.length;
    };

    beforeEach(() => {
      document.body.innerHTML = `
        <div class="watch-page-video"></div>
        <div class="subscriptions-video"></div>
        <div class="channel-video"></div>
        <div class="misc-video"></div>
      `;
    });

    test('should apply dimmed state to specific section', () => {
      const count = applyHidingForSection('watch', 'dimmed');
      expect(count).toBe(1);
      expect(document.querySelector('.watch-page-video').classList.contains('YT-HWV-WATCHED-DIMMED')).toBe(true);
    });

    test('should apply hidden state to specific section', () => {
      const count = applyHidingForSection('subscriptions', 'hidden');
      expect(count).toBe(1);
      expect(document.querySelector('.subscriptions-video').classList.contains('YT-HWV-WATCHED-HIDDEN')).toBe(true);
    });

    test('should remove previous states when applying new state', () => {
      const video = document.querySelector('.watch-page-video');
      video.classList.add('YT-HWV-WATCHED-HIDDEN');
      
      applyHidingForSection('watch', 'dimmed');
      
      expect(video.classList.contains('YT-HWV-WATCHED-HIDDEN')).toBe(false);
      expect(video.classList.contains('YT-HWV-WATCHED-DIMMED')).toBe(true);
    });
  });
});

describe('Business Logic - Individual Video Management', () => {
  let storageData;

  beforeEach(() => {
    jest.clearAllMocks();
    storageData = mockChromeStorage();
  });

  describe('Individual Video State Management', () => {
    const saveHiddenVideo = async (videoId, state, title = null) => {
      if (!videoId) return;
      
      const result = await chrome.storage.local.get(STORAGE_KEYS.HIDDEN_VIDEOS);
      const hiddenVideos = result[STORAGE_KEYS.HIDDEN_VIDEOS] || {};
      
      if (state === 'normal') {
        delete hiddenVideos[videoId];
      } else {
        hiddenVideos[videoId] = {
          state: state,
          title: title || hiddenVideos[videoId]?.title || ''
        };
      }
      
      await chrome.storage.local.set({ [STORAGE_KEYS.HIDDEN_VIDEOS]: hiddenVideos });
      return hiddenVideos;
    };

    test('should save video with dimmed state', async () => {
      const result = await saveHiddenVideo('video123', 'dimmed', 'Test Video');
      
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        [STORAGE_KEYS.HIDDEN_VIDEOS]: {
          'video123': { state: 'dimmed', title: 'Test Video' }
        }
      });
    });

    test('should save video with hidden state', async () => {
      const result = await saveHiddenVideo('video456', 'hidden', 'Another Video');
      
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        [STORAGE_KEYS.HIDDEN_VIDEOS]: {
          'video456': { state: 'hidden', title: 'Another Video' }
        }
      });
    });

    test('should remove video when state is normal', async () => {
      storageData.local[STORAGE_KEYS.HIDDEN_VIDEOS] = {
        'video789': { state: 'hidden', title: 'Old Video' }
      };
      
      await saveHiddenVideo('video789', 'normal');
      
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        [STORAGE_KEYS.HIDDEN_VIDEOS]: {}
      });
    });

    test('should preserve title when updating state', async () => {
      storageData.local[STORAGE_KEYS.HIDDEN_VIDEOS] = {
        'video111': { state: 'dimmed', title: 'Preserved Title' }
      };
      
      await saveHiddenVideo('video111', 'hidden');
      
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        [STORAGE_KEYS.HIDDEN_VIDEOS]: {
          'video111': { state: 'hidden', title: 'Preserved Title' }
        }
      });
    });

    test('should not save if videoId is null', async () => {
      await saveHiddenVideo(null, 'hidden');
      expect(chrome.storage.local.set).not.toHaveBeenCalled();
    });
  });
});
