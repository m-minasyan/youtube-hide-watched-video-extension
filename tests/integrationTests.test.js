const { STORAGE_KEYS, DEFAULT_SETTINGS, mockChromeStorage } = require('./testUtils');

describe('Integration Tests - Component Communication', () => {
  let storageData;

  beforeEach(() => {
    jest.clearAllMocks();
    storageData = mockChromeStorage();
    
    // Mock chrome.runtime.sendMessage
    chrome.runtime.sendMessage = jest.fn();
    chrome.runtime.onMessage = {
      addListener: jest.fn()
    };
  });

  describe('Background <-> Content Script Communication', () => {
    const simulateMessage = async (message, sender = {}) => {
      const listeners = chrome.runtime.onMessage.addListener.mock.calls;
      if (listeners.length > 0) {
        const handler = listeners[0][0];
        return await handler(message, sender, jest.fn());
      }
      return null;
    };

    test('should handle settings update message', async () => {
      const message = {
        action: 'updateSettings',
        settings: {
          threshold: 75,
          individualMode: 'hidden'
        }
      };

      chrome.runtime.sendMessage(message);
      
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(message);
    });

    test('should handle video state change message', async () => {
      const message = {
        action: 'videoStateChanged',
        videoId: 'abc123',
        state: 'dimmed'
      };

      chrome.runtime.sendMessage(message);
      
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(message);
    });

    test('should handle get settings request', async () => {
      const message = { action: 'getSettings' };
      const expectedResponse = {
        threshold: 10,
        individualMode: 'dimmed',
        theme: 'auto'
      };

      chrome.runtime.sendMessage(message, (response) => {
        expect(response).toEqual(expectedResponse);
      });
    });
  });

  describe('Popup <-> Background Communication', () => {
    test('should sync settings changes from popup to all tabs', async () => {
      const tabs = [
        { id: 1, url: 'https://youtube.com' },
        { id: 2, url: 'https://youtube.com/watch?v=123' }
      ];

      chrome.tabs.query = jest.fn().mockResolvedValue(tabs);
      chrome.tabs.sendMessage = jest.fn();

      const broadcastSettings = async (settings) => {
        const youtubeTabs = await chrome.tabs.query({ url: '*://*.youtube.com/*' });
        
        for (const tab of youtubeTabs) {
          chrome.tabs.sendMessage(tab.id, {
            action: 'settingsUpdated',
            settings
          });
        }
      };

      await broadcastSettings({ threshold: 80 });
      
      expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(2);
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, {
        action: 'settingsUpdated',
        settings: { threshold: 80 }
      });
    });
  });

  describe('Storage Event Synchronization', () => {
    test('should sync storage changes across components', async () => {
      const listeners = [];
      chrome.storage.onChanged = {
        addListener: (callback) => listeners.push(callback)
      };

      const handleStorageChange = (changes, areaName) => {
        if (areaName !== 'sync') return;
        
        const updates = {};
        for (const [key, { newValue }] of Object.entries(changes)) {
          updates[key] = newValue;
        }
        
        return updates;
      };

      chrome.storage.onChanged.addListener(handleStorageChange);
      
      // Simulate storage change
      const changes = {
        [STORAGE_KEYS.THRESHOLD]: { oldValue: 10, newValue: 50 }
      };
      
      const result = listeners[0](changes, 'sync');
      expect(result[STORAGE_KEYS.THRESHOLD]).toBe(50);
    });
  });
});

describe('Integration Tests - Full User Workflows', () => {
  let storageData;

  beforeEach(() => {
    jest.clearAllMocks();
    storageData = mockChromeStorage();
    document.body.innerHTML = '';
  });

  describe('Complete Video Hiding Workflow', () => {
    const completeHidingWorkflow = async () => {
      // Step 1: Load settings
      const settings = await chrome.storage.sync.get(null);
      
      // Step 2: Detect videos
      const videos = document.querySelectorAll('[data-video-id]');
      
      // Step 3: Process each video
      const processedVideos = [];
      for (const video of videos) {
        const videoId = video.dataset.videoId;
        const hasProgress = video.querySelector('.progress-bar') !== null;
        
        if (hasProgress) {
          video.classList.add('YT-HWV-WATCHED-DIMMED');
          processedVideos.push(videoId);
        }
      }
      
      // Step 4: Save state
      await chrome.storage.sync.set({
        processedVideos: processedVideos
      });
      
      return processedVideos;
    };

    test('should complete full hiding workflow', async () => {
      // Setup DOM
      const video1 = document.createElement('div');
      video1.dataset.videoId = 'video1';
      const progress1 = document.createElement('div');
      progress1.className = 'progress-bar';
      video1.appendChild(progress1);
      
      const video2 = document.createElement('div');
      video2.dataset.videoId = 'video2';
      
      document.body.appendChild(video1);
      document.body.appendChild(video2);
      
      const processed = await completeHidingWorkflow();
      
      expect(processed).toEqual(['video1']);
      expect(video1.classList.contains('YT-HWV-WATCHED-DIMMED')).toBe(true);
      expect(video2.classList.contains('YT-HWV-WATCHED-DIMMED')).toBe(false);
    });
  });

  describe('Settings Migration Workflow', () => {
    const migrateSettings = async () => {
      const [syncData, localData] = await Promise.all([
        chrome.storage.sync.get(null),
        chrome.storage.local.get(STORAGE_KEYS.HIDDEN_VIDEOS)
      ]);
      const newData = {};
      const syncHiddenVideos = syncData[STORAGE_KEYS.HIDDEN_VIDEOS] || syncData.hiddenVideos;
      let sourceHiddenVideos = localData[STORAGE_KEYS.HIDDEN_VIDEOS];
      const now = Date.now();
      
      if ((!sourceHiddenVideos || Object.keys(sourceHiddenVideos).length === 0) && syncHiddenVideos) {
        sourceHiddenVideos = syncHiddenVideos;
      }
      
      if (sourceHiddenVideos) {
        const migrated = {};
        Object.entries(sourceHiddenVideos).forEach(([videoId, value]) => {
          if (typeof value === 'string') {
            migrated[videoId] = {
              state: value,
              title: '',
              updatedAt: now
            };
          } else {
            migrated[videoId] = {
              state: value.state,
              title: value.title || '',
              updatedAt: value.updatedAt || now
            };
          }
        });
        newData[STORAGE_KEYS.HIDDEN_VIDEOS] = migrated;
        await chrome.storage.local.set({ [STORAGE_KEYS.HIDDEN_VIDEOS]: migrated });
      } else {
        await chrome.storage.local.set({ [STORAGE_KEYS.HIDDEN_VIDEOS]: {} });
      }
      
      if (syncHiddenVideos) {
        await chrome.storage.sync.remove([STORAGE_KEYS.HIDDEN_VIDEOS, 'hiddenVideos']);
      }
      
      if (!syncData[STORAGE_KEYS.THEME]) {
        newData[STORAGE_KEYS.THEME] = 'auto';
      }
      
      await chrome.storage.sync.set(newData);
      return newData;
    };

    test('should migrate old video format to new format', async () => {
      storageData.local[STORAGE_KEYS.HIDDEN_VIDEOS] = {
        'video1': 'dimmed',
        'video2': 'hidden'
      };
      
      const migrated = await migrateSettings();
      
      expect(migrated[STORAGE_KEYS.HIDDEN_VIDEOS]['video1']).toHaveProperty('state', 'dimmed');
      expect(migrated[STORAGE_KEYS.HIDDEN_VIDEOS]['video1']).toHaveProperty('title', '');
      expect(migrated[STORAGE_KEYS.HIDDEN_VIDEOS]['video1']).toHaveProperty('updatedAt');
    });

    test('should add default theme if missing', async () => {
      const migrated = await migrateSettings();
      expect(migrated[STORAGE_KEYS.THEME]).toBe('auto');
    });
  });

  describe('Multi-Tab Synchronization', () => {
    const syncAcrossTabs = async (change) => {
      const tabs = await chrome.tabs.query({ url: '*://*.youtube.com/*' });
      const messages = [];
      
      for (const tab of tabs) {
        const message = {
          action: 'sync',
          change: change,
          timestamp: Date.now()
        };
        
        chrome.tabs.sendMessage(tab.id, message);
        messages.push({ tabId: tab.id, message });
      }
      
      return messages;
    };

    test('should synchronize changes across multiple tabs', async () => {
      chrome.tabs.query = jest.fn().mockResolvedValue([
        { id: 1, url: 'https://youtube.com' },
        { id: 2, url: 'https://youtube.com/watch' },
        { id: 3, url: 'https://youtube.com/shorts' }
      ]);
      
      chrome.tabs.sendMessage = jest.fn();
      
      const change = { threshold: 90 };
      const messages = await syncAcrossTabs(change);
      
      expect(messages).toHaveLength(3);
      expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(3);
      
      messages.forEach(msg => {
        expect(msg.message).toHaveProperty('action', 'sync');
        expect(msg.message).toHaveProperty('change', change);
        expect(msg.message).toHaveProperty('timestamp');
      });
    });
  });
});
