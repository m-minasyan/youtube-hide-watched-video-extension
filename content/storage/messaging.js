import { HIDDEN_VIDEO_MESSAGES } from '../utils/constants.js';
import { logDebug } from '../utils/logger.js';
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

export async function sendHiddenVideosMessage(type, payload = {}) {
  try {
    const response = await chrome.runtime.sendMessage({ type, ...payload });
    if (!response || !response.ok) {
      throw new Error(response?.error || 'hidden video message failed');
    }
    return response.result;
  } catch (error) {
    logDebug('Hidden videos message error', error);
    throw error;
  }
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
      }));
      return;
    }
    missing.push(videoId);
  });

  if (missing.length > 0) {
    const fetchPromise = sendHiddenVideosMessage(HIDDEN_VIDEO_MESSAGES.GET_MANY, { ids: missing }).then((response) => {
      const records = response.records || {};
      missing.forEach((videoId) => {
        mergeFetchedRecord(videoId, records[videoId] || null);
        result[videoId] = getCachedHiddenVideo(videoId);
      });
      return records;
    }).finally(() => {
      missing.forEach((videoId) => deletePendingRequest(videoId));
    });

    missing.forEach((videoId) => {
      const promise = fetchPromise.then(() => getCachedHiddenVideo(videoId));
      setPendingRequest(videoId, promise);
      waiters.push(promise.then((record) => {
        result[videoId] = record;
      }));
    });
  }

  if (waiters.length > 0) {
    await Promise.all(waiters);
  }

  return result;
}

export async function setHiddenVideoState(videoId, state, title) {
  const sanitizedId = videoId ? String(videoId).trim() : '';
  if (!sanitizedId) return null;
  const payload = {
    videoId: sanitizedId,
    state,
    title: title || ''
  };
  const result = await sendHiddenVideosMessage(HIDDEN_VIDEO_MESSAGES.SET_STATE, payload);
  if (result && result.record) {
    applyCacheUpdate(sanitizedId, result.record);
    return result.record;
  }
  applyCacheUpdate(sanitizedId, null);
  return null;
}
