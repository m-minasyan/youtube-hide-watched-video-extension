chrome.runtime.onInstalled.addListener(async () => {
  const STORAGE_KEYS = {
    THRESHOLD: 'YTHWV_THRESHOLD',
    WATCHED_STATE: 'YTHWV_STATE',
    SHORTS_STATE: 'YTHWV_STATE_SHORTS'
  };

  const DEFAULT_SETTINGS = {
    threshold: 10,
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

  const currentSettings = await chrome.storage.sync.get(null);
  
  if (Object.keys(currentSettings).length === 0) {
    const defaultData = {
      [STORAGE_KEYS.THRESHOLD]: DEFAULT_SETTINGS.threshold
    };
    
    Object.keys(DEFAULT_SETTINGS.states.watched).forEach(section => {
      defaultData[`${STORAGE_KEYS.WATCHED_STATE}_${section}`] = DEFAULT_SETTINGS.states.watched[section];
    });
    
    Object.keys(DEFAULT_SETTINGS.states.shorts).forEach(section => {
      defaultData[`${STORAGE_KEYS.SHORTS_STATE}_${section}`] = DEFAULT_SETTINGS.states.shorts[section];
    });
    
    await chrome.storage.sync.set(defaultData);
    console.log('YouTube Hide Watched Videos: Default settings initialized');
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('youtube.com')) {
    chrome.tabs.sendMessage(tabId, {action: 'pageUpdated'}).catch(() => {});
  }
});