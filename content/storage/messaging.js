import { HIDDEN_VIDEO_MESSAGES } from '../utils/constants.js';
import {
  getCachedHiddenVideo,
  mergeFetchedRecord,
  applyCacheUpdate,
  hasCachedVideo,
  hasPendingRequest,
  getPendingRequest,
  setPendingRequest,
  deletePendingRequest,
  clearPendingRequests as clearPendingRequestsCache
} from './cache.js';
import { sendHiddenVideosMessage } from '../../shared/messaging.js';
import { logError, classifyError, ErrorType } from '../../shared/errorHandler.js';
import { showNotification } from '../../shared/notifications.js';

// Re-export sendHiddenVideosMessage for backward compatibility
export { sendHiddenVideosMessage };

/**
 * Clears all pending requests (useful for navigation events)
 */
export function clearPendingRequests() {
  clearPendingRequestsCache();
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
    // Note: We don't set a timeout to delete pending requests because that could
    // cause race conditions if the fetch takes longer than the timeout.
    // The finally block will clean up pending requests when the fetch completes.
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
      // Clean up pending requests after fetch completes (success or failure)
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

    // Show user notification for persistent errors (after all retries exhausted)
    const errorType = classifyError(error);
    // Check for DOM availability before showing notification
    if (typeof document !== 'undefined' && document.body) {
      const message = errorType === ErrorType.NETWORK
        ? 'Unable to connect to extension. Please check your connection.'
        : 'Failed to save video state. Please try again.';
      showNotification(message, 'error', 3000);
    }

    // Revert optimistic update on failure
    applyCacheUpdate(sanitizedId, null);
    throw error;
  }
}
