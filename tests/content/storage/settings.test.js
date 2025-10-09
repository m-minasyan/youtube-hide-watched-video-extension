/**
 * @jest-environment jsdom
 */

import {
  loadSettings,
  getSettings,
  getThreshold,
  getWatchedState,
  getShortsState,
  getIndividualMode,
  isIndividualModeEnabled
} from '../../../content/storage/settings.js';

describe('Settings Module', () => {
  let mockStorageGet;

  beforeEach(() => {
    mockStorageGet = jest.fn();
    global.chrome = {
      storage: {
        sync: {
          get: mockStorageGet
        }
      }
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('loadSettings', () => {
    test('should load settings from chrome.storage.sync', async () => {
      const mockSettings = {
        YTHWV_THRESHOLD: 75,
        YTHWV_STATE_misc: 'hidden',
        YTHWV_STATE_subscriptions: 'dimmed',
        YTHWV_STATE_channel: 'normal',
        YTHWV_STATE_watch: 'hidden',
        YTHWV_STATE_trending: 'normal',
        YTHWV_STATE_playlist: 'dimmed',
        YTHWV_STATE_SHORTS_misc: 'hidden',
        YTHWV_STATE_SHORTS_subscriptions: 'normal',
        YTHWV_STATE_SHORTS_channel: 'normal',
        YTHWV_STATE_SHORTS_watch: 'hidden',
        YTHWV_STATE_SHORTS_trending: 'normal',
        YTHWV_INDIVIDUAL_MODE: 'dimmed',
        YTHWV_INDIVIDUAL_MODE_ENABLED: true
      };

      mockStorageGet.mockResolvedValue(mockSettings);

      await loadSettings();

      expect(mockStorageGet).toHaveBeenCalled();
      expect(getThreshold()).toBe(75);
      expect(getWatchedState('misc')).toBe('hidden');
      expect(getShortsState('misc')).toBe('hidden');
      expect(getIndividualMode()).toBe('dimmed');
      expect(isIndividualModeEnabled()).toBe(true);
    });

    test('should use default values when storage is empty', async () => {
      mockStorageGet.mockResolvedValue({});

      await loadSettings();

      expect(getThreshold()).toBe(10);
      expect(getWatchedState('misc')).toBe('normal');
      expect(getIndividualMode()).toBe('dimmed');
      expect(isIndividualModeEnabled()).toBe(true);
    });

    test('should handle partial settings gracefully', async () => {
      mockStorageGet.mockResolvedValue({
        YTHWV_THRESHOLD: 50
        // Other settings missing
      });

      await loadSettings();

      expect(getThreshold()).toBe(50);
      expect(getWatchedState('misc')).toBe('normal'); // Default
    });
  });

  describe('getThreshold', () => {
    test('should return loaded threshold value', async () => {
      mockStorageGet.mockResolvedValue({ YTHWV_THRESHOLD: 80 });

      await loadSettings();
      expect(getThreshold()).toBe(80);
    });

    test('should return default threshold before settings loaded', () => {
      // Settings not loaded yet
      expect(getThreshold()).toBeDefined();
      expect(typeof getThreshold()).toBe('number');
    });
  });

  describe('getWatchedState', () => {
    test('should return state for specific section', async () => {
      mockStorageGet.mockResolvedValue({
        YTHWV_STATE_misc: 'hidden',
        YTHWV_STATE_subscriptions: 'dimmed',
        YTHWV_STATE_channel: 'normal'
      });

      await loadSettings();

      expect(getWatchedState('misc')).toBe('hidden');
      expect(getWatchedState('subscriptions')).toBe('dimmed');
      expect(getWatchedState('channel')).toBe('normal');
    });

    test('should return default for unknown section', async () => {
      mockStorageGet.mockResolvedValue({
        YTHWV_STATE_misc: 'hidden'
      });

      await loadSettings();

      const unknownState = getWatchedState('unknown_section');
      expect(unknownState).toBeUndefined();
    });
  });

  describe('getShortsState', () => {
    test('should return shorts state for specific section', async () => {
      mockStorageGet.mockResolvedValue({
        YTHWV_STATE_SHORTS_misc: 'hidden',
        YTHWV_STATE_SHORTS_subscriptions: 'normal'
      });

      await loadSettings();

      expect(getShortsState('misc')).toBe('hidden');
      expect(getShortsState('subscriptions')).toBe('normal');
    });
  });

  describe('getIndividualMode', () => {
    test('should return individual mode setting', async () => {
      mockStorageGet.mockResolvedValue({ YTHWV_INDIVIDUAL_MODE: 'hidden' });

      await loadSettings();

      expect(getIndividualMode()).toBe('hidden');
    });

    test('should default to dimmed if not set', async () => {
      mockStorageGet.mockResolvedValue({});

      await loadSettings();

      expect(getIndividualMode()).toBe('dimmed');
    });
  });

  describe('isIndividualModeEnabled', () => {
    test('should return true when enabled', async () => {
      mockStorageGet.mockResolvedValue({ YTHWV_INDIVIDUAL_MODE_ENABLED: true });

      await loadSettings();

      expect(isIndividualModeEnabled()).toBe(true);
    });

    test('should return false when disabled', async () => {
      mockStorageGet.mockResolvedValue({ YTHWV_INDIVIDUAL_MODE_ENABLED: false });

      await loadSettings();

      expect(isIndividualModeEnabled()).toBe(false);
    });

    test('should default to true if not set', async () => {
      mockStorageGet.mockResolvedValue({});

      await loadSettings();

      expect(isIndividualModeEnabled()).toBe(true);
    });
  });

  describe('getSettings', () => {
    test('should return complete settings object', async () => {
      mockStorageGet.mockResolvedValue({
        YTHWV_THRESHOLD: 60,
        YTHWV_STATE_misc: 'hidden',
        YTHWV_INDIVIDUAL_MODE: 'dimmed'
      });

      await loadSettings();

      const settings = getSettings();
      expect(settings).toBeDefined();
      expect(settings.threshold).toBe(60);
      expect(settings.watchedStates).toBeDefined();
      expect(settings.individualMode).toBe('dimmed');
    });
  });
});
