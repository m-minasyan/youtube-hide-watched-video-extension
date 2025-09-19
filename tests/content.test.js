const { createMockVideoElement, setLocation } = require('./testUtils');

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

  test('detects watch page', () => {
    setLocation('https://www.youtube.com/watch?v=abc123');
    expect(determineYoutubeSection()).toBe('watch');
  });

  test('detects channel page variations', () => {
    setLocation('https://www.youtube.com/@username');
    expect(determineYoutubeSection()).toBe('channel');
    setLocation('https://www.youtube.com/channel/UC123/videos');
    expect(determineYoutubeSection()).toBe('channel');
    setLocation('https://www.youtube.com/c/channelname/videos');
    expect(determineYoutubeSection()).toBe('channel');
  });

  test('detects subscriptions, trending, and playlist pages', () => {
    setLocation('https://www.youtube.com/feed/subscriptions');
    expect(determineYoutubeSection()).toBe('subscriptions');
    setLocation('https://www.youtube.com/feed/trending');
    expect(determineYoutubeSection()).toBe('trending');
    setLocation('https://www.youtube.com/playlist?list=PL123');
    expect(determineYoutubeSection()).toBe('playlist');
  });

  test('returns misc for homepage and other pages', () => {
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

  test('extracts video ID from regular links', () => {
    const element = createMockVideoElement({ videoId: 'abc123' });
    expect(getVideoId(element)).toBe('abc123');
  });

  test('extracts video ID from shorts links', () => {
    const element = createMockVideoElement({ videoId: 'short456', isShorts: true });
    expect(getVideoId(element)).toBe('short456');
  });

  test('returns null when no link found', () => {
    const element = document.createElement('div');
    expect(getVideoId(element)).toBeNull();
  });
});

describe('Content Script - Watched Video Detection', () => {
  const isWatchedVideo = (element, threshold = 10) => {
    const selectors = [
      'ytd-thumbnail-overlay-resume-playback-progress-renderer',
      'div.ytd-thumbnail-overlay-resume-playback-progress-renderer',
      '[class*="ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment"]'
    ];
    for (const selector of selectors) {
      const progressBar = element.querySelector(selector);
      if (progressBar) {
        const width = parseInt(progressBar.style.width || '0', 10);
        if (!Number.isNaN(width) && width >= threshold) {
          return true;
        }
      }
    }
    return false;
  };

  test('detects watched videos above threshold', () => {
    const element = createMockVideoElement({ hasProgressBar: true });
    const progressBar = element.querySelector('[class*="progress"]');
    progressBar.style.width = '50%';
    expect(isWatchedVideo(element, 10)).toBe(true);
  });

  test('does not detect unwatched videos below threshold', () => {
    const element = createMockVideoElement({ hasProgressBar: true });
    const progressBar = element.querySelector('[class*="progress"]');
    progressBar.style.width = '5%';
    expect(isWatchedVideo(element, 10)).toBe(false);
  });

  test('does not detect videos without progress bar', () => {
    const element = createMockVideoElement({ hasProgressBar: false });
    expect(isWatchedVideo(element)).toBe(false);
  });

  test('respects custom threshold values', () => {
    const element = createMockVideoElement({ hasProgressBar: true });
    const progressBar = element.querySelector('[class*="progress"]');
    progressBar.style.width = '75%';
    expect(isWatchedVideo(element, 80)).toBe(false);
    expect(isWatchedVideo(element, 70)).toBe(true);
  });
});
