const { STORAGE_KEYS, mockChromeStorage } = require('./testUtils');

describe('Business Logic - Theme Management', () => {
  let storageData;

  beforeEach(() => {
    jest.clearAllMocks();
    storageData = mockChromeStorage();
    document.documentElement.removeAttribute('data-theme');
  });

  describe('Theme Auto-Detection', () => {
    const detectAndApplyTheme = async () => {
      const result = await chrome.storage.sync.get(STORAGE_KEYS.THEME);
      let theme = result[STORAGE_KEYS.THEME];
      
      if (!theme || theme === 'auto') {
        const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        theme = isDarkMode ? 'dark' : 'light';
        
        if (!result[STORAGE_KEYS.THEME]) {
          await chrome.storage.sync.set({ [STORAGE_KEYS.THEME]: 'auto' });
        }
      }
      
      if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
      
      return theme;
    };

    test('should detect dark mode from system preference', async () => {
      window.matchMedia = jest.fn(() => ({ matches: true }));
      
      const theme = await detectAndApplyTheme();
      
      expect(theme).toBe('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    test('should detect light mode from system preference', async () => {
      window.matchMedia = jest.fn(() => ({ matches: false }));
      
      const theme = await detectAndApplyTheme();
      
      expect(theme).toBe('light');
      expect(document.documentElement.getAttribute('data-theme')).toBeNull();
    });

    test('should respect manually set theme over auto', async () => {
      storageData[STORAGE_KEYS.THEME] = 'dark';
      window.matchMedia = jest.fn(() => ({ matches: false }));
      
      const theme = await detectAndApplyTheme();
      
      expect(theme).toBe('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    test('should save auto as theme preference when not set', async () => {
      window.matchMedia = jest.fn(() => ({ matches: true }));
      
      await detectAndApplyTheme();
      
      expect(chrome.storage.sync.set).toHaveBeenCalledWith({ [STORAGE_KEYS.THEME]: 'auto' });
    });
  });

  describe('Theme Switching', () => {
    const switchTheme = async () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      
      if (newTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
      
      await chrome.storage.sync.set({ [STORAGE_KEYS.THEME]: newTheme });
      return newTheme;
    };

    test('should switch from light to dark', async () => {
      const newTheme = await switchTheme();
      
      expect(newTheme).toBe('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      expect(chrome.storage.sync.set).toHaveBeenCalledWith({ [STORAGE_KEYS.THEME]: 'dark' });
    });

    test('should switch from dark to light', async () => {
      document.documentElement.setAttribute('data-theme', 'dark');
      
      const newTheme = await switchTheme();
      
      expect(newTheme).toBe('light');
      expect(document.documentElement.getAttribute('data-theme')).toBeNull();
      expect(chrome.storage.sync.set).toHaveBeenCalledWith({ [STORAGE_KEYS.THEME]: 'light' });
    });
  });

  describe('Theme Persistence', () => {
    test('should persist theme across sessions', async () => {
      await chrome.storage.sync.set({ [STORAGE_KEYS.THEME]: 'dark' });
      
      const result = await chrome.storage.sync.get(STORAGE_KEYS.THEME);
      expect(result[STORAGE_KEYS.THEME]).toBe('dark');
    });

    test('should handle theme reset to auto', async () => {
      storageData[STORAGE_KEYS.THEME] = 'dark';
      
      await chrome.storage.sync.set({ [STORAGE_KEYS.THEME]: 'auto' });
      
      const result = await chrome.storage.sync.get(STORAGE_KEYS.THEME);
      expect(result[STORAGE_KEYS.THEME]).toBe('auto');
    });
  });
});

describe('Business Logic - Pagination', () => {
  describe('Page Navigation', () => {
    const calculatePagination = (totalItems, currentPage, itemsPerPage) => {
      const totalPages = Math.ceil(totalItems / itemsPerPage);
      const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages || 1);
      const startIndex = (validCurrentPage - 1) * itemsPerPage;
      const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
      
      return {
        totalPages,
        currentPage: validCurrentPage,
        startIndex,
        endIndex,
        hasPrevious: validCurrentPage > 1,
        hasNext: validCurrentPage < totalPages
      };
    };

    test('should calculate correct pagination for first page', () => {
      const result = calculatePagination(100, 1, 12);
      
      expect(result.totalPages).toBe(9);
      expect(result.currentPage).toBe(1);
      expect(result.startIndex).toBe(0);
      expect(result.endIndex).toBe(12);
      expect(result.hasPrevious).toBe(false);
      expect(result.hasNext).toBe(true);
    });

    test('should calculate correct pagination for middle page', () => {
      const result = calculatePagination(100, 5, 12);
      
      expect(result.currentPage).toBe(5);
      expect(result.startIndex).toBe(48);
      expect(result.endIndex).toBe(60);
      expect(result.hasPrevious).toBe(true);
      expect(result.hasNext).toBe(true);
    });

    test('should calculate correct pagination for last page', () => {
      const result = calculatePagination(100, 9, 12);
      
      expect(result.currentPage).toBe(9);
      expect(result.startIndex).toBe(96);
      expect(result.endIndex).toBe(100);
      expect(result.hasPrevious).toBe(true);
      expect(result.hasNext).toBe(false);
    });

    test('should handle page beyond total pages', () => {
      const result = calculatePagination(50, 10, 12);
      
      expect(result.currentPage).toBe(5);
      expect(result.totalPages).toBe(5);
    });

    test('should handle zero items', () => {
      const result = calculatePagination(0, 1, 12);
      
      expect(result.totalPages).toBe(0);
      expect(result.currentPage).toBe(1);
      expect(result.startIndex).toBe(0);
      expect(result.endIndex).toBe(0);
      expect(result.hasPrevious).toBe(false);
      expect(result.hasNext).toBe(false);
    });

    test('should handle negative page number', () => {
      const result = calculatePagination(100, -5, 12);
      
      expect(result.currentPage).toBe(1);
    });
  });

  describe('Filtering with Pagination', () => {
    const filterAndPaginate = (items, filter, currentPage, itemsPerPage) => {
      let filtered = items;
      
      if (filter !== 'all') {
        filtered = items.filter(item => item.state === filter);
      }
      
      const totalPages = Math.ceil(filtered.length / itemsPerPage);
      const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages || 1);
      const startIndex = (validCurrentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      
      return {
        filteredItems: filtered.slice(startIndex, endIndex),
        totalFiltered: filtered.length,
        currentPage: validCurrentPage,
        totalPages
      };
    };

    const testItems = [
      { id: '1', state: 'hidden' },
      { id: '2', state: 'dimmed' },
      { id: '3', state: 'hidden' },
      { id: '4', state: 'dimmed' },
      { id: '5', state: 'hidden' },
      { id: '6', state: 'dimmed' }
    ];

    test('should filter and paginate all items', () => {
      const result = filterAndPaginate(testItems, 'all', 1, 3);
      
      expect(result.filteredItems.length).toBe(3);
      expect(result.totalFiltered).toBe(6);
      expect(result.totalPages).toBe(2);
    });

    test('should filter only hidden items', () => {
      const result = filterAndPaginate(testItems, 'hidden', 1, 3);
      
      expect(result.filteredItems.length).toBe(3);
      expect(result.totalFiltered).toBe(3);
      expect(result.filteredItems.every(item => item.state === 'hidden')).toBe(true);
    });

    test('should filter only dimmed items', () => {
      const result = filterAndPaginate(testItems, 'dimmed', 1, 3);
      
      expect(result.filteredItems.length).toBe(3);
      expect(result.totalFiltered).toBe(3);
      expect(result.filteredItems.every(item => item.state === 'dimmed')).toBe(true);
    });

    test('should reset to page 1 when filter changes', () => {
      const result = filterAndPaginate(testItems, 'hidden', 5, 3);
      
      expect(result.currentPage).toBe(1);
    });
  });
});

describe('Business Logic - Quick Toggle', () => {
  let storageData;

  beforeEach(() => {
    jest.clearAllMocks();
    storageData = mockChromeStorage();
  });

  describe('Batch State Updates', () => {
    const applyQuickToggle = async (type, mode) => {
      const updates = {};
      const sections = type === 'watched' 
        ? ['misc', 'subscriptions', 'channel', 'watch', 'trending', 'playlist']
        : ['misc', 'subscriptions', 'channel', 'watch', 'trending'];
      
      const storageKey = type === 'watched' ? STORAGE_KEYS.WATCHED_STATE : STORAGE_KEYS.SHORTS_STATE;
      
      sections.forEach(section => {
        updates[`${storageKey}_${section}`] = mode;
      });
      
      await chrome.storage.sync.set(updates);
      return updates;
    };

    test('should set all watched sections to hidden', async () => {
      const updates = await applyQuickToggle('watched', 'hidden');
      
      expect(updates[`${STORAGE_KEYS.WATCHED_STATE}_misc`]).toBe('hidden');
      expect(updates[`${STORAGE_KEYS.WATCHED_STATE}_subscriptions`]).toBe('hidden');
      expect(updates[`${STORAGE_KEYS.WATCHED_STATE}_channel`]).toBe('hidden');
      expect(updates[`${STORAGE_KEYS.WATCHED_STATE}_watch`]).toBe('hidden');
      expect(updates[`${STORAGE_KEYS.WATCHED_STATE}_trending`]).toBe('hidden');
      expect(updates[`${STORAGE_KEYS.WATCHED_STATE}_playlist`]).toBe('hidden');
    });

    test('should set all shorts sections to dimmed', async () => {
      const updates = await applyQuickToggle('shorts', 'dimmed');
      
      expect(updates[`${STORAGE_KEYS.SHORTS_STATE}_misc`]).toBe('dimmed');
      expect(updates[`${STORAGE_KEYS.SHORTS_STATE}_subscriptions`]).toBe('dimmed');
      expect(updates[`${STORAGE_KEYS.SHORTS_STATE}_channel`]).toBe('dimmed');
      expect(updates[`${STORAGE_KEYS.SHORTS_STATE}_watch`]).toBe('dimmed');
      expect(updates[`${STORAGE_KEYS.SHORTS_STATE}_trending`]).toBe('dimmed');
    });

    test('should not include playlist for shorts', async () => {
      const updates = await applyQuickToggle('shorts', 'normal');
      
      expect(updates[`${STORAGE_KEYS.SHORTS_STATE}_playlist`]).toBeUndefined();
    });
  });

  describe('Quick Toggle State Detection', () => {
    const detectQuickToggleState = (type, settings) => {
      const sections = type === 'watched' 
        ? ['misc', 'subscriptions', 'channel', 'watch', 'trending', 'playlist']
        : ['misc', 'subscriptions', 'channel', 'watch', 'trending'];
      
      const storageKey = type === 'watched' ? STORAGE_KEYS.WATCHED_STATE : STORAGE_KEYS.SHORTS_STATE;
      
      const modes = sections.map(section => 
        settings[`${storageKey}_${section}`] || 'normal'
      );
      
      const allSame = modes.every(mode => mode === modes[0]);
      return allSame ? modes[0] : null;
    };

    test('should detect when all watched sections have same state', () => {
      const settings = {
        [`${STORAGE_KEYS.WATCHED_STATE}_misc`]: 'hidden',
        [`${STORAGE_KEYS.WATCHED_STATE}_subscriptions`]: 'hidden',
        [`${STORAGE_KEYS.WATCHED_STATE}_channel`]: 'hidden',
        [`${STORAGE_KEYS.WATCHED_STATE}_watch`]: 'hidden',
        [`${STORAGE_KEYS.WATCHED_STATE}_trending`]: 'hidden',
        [`${STORAGE_KEYS.WATCHED_STATE}_playlist`]: 'hidden'
      };
      
      const state = detectQuickToggleState('watched', settings);
      expect(state).toBe('hidden');
    });

    test('should return null when sections have different states', () => {
      const settings = {
        [`${STORAGE_KEYS.WATCHED_STATE}_misc`]: 'hidden',
        [`${STORAGE_KEYS.WATCHED_STATE}_subscriptions`]: 'dimmed',
        [`${STORAGE_KEYS.WATCHED_STATE}_channel`]: 'hidden'
      };
      
      const state = detectQuickToggleState('watched', settings);
      expect(state).toBeNull();
    });

    test('should handle missing settings with default value', () => {
      const settings = {};
      
      const state = detectQuickToggleState('shorts', settings);
      expect(state).toBe('normal');
    });
  });
});
