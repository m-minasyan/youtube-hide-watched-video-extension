describe('Hidden videos developer tools', () => {
  beforeEach(() => {
    jest.resetModules();
    chrome.runtime.sendMessage.mockReset();
    window.ythwvDbTools = undefined;
  });

  test('registers helper functions on window', async () => {
    chrome.runtime.sendMessage.mockResolvedValue({ ok: true, result: { items: [], hasMore: false, nextCursor: null } });
    await import('../hidden-videos-db-tools.js');
    expect(window.ythwvDbTools).toBeDefined();
    expect(typeof window.ythwvDbTools.dumpHiddenVideos).toBe('function');
    expect(typeof window.ythwvDbTools.resetHiddenVideosDb).toBe('function');
  });

  test('dumpHiddenVideos forwards results from background', async () => {
    chrome.runtime.sendMessage.mockResolvedValueOnce({
      ok: true,
      result: {
        items: [{ videoId: 'abc', state: 'hidden', title: 'Video', updatedAt: 10 }],
        hasMore: false,
        nextCursor: null
      }
    });
    await import('../hidden-videos-db-tools.js');
    const result = await window.ythwvDbTools.dumpHiddenVideos(10);
    expect(result.items).toHaveLength(1);
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'HIDDEN_VIDEOS_GET_PAGE',
      state: null,
      cursor: null,
      limit: 10
    });
  });
});
