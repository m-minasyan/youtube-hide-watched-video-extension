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
      { videoId: 'a', state: 'hidden', title: 'First', updatedAt: 1000 },
      { videoId: 'b', state: 'dimmed', title: 'Second', updatedAt: 2000 }
    ]);
    const result = await dbModule.getHiddenVideosByIds(['a', 'b', 'c']);
    expect(Object.keys(result)).toEqual(['a', 'b']);
    expect(result.a.state).toBe('hidden');
    expect(result.b.state).toBe('dimmed');
  });

  test('paginates results ordered by updatedAt', async () => {
    const records = [];
    for (let i = 0; i < 5; i += 1) {
      records.push({
        videoId: `video${i}`,
        state: i % 2 === 0 ? 'hidden' : 'dimmed',
        title: `Video ${i}`,
        updatedAt: 1000 + i
      });
    }
    await dbModule.upsertHiddenVideos(records);
    const page1 = await dbModule.getHiddenVideosPage({ limit: 2 });
    expect(page1.items.map((item) => item.videoId)).toEqual(['video4', 'video3']);
    expect(page1.hasMore).toBe(true);
    const page2 = await dbModule.getHiddenVideosPage({ limit: 2, cursor: page1.nextCursor });
    expect(page2.items.map((item) => item.videoId)).toEqual(['video2', 'video1']);
  });

  test('computes stats and clears store', async () => {
    await dbModule.upsertHiddenVideos([
      { videoId: 'x', state: 'hidden', title: '', updatedAt: Date.now() },
      { videoId: 'y', state: 'dimmed', title: '', updatedAt: Date.now() }
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
      { videoId: 'old', state: 'hidden', title: '', updatedAt: now - 100 },
      { videoId: 'new', state: 'hidden', title: '', updatedAt: now }
    ]);
    await dbModule.deleteOldestHiddenVideos(1);
    const remaining = await dbModule.getHiddenVideosByIds(['old', 'new']);
    expect(remaining.old).toBeUndefined();
    expect(remaining.new).toBeTruthy();
  });
});
