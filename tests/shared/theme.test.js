/**
 * @jest-environment jsdom
 */

const { initTheme, toggleTheme } = require('../../shared/theme.js');
const { STORAGE_KEYS } = require('../../shared/constants.js');

describe('Shared Theme Module', () => {
  beforeEach(() => {
    // Setup DOM
    document.documentElement.removeAttribute('data-theme');

    // Setup Chrome API mock
    global.chrome = {
      storage: {
        sync: {
          get: jest.fn(),
          set: jest.fn()
        }
      }
    };

    // Setup matchMedia mock
    global.window.matchMedia = jest.fn();
  });

  afterEach(() => {
    delete global.chrome;
    delete global.window.matchMedia;
  });

  describe('initTheme', () => {
    it('should apply stored dark theme', async () => {
      chrome.storage.sync.get.mockResolvedValue({
        [STORAGE_KEYS.THEME]: 'dark'
      });

      await initTheme();

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should apply stored light theme', async () => {
      chrome.storage.sync.get.mockResolvedValue({
        [STORAGE_KEYS.THEME]: 'light'
      });

      await initTheme();

      expect(document.documentElement.getAttribute('data-theme')).toBe(null);
    });

    it('should detect dark mode from system when theme is auto', async () => {
      chrome.storage.sync.get.mockResolvedValue({
        [STORAGE_KEYS.THEME]: 'auto'
      });

      window.matchMedia.mockReturnValue({
        matches: true // Dark mode
      });

      chrome.storage.sync.set.mockResolvedValue();

      await initTheme();

      expect(window.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should detect light mode from system when theme is auto', async () => {
      chrome.storage.sync.get.mockResolvedValue({
        [STORAGE_KEYS.THEME]: 'auto'
      });

      window.matchMedia.mockReturnValue({
        matches: false // Light mode
      });

      chrome.storage.sync.set.mockResolvedValue();

      await initTheme();

      expect(document.documentElement.getAttribute('data-theme')).toBe(null);
    });

    it('should set default theme when no theme is stored', async () => {
      chrome.storage.sync.get.mockResolvedValue({});

      window.matchMedia.mockReturnValue({
        matches: false // Light mode
      });

      chrome.storage.sync.set.mockResolvedValue();

      await initTheme();

      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        [STORAGE_KEYS.THEME]: 'light'
      });
      expect(document.documentElement.getAttribute('data-theme')).toBe(null);
    });

    it('should handle missing matchMedia', async () => {
      chrome.storage.sync.get.mockResolvedValue({});

      delete window.matchMedia;

      chrome.storage.sync.set.mockResolvedValue();

      await initTheme();

      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        [STORAGE_KEYS.THEME]: 'light'
      });
    });
  });

  describe('toggleTheme', () => {
    it('should toggle from light to dark', async () => {
      document.documentElement.removeAttribute('data-theme');
      chrome.storage.sync.set.mockResolvedValue();

      await toggleTheme();

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        [STORAGE_KEYS.THEME]: 'dark'
      });
    });

    it('should toggle from dark to light', async () => {
      document.documentElement.setAttribute('data-theme', 'dark');
      chrome.storage.sync.set.mockResolvedValue();

      await toggleTheme();

      expect(document.documentElement.getAttribute('data-theme')).toBe(null);
      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        [STORAGE_KEYS.THEME]: 'light'
      });
    });

    it('should handle storage errors gracefully', async () => {
      document.documentElement.removeAttribute('data-theme');
      chrome.storage.sync.set.mockRejectedValue(new Error('Storage error'));

      await expect(toggleTheme()).rejects.toThrow('Storage error');

      // Theme should still be applied to DOM even if storage fails
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });
  });
});
