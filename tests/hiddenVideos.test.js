const { STORAGE_KEYS, mockChromeStorage } = require('./testUtils');

describe('Hidden Videos Manager - Data Migration', () => {
  let storageData;

  beforeEach(() => {
    jest.clearAllMocks();
    storageData = mockChromeStorage();
  });

  const migrateHiddenVideos = async () => {
    const result = await chrome.storage.sync.get(STORAGE_KEYS.HIDDEN_VIDEOS);
    let hiddenVideos = result[STORAGE_KEYS.HIDDEN_VIDEOS] || {};
    
    let needsMigration = false;
    Object.entries(hiddenVideos).forEach(([videoId, data]) => {
      if (typeof data === 'string') {
        hiddenVideos[videoId] = {
          state: data,
          title: ''
        };
        needsMigration = true;
      }
    });
    
    if (needsMigration) {
      await chrome.storage.sync.set({ [STORAGE_KEYS.HIDDEN_VIDEOS]: hiddenVideos });
    }
    
    return hiddenVideos;
  };

  test('should migrate old string format to new object format', async () => {
    storageData[STORAGE_KEYS.HIDDEN_VIDEOS] = {
      'video1': 'hidden',
      'video2': 'dimmed'
    };
    
    const migrated = await migrateHiddenVideos();
    
    expect(chrome.storage.sync.set).toHaveBeenCalledWith({
      [STORAGE_KEYS.HIDDEN_VIDEOS]: {
        'video1': { state: 'hidden', title: '' },
        'video2': { state: 'dimmed', title: '' }
      }
    });
  });

  test('should not migrate if already in new format', async () => {
    storageData[STORAGE_KEYS.HIDDEN_VIDEOS] = {
      'video1': { state: 'hidden', title: 'Test Video' }
    };
    
    await migrateHiddenVideos();
    
    expect(chrome.storage.sync.set).not.toHaveBeenCalled();
  });

  test('should handle mixed format correctly', async () => {
    storageData[STORAGE_KEYS.HIDDEN_VIDEOS] = {
      'video1': 'hidden',
      'video2': { state: 'dimmed', title: 'Existing Video' }
    };
    
    const migrated = await migrateHiddenVideos();
    
    expect(chrome.storage.sync.set).toHaveBeenCalledWith({
      [STORAGE_KEYS.HIDDEN_VIDEOS]: {
        'video1': { state: 'hidden', title: '' },
        'video2': { state: 'dimmed', title: 'Existing Video' }
      }
    });
  });
});

describe('Hidden Videos Manager - Statistics', () => {
  const calculateStats = (hiddenVideos) => {
    const videos = Object.entries(hiddenVideos);
    const dimmed = videos.filter(([_, data]) => {
      const state = data?.state || data;
      return state === 'dimmed';
    }).length;
    const hidden = videos.filter(([_, data]) => {
      const state = data?.state || data;
      return state === 'hidden';
    }).length;
    
    return {
      total: videos.length,
      dimmed,
      hidden
    };
  };

  test('should calculate correct statistics', () => {
    const hiddenVideos = {
      'video1': { state: 'hidden', title: 'Video 1' },
      'video2': { state: 'dimmed', title: 'Video 2' },
      'video3': { state: 'hidden', title: 'Video 3' },
      'video4': { state: 'dimmed', title: 'Video 4' }
    };
    
    const stats = calculateStats(hiddenVideos);
    
    expect(stats).toEqual({
      total: 4,
      dimmed: 2,
      hidden: 2
    });
  });

  test('should handle empty videos list', () => {
    const stats = calculateStats({});
    
    expect(stats).toEqual({
      total: 0,
      dimmed: 0,
      hidden: 0
    });
  });

  test('should handle legacy format in statistics', () => {
    const hiddenVideos = {
      'video1': 'hidden',
      'video2': { state: 'dimmed', title: 'Video 2' }
    };
    
    const stats = calculateStats(hiddenVideos);
    
    expect(stats).toEqual({
      total: 2,
      dimmed: 1,
      hidden: 1
    });
  });
});

describe('Hidden Videos Manager - Filtering', () => {
  const filterVideos = (hiddenVideos, filter) => {
    return Object.entries(hiddenVideos).filter(([_, data]) => {
      const state = data?.state || data;
      return filter === 'all' || state === filter;
    });
  };

  test('should filter videos by state', () => {
    const hiddenVideos = {
      'video1': { state: 'hidden', title: 'Video 1' },
      'video2': { state: 'dimmed', title: 'Video 2' },
      'video3': { state: 'hidden', title: 'Video 3' }
    };
    
    const hiddenOnly = filterVideos(hiddenVideos, 'hidden');
    expect(hiddenOnly).toHaveLength(2);
    expect(hiddenOnly[0][0]).toBe('video1');
    expect(hiddenOnly[1][0]).toBe('video3');
    
    const dimmedOnly = filterVideos(hiddenVideos, 'dimmed');
    expect(dimmedOnly).toHaveLength(1);
    expect(dimmedOnly[0][0]).toBe('video2');
  });

  test('should return all videos when filter is all', () => {
    const hiddenVideos = {
      'video1': { state: 'hidden', title: 'Video 1' },
      'video2': { state: 'dimmed', title: 'Video 2' }
    };
    
    const all = filterVideos(hiddenVideos, 'all');
    expect(all).toHaveLength(2);
  });
});

describe('Hidden Videos Manager - Pagination', () => {
  const paginateVideos = (videos, currentPage, videosPerPage) => {
    const totalPages = Math.ceil(videos.length / videosPerPage);
    const startIndex = (currentPage - 1) * videosPerPage;
    const endIndex = startIndex + videosPerPage;
    const paginatedVideos = videos.slice(startIndex, endIndex);
    
    return {
      videos: paginatedVideos,
      totalPages,
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1
    };
  };

  test('should paginate videos correctly', () => {
    const videos = Array.from({ length: 25 }, (_, i) => [`video${i}`, { state: 'hidden' }]);
    
    const page1 = paginateVideos(videos, 1, 12);
    expect(page1.videos).toHaveLength(12);
    expect(page1.totalPages).toBe(3);
    expect(page1.hasNext).toBe(true);
    expect(page1.hasPrev).toBe(false);
    
    const page2 = paginateVideos(videos, 2, 12);
    expect(page2.videos).toHaveLength(12);
    expect(page2.hasNext).toBe(true);
    expect(page2.hasPrev).toBe(true);
    
    const page3 = paginateVideos(videos, 3, 12);
    expect(page3.videos).toHaveLength(1);
    expect(page3.hasNext).toBe(false);
    expect(page3.hasPrev).toBe(true);
  });

  test('should handle empty videos list', () => {
    const result = paginateVideos([], 1, 12);
    
    expect(result.videos).toHaveLength(0);
    expect(result.totalPages).toBe(0);
    expect(result.hasNext).toBe(false);
    expect(result.hasPrev).toBe(false);
  });

  test('should handle single page', () => {
    const videos = Array.from({ length: 5 }, (_, i) => [`video${i}`, { state: 'hidden' }]);
    
    const result = paginateVideos(videos, 1, 12);
    
    expect(result.videos).toHaveLength(5);
    expect(result.totalPages).toBe(1);
    expect(result.hasNext).toBe(false);
    expect(result.hasPrev).toBe(false);
  });
});
