const { ensurePromise, isShorts, buildDefaultSettings, queryYoutubeTabs } = require('../../shared/utils.js');
const { STORAGE_KEYS, DEFAULT_SETTINGS } = require('../../shared/constants.js');

describe('Shared Utils', () => {
  describe('ensurePromise', () => {
    it('should return the value if it is already a promise', async () => {
      const promise = Promise.resolve('test');
      const result = ensurePromise(promise);
      expect(result).toBe(promise);
      expect(await result).toBe('test');
    });

    it('should wrap non-promise values in a promise', async () => {
      const value = 'test';
      const result = ensurePromise(value);
      expect(result).toBeInstanceOf(Promise);
      expect(await result).toBe('test');
    });

    it('should handle null and undefined', async () => {
      expect(await ensurePromise(null)).toBe(null);
      expect(await ensurePromise(undefined)).toBe(undefined);
    });

    it('should handle objects without then method', async () => {
      const obj = { foo: 'bar' };
      const result = ensurePromise(obj);
      expect(await result).toBe(obj);
    });
  });

  describe('isShorts', () => {
    it('should return true for short video IDs (< 15 chars)', () => {
      expect(isShorts('abc123')).toBe(true);
      expect(isShorts('shortID')).toBe(true);
      expect(isShorts('12345678901234')).toBe(true); // 14 chars
    });

    it('should return false for regular video IDs (>= 15 chars)', () => {
      expect(isShorts('dQw4w9WgXcQ12345')).toBe(false); // 16 chars
      expect(isShorts('123456789012345')).toBe(false); // 15 chars
    });

    it('should handle empty and null values', () => {
      expect(isShorts('')).toBe(false);
      expect(isShorts(null)).toBe(false);
      expect(isShorts(undefined)).toBe(false);
    });

    it('should convert numbers to strings', () => {
      expect(isShorts(12345)).toBe(true);
      expect(isShorts(123456789012345)).toBe(false);
    });
  });

  describe('buildDefaultSettings', () => {
    it('should build complete default settings object', () => {
      const result = buildDefaultSettings(STORAGE_KEYS, DEFAULT_SETTINGS);

      expect(result[STORAGE_KEYS.THRESHOLD]).toBe(DEFAULT_SETTINGS.threshold);
      expect(result[STORAGE_KEYS.INDIVIDUAL_MODE]).toBe(DEFAULT_SETTINGS.individualMode);
      expect(result[STORAGE_KEYS.INDIVIDUAL_MODE_ENABLED]).toBe(DEFAULT_SETTINGS.individualModeEnabled);
      expect(result[STORAGE_KEYS.THEME]).toBe(DEFAULT_SETTINGS.theme);
    });

    it('should include all watched states', () => {
      const result = buildDefaultSettings(STORAGE_KEYS, DEFAULT_SETTINGS);

      Object.keys(DEFAULT_SETTINGS.states.watched).forEach((section) => {
        const key = `${STORAGE_KEYS.WATCHED_STATE}_${section}`;
        expect(result[key]).toBe(DEFAULT_SETTINGS.states.watched[section]);
      });
    });

    it('should include all shorts states', () => {
      const result = buildDefaultSettings(STORAGE_KEYS, DEFAULT_SETTINGS);

      Object.keys(DEFAULT_SETTINGS.states.shorts).forEach((section) => {
        const key = `${STORAGE_KEYS.SHORTS_STATE}_${section}`;
        expect(result[key]).toBe(DEFAULT_SETTINGS.states.shorts[section]);
      });
    });

    it('should have correct number of keys', () => {
      const result = buildDefaultSettings(STORAGE_KEYS, DEFAULT_SETTINGS);
      const watchedCount = Object.keys(DEFAULT_SETTINGS.states.watched).length;
      const shortsCount = Object.keys(DEFAULT_SETTINGS.states.shorts).length;
      const expectedCount = 4 + watchedCount + shortsCount; // 4 base settings + states

      expect(Object.keys(result).length).toBe(expectedCount);
    });
  });

  describe('queryYoutubeTabs', () => {
    beforeEach(() => {
      global.chrome = {
        tabs: {
          query: jest.fn()
        },
        runtime: {}
      };
    });

    afterEach(() => {
      delete global.chrome;
    });

    it('should query YouTube tabs successfully', async () => {
      const mockTabs = [
        { id: 1, url: 'https://www.youtube.com/watch?v=test' },
        { id: 2, url: 'https://www.youtube.com/feed/subscriptions' }
      ];

      chrome.tabs.query.mockImplementation((query, callback) => {
        callback(mockTabs);
      });

      const result = await queryYoutubeTabs();
      expect(result).toEqual(mockTabs);
      expect(chrome.tabs.query).toHaveBeenCalledWith(
        { url: '*://*.youtube.com/*' },
        expect.any(Function)
      );
    });

    it('should handle chrome runtime errors', async () => {
      chrome.tabs.query.mockImplementation((query, callback) => {
        chrome.runtime.lastError = { message: 'Error' };
        callback([]);
      });

      const result = await queryYoutubeTabs();
      expect(result).toEqual([]);

      delete chrome.runtime.lastError;
    });

    it('should handle null tabs response', async () => {
      chrome.tabs.query.mockImplementation((query, callback) => {
        callback(null);
      });

      const result = await queryYoutubeTabs();
      expect(result).toEqual([]);
    });

    it('should handle undefined tabs response', async () => {
      chrome.tabs.query.mockImplementation((query, callback) => {
        callback(undefined);
      });

      const result = await queryYoutubeTabs();
      expect(result).toEqual([]);
    });
  });
});
