/**
 * Integration tests for shared constants across extension contexts
 */

import { STORAGE_KEYS, DEFAULT_SETTINGS, HIDDEN_VIDEO_MESSAGES } from '../shared/constants.js';

describe('Constants Integration Tests', () => {
  beforeEach(() => {
    // Reset chrome mock before each test
    global.chrome = {
      storage: {
        sync: {
          get: jest.fn(),
          set: jest.fn(),
        },
      },
      runtime: {
        sendMessage: jest.fn(),
      },
    };
  });

  describe('Storage Keys Integration', () => {
    test('storage keys work with chrome.storage.sync.get', async () => {
      const mockData = {
        [STORAGE_KEYS.THRESHOLD]: 20,
        [STORAGE_KEYS.THEME]: 'dark',
      };

      global.chrome.storage.sync.get.mockImplementation((keys) => {
        return Promise.resolve(mockData);
      });

      const result = await chrome.storage.sync.get([
        STORAGE_KEYS.THRESHOLD,
        STORAGE_KEYS.THEME,
      ]);

      expect(result[STORAGE_KEYS.THRESHOLD]).toBe(20);
      expect(result[STORAGE_KEYS.THEME]).toBe('dark');
    });

    test('storage keys work with chrome.storage.sync.set', async () => {
      global.chrome.storage.sync.set.mockImplementation((data) => {
        return Promise.resolve();
      });

      const data = {
        [STORAGE_KEYS.THRESHOLD]: DEFAULT_SETTINGS.threshold,
        [STORAGE_KEYS.THEME]: DEFAULT_SETTINGS.theme,
      };

      await chrome.storage.sync.set(data);

      expect(global.chrome.storage.sync.set).toHaveBeenCalledWith(data);
    });

    test('watched state keys can be constructed dynamically', () => {
      const section = 'subscriptions';
      const key = `${STORAGE_KEYS.WATCHED_STATE}_${section}`;

      expect(key).toBe('YTHWV_STATE_subscriptions');
    });

    test('shorts state keys can be constructed dynamically', () => {
      const section = 'channel';
      const key = `${STORAGE_KEYS.SHORTS_STATE}_${section}`;

      expect(key).toBe('YTHWV_STATE_SHORTS_channel');
    });
  });

  describe('Default Settings Integration', () => {
    test('default settings can be used to initialize storage', async () => {
      const defaultData = {
        [STORAGE_KEYS.THRESHOLD]: DEFAULT_SETTINGS.threshold,
        [STORAGE_KEYS.THEME]: DEFAULT_SETTINGS.theme,
        [STORAGE_KEYS.INDIVIDUAL_MODE]: DEFAULT_SETTINGS.individualMode,
        [STORAGE_KEYS.INDIVIDUAL_MODE_ENABLED]: DEFAULT_SETTINGS.individualModeEnabled,
      };

      Object.keys(DEFAULT_SETTINGS.states.watched).forEach((section) => {
        defaultData[`${STORAGE_KEYS.WATCHED_STATE}_${section}`] =
          DEFAULT_SETTINGS.states.watched[section];
      });

      expect(defaultData[STORAGE_KEYS.THRESHOLD]).toBe(10);
      expect(defaultData['YTHWV_STATE_misc']).toBe('normal');
      expect(defaultData['YTHWV_STATE_subscriptions']).toBe('normal');
    });

    test('default settings cover all watched sections', () => {
      const expectedSections = ['misc', 'subscriptions', 'channel', 'watch', 'trending', 'playlist'];
      const actualSections = Object.keys(DEFAULT_SETTINGS.states.watched);

      expectedSections.forEach(section => {
        expect(actualSections).toContain(section);
      });
    });

    test('default settings cover all shorts sections', () => {
      const expectedSections = ['misc', 'subscriptions', 'channel', 'watch', 'trending'];
      const actualSections = Object.keys(DEFAULT_SETTINGS.states.shorts);

      expectedSections.forEach(section => {
        expect(actualSections).toContain(section);
      });
    });
  });

  describe('Message Types Integration', () => {
    test('message types work with chrome.runtime.sendMessage', async () => {
      global.chrome.runtime.sendMessage.mockImplementation((message) => {
        return Promise.resolve({ ok: true, result: [] });
      });

      await chrome.runtime.sendMessage({
        type: HIDDEN_VIDEO_MESSAGES.GET_PAGE,
        cursor: null,
        limit: 12,
      });

      expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'HIDDEN_VIDEOS_GET_PAGE',
        cursor: null,
        limit: 12,
      });
    });

    test('all message types can be used in message handlers', () => {
      const messageHandler = (message) => {
        switch (message.type) {
          case HIDDEN_VIDEO_MESSAGES.GET_MANY:
            return { action: 'get_many' };
          case HIDDEN_VIDEO_MESSAGES.GET_PAGE:
            return { action: 'get_page' };
          case HIDDEN_VIDEO_MESSAGES.GET_STATS:
            return { action: 'get_stats' };
          case HIDDEN_VIDEO_MESSAGES.SET_STATE:
            return { action: 'set_state' };
          case HIDDEN_VIDEO_MESSAGES.CLEAR_ALL:
            return { action: 'clear_all' };
          default:
            return { action: 'unknown' };
        }
      };

      expect(messageHandler({ type: HIDDEN_VIDEO_MESSAGES.GET_PAGE }).action).toBe('get_page');
      expect(messageHandler({ type: HIDDEN_VIDEO_MESSAGES.GET_STATS }).action).toBe('get_stats');
      expect(messageHandler({ type: HIDDEN_VIDEO_MESSAGES.CLEAR_ALL }).action).toBe('clear_all');
    });
  });

  describe('Cross-Context Consistency', () => {
    test('popup and background use same storage keys', () => {
      // Simulate popup reading a value set by background
      const backgroundSavedData = {
        [STORAGE_KEYS.THRESHOLD]: 25,
      };

      global.chrome.storage.sync.get.mockImplementation(() => {
        return Promise.resolve(backgroundSavedData);
      });

      // Popup reads the same key
      chrome.storage.sync.get([STORAGE_KEYS.THRESHOLD]).then((result) => {
        expect(result[STORAGE_KEYS.THRESHOLD]).toBe(25);
      });
    });

    test('hidden-videos and content script use same message types', () => {
      const messageFromHiddenVideos = {
        type: HIDDEN_VIDEO_MESSAGES.SET_STATE,
        videoId: 'abc123',
        state: 'dimmed',
      };

      // Background script receives message
      const backgroundHandler = (message) => {
        if (message.type === HIDDEN_VIDEO_MESSAGES.SET_STATE) {
          return { ok: true };
        }
        return { ok: false };
      };

      expect(backgroundHandler(messageFromHiddenVideos).ok).toBe(true);
    });
  });

  describe('Webpack Bundle Integration', () => {
    test('content script can import constants via re-export', () => {
      // Simulate the re-export pattern used in content/utils/constants.js
      const contentConstants = {
        STORAGE_KEYS,
        HIDDEN_VIDEO_MESSAGES,
      };

      expect(contentConstants.STORAGE_KEYS.THRESHOLD).toBe('YTHWV_THRESHOLD');
      expect(contentConstants.HIDDEN_VIDEO_MESSAGES.GET_MANY).toBe('HIDDEN_VIDEOS_GET_MANY');
    });
  });

  describe('Settings Reset Functionality', () => {
    test('can reset all settings to defaults using constants', async () => {
      // Clear all storage
      global.chrome.storage.sync.clear = jest.fn().mockResolvedValue(undefined);
      await chrome.storage.sync.clear();

      // Set defaults
      const defaultData = {
        [STORAGE_KEYS.THRESHOLD]: DEFAULT_SETTINGS.threshold,
        [STORAGE_KEYS.THEME]: DEFAULT_SETTINGS.theme,
        [STORAGE_KEYS.INDIVIDUAL_MODE]: DEFAULT_SETTINGS.individualMode,
        [STORAGE_KEYS.INDIVIDUAL_MODE_ENABLED]: DEFAULT_SETTINGS.individualModeEnabled,
      };

      Object.keys(DEFAULT_SETTINGS.states.watched).forEach((section) => {
        defaultData[`${STORAGE_KEYS.WATCHED_STATE}_${section}`] =
          DEFAULT_SETTINGS.states.watched[section];
      });

      Object.keys(DEFAULT_SETTINGS.states.shorts).forEach((section) => {
        defaultData[`${STORAGE_KEYS.SHORTS_STATE}_${section}`] =
          DEFAULT_SETTINGS.states.shorts[section];
      });

      global.chrome.storage.sync.set.mockResolvedValue(undefined);
      await chrome.storage.sync.set(defaultData);

      expect(chrome.storage.sync.clear).toHaveBeenCalled();
      expect(chrome.storage.sync.set).toHaveBeenCalledWith(
        expect.objectContaining({
          [STORAGE_KEYS.THRESHOLD]: 10,
          [STORAGE_KEYS.THEME]: 'auto',
        })
      );
    });
  });
});
