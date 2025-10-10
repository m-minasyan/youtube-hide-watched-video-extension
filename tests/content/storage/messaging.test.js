/**
 * @jest-environment jsdom
 */

import {
  sendHiddenVideosMessage,
  fetchHiddenVideoStates,
  setHiddenVideoState
} from '../../../content/storage/messaging.js';
import { getCachedHiddenVideo, clearCache } from '../../../content/storage/cache.js';

describe('Messaging Module', () => {
  let mockSendMessage;

  beforeEach(() => {
    clearCache();
    mockSendMessage = jest.fn();
    global.chrome = {
      runtime: {
        id: 'test-extension-id',
        sendMessage: mockSendMessage
      }
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendHiddenVideosMessage', () => {
    test('should send message via chrome.runtime.sendMessage', async () => {
      mockSendMessage.mockResolvedValue({ ok: true, result: { success: true } });

      const result = await sendHiddenVideosMessage('TEST_TYPE', { data: 'test' });

      expect(mockSendMessage).toHaveBeenCalledWith({
        type: 'TEST_TYPE',
        data: 'test'
      });
      expect(result).toEqual({ success: true });
    });

    test('should handle message sending errors', async () => {
      mockSendMessage.mockRejectedValue(new Error('Send failed'));

      await expect(sendHiddenVideosMessage('TEST', {})).rejects.toThrow('Send failed');
    });

    test('should handle failed response', async () => {
      mockSendMessage.mockResolvedValue({ ok: false, error: 'Failed to process' });

      await expect(sendHiddenVideosMessage('TEST', {})).rejects.toThrow('Failed to process');
    });
  });

  describe('fetchHiddenVideoStates', () => {
    test('should fetch and cache multiple video states', async () => {
      const mockRecords = {
        'vid-1': { videoId: 'vid-1', state: 'dimmed', timestamp: 1000 },
        'vid-2': { videoId: 'vid-2', state: 'hidden', timestamp: 2000 }
      };
      mockSendMessage.mockResolvedValue({
        ok: true,
        result: { records: mockRecords }
      });

      await fetchHiddenVideoStates(['vid-1', 'vid-2']);

      expect(mockSendMessage).toHaveBeenCalledWith({
        type: 'HIDDEN_VIDEOS_GET_MANY',
        ids: ['vid-1', 'vid-2']
      });

      expect(getCachedHiddenVideo('vid-1')).toEqual(mockRecords['vid-1']);
      expect(getCachedHiddenVideo('vid-2')).toEqual(mockRecords['vid-2']);
    });

    test('should deduplicate pending requests for same video IDs', async () => {
      mockSendMessage.mockImplementation(() => new Promise(resolve => {
        setTimeout(() => resolve({ ok: true, result: { records: {} } }), 100);
      }));

      const promise1 = fetchHiddenVideoStates(['vid-1']);
      const promise2 = fetchHiddenVideoStates(['vid-1']);

      await Promise.all([promise1, promise2]);

      // Should only call sendMessage once due to deduplication
      expect(mockSendMessage).toHaveBeenCalledTimes(1);
    });

    test('should handle empty video ID array', async () => {
      const result = await fetchHiddenVideoStates([]);

      expect(mockSendMessage).not.toHaveBeenCalled();
      expect(result).toEqual({});
    });

    test('should handle fetch errors gracefully', async () => {
      mockSendMessage.mockRejectedValue(new Error('Network error'));

      // fetchHiddenVideoStates uses Promise.allSettled so it doesn't reject
      // Instead it returns null values for failed fetches
      const result = await fetchHiddenVideoStates(['vid-1']);

      // Should return null for the failed video
      expect(result['vid-1']).toBe(null);

      // Verify null was cached for the failed video
      expect(getCachedHiddenVideo('vid-1')).toBe(null);
    });
  });

  describe('setHiddenVideoState', () => {
    test('should set video state and return updated record', async () => {
      const mockRecord = { videoId: 'vid-1', state: 'dimmed', timestamp: Date.now() };
      mockSendMessage.mockResolvedValue({ ok: true, result: { record: mockRecord } });

      const result = await setHiddenVideoState('vid-1', 'dimmed', 'Test Video');

      expect(mockSendMessage).toHaveBeenCalledWith({
        type: 'HIDDEN_VIDEOS_SET_STATE',
        videoId: 'vid-1',
        state: 'dimmed',
        title: 'Test Video'
      });

      expect(result).toEqual(mockRecord);
      expect(getCachedHiddenVideo('vid-1')).toEqual(mockRecord);
    });

    test('should handle state update without title', async () => {
      const mockRecord = { videoId: 'vid-2', state: 'hidden', timestamp: Date.now() };
      mockSendMessage.mockResolvedValue({ ok: true, result: { record: mockRecord } });

      await setHiddenVideoState('vid-2', 'hidden');

      expect(mockSendMessage).toHaveBeenCalledWith({
        type: 'HIDDEN_VIDEOS_SET_STATE',
        videoId: 'vid-2',
        state: 'hidden',
        title: ''
      });
    });

    test('should cache the returned record', async () => {
      const mockRecord = { videoId: 'vid-3', state: 'dimmed', timestamp: 5000 };
      mockSendMessage.mockResolvedValue({ ok: true, result: { record: mockRecord } });

      await setHiddenVideoState('vid-3', 'dimmed', 'Video 3');

      const cached = getCachedHiddenVideo('vid-3');
      expect(cached).toEqual(mockRecord);
    });

    test('should handle state update errors', async () => {
      mockSendMessage.mockRejectedValue(new Error('Update failed'));

      await expect(setHiddenVideoState('vid-1', 'dimmed')).rejects.toThrow('Update failed');
    });
  });
});
