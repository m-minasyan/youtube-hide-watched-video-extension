const { STORAGE_KEYS, mockChromeStorage, setLocation } = require('./testUtils');

describe('Business Logic - Message Passing', () => {
  let messageHandlers = {};

  beforeEach(() => {
    jest.clearAllMocks();
    messageHandlers = {};
    
    chrome.runtime.onMessage.addListener.mockImplementation((handler) => {
      messageHandlers.runtime = handler;
    });
    
    chrome.tabs.sendMessage.mockImplementation(() => Promise.resolve());
  });

  describe('Settings Update Communication', () => {
    const setupMessageHandler = () => {
      const handler = (request, sender, sendResponse) => {
        if (request.action === 'settingsUpdated') {
          return { success: true, key: request.key, value: request.value };
        }
        if (request.action === 'resetSettings') {
          return { success: true, reset: true };
        }
        return { success: false };
      };
      messageHandlers.runtime = handler;
      return handler;
    };

    test('should handle settings update message', () => {
      setupMessageHandler();
      
      const response = messageHandlers.runtime(
        { action: 'settingsUpdated', key: STORAGE_KEYS.THRESHOLD, value: 50 },
        {},
        jest.fn()
      );
      
      expect(response.success).toBe(true);
      expect(response.key).toBe(STORAGE_KEYS.THRESHOLD);
      expect(response.value).toBe(50);
    });

    test('should handle reset settings message', () => {
      setupMessageHandler();
      
      const response = messageHandlers.runtime(
        { action: 'resetSettings' },
        {},
        jest.fn()
      );
      
      expect(response.success).toBe(true);
      expect(response.reset).toBe(true);
    });

    test('should broadcast settings to all YouTube tabs', async () => {
      const tabs = [
        { id: 1, url: 'https://www.youtube.com/watch?v=test' },
        { id: 2, url: 'https://www.youtube.com/feed/subscriptions' },
        { id: 3, url: 'https://www.google.com' }
      ];
      
      chrome.tabs.query.mockResolvedValue(tabs.filter(tab => tab.url.includes('youtube.com')));
      
      const broadcastSettings = async (key, value) => {
        const youtubeTabs = await chrome.tabs.query({ url: '*://*.youtube.com/*' });
        youtubeTabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {
            action: 'settingsUpdated',
            key: key,
            value: value
          });
        });
      };
      
      await broadcastSettings(STORAGE_KEYS.THRESHOLD, 75);
      
      expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(2);
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, {
        action: 'settingsUpdated',
        key: STORAGE_KEYS.THRESHOLD,
        value: 75
      });
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(2, {
        action: 'settingsUpdated',
        key: STORAGE_KEYS.THRESHOLD,
        value: 75
      });
    });
  });

  describe('Page Update Messages', () => {
    test('should send page update message to tab', () => {
      const sendPageUpdate = (tabId) => {
        chrome.tabs.sendMessage(tabId, { action: 'pageUpdated' });
      };
      
      sendPageUpdate(123);
      
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(123, { action: 'pageUpdated' });
    });

    test('should handle tab update for YouTube URLs', () => {
      let onTabUpdatedHandler;
      chrome.tabs.onUpdated.addListener.mockImplementation((handler) => {
        onTabUpdatedHandler = handler;
      });
      
      const setupTabUpdateHandler = () => {
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
          if (changeInfo.status === 'complete' && tab.url && tab.url.includes('youtube.com')) {
            chrome.tabs.sendMessage(tabId, { action: 'pageUpdated' });
          }
        });
      };
      
      setupTabUpdateHandler();
      
      onTabUpdatedHandler(456, { status: 'complete' }, { url: 'https://www.youtube.com/watch?v=test' });
      
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(456, { action: 'pageUpdated' });
    });

    test('should not send message for non-YouTube URLs', () => {
      let onTabUpdatedHandler;
      chrome.tabs.onUpdated.addListener.mockImplementation((handler) => {
        onTabUpdatedHandler = handler;
      });
      
      const setupTabUpdateHandler = () => {
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
          if (changeInfo.status === 'complete' && tab.url && tab.url.includes('youtube.com')) {
            chrome.tabs.sendMessage(tabId, { action: 'pageUpdated' });
          }
        });
      };
      
      setupTabUpdateHandler();
      
      onTabUpdatedHandler(789, { status: 'complete' }, { url: 'https://www.google.com' });
      
      expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
    });
  });
});

describe('Business Logic - URL Section Detection', () => {
  const determineYoutubeSection = () => {
    const { href } = window.location;
    
    if (href.includes('/watch?')) return 'watch';
    if (href.match(/.*\/(user|channel|c)\/.+\/videos/u) || href.match(/.*\/@.*/u)) return 'channel';
    if (href.includes('/feed/subscriptions')) return 'subscriptions';
    if (href.includes('/feed/trending')) return 'trending';
    if (href.includes('/playlist?')) return 'playlist';
    
    return 'misc';
  };

  describe('Page Type Detection', () => {
    test('should detect watch page', () => {
      setLocation('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(determineYoutubeSection()).toBe('watch');
      
      setLocation('https://www.youtube.com/watch?v=test&list=PLtest');
      expect(determineYoutubeSection()).toBe('watch');
    });

    test('should detect channel pages', () => {
      setLocation('https://www.youtube.com/@MrBeast');
      expect(determineYoutubeSection()).toBe('channel');
      
      setLocation('https://www.youtube.com/channel/UCX6OQ3DkcsbYNE6H8uQQuVA/videos');
      expect(determineYoutubeSection()).toBe('channel');
      
      setLocation('https://www.youtube.com/c/MrBeast6000/videos');
      expect(determineYoutubeSection()).toBe('channel');
      
      setLocation('https://www.youtube.com/user/PewDiePie/videos');
      expect(determineYoutubeSection()).toBe('channel');
    });

    test('should detect subscriptions feed', () => {
      setLocation('https://www.youtube.com/feed/subscriptions');
      expect(determineYoutubeSection()).toBe('subscriptions');
      
      setLocation('https://www.youtube.com/feed/subscriptions?flow=1');
      expect(determineYoutubeSection()).toBe('subscriptions');
    });

    test('should detect trending page', () => {
      setLocation('https://www.youtube.com/feed/trending');
      expect(determineYoutubeSection()).toBe('trending');
      
      setLocation('https://www.youtube.com/feed/trending?bp=test');
      expect(determineYoutubeSection()).toBe('trending');
    });

    test('should detect playlist page', () => {
      setLocation('https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf');
      expect(determineYoutubeSection()).toBe('playlist');
      
      setLocation('https://www.youtube.com/playlist?list=WL');
      expect(determineYoutubeSection()).toBe('playlist');
    });

    test('should return misc for homepage', () => {
      setLocation('https://www.youtube.com/');
      expect(determineYoutubeSection()).toBe('misc');
      
      setLocation('https://www.youtube.com');
      expect(determineYoutubeSection()).toBe('misc');
    });

    test('should return misc for search results', () => {
      setLocation('https://www.youtube.com/results?search_query=javascript+tutorial');
      expect(determineYoutubeSection()).toBe('misc');
    });

    test('should return misc for other YouTube pages', () => {
      setLocation('https://www.youtube.com/feed/library');
      expect(determineYoutubeSection()).toBe('misc');
      
      setLocation('https://www.youtube.com/feed/history');
      expect(determineYoutubeSection()).toBe('misc');
      
      setLocation('https://www.youtube.com/gaming');
      expect(determineYoutubeSection()).toBe('misc');
    });
  });

  describe('Section-Based Behavior', () => {
    const getSectionSettings = (section, settings) => {
      const watchedKey = `${STORAGE_KEYS.WATCHED_STATE}_${section}`;
      const shortsKey = `${STORAGE_KEYS.SHORTS_STATE}_${section}`;
      
      return {
        watchedState: settings[watchedKey] || 'normal',
        shortsState: section !== 'playlist' ? (settings[shortsKey] || 'normal') : null
      };
    };

    test('should get correct settings for watch section', () => {
      const settings = {
        [`${STORAGE_KEYS.WATCHED_STATE}_watch`]: 'hidden',
        [`${STORAGE_KEYS.SHORTS_STATE}_watch`]: 'dimmed'
      };
      
      const sectionSettings = getSectionSettings('watch', settings);
      
      expect(sectionSettings.watchedState).toBe('hidden');
      expect(sectionSettings.shortsState).toBe('dimmed');
    });

    test('should get correct settings for playlist section', () => {
      const settings = {
        [`${STORAGE_KEYS.WATCHED_STATE}_playlist`]: 'dimmed'
      };
      
      const sectionSettings = getSectionSettings('playlist', settings);
      
      expect(sectionSettings.watchedState).toBe('dimmed');
      expect(sectionSettings.shortsState).toBeNull();
    });

    test('should use default values when settings not found', () => {
      const sectionSettings = getSectionSettings('misc', {});
      
      expect(sectionSettings.watchedState).toBe('normal');
      expect(sectionSettings.shortsState).toBe('normal');
    });
  });
});

describe('Business Logic - Data Migration', () => {
  let storageData;

  beforeEach(() => {
    jest.clearAllMocks();
    storageData = mockChromeStorage();
  });

  describe('Hidden Videos Format Migration', () => {
    const migrateHiddenVideos = async () => {
      const result = await chrome.storage.local.get(STORAGE_KEYS.HIDDEN_VIDEOS);
      let hiddenVideos = result[STORAGE_KEYS.HIDDEN_VIDEOS] || {};
      let needsMigration = false;
      
      Object.entries(hiddenVideos).forEach(([videoId, data]) => {
        if (typeof data === 'string') {
          hiddenVideos[videoId] = {
            state: data,
            title: ''
          };
          needsMigration = true;
        }
      });
      
      if (needsMigration) {
        await chrome.storage.local.set({ [STORAGE_KEYS.HIDDEN_VIDEOS]: hiddenVideos });
      }
      
      return { hiddenVideos, migrated: needsMigration };
    };

    test('should migrate string format to object format', async () => {
      storageData.local[STORAGE_KEYS.HIDDEN_VIDEOS] = {
        'abc123': 'hidden',
        'def456': 'dimmed'
      };
      
      const result = await migrateHiddenVideos();
      
      expect(result.migrated).toBe(true);
      expect(result.hiddenVideos['abc123']).toEqual({ state: 'hidden', title: '' });
      expect(result.hiddenVideos['def456']).toEqual({ state: 'dimmed', title: '' });
    });

    test('should not migrate if already in new format', async () => {
      storageData.local[STORAGE_KEYS.HIDDEN_VIDEOS] = {
        'abc123': { state: 'hidden', title: 'Video Title' }
      };
      
      const result = await migrateHiddenVideos();
      
      expect(result.migrated).toBe(false);
      expect(chrome.storage.local.set).not.toHaveBeenCalled();
    });

    test('should handle mixed formats correctly', async () => {
      storageData.local[STORAGE_KEYS.HIDDEN_VIDEOS] = {
        'abc123': 'hidden',
        'def456': { state: 'dimmed', title: 'Existing Title' },
        'ghi789': 'dimmed'
      };
      
      const result = await migrateHiddenVideos();
      
      expect(result.migrated).toBe(true);
      expect(result.hiddenVideos['abc123']).toEqual({ state: 'hidden', title: '' });
      expect(result.hiddenVideos['def456']).toEqual({ state: 'dimmed', title: 'Existing Title' });
      expect(result.hiddenVideos['ghi789']).toEqual({ state: 'dimmed', title: '' });
    });

    test('should handle empty hidden videos', async () => {
      storageData.local[STORAGE_KEYS.HIDDEN_VIDEOS] = {};
      
      const result = await migrateHiddenVideos();
      
      expect(result.migrated).toBe(false);
      expect(result.hiddenVideos).toEqual({});
    });

    test('should handle missing hidden videos key', async () => {
      const result = await migrateHiddenVideos();
      
      expect(result.migrated).toBe(false);
      expect(result.hiddenVideos).toEqual({});
    });
  });
});
