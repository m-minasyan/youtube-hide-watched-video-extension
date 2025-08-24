chrome.runtime.onInstalled.addListener(async (details) => {
  const STORAGE_KEYS = {
    THRESHOLD: 'YTHWV_THRESHOLD',
    WATCHED_STATE: 'YTHWV_STATE',
    SHORTS_STATE: 'YTHWV_STATE_SHORTS',
    INDIVIDUAL_MODE: 'YTHWV_INDIVIDUAL_MODE',
    INDIVIDUAL_MODE_ENABLED: 'YTHWV_INDIVIDUAL_MODE_ENABLED',
    THEME: 'YTHWV_THEME'
  };

  const DEFAULT_SETTINGS = {
    threshold: 10,
    individualMode: 'dimmed',
    individualModeEnabled: true,
    theme: 'auto',
    states: {
      watched: {
        misc: 'normal',
        subscriptions: 'normal',
        channel: 'normal',
        watch: 'normal',
        trending: 'normal',
        playlist: 'normal'
      },
      shorts: {
        misc: 'normal',
        subscriptions: 'normal',
        channel: 'normal',
        watch: 'normal',
        trending: 'normal'
      }
    }
  };

  if (details.reason === 'install') {
    const defaultData = {
      [STORAGE_KEYS.THRESHOLD]: DEFAULT_SETTINGS.threshold,
      [STORAGE_KEYS.INDIVIDUAL_MODE]: DEFAULT_SETTINGS.individualMode,
      [STORAGE_KEYS.INDIVIDUAL_MODE_ENABLED]: DEFAULT_SETTINGS.individualModeEnabled,
      [STORAGE_KEYS.THEME]: 'auto'
    };
    
    Object.keys(DEFAULT_SETTINGS.states.watched).forEach(section => {
      defaultData[`${STORAGE_KEYS.WATCHED_STATE}_${section}`] = DEFAULT_SETTINGS.states.watched[section];
    });
    
    Object.keys(DEFAULT_SETTINGS.states.shorts).forEach(section => {
      defaultData[`${STORAGE_KEYS.SHORTS_STATE}_${section}`] = DEFAULT_SETTINGS.states.shorts[section];
    });
    
    await chrome.storage.sync.set(defaultData);
    console.log('YouTube Hide Watched Videos: Default settings initialized with auto theme');
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('youtube.com')) {
    chrome.tabs.sendMessage(tabId, {action: 'pageUpdated'}).catch(() => {});
  }
});