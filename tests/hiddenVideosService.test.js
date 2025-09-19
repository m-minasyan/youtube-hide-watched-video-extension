const { STORAGE_KEYS } = require('./testUtils');

const deleteDatabase = (name) => new Promise((resolve, reject) => {
  const request = indexedDB.deleteDatabase(name);
  request.onsuccess = () => resolve();
  request.onerror = () => reject(request.error);
  request.onblocked = () => resolve();
});

const invokeHandler = (handler, message) => new Promise((resolve) => {
  const callback = (response) => resolve(response);
  const result = handler(message, {}, callback);
  if (result !== true && result !== undefined) {
    resolve(result);
  }
});

const setupService = async (legacyHiddenVideos = {}, legacySync = {}) => {
  jest.resetModules();
  chrome.runtime.onMessage.addListener.mockClear();
  await deleteDatabase('ythwvHiddenVideos');
  chrome.storage.local.get.mockImplementation((keys) => {
    if (keys === STORAGE_KEYS.HIDDEN_VIDEOS || (Array.isArray(keys) && keys.includes(STORAGE_KEYS.HIDDEN_VIDEOS))) {
      return Promise.resolve({ [STORAGE_KEYS.HIDDEN_VIDEOS]: legacyHiddenVideos });
    }
    if (keys === null || keys === undefined) {
      return Promise.resolve({ [STORAGE_KEYS.HIDDEN_VIDEOS]: legacyHiddenVideos });
    }
    return Promise.resolve({});
  });
  chrome.storage.sync.get.mockImplementation((keys) => {
    if (keys === STORAGE_KEYS.HIDDEN_VIDEOS || (Array.isArray(keys) && keys.includes(STORAGE_KEYS.HIDDEN_VIDEOS))) {
      return Promise.resolve({ [STORAGE_KEYS.HIDDEN_VIDEOS]: legacySync });
    }
    if (keys === null || keys === undefined) {
      return Promise.resolve({ [STORAGE_KEYS.HIDDEN_VIDEOS]: legacySync });
    }
    return Promise.resolve({});
  });
  const service = await import('../background/hiddenVideosService.js');
  await service.initializeHiddenVideosService();
  return chrome.runtime.onMessage.addListener.mock.calls.at(-1)[0];
};

describe('Hidden videos service messaging', () => {
  test('stores and retrieves hidden videos via messaging', async () => {
    const handler = await setupService();
    const setResponse = await invokeHandler(handler, {
      type: 'HIDDEN_VIDEOS_SET_STATE',
      videoId: 'abc123',
      state: 'hidden',
      title: 'Test Video'
    });
    expect(setResponse.ok).toBe(true);
    expect(setResponse.result.record.videoId).toBe('abc123');

    const getResponse = await invokeHandler(handler, {
      type: 'HIDDEN_VIDEOS_GET_MANY',
      ids: ['abc123']
    });
    expect(getResponse.ok).toBe(true);
    expect(getResponse.result.records.abc123.state).toBe('hidden');
  });

  test('removes entries when state becomes normal', async () => {
    const handler = await setupService();
    await invokeHandler(handler, {
      type: 'HIDDEN_VIDEOS_SET_STATE',
      videoId: 'remove-me',
      state: 'hidden',
      title: ''
    });
    await invokeHandler(handler, {
      type: 'HIDDEN_VIDEOS_SET_STATE',
      videoId: 'remove-me',
      state: 'normal'
    });
    const response = await invokeHandler(handler, {
      type: 'HIDDEN_VIDEOS_GET_MANY',
      ids: ['remove-me']
    });
    expect(response.ok).toBe(true);
    expect(response.result.records['remove-me']).toBeUndefined();
  });

  test('paginates results and reports stats', async () => {
    const handler = await setupService();
    for (let i = 0; i < 10; i += 1) {
      await invokeHandler(handler, {
        type: 'HIDDEN_VIDEOS_SET_STATE',
        videoId: `video-${i}`,
        state: i % 2 === 0 ? 'hidden' : 'dimmed',
        title: `Video ${i}`
      });
    }
    const statsResponse = await invokeHandler(handler, { type: 'HIDDEN_VIDEOS_GET_STATS' });
    expect(statsResponse.result.total).toBe(10);
    expect(statsResponse.result.hidden).toBe(5);

    const pageResponse = await invokeHandler(handler, { type: 'HIDDEN_VIDEOS_GET_PAGE', limit: 3 });
    expect(pageResponse.result.items).toHaveLength(3);
    expect(pageResponse.result.hasMore).toBe(true);
  });

  test('migrates legacy storage entries into IndexedDB', async () => {
    const handler = await setupService({
      legacyVideo: { state: 'hidden', title: 'Legacy Title', updatedAt: 123 }
    });
    const response = await invokeHandler(handler, {
      type: 'HIDDEN_VIDEOS_GET_MANY',
      ids: ['legacyVideo']
    });
    expect(response.ok).toBe(true);
    expect(response.result.records.legacyVideo.title).toBe('Legacy Title');
  });

  test('broadcast handles APIs without promise support', async () => {
    const originalRuntimeSend = chrome.runtime.sendMessage;
    const originalTabSend = chrome.tabs.sendMessage;
    const originalQuery = chrome.tabs.query;
    chrome.runtime.sendMessage = jest.fn(() => undefined);
    chrome.tabs.sendMessage = jest.fn(() => undefined);
    chrome.tabs.query = jest.fn((queryInfo, callback) => {
      const tabs = [{ id: 999, url: 'https://www.youtube.com/watch?v=test' }];
      if (typeof callback === 'function') {
        callback(tabs);
      }
      return Promise.resolve(tabs);
    });
    const handler = await setupService();
    await invokeHandler(handler, {
      type: 'HIDDEN_VIDEOS_SET_STATE',
      videoId: 'no-promise',
      state: 'hidden',
      title: ''
    });
    expect(chrome.runtime.sendMessage).toHaveBeenCalled();
    expect(chrome.tabs.sendMessage).toHaveBeenCalled();
    chrome.runtime.sendMessage = originalRuntimeSend;
    chrome.tabs.sendMessage = originalTabSend;
    chrome.tabs.query = originalQuery;
  });
});
