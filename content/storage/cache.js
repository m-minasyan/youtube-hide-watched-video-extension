const hiddenVideoCache = new Map();
const hiddenVideoTimestamps = new Map();
const pendingHiddenVideoRequests = new Map();

export function getRecordTimestamp(record) {
  return record && Number.isFinite(record.updatedAt) ? record.updatedAt : -1;
}

export function applyCacheUpdate(videoId, record) {
  if (!videoId) return;
  if (record) {
    const timestamp = getRecordTimestamp(record);
    hiddenVideoCache.set(videoId, record);
    hiddenVideoTimestamps.set(videoId, timestamp === -1 ? Date.now() : timestamp);
    return;
  }
  hiddenVideoCache.delete(videoId);
  hiddenVideoTimestamps.set(videoId, Date.now());
}

export function mergeFetchedRecord(videoId, record) {
  if (!videoId) return;
  const incomingTimestamp = getRecordTimestamp(record);
  if (hiddenVideoTimestamps.has(videoId)) {
    const currentTimestamp = hiddenVideoTimestamps.get(videoId);
    if (incomingTimestamp <= currentTimestamp) {
      return;
    }
  }
  if (record) {
    hiddenVideoCache.set(videoId, record);
    hiddenVideoTimestamps.set(videoId, incomingTimestamp === -1 ? Date.now() : incomingTimestamp);
    return;
  }
  hiddenVideoCache.delete(videoId);
}

export function getCachedHiddenVideo(videoId) {
  if (!videoId) return null;
  return hiddenVideoCache.get(videoId) || null;
}

export function clearCache() {
  hiddenVideoCache.clear();
  hiddenVideoTimestamps.clear();
}

export function hasPendingRequest(videoId) {
  return pendingHiddenVideoRequests.has(videoId);
}

export function getPendingRequest(videoId) {
  return pendingHiddenVideoRequests.get(videoId);
}

export function setPendingRequest(videoId, promise) {
  pendingHiddenVideoRequests.set(videoId, promise);
}

export function deletePendingRequest(videoId) {
  pendingHiddenVideoRequests.delete(videoId);
}

export function hasCachedVideo(videoId) {
  return hiddenVideoCache.has(videoId);
}
