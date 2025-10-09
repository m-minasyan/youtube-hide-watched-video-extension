/**
 * @jest-environment jsdom
 */

import {
  handleHiddenVideosEvent,
  applyHiding,
  setupMessageListener
} from '../../../content/events/eventHandler.js';
import { applyCacheUpdate, clearCache, getCachedHiddenVideo } from '../../../content/storage/cache.js';

// Mock the dependencies
jest.mock('../../../content/hiding/watchedHiding.js', () => ({
  updateClassOnWatchedItems: jest.fn()
}));

jest.mock('../../../content/hiding/shortsHiding.js', () => ({
  updateClassOnShortsItems: jest.fn()
}));

jest.mock('../../../content/ui/eyeButtonManager.js', () => ({
  addEyeButtons: jest.fn()
}));

jest.mock('../../../content/hiding/individualHiding.js', () => ({
  applyIndividualHiding: jest.fn()
}));

jest.mock('../../../content/storage/settings.js', () => ({
  loadSettings: jest.fn().mockResolvedValue(undefined)
}));

import { updateClassOnWatchedItems } from '../../../content/hiding/watchedHiding.js';
import { updateClassOnShortsItems } from '../../../content/hiding/shortsHiding.js';
import { addEyeButtons } from '../../../content/ui/eyeButtonManager.js';
import { applyIndividualHiding } from '../../../content/hiding/individualHiding.js';
import { loadSettings } from '../../../content/storage/settings.js';

describe('EventHandler Module', () => {
  beforeEach(() => {
    clearCache();
    jest.clearAllMocks();
    document.body.innerHTML = '';
  });

  describe('handleHiddenVideosEvent', () => {
    test('should handle "updated" event and update cache', () => {
      const event = {
        type: 'updated',
        record: { videoId: 'vid-1', state: 'dimmed', timestamp: 1000 }
      };

      handleHiddenVideosEvent(event);

      const cached = getCachedHiddenVideo('vid-1');
      expect(cached).toEqual(event.record);
      expect(applyIndividualHiding).toHaveBeenCalled();
    });

    test('should update eye button state on "updated" event', () => {
      const button = document.createElement('button');
      button.className = 'yt-hwv-eye-button';
      button.setAttribute('data-video-id', 'vid-1');
      document.body.appendChild(button);

      const event = {
        type: 'updated',
        record: { videoId: 'vid-1', state: 'hidden', timestamp: 1000 }
      };

      handleHiddenVideosEvent(event);

      expect(button.classList.contains('hidden')).toBe(true);
    });

    test('should handle "removed" event and clear cache', () => {
      applyCacheUpdate('vid-1', { videoId: 'vid-1', state: 'dimmed', timestamp: 1000 });

      const event = {
        type: 'removed',
        videoId: 'vid-1'
      };

      handleHiddenVideosEvent(event);

      expect(getCachedHiddenVideo('vid-1')).toBeNull();
      expect(applyIndividualHiding).toHaveBeenCalled();
    });

    test('should reset eye button state on "removed" event', () => {
      const button = document.createElement('button');
      button.className = 'yt-hwv-eye-button hidden';
      button.setAttribute('data-video-id', 'vid-1');
      document.body.appendChild(button);

      const event = {
        type: 'removed',
        videoId: 'vid-1'
      };

      handleHiddenVideosEvent(event);

      expect(button.classList.contains('hidden')).toBe(false);
      expect(button.classList.contains('dimmed')).toBe(false);
    });

    test('should handle "cleared" event and clear entire cache', () => {
      applyCacheUpdate('vid-1', { videoId: 'vid-1', state: 'dimmed', timestamp: 1000 });
      applyCacheUpdate('vid-2', { videoId: 'vid-2', state: 'hidden', timestamp: 2000 });

      const event = {
        type: 'cleared'
      };

      handleHiddenVideosEvent(event);

      expect(getCachedHiddenVideo('vid-1')).toBeNull();
      expect(getCachedHiddenVideo('vid-2')).toBeNull();
      expect(applyIndividualHiding).toHaveBeenCalled();
    });

    test('should reset all eye buttons on "cleared" event', () => {
      const button1 = document.createElement('button');
      button1.className = 'yt-hwv-eye-button dimmed';
      const button2 = document.createElement('button');
      button2.className = 'yt-hwv-eye-button hidden';
      document.body.appendChild(button1);
      document.body.appendChild(button2);

      const event = {
        type: 'cleared'
      };

      handleHiddenVideosEvent(event);

      expect(button1.classList.contains('dimmed')).toBe(false);
      expect(button2.classList.contains('hidden')).toBe(false);
    });

    test('should handle invalid event gracefully', () => {
      expect(() => handleHiddenVideosEvent(null)).not.toThrow();
      expect(() => handleHiddenVideosEvent({})).not.toThrow();
      expect(() => handleHiddenVideosEvent({ type: 'unknown' })).not.toThrow();
    });
  });

  describe('applyHiding', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should call watched and shorts hiding functions', () => {
      applyHiding();

      expect(updateClassOnWatchedItems).toHaveBeenCalled();
      expect(updateClassOnShortsItems).toHaveBeenCalled();
    });

    test('should add eye buttons after delay', () => {
      applyHiding();

      expect(addEyeButtons).not.toHaveBeenCalled();

      jest.advanceTimersByTime(500);

      expect(addEyeButtons).toHaveBeenCalled();
    });

    test('should apply individual hiding after delay', () => {
      applyHiding();

      expect(applyIndividualHiding).not.toHaveBeenCalled();

      jest.advanceTimersByTime(500);

      expect(applyIndividualHiding).toHaveBeenCalled();
    });
  });

  describe('setupMessageListener', () => {
    let mockOnMessage;

    beforeEach(() => {
      mockOnMessage = { addListener: jest.fn() };
      global.chrome = {
        runtime: {
          onMessage: mockOnMessage
        }
      };
    });

    test('should register chrome.runtime.onMessage listener', () => {
      setupMessageListener();

      expect(mockOnMessage.addListener).toHaveBeenCalled();
    });

    test('should handle "settingsUpdated" message', async () => {
      let messageHandler;
      mockOnMessage.addListener.mockImplementation(handler => {
        messageHandler = handler;
      });

      setupMessageListener();

      await messageHandler({ action: 'settingsUpdated' }, {}, jest.fn());

      expect(loadSettings).toHaveBeenCalled();
    });

    test('should handle "resetSettings" message', async () => {
      let messageHandler;
      mockOnMessage.addListener.mockImplementation(handler => {
        messageHandler = handler;
      });

      setupMessageListener();

      await messageHandler({ action: 'resetSettings' }, {}, jest.fn());

      expect(loadSettings).toHaveBeenCalled();
    });

    test('should handle "HIDDEN_VIDEOS_EVENT" message', async () => {
      let messageHandler;
      mockOnMessage.addListener.mockImplementation(handler => {
        messageHandler = handler;
      });

      setupMessageListener();

      const event = { videoId: 'vid-1', state: 'dimmed' };
      await messageHandler(
        { type: 'HIDDEN_VIDEOS_EVENT', event: { type: 'updated', record: event } },
        {},
        jest.fn()
      );

      const cached = getCachedHiddenVideo('vid-1');
      expect(cached).toEqual(event);
    });

    test('should register custom event listener for individual updates', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

      setupMessageListener();

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'yt-hwv-individual-update',
        expect.any(Function)
      );
    });
  });
});
