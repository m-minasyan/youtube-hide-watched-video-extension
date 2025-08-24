const { STORAGE_KEYS, DEFAULT_SETTINGS, mockChromeStorage } = require('./testUtils');

describe('Popup - Theme Management', () => {
  let storageData;

  beforeEach(() => {
    jest.clearAllMocks();
    storageData = mockChromeStorage();
    document.body.innerHTML = '<div id="root"></div>';
  });

  const initTheme = async () => {
    const result = await chrome.storage.sync.get(STORAGE_KEYS.THEME);
    let theme = result[STORAGE_KEYS.THEME];
    
    if (!theme || theme === 'auto') {
      const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      theme = isDarkMode ? 'dark' : 'light';
      
      if (!result[STORAGE_KEYS.THEME]) {
        await chrome.storage.sync.set({ [STORAGE_KEYS.THEME]: theme });
      }
    }
    
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    
    return theme;
  };

  test('should initialize with auto theme and detect system preference', async () => {
    window.matchMedia = jest.fn(() => ({ matches: true }));
    
    const theme = await initTheme();
    
    expect(theme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  test('should respect saved theme preference', async () => {
    storageData[STORAGE_KEYS.THEME] = 'light';
    
    const theme = await initTheme();
    
    expect(theme).toBe('light');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  test('should toggle theme correctly', async () => {
    const toggleTheme = async () => {
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
    
    document.documentElement.setAttribute('data-theme', 'dark');
    const newTheme = await toggleTheme();
    
    expect(newTheme).toBe('light');
    expect(chrome.storage.sync.set).toHaveBeenCalledWith({ [STORAGE_KEYS.THEME]: 'light' });
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });
});

describe('Popup - Individual Mode Management', () => {
  let storageData;

  beforeEach(() => {
    jest.clearAllMocks();
    storageData = mockChromeStorage();
  });

  const initIndividualMode = async () => {
    const result = await chrome.storage.sync.get(STORAGE_KEYS.INDIVIDUAL_MODE);
    let individualMode = result[STORAGE_KEYS.INDIVIDUAL_MODE];
    
    if (!individualMode) {
      individualMode = DEFAULT_SETTINGS.individualMode;
      await chrome.storage.sync.set({ [STORAGE_KEYS.INDIVIDUAL_MODE]: individualMode });
    }
    
    return individualMode;
  };

  test('should initialize with default individual mode', async () => {
    const mode = await initIndividualMode();
    
    expect(mode).toBe('dimmed');
    expect(chrome.storage.sync.set).toHaveBeenCalledWith({
      [STORAGE_KEYS.INDIVIDUAL_MODE]: 'dimmed'
    });
  });

  test('should preserve existing individual mode', async () => {
    storageData[STORAGE_KEYS.INDIVIDUAL_MODE] = 'hidden';
    
    const mode = await initIndividualMode();
    
    expect(mode).toBe('hidden');
    expect(chrome.storage.sync.set).not.toHaveBeenCalled();
  });
});

describe('Popup - Quick Toggle Functionality', () => {
  let storageData;

  beforeEach(() => {
    jest.clearAllMocks();
    storageData = mockChromeStorage();
  });

  const setAllSectionStates = async (type, state) => {
    const storageKey = type === 'shorts' ? STORAGE_KEYS.SHORTS_STATE : STORAGE_KEYS.WATCHED_STATE;
    const sections = type === 'shorts' 
      ? ['misc', 'subscriptions', 'channel', 'watch', 'trending']
      : ['misc', 'subscriptions', 'channel', 'watch', 'trending', 'playlist'];
    
    const updates = {};
    sections.forEach(section => {
      updates[`${storageKey}_${section}`] = state;
    });
    
    await chrome.storage.sync.set(updates);
    return updates;
  };

  test('should set all watched video sections to same state', async () => {
    const updates = await setAllSectionStates('watched', 'hidden');
    
    expect(chrome.storage.sync.set).toHaveBeenCalledWith(expect.objectContaining({
      [`${STORAGE_KEYS.WATCHED_STATE}_misc`]: 'hidden',
      [`${STORAGE_KEYS.WATCHED_STATE}_subscriptions`]: 'hidden',
      [`${STORAGE_KEYS.WATCHED_STATE}_channel`]: 'hidden',
      [`${STORAGE_KEYS.WATCHED_STATE}_watch`]: 'hidden',
      [`${STORAGE_KEYS.WATCHED_STATE}_trending`]: 'hidden',
      [`${STORAGE_KEYS.WATCHED_STATE}_playlist`]: 'hidden'
    }));
  });

  test('should set all shorts sections to same state', async () => {
    const updates = await setAllSectionStates('shorts', 'dimmed');
    
    expect(chrome.storage.sync.set).toHaveBeenCalledWith(expect.objectContaining({
      [`${STORAGE_KEYS.SHORTS_STATE}_misc`]: 'dimmed',
      [`${STORAGE_KEYS.SHORTS_STATE}_subscriptions`]: 'dimmed',
      [`${STORAGE_KEYS.SHORTS_STATE}_channel`]: 'dimmed',
      [`${STORAGE_KEYS.SHORTS_STATE}_watch`]: 'dimmed',
      [`${STORAGE_KEYS.SHORTS_STATE}_trending`]: 'dimmed'
    }));
    
    expect(chrome.storage.sync.set).not.toHaveBeenCalledWith(
      expect.objectContaining({
        [`${STORAGE_KEYS.SHORTS_STATE}_playlist`]: expect.anything()
      })
    );
  });
});
