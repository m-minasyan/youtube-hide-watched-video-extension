import { HIDDEN_VIDEO_MESSAGES } from '../utils/constants.js';
import { logDebug } from '../utils/logger.js';
import { retryOperation, logError, classifyError, ErrorType } from '../../shared/errorHandler.js';
import {
  getCachedHiddenVideo,
  mergeFetchedRecord,
  applyCacheUpdate,
  hasCachedVideo,
  hasPendingRequest,
  getPendingRequest,
  setPendingRequest,
  deletePendingRequest
} from './cache.js';

// Message timeout duration
const MESSAGE_TIMEOUT = 5000;

// Send message with timeout
function sendMessageWithTimeout(message, timeout = MESSAGE_TIMEOUT) {
  return Promise.race([
    chrome.runtime.sendMessage(message),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Message timeout')), timeout)
    )
  ]);
}

// Enhanced sendHiddenVideosMessage with retry
export async function sendHiddenVideosMessage(type, payload = {}) {
  return retryOperation(
    async () => {
      try {
        const response = await sendMessageWithTimeout({ type, ...payload });

        if (!response) {
          throw new Error('No response from background script');
        }

        if (!response.ok) {
          const error = new Error(response.error || 'hidden video message failed');
          error.response = response;
          throw error;
        }

        return response.result;
      } catch (error) {
        logError('ContentMessaging', error, { type, payload });
        throw error;
      }
    },
    {
      maxAttempts: 3,
      initialDelay: 200,
      shouldRetry: (error) => {
        const errorType = classifyError(error);
        return errorType === ErrorType.NETWORK || errorType === ErrorType.TRANSIENT;
      },
      onRetry: (attempt, error) => {
        logDebug(`Retrying message (attempt ${attempt})`, error);
      }
    }
  );
}

export async function fetchHiddenVideoStates(videoIds) {
  const ids = Array.isArray(videoIds) ? videoIds.filter(Boolean) : [];
  if (ids.length === 0) return {};

  const unique = Array.from(new Set(ids));
  const result = {};
  const missing = [];
  const waiters = [];

  unique.forEach((videoId) => {
    if (hasCachedVideo(videoId)) {
      result[videoId] = getCachedHiddenVideo(videoId);
      return;
    }
    if (hasPendingRequest(videoId)) {
      waiters.push(getPendingRequest(videoId).then((record) => {
        result[videoId] = record;
      }).catch(() => {
        // If pending request fails, we'll try to fetch again
        missing.push(videoId);
      }));
      return;
    }
    missing.push(videoId);
  });

  if (missing.length > 0) {
    const fetchPromise = sendHiddenVideosMessage(
      HIDDEN_VIDEO_MESSAGES.GET_MANY,
      { ids: missing }
    ).then((response) => {
      const records = response.records || {};
      missing.forEach((videoId) => {
        mergeFetchedRecord(videoId, records[videoId] || null);
        result[videoId] = getCachedHiddenVideo(videoId);
      });
      return records;
    }).catch((error) => {
      logError('ContentMessaging', error, {
        operation: 'fetchHiddenVideoStates',
        videoCount: missing.length
      });

      // Cache null values for failed fetches to prevent repeated failures
      missing.forEach((videoId) => {
        mergeFetchedRecord(videoId, null);
        result[videoId] = null;
      });

      throw error;
    }).finally(() => {
      missing.forEach((videoId) => deletePendingRequest(videoId));
    });

    missing.forEach((videoId) => {
      const promise = fetchPromise
        .then(() => getCachedHiddenVideo(videoId))
        .catch(() => null);
      setPendingRequest(videoId, promise);
      waiters.push(promise.then((record) => {
        result[videoId] = record;
      }));
    });
  }

  if (waiters.length > 0) {
    // Use Promise.allSettled to not fail on individual errors
    await Promise.allSettled(waiters);
  }

  return result;
}

export async function setHiddenVideoState(videoId, state, title) {
  const sanitizedId = videoId ? String(videoId).trim() : '';
  if (!sanitizedId) return null;

  // Optimistic update
  const optimisticRecord = {
    videoId: sanitizedId,
    state,
    title: title || '',
    updatedAt: Date.now()
  };
  applyCacheUpdate(sanitizedId, state === 'normal' ? null : optimisticRecord);

  const payload = {
    videoId: sanitizedId,
    state,
    title: title || ''
  };

  try {
    const result = await sendHiddenVideosMessage(HIDDEN_VIDEO_MESSAGES.SET_STATE, payload);

    if (result && result.record) {
      applyCacheUpdate(sanitizedId, result.record);
      return result.record;
    }

    applyCacheUpdate(sanitizedId, null);
    return null;
  } catch (error) {
    logError('ContentMessaging', error, {
      operation: 'setHiddenVideoState',
      videoId: sanitizedId,
      state
    });

    // Revert optimistic update on failure
    applyCacheUpdate(sanitizedId, null);
    throw error;
  }
}
