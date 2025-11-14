const { STORAGE_KEYS, DEFAULT_SETTINGS, mockChromeStorage } = require('./testUtils');

async function loadBackgroundModule() {
  const backgroundModule = await import('../background.js');
  await Promise.resolve();
  if (typeof backgroundModule.__getHiddenVideosInitializationPromiseForTests === 'function') {
    await backgroundModule.__getHiddenVideosInitializationPromiseForTests();
  }
  return backgroundModule;
}

describe('Background Script - Settings Initialization', () => {
  let storageData;
  let onInstalledCallback;
  let backgroundModule;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();
    chrome.runtime.onMessage.addListener.mockImplementation(() => {});
    storageData = mockChromeStorage();
    chrome.runtime.onInstalled.addListener.mockImplementation((callback) => {
      onInstalledCallback = callback;
    });
    chrome.runtime.onStartup.addListener.mockImplementation(() => {
      // No-op: onStartup is not used in current implementation
    });
    backgroundModule = await loadBackgroundModule();
  });

  test('should initialize default settings on extension install', async () => {
    await onInstalledCallback({ reason: 'install' });

    expect(chrome.storage.sync.set).toHaveBeenCalledWith(
      expect.objectContaining({
        [STORAGE_KEYS.THRESHOLD]: DEFAULT_SETTINGS.threshold,
        [STORAGE_KEYS.INDIVIDUAL_MODE]: DEFAULT_SETTINGS.individualMode,
        [STORAGE_KEYS.THEME]: 'auto'
      })
    );
  });

  test('should set default watched states for all sections', async () => {
    await onInstalledCallback({ reason: 'install' });

    const sections = ['misc', 'subscriptions', 'channel', 'watch', 'trending', 'playlist'];
    
    sections.forEach(section => {
      expect(chrome.storage.sync.set).toHaveBeenCalledWith(
        expect.objectContaining({
          [`${STORAGE_KEYS.WATCHED_STATE}_${section}`]: 'normal'
        })
      );
    });
  });

  test('should set default shorts states for all sections except playlist', async () => {
    await onInstalledCallback({ reason: 'install' });

    const sections = ['misc', 'subscriptions', 'channel', 'watch', 'trending'];
    
    sections.forEach(section => {
      expect(chrome.storage.sync.set).toHaveBeenCalledWith(
        expect.objectContaining({
          [`${STORAGE_KEYS.SHORTS_STATE}_${section}`]: 'normal'
        })
      );
    });
    
    expect(chrome.storage.sync.set).not.toHaveBeenCalledWith(
      expect.objectContaining({
        [`${STORAGE_KEYS.SHORTS_STATE}_playlist`]: expect.anything()
      })
    );
  });

  test('should not initialize settings on extension update', async () => {
    await onInstalledCallback({ reason: 'update' });
    
    expect(chrome.storage.sync.set).not.toHaveBeenCalled();
  });

  test('should not initialize settings on browser update', async () => {
    await onInstalledCallback({ reason: 'browser_update' });
    
    expect(chrome.storage.sync.set).not.toHaveBeenCalled();
  });

  test('initializes hidden videos service during module load', async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(chrome.runtime.onMessage.addListener.mock.calls.length).toBeGreaterThan(0);
  });

  test('reuses hidden videos initialization when called multiple times', async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    const initialListenerCount = chrome.runtime.onMessage.addListener.mock.calls.length;

    // Call initialization multiple times - should reuse the same promise
    if (backgroundModule && typeof backgroundModule.__getHiddenVideosInitializationPromiseForTests === 'function') {
      const promise1 = backgroundModule.__getHiddenVideosInitializationPromiseForTests();
      const promise2 = backgroundModule.__getHiddenVideosInitializationPromiseForTests();

      // Should return the same promise instance (reused)
      expect(promise1).toBe(promise2);

      await Promise.all([promise1, promise2]);
    }

    await new Promise((resolve) => setTimeout(resolve, 0));
    // Should not register additional listeners
    expect(chrome.runtime.onMessage.addListener.mock.calls.length).toBe(initialListenerCount);
  });
});

describe('Background Script - Tab Updates', () => {
  let onTabUpdatedCallback;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();
    chrome.runtime.onMessage.addListener.mockImplementation(() => {});
    chrome.tabs.onUpdated.addListener.mockImplementation((callback) => {
      onTabUpdatedCallback = callback;
    });
    chrome.runtime.onInstalled.addListener.mockImplementation(() => {});
    chrome.runtime.onStartup.addListener.mockImplementation(() => {});
    await loadBackgroundModule();
  });

  test('should send message to YouTube tabs when page completes loading', () => {
    const tabId = 123;
    const tab = { url: 'https://www.youtube.com/watch?v=test' };
    
    onTabUpdatedCallback(tabId, { status: 'complete' }, tab);
    
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
      tabId,
      { action: 'pageUpdated' }
    );
  });

  test('should not send message to non-YouTube tabs', () => {
    const tabId = 123;
    const tab = { url: 'https://www.google.com' };
    
    onTabUpdatedCallback(tabId, { status: 'complete' }, tab);
    
    expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
  });

  test('should not send message when status is not complete', () => {
    const tabId = 123;
    const tab = { url: 'https://www.youtube.com/watch?v=test' };
    
    onTabUpdatedCallback(tabId, { status: 'loading' }, tab);
    
    expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
  });
});
