const { STORAGE_KEYS, createMockVideoElement, mockChromeStorage, setLocation } = require('./testUtils');

describe('Content Script - YouTube Section Detection', () => {
  const determineYoutubeSection = () => {
    const { href } = window.location;
    
    if (href.includes('/watch?')) return 'watch';
    if (href.match(/.*\/(user|channel|c)\/.+\/videos/u) || href.match(/.*\/@.*/u)) return 'channel';
    if (href.includes('/feed/subscriptions')) return 'subscriptions';
    if (href.includes('/feed/trending')) return 'trending';
    if (href.includes('/playlist?')) return 'playlist';
    
    return 'misc';
  };

  test('should detect watch page', () => {
    setLocation('https://www.youtube.com/watch?v=abc123');
    expect(determineYoutubeSection()).toBe('watch');
  });

  test('should detect channel page', () => {
    setLocation('https://www.youtube.com/@username');
    expect(determineYoutubeSection()).toBe('channel');
    
    setLocation('https://www.youtube.com/channel/UC123/videos');
    expect(determineYoutubeSection()).toBe('channel');
    
    setLocation('https://www.youtube.com/c/channelname/videos');
    expect(determineYoutubeSection()).toBe('channel');
  });

  test('should detect subscriptions page', () => {
    setLocation('https://www.youtube.com/feed/subscriptions');
    expect(determineYoutubeSection()).toBe('subscriptions');
  });

  test('should detect trending page', () => {
    setLocation('https://www.youtube.com/feed/trending');
    expect(determineYoutubeSection()).toBe('trending');
  });

  test('should detect playlist page', () => {
    setLocation('https://www.youtube.com/playlist?list=PL123');
    expect(determineYoutubeSection()).toBe('playlist');
  });

  test('should return misc for homepage and other pages', () => {
    setLocation('https://www.youtube.com/');
    expect(determineYoutubeSection()).toBe('misc');
    
    setLocation('https://www.youtube.com/results?search_query=test');
    expect(determineYoutubeSection()).toBe('misc');
  });
});

describe('Content Script - Video ID Extraction', () => {
  const getVideoId = (element) => {
    const links = element.querySelectorAll('a[href*="/watch?v="], a[href*="/shorts/"]');
    for (const link of links) {
      const href = link.getAttribute('href');
      if (href) {
        const match = href.match(/\/watch\?v=([^&]+)/);
        if (match) return match[1];
        
        const shortsMatch = href.match(/\/shorts\/([^?]+)/);
        if (shortsMatch) return shortsMatch[1];
      }
    }
    return null;
  };

  test('should extract video ID from regular video link', () => {
    const element = createMockVideoElement({ videoId: 'abc123' });
    expect(getVideoId(element)).toBe('abc123');
  });

  test('should extract video ID from shorts link', () => {
    const element = createMockVideoElement({ videoId: 'short456', isShorts: true });
    expect(getVideoId(element)).toBe('short456');
  });

  test('should return null when no video link found', () => {
    const element = document.createElement('div');
    expect(getVideoId(element)).toBeNull();
  });
});

describe('Content Script - Watched Video Detection', () => {
  const isWatchedVideo = (element, threshold = 10) => {
    const progressBarSelectors = [
      'ytd-thumbnail-overlay-resume-playback-progress-renderer',
      'div.ytd-thumbnail-overlay-resume-playback-progress-renderer',
      '[class*="ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment"]'
    ];
    
    for (const selector of progressBarSelectors) {
      const progressBar = element.querySelector(selector);
      if (progressBar) {
        const widthStr = progressBar.style.width;
        if (widthStr) {
          const width = parseInt(widthStr);
          return width >= threshold;
        }
      }
    }
    return false;
  };

  test('should detect watched video with progress above threshold', () => {
    const element = createMockVideoElement({ hasProgressBar: true });
    const progressBar = element.querySelector('[class*="progress"]');
    progressBar.style.width = '50%';
    
    expect(isWatchedVideo(element, 10)).toBe(true);
  });

  test('should not detect unwatched video with progress below threshold', () => {
    const element = createMockVideoElement({ hasProgressBar: true });
    const progressBar = element.querySelector('[class*="progress"]');
    progressBar.style.width = '5%';
    
    expect(isWatchedVideo(element, 10)).toBe(false);
  });

  test('should not detect video without progress bar', () => {
    const element = createMockVideoElement({ hasProgressBar: false });
    expect(isWatchedVideo(element)).toBe(false);
  });

  test('should respect custom threshold', () => {
    const element = createMockVideoElement({ hasProgressBar: true });
    const progressBar = element.querySelector('[class*="progress"]');
    progressBar.style.width = '75%';
    
    expect(isWatchedVideo(element, 80)).toBe(false);
    expect(isWatchedVideo(element, 70)).toBe(true);
  });
});

describe('Content Script - Hidden Videos Management', () => {
  let storageData;

  beforeEach(() => {
    jest.clearAllMocks();
    storageData = mockChromeStorage();
  });

  const saveHiddenVideo = async (videoId, state, title = null) => {
    if (!videoId) return;
    
    const result = await chrome.storage.sync.get(STORAGE_KEYS.HIDDEN_VIDEOS);
    const hiddenVideos = result[STORAGE_KEYS.HIDDEN_VIDEOS] || {};
    
    if (state === 'normal') {
      delete hiddenVideos[videoId];
    } else {
      hiddenVideos[videoId] = {
        state: state,
        title: title || hiddenVideos[videoId]?.title || ''
      };
    }
    
    await chrome.storage.sync.set({ [STORAGE_KEYS.HIDDEN_VIDEOS]: hiddenVideos });
    return hiddenVideos;
  };

  test('should save hidden video with state and title', async () => {
    const result = await saveHiddenVideo('video123', 'hidden', 'Test Video');
    
    expect(chrome.storage.sync.set).toHaveBeenCalledWith({
      [STORAGE_KEYS.HIDDEN_VIDEOS]: {
        'video123': {
          state: 'hidden',
          title: 'Test Video'
        }
      }
    });
  });

  test('should update existing video state', async () => {
    storageData[STORAGE_KEYS.HIDDEN_VIDEOS] = {
      'video123': { state: 'dimmed', title: 'Original Title' }
    };
    
    await saveHiddenVideo('video123', 'hidden');
    
    expect(chrome.storage.sync.set).toHaveBeenCalledWith({
      [STORAGE_KEYS.HIDDEN_VIDEOS]: {
        'video123': {
          state: 'hidden',
          title: 'Original Title'
        }
      }
    });
  });

  test('should remove video when state is normal', async () => {
    storageData[STORAGE_KEYS.HIDDEN_VIDEOS] = {
      'video123': { state: 'hidden', title: 'Test Video' }
    };
    
    await saveHiddenVideo('video123', 'normal');
    
    expect(chrome.storage.sync.set).toHaveBeenCalledWith({
      [STORAGE_KEYS.HIDDEN_VIDEOS]: {}
    });
  });

  test('should not save if videoId is null', async () => {
    await saveHiddenVideo(null, 'hidden');
    expect(chrome.storage.sync.set).not.toHaveBeenCalled();
  });
});
