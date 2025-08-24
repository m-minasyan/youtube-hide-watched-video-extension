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

function mockChromeStorage(data = {}) {
  chrome.storage.sync.get.mockImplementation((keys) => {
    if (Array.isArray(keys)) {
      const result = {};
      keys.forEach(key => {
        if (data[key] !== undefined) {
          result[key] = data[key];
        }
      });
      return Promise.resolve(result);
    } else if (keys === null) {
      return Promise.resolve(data);
    } else if (typeof keys === 'object') {
      const result = {};
      Object.keys(keys).forEach(key => {
        result[key] = data[key] !== undefined ? data[key] : keys[key];
      });
      return Promise.resolve(result);
    }
    return Promise.resolve(data[keys] !== undefined ? { [keys]: data[keys] } : {});
  });
  
  chrome.storage.sync.set.mockImplementation((items) => {
    Object.assign(data, items);
    return Promise.resolve();
  });
  
  return data;
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
