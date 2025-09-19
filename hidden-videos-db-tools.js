const HIDDEN_VIDEO_MESSAGES = {
  GET_PAGE: 'HIDDEN_VIDEOS_GET_PAGE',
  GET_STATS: 'HIDDEN_VIDEOS_GET_STATS',
  CLEAR_ALL: 'HIDDEN_VIDEOS_CLEAR_ALL'
};

async function sendHiddenVideosMessage(type, payload = {}) {
  const response = await chrome.runtime.sendMessage({ type, ...payload });
  if (!response || !response.ok) {
    throw new Error(response?.error || 'Hidden videos request failed');
  }
  return response.result;
}
async function dumpHiddenVideos(limit = 1000) {
  const items = [];
  let cursor = null;
  let hasMore = true;
  while (hasMore && items.length < limit) {
    const pageLimit = Math.min(200, Math.max(1, limit - items.length));
    const result = await sendHiddenVideosMessage(HIDDEN_VIDEO_MESSAGES.GET_PAGE, {
      state: null,
      cursor,
      limit: pageLimit
    });
    const pageItems = Array.isArray(result?.items) ? result.items : [];
    items.push(...pageItems);
    hasMore = Boolean(result?.hasMore);
    cursor = result?.nextCursor || null;
  }
  return {
    items,
    hasMore,
    nextCursor: cursor
  };
}

async function resetHiddenVideosDb() {
  await sendHiddenVideosMessage(HIDDEN_VIDEO_MESSAGES.CLEAR_ALL);
}

async function getHiddenVideosStats() {
  return sendHiddenVideosMessage(HIDDEN_VIDEO_MESSAGES.GET_STATS);
}

window.ythwvDbTools = {
  dumpHiddenVideos,
  resetHiddenVideosDb,
  getHiddenVideosStats
};
