const STORAGE_KEYS = {
  THRESHOLD: 'YTHWV_THRESHOLD',
  WATCHED_STATE: 'YTHWV_STATE',
  SHORTS_STATE: 'YTHWV_STATE_SHORTS',
  HIDDEN_VIDEOS: 'YTHWV_HIDDEN_VIDEOS',
  INDIVIDUAL_MODE: 'YTHWV_INDIVIDUAL_MODE',
  THEME: 'YTHWV_THEME'
};

const DEFAULT_SETTINGS = {
  threshold: 10,
  individualMode: 'dimmed',
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

function createMockVideoElement(options = {}) {
  const {
    videoId = 'test123',
    hasProgressBar = false,
    isShorts = false,
    title = 'Test Video'
  } = options;

  const element = document.createElement('div');
  element.className = isShorts ? 'ytm-shorts-lockup-view-model' : 'ytd-rich-item-renderer';
  
  const link = document.createElement('a');
  link.href = isShorts ? `/shorts/${videoId}` : `/watch?v=${videoId}`;
  element.appendChild(link);

  if (hasProgressBar) {
    const progressBar = document.createElement('div');
    progressBar.className = 'ytd-thumbnail-overlay-resume-playback-progress-renderer';
    progressBar.style.width = '50%';
    element.appendChild(progressBar);
  }

  const titleElement = document.createElement('h3');
  titleElement.id = 'video-title';
  titleElement.textContent = title;
  element.appendChild(titleElement);

  return element;
}

function mockChromeStorage(initial = {}) {
  const syncData = { ...(initial.sync || {}) };
  const localData = { ...(initial.local || {}) };

  const resolveGet = (keys, store) => {
    if (Array.isArray(keys)) {
      const result = {};
      keys.forEach(key => {
        if (store[key] !== undefined) {
          result[key] = store[key];
        }
      });
      return result;
    }
    if (keys === null || keys === undefined) {
      return { ...store };
    }
    if (typeof keys === 'object') {
      const result = {};
      Object.keys(keys).forEach(key => {
        result[key] = store[key] !== undefined ? store[key] : keys[key];
      });
      return result;
    }
    return store[keys] !== undefined ? { [keys]: store[keys] } : {};
  };

  chrome.storage.sync.get.mockImplementation((keys, callback) => {
    const result = resolveGet(keys, syncData);
    if (typeof callback === 'function') {
      callback(result);
    }
    return Promise.resolve(result);
  });

  chrome.storage.sync.set.mockImplementation((items, callback) => {
    Object.assign(syncData, items);
    if (typeof callback === 'function') {
      callback();
    }
    return Promise.resolve();
  });

  chrome.storage.sync.remove.mockImplementation((keys, callback) => {
    const entries = Array.isArray(keys) ? keys : [keys];
    entries.forEach(key => {
      delete syncData[key];
    });
    if (typeof callback === 'function') {
      callback();
    }
    return Promise.resolve();
  });

  chrome.storage.sync.clear.mockImplementation((callback) => {
    Object.keys(syncData).forEach(key => delete syncData[key]);
    if (typeof callback === 'function') {
      callback();
    }
    return Promise.resolve();
  });

  chrome.storage.local.get.mockImplementation((keys, callback) => {
    const result = resolveGet(keys, localData);
    if (typeof callback === 'function') {
      callback(result);
    }
    return Promise.resolve(result);
  });

  chrome.storage.local.set.mockImplementation((items, callback) => {
    Object.assign(localData, items);
    if (typeof callback === 'function') {
      callback();
    }
    return Promise.resolve();
  });

  chrome.storage.local.remove.mockImplementation((keys, callback) => {
    const entries = Array.isArray(keys) ? keys : [keys];
    entries.forEach(key => {
      delete localData[key];
    });
    if (typeof callback === 'function') {
      callback();
    }
    return Promise.resolve();
  });

  chrome.storage.local.clear.mockImplementation((callback) => {
    Object.keys(localData).forEach(key => delete localData[key]);
    if (typeof callback === 'function') {
      callback();
    }
    return Promise.resolve();
  });

  return { sync: syncData, local: localData };
}

function setLocation(url) {
  delete window.location;
  window.location = new URL(url);
}

module.exports = {
  STORAGE_KEYS,
  DEFAULT_SETTINGS,
  createMockVideoElement,
  mockChromeStorage,
  setLocation
};
