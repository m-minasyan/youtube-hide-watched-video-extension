const { STORAGE_KEYS, DEFAULT_SETTINGS } = require('../shared/constants.js');

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
  const hiddenVideosData = { ...(initial.hiddenVideos || {}) };

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

  chrome.runtime.sendMessage.mockImplementation((message) => {
    if (!message || typeof message !== 'object') {
      return Promise.resolve({ ok: true, result: null });
    }
    if (message.type === 'HIDDEN_VIDEOS_GET_MANY') {
      const result = {};
      (message.ids || []).forEach((id) => {
        if (hiddenVideosData[id]) {
          result[id] = { ...hiddenVideosData[id], videoId: id };
        }
      });
      return Promise.resolve({ ok: true, result: { records: result } });
    }
    if (message.type === 'HIDDEN_VIDEOS_SET_STATE') {
      const videoId = String(message.videoId);
      if (!videoId) {
        return Promise.resolve({ ok: true, result: {} });
      }
      if (message.state === 'normal') {
        delete hiddenVideosData[videoId];
        return Promise.resolve({ ok: true, result: { removed: true, videoId } });
      }
      const record = {
        videoId,
        state: message.state,
        title: message.title || (hiddenVideosData[videoId]?.title || ''),
        updatedAt: Date.now()
      };
      hiddenVideosData[videoId] = { state: record.state, title: record.title, updatedAt: record.updatedAt };
      return Promise.resolve({ ok: true, result: { record } });
    }
    if (message.type === 'HIDDEN_VIDEOS_GET_PAGE') {
      const limit = Math.max(1, Math.min(message.limit || 100, 500));
      const stateFilter = message.state;
      const sorted = Object.entries(hiddenVideosData)
        .map(([videoId, data]) => ({ videoId, ...data }))
        .filter((item) => !stateFilter || item.state === stateFilter)
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      let startIndex = 0;
      if (message.cursor && message.cursor.videoId) {
        const index = sorted.findIndex((item) => item.videoId === message.cursor.videoId && item.updatedAt === message.cursor.updatedAt);
        if (index >= 0) {
          startIndex = index + 1;
        }
      }
      const pageItems = sorted.slice(startIndex, startIndex + limit + 1);
      const items = pageItems.slice(0, limit).map((item) => ({
        videoId: item.videoId,
        state: item.state,
        title: item.title,
        updatedAt: item.updatedAt
      }));
      const extra = pageItems.length > limit ? pageItems[limit] : null;
      const nextCursor = items.length > 0 ? {
        state: stateFilter || null,
        updatedAt: items[items.length - 1].updatedAt,
        videoId: items[items.length - 1].videoId
      } : null;
      const hasMore = extra !== null;
      return Promise.resolve({ ok: true, result: { items, hasMore, nextCursor } });
    }
    if (message.type === 'HIDDEN_VIDEOS_GET_STATS') {
      const values = Object.values(hiddenVideosData);
      const total = values.length;
      const dimmed = values.filter((item) => item.state === 'dimmed').length;
      const hidden = values.filter((item) => item.state === 'hidden').length;
      return Promise.resolve({ ok: true, result: { total, dimmed, hidden } });
    }
    if (message.type === 'HIDDEN_VIDEOS_CLEAR_ALL') {
      Object.keys(hiddenVideosData).forEach((key) => delete hiddenVideosData[key]);
      return Promise.resolve({ ok: true, result: { cleared: true } });
    }
    return Promise.resolve({ ok: true, result: null });
  });

  return { sync: syncData, local: localData, hiddenVideos: hiddenVideosData };
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
