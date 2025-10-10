// Mock dependencies
jest.mock('../background/indexedDb.js', () => ({
  initializeDb: jest.fn().mockResolvedValue(undefined),
  getHiddenVideosByIds: jest.fn().mockResolvedValue({}),
  upsertHiddenVideo: jest.fn().mockResolvedValue(undefined),
  getHiddenVideosStats: jest.fn().mockResolvedValue({ total: 0 }),
  clearHiddenVideosStore: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('../background/indexedDbCache.js', () => ({
  getCacheStats: jest.fn().mockReturnValue({ size: 0, ttl: 30000 })
}));

jest.mock('../shared/utils.js', () => ({
  ensurePromise: jest.fn((promise) => promise),
  queryYoutubeTabs: jest.fn().mockResolvedValue([])
}));

// Mock chrome API
global.chrome = {
  runtime: {
    onMessage: {
      addListener: jest.fn()
    },
    sendMessage: jest.fn()
  },
  storage: {
    local: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined)
    },
    sync: {
      get: jest.fn().mockResolvedValue({}),
      remove: jest.fn().mockResolvedValue(undefined)
    }
  }
};

describe('Background Initialization', () => {
  let initializeHiddenVideosService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    // Re-import the module fresh each time to reset state
    const module = require('../background/hiddenVideosService.js');
    initializeHiddenVideosService = module.initializeHiddenVideosService;
  });

  describe('Message Listener Registration', () => {
    it('should register message listener before async initialization', async () => {
      await initializeHiddenVideosService();

      // Message listener should be registered
      expect(chrome.runtime.onMessage.addListener).toHaveBeenCalled();
    });

    it('should register message listener only once on multiple calls', async () => {
      await initializeHiddenVideosService();
      await initializeHiddenVideosService();
      await initializeHiddenVideosService();

      // Should only register once
      expect(chrome.runtime.onMessage.addListener).toHaveBeenCalledTimes(1);
    });

    it('should register listener synchronously before database initialization', async () => {
      const callOrder = [];

      const { initializeDb } = require('../background/indexedDb.js');
      initializeDb.mockImplementation(async () => {
        callOrder.push('db-init');
      });

      chrome.runtime.onMessage.addListener.mockImplementation(() => {
        callOrder.push('listener-registered');
      });

      await initializeHiddenVideosService();

      // Listener should be registered before database initialization
      expect(callOrder[0]).toBe('listener-registered');
      expect(callOrder[1]).toBe('db-init');
    });
  });

  describe('Health Check Handler', () => {
    it('should handle health check messages', async () => {
      await initializeHiddenVideosService();

      const listener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();

      // Send health check message
      const result = listener(
        { type: 'HIDDEN_VIDEOS_HEALTH_CHECK' },
        {},
        sendResponse
      );

      expect(result).toBe(true); // Keep channel open

      // Wait for async response
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(sendResponse).toHaveBeenCalledWith({
        ok: true,
        result: {
          ready: true,
          error: null,
          components: {
            messageListener: true,
            database: true,
            migration: true
          },
          cache: {
            size: 0,
            ttl: 30000
          }
        }
      });
    });

    it('should return ready status after initialization completes', async () => {
      await initializeHiddenVideosService();

      const listener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();

      listener(
        { type: 'HIDDEN_VIDEOS_HEALTH_CHECK' },
        {},
        sendResponse
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      const response = sendResponse.mock.calls[0][0];
      expect(response.ok).toBe(true);
      expect(response.result.ready).toBe(true);
      expect(response.result.error).toBe(null);
    });

    it('should return error status when initialization fails', async () => {
      const { initializeDb } = require('../background/indexedDb.js');
      initializeDb.mockRejectedValueOnce(new Error('Database initialization failed'));

      try {
        await initializeHiddenVideosService();
      } catch (error) {
        // Expected to fail
      }

      const listener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();

      listener(
        { type: 'HIDDEN_VIDEOS_HEALTH_CHECK' },
        {},
        sendResponse
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      const response = sendResponse.mock.calls[0][0];
      expect(response.ok).toBe(true);
      expect(response.result.ready).toBe(true); // Marked complete even on error
      expect(response.result.error).toContain('Database initialization failed');
    });
  });

  describe('Message Handler Wait Logic', () => {
    it('should wait for initialization before processing non-health-check messages', async () => {
      const { initializeDb } = require('../background/indexedDb.js');
      let dbInitComplete = false;

      initializeDb.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        dbInitComplete = true;
      });

      const initPromise = initializeHiddenVideosService();

      const listener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();

      // Try to get stats before initialization completes
      listener(
        { type: 'HIDDEN_VIDEOS_GET_STATS' },
        {},
        sendResponse
      );

      // Should not have responded yet (waiting for init)
      expect(sendResponse).not.toHaveBeenCalled();

      // Wait for initialization to complete
      await initPromise;
      await new Promise(resolve => setTimeout(resolve, 150));

      // Now should have responded
      expect(sendResponse).toHaveBeenCalled();
      expect(dbInitComplete).toBe(true);
    });

    it('should not wait for initialization for health check messages', async () => {
      const { initializeDb } = require('../background/indexedDb.js');

      initializeDb.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      const initPromise = initializeHiddenVideosService();

      const listener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();

      // Send health check immediately
      listener(
        { type: 'HIDDEN_VIDEOS_HEALTH_CHECK' },
        {},
        sendResponse
      );

      // Should respond immediately without waiting
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(sendResponse).toHaveBeenCalled();
      const response = sendResponse.mock.calls[0][0];
      expect(response.result.ready).toBe(false); // Not ready yet

      await initPromise;
    });
  });

  describe('Initialization Error Handling', () => {
    it('should mark initialization as complete even on error', async () => {
      const { initializeDb } = require('../background/indexedDb.js');
      initializeDb.mockRejectedValueOnce(new Error('Test error'));

      try {
        await initializeHiddenVideosService();
      } catch (error) {
        // Expected
      }

      const listener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();

      listener(
        { type: 'HIDDEN_VIDEOS_HEALTH_CHECK' },
        {},
        sendResponse
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      const response = sendResponse.mock.calls[0][0];
      expect(response.result.ready).toBe(true);
      expect(response.result.error).toBeTruthy();
    });

    it('should provide meaningful error messages', async () => {
      const { initializeDb } = require('../background/indexedDb.js');
      initializeDb.mockRejectedValue(new Error('Quota exceeded'));

      try {
        await initializeHiddenVideosService();
      } catch (error) {
        // Expected
      }

      const listener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();

      listener(
        { type: 'HIDDEN_VIDEOS_GET_STATS' },
        {},
        sendResponse
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      const response = sendResponse.mock.calls[0][0];
      expect(response.ok).toBe(false);
      expect(response.error).toContain('Background service initialization failed');
    });
  });
});
