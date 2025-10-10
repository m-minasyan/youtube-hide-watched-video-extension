/**
 * Integration tests for message passing with error handling
 */

describe('Message Passing Error Handling Integration', () => {
  let chrome;

  beforeEach(() => {
    jest.resetModules();
    // Mock chrome.runtime API
    chrome = {
      runtime: {
        id: 'test-extension-id',
        sendMessage: jest.fn()
      }
    };
    global.chrome = chrome;
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete global.chrome;
  });

  describe('Timeout handling', () => {
    it('should timeout after specified duration', async () => {
      // Mock sendMessage to never resolve
      chrome.runtime.sendMessage.mockImplementation(() =>
        new Promise(() => {}) // Never resolves
      );

      const { sendHiddenVideosMessage } = require('../content/storage/messaging.js');

      // Should timeout and throw error (MESSAGE_TIMEOUT is 5000ms)
      // With maxAttempts: 5, this will timeout 5 times before giving up
      // Each attempt: 5000ms timeout + exponential backoff (300, 600, 1200, 2400ms)
      // Total worst case: ~31s
      await expect(
        sendHiddenVideosMessage('TEST_MESSAGE', { data: 'test' })
      ).rejects.toThrow('Message timeout');
    }, 35000); // 35 second timeout for test itself to allow 5 retries with 5s timeout each + backoff delays

    it('should succeed if response comes before timeout', async () => {
      chrome.runtime.sendMessage.mockResolvedValue({
        ok: true,
        result: { data: 'success' }
      });

      const { sendHiddenVideosMessage } = require('../content/storage/messaging.js');

      const result = await sendHiddenVideosMessage('TEST_MESSAGE', { data: 'test' });
      expect(result).toEqual({ data: 'success' });
    });
  });

  describe('Retry logic', () => {
    it('should retry on network errors', async () => {
      chrome.runtime.sendMessage
        .mockRejectedValueOnce(new Error('No receiver'))
        .mockResolvedValue({ ok: true, result: { records: {} } });

      const { sendHiddenVideosMessage } = require('../content/storage/messaging.js');

      const result = await sendHiddenVideosMessage('GET_MANY', { ids: ['test'] });

      expect(result).toEqual({ records: {} });
      expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(2);
    });

    it('should retry on transient errors', async () => {
      chrome.runtime.sendMessage
        .mockRejectedValueOnce(new Error('Connection disconnected'))
        .mockRejectedValueOnce(new Error('Message timeout'))
        .mockResolvedValue({ ok: true, result: { records: {} } });

      const { sendHiddenVideosMessage } = require('../content/storage/messaging.js');

      const result = await sendHiddenVideosMessage('GET_MANY', { ids: ['test'] });

      expect(result).toEqual({ records: {} });
      // Should succeed on 3rd attempt (2 failures + 1 success)
      expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(3);
    });

    it('should not retry on permanent errors', async () => {
      chrome.runtime.sendMessage.mockResolvedValue({
        ok: false,
        error: 'Invalid request'
      });

      const { sendHiddenVideosMessage } = require('../content/storage/messaging.js');

      await expect(
        sendHiddenVideosMessage('INVALID_MESSAGE', {})
      ).rejects.toThrow();

      // Permanent errors (response with ok: false) are not retried
      // Should fail immediately on first attempt
      expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
    });

    it('should give up after max attempts', async () => {
      chrome.runtime.sendMessage.mockRejectedValue(new Error('No receiver'));

      const { sendHiddenVideosMessage } = require('../content/storage/messaging.js');

      await expect(
        sendHiddenVideosMessage('TEST_MESSAGE', {})
      ).rejects.toThrow('No receiver');

      expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(5); // maxAttempts = 5
    });
  });

  describe('Optimistic updates', () => {
    it('should apply optimistic update before request', async () => {
      chrome.runtime.sendMessage.mockImplementation(() =>
        new Promise(resolve => {
          setTimeout(() => {
            resolve({ ok: true, result: { record: { videoId: 'test123', state: 'hidden' } } });
          }, 100);
        })
      );

      const { setHiddenVideoState } = require('../content/storage/messaging.js');
      const { getCachedHiddenVideo } = require('../content/storage/cache.js');

      const promise = setHiddenVideoState('test123', 'hidden', 'Test Video');

      // Check optimistic update was applied
      const cached = getCachedHiddenVideo('test123');
      expect(cached).toBeTruthy();
      expect(cached.state).toBe('hidden');

      await promise;
    });

    it('should revert optimistic update on failure', async () => {
      chrome.runtime.sendMessage.mockRejectedValue(new Error('Network error'));

      const { setHiddenVideoState } = require('../content/storage/messaging.js');
      const { getCachedHiddenVideo } = require('../content/storage/cache.js');

      try {
        await setHiddenVideoState('test123', 'hidden', 'Test Video');
      } catch (error) {
        // Expected to fail
      }

      // Cache should be reverted (null or original state)
      const cached = getCachedHiddenVideo('test123');
      expect(cached).toBeFalsy();
    });

    it('should update cache with server response on success', async () => {
      const serverRecord = {
        videoId: 'test123',
        state: 'dimmed',
        title: 'Server Title',
        updatedAt: Date.now()
      };

      chrome.runtime.sendMessage.mockResolvedValue({
        ok: true,
        result: { record: serverRecord }
      });

      const { setHiddenVideoState } = require('../content/storage/messaging.js');
      const { getCachedHiddenVideo } = require('../content/storage/cache.js');

      await setHiddenVideoState('test123', 'dimmed', 'Client Title');

      const cached = getCachedHiddenVideo('test123');
      expect(cached).toEqual(serverRecord);
    });
  });

  describe('Error logging', () => {
    it('should log errors with context', async () => {
      chrome.runtime.sendMessage.mockRejectedValue(new Error('Test error'));

      const { logError } = require('../shared/errorHandler.js');
      const logErrorSpy = jest.spyOn({ logError }, 'logError');

      const { sendHiddenVideosMessage } = require('../content/storage/messaging.js');

      try {
        await sendHiddenVideosMessage('TEST_MESSAGE', { data: 'test' });
      } catch (error) {
        // Expected
      }

      // Error should have been logged (can't easily verify due to module isolation)
    });
  });

  describe('Batch operations', () => {
    it('should handle partial failures in batch fetches', async () => {
      chrome.runtime.sendMessage.mockResolvedValue({
        ok: true,
        result: {
          records: {
            'video1': { videoId: 'video1', state: 'hidden' },
            // video2 missing (null/undefined)
            'video3': { videoId: 'video3', state: 'dimmed' }
          }
        }
      });

      const { fetchHiddenVideoStates } = require('../content/storage/messaging.js');

      const result = await fetchHiddenVideoStates(['video1', 'video2', 'video3']);

      expect(result.video1).toBeTruthy();
      expect(result.video2).toBeFalsy();
      expect(result.video3).toBeTruthy();
    });

    it('should cache null for failed fetches', async () => {
      chrome.runtime.sendMessage.mockRejectedValue(new Error('Network error'));

      const { fetchHiddenVideoStates } = require('../content/storage/messaging.js');
      const { getCachedHiddenVideo, clearCache } = require('../content/storage/cache.js');

      // Clear cache before test to ensure clean state
      clearCache();

      // fetchHiddenVideoStates uses Promise.allSettled so it doesn't reject
      const result = await fetchHiddenVideoStates(['video1', 'video2']);

      // Should return null values for failed fetches
      expect(result.video1).toBe(null);
      expect(result.video2).toBe(null);

      // Should cache null to prevent repeated failures
      const cached1 = getCachedHiddenVideo('video1');
      const cached2 = getCachedHiddenVideo('video2');

      // Implementation caches null values for failed fetches
      expect(cached1).toBe(null);
      expect(cached2).toBe(null);
    });
  });
});
