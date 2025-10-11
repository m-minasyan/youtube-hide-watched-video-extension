const deleteDatabase = (name) => new Promise((resolve, reject) => {
  const request = indexedDB.deleteDatabase(name);
  request.onsuccess = () => resolve();
  request.onerror = () => reject(request.error);
  request.onblocked = () => resolve();
});

describe('IndexedDB hidden videos store', () => {
  let dbModule;

  beforeEach(async () => {
    jest.resetModules();
    await deleteDatabase('ythwvHiddenVideos');
    dbModule = await import('../background/indexedDb.js');
    await dbModule.initializeDb();
  });

  test('upserts and retrieves hidden videos by id', async () => {
    await dbModule.upsertHiddenVideos([
      { videoId: 'video-a-test', state: 'hidden', title: 'First', updatedAt: 1000 },
      { videoId: 'video-b-test', state: 'dimmed', title: 'Second', updatedAt: 2000 }
    ]);
    const result = await dbModule.getHiddenVideosByIds(['video-a-test', 'video-b-test', 'video-c-test']);
    expect(Object.keys(result)).toEqual(['video-a-test', 'video-b-test']);
    expect(result['video-a-test'].state).toBe('hidden');
    expect(result['video-b-test'].state).toBe('dimmed');
  });

  test('paginates results ordered by updatedAt', async () => {
    const records = [];
    for (let i = 0; i < 5; i += 1) {
      records.push({
        videoId: `test-video-${i}`,
        state: i % 2 === 0 ? 'hidden' : 'dimmed',
        title: `Video ${i}`,
        updatedAt: 1000 + i
      });
    }
    await dbModule.upsertHiddenVideos(records);
    const page1 = await dbModule.getHiddenVideosPage({ limit: 2 });
    expect(page1.items.map((item) => item.videoId)).toEqual(['test-video-4', 'test-video-3']);
    expect(page1.hasMore).toBe(true);
    const page2 = await dbModule.getHiddenVideosPage({ limit: 2, cursor: page1.nextCursor });
    expect(page2.items.map((item) => item.videoId)).toEqual(['test-video-2', 'test-video-1']);
  });

  test('computes stats and clears store', async () => {
    await dbModule.upsertHiddenVideos([
      { videoId: 'video-x-test', state: 'hidden', title: '', updatedAt: Date.now() },
      { videoId: 'video-y-test', state: 'dimmed', title: '', updatedAt: Date.now() }
    ]);
    const stats = await dbModule.getHiddenVideosStats();
    expect(stats.total).toBe(2);
    expect(stats.hidden).toBe(1);
    expect(stats.dimmed).toBe(1);
    await dbModule.clearHiddenVideosStore();
    const clearedStats = await dbModule.getHiddenVideosStats();
    expect(clearedStats.total).toBe(0);
  });

  test('removes oldest records when pruning', async () => {
    const now = Date.now();
    await dbModule.upsertHiddenVideos([
      { videoId: 'video-old-test', state: 'hidden', title: '', updatedAt: now - 100 },
      { videoId: 'video-new-test', state: 'hidden', title: '', updatedAt: now }
    ]);
    await dbModule.deleteOldestHiddenVideos(1);
    const remaining = await dbModule.getHiddenVideosByIds(['video-old-test', 'video-new-test']);
    expect(remaining['video-old-test']).toBeUndefined();
    expect(remaining['video-new-test']).toBeTruthy();
  });
});
