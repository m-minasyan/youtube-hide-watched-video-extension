(function() {
  const DEBUG = false;
  
  const STORAGE_KEYS = {
    THRESHOLD: 'YTHWV_THRESHOLD',
    WATCHED_STATE: 'YTHWV_STATE',
    SHORTS_STATE: 'YTHWV_STATE_SHORTS'
  };

  let settings = {
    threshold: 10,
    watchedStates: {},
    shortsStates: {}
  };

  const logDebug = (...msgs) => {
    if (DEBUG) console.log('[YT-HWV]', ...msgs);
  };

  function injectStyles() {
    const styleId = 'yt-hwv-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .YT-HWV-WATCHED-HIDDEN { display: none !important }
      .YT-HWV-WATCHED-DIMMED { opacity: 0.3 }
      .YT-HWV-SHORTS-HIDDEN { display: none !important }
      .YT-HWV-SHORTS-DIMMED { opacity: 0.3 }
      .YT-HWV-HIDDEN-ROW-PARENT { padding-bottom: 10px }
    `;
    document.head.appendChild(style);
  }

  async function loadSettings() {
    const result = await chrome.storage.sync.get(null);
    
    settings.threshold = result[STORAGE_KEYS.THRESHOLD] || 10;
    
    const sections = ['misc', 'subscriptions', 'channel', 'watch', 'trending', 'playlist'];
    sections.forEach(section => {
      settings.watchedStates[section] = result[`${STORAGE_KEYS.WATCHED_STATE}_${section}`] || 'normal';
      if (section !== 'playlist') {
        settings.shortsStates[section] = result[`${STORAGE_KEYS.SHORTS_STATE}_${section}`] || 'normal';
      }
    });
    
    logDebug('Settings loaded:', settings);
  }

  function determineYoutubeSection() {
    const { href } = window.location;
    
    if (href.includes('/watch?')) return 'watch';
    if (href.match(/.*\/(user|channel|c)\/.+\/videos/u) || href.match(/.*\/@.*/u)) return 'channel';
    if (href.includes('/feed/subscriptions')) return 'subscriptions';
    if (href.includes('/feed/trending')) return 'trending';
    if (href.includes('/playlist?')) return 'playlist';
    
    return 'misc';
  }

  function findWatchedElements() {
    const watched = document.querySelectorAll('.ytd-thumbnail-overlay-resume-playback-renderer');
    
    const withThreshold = Array.from(watched).filter((bar) => {
      return bar.style.width && parseInt(bar.style.width, 10) >= settings.threshold;
    });
    
    logDebug(`Found ${watched.length} watched elements (${withThreshold.length} within threshold)`);
    
    return withThreshold;
  }

  function findShortsContainers() {
    const shortsContainers = [];
    const processedContainers = new Set();
    
    const selectors = [
      'ytd-reel-shelf-renderer',
      'ytd-rich-shelf-renderer[is-shorts]',
      'ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts])',
      'ytm-shorts-lockup-view-model-v2',
      'ytm-shorts-lockup-view-model',
      'ytd-rich-item-renderer:has(.shortsLockupViewModelHost)',
      'ytd-rich-item-renderer:has(a[href^="/shorts/"])',
      '.ytd-rich-shelf-renderer:has(a.reel-item-endpoint)',
      'ytd-video-renderer:has(.ytd-thumbnail-overlay-time-status-renderer[aria-label="Shorts"])',
      'ytd-compact-video-renderer:has(a[href^="/shorts/"])',
      'ytd-grid-video-renderer:has(a[href^="/shorts/"])'
    ];
    
    selectors.forEach(selector => {
      try {
        document.querySelectorAll(selector).forEach(element => {
          const key = element.tagName + element.className;
          if (!processedContainers.has(key)) {
            processedContainers.add(key);
            
            const parentShelf = element.closest('ytd-reel-shelf-renderer') || 
                               element.closest('ytd-rich-shelf-renderer') ||
                               element.closest('ytd-rich-section-renderer');
            
            if (parentShelf && !shortsContainers.includes(parentShelf)) {
              shortsContainers.push(parentShelf);
            } else if (!parentShelf && !shortsContainers.includes(element)) {
              shortsContainers.push(element);
            }
          }
        });
      } catch(e) {
        logDebug(`Selector failed: ${selector}`, e);
      }
    });
    
    const reelItemLinks = document.querySelectorAll('a.reel-item-endpoint, a[href^="/shorts/"]');
    reelItemLinks.forEach(link => {
      const container = link.closest('ytd-rich-item-renderer') || 
                       link.closest('ytd-video-renderer') ||
                       link.closest('ytd-compact-video-renderer') ||
                       link.closest('ytd-grid-video-renderer');
      if (container && !shortsContainers.includes(container)) {
        shortsContainers.push(container);
      }
    });
    
    document.querySelectorAll('.ytd-thumbnail-overlay-time-status-renderer[aria-label="Shorts"]').forEach((child) => {
      const container = child.closest('ytd-video-renderer') || 
                       child.closest('ytd-compact-video-renderer') ||
                       child.closest('ytd-grid-video-renderer');
      if (container && !shortsContainers.includes(container)) {
        shortsContainers.push(container);
      }
    });
    
    const richShelves = document.querySelectorAll('ytd-rich-shelf-renderer');
    richShelves.forEach(shelf => {
      const hasShorts = shelf.querySelector('a[href^="/shorts/"]') || 
                       shelf.querySelector('.reel-item-endpoint') ||
                       shelf.querySelector('.shortsLockupViewModelHost');
      if (hasShorts && !shortsContainers.includes(shelf)) {
        shortsContainers.push(shelf);
      }
    });

    logDebug(`Found ${shortsContainers.length} shorts container elements`);
    
    return shortsContainers;
  }

  function updateClassOnWatchedItems() {
    document.querySelectorAll('.YT-HWV-WATCHED-DIMMED').forEach((el) => el.classList.remove('YT-HWV-WATCHED-DIMMED'));
    document.querySelectorAll('.YT-HWV-WATCHED-HIDDEN').forEach((el) => el.classList.remove('YT-HWV-WATCHED-HIDDEN'));

    if (window.location.href.indexOf('/feed/history') >= 0) return;

    const section = determineYoutubeSection();
    const state = settings.watchedStates[section] || 'normal';

    if (state === 'normal') return;

    findWatchedElements().forEach((item) => {
      let watchedItem;
      let dimmedItem;

      if (section === 'subscriptions') {
        watchedItem = (
          item.closest('.ytd-grid-renderer') ||
          item.closest('.ytd-item-section-renderer') ||
          item.closest('.ytd-rich-grid-row') ||
          item.closest('.ytd-rich-grid-renderer') ||
          item.closest('#grid-container')
        );

        if (watchedItem?.classList.contains('ytd-item-section-renderer')) {
          watchedItem.closest('ytd-item-section-renderer')?.classList.add('YT-HWV-HIDDEN-ROW-PARENT');
        }
      } else if (section === 'playlist') {
        watchedItem = item.closest('ytd-playlist-video-renderer');
      } else if (section === 'watch') {
        watchedItem = item.closest('ytd-compact-video-renderer');

        if (watchedItem?.closest('ytd-compact-autoplay-renderer')) {
          watchedItem = null;
        }

        const watchedItemInPlaylist = item.closest('ytd-playlist-panel-video-renderer');
        if (!watchedItem && watchedItemInPlaylist) {
          dimmedItem = watchedItemInPlaylist;
        }
      } else {
        watchedItem = (
          item.closest('ytd-rich-item-renderer') ||
          item.closest('ytd-video-renderer') ||
          item.closest('ytd-grid-video-renderer')
        );
      }

      if (watchedItem) {
        if (state === 'dimmed') {
          watchedItem.classList.add('YT-HWV-WATCHED-DIMMED');
        } else if (state === 'hidden') {
          watchedItem.classList.add('YT-HWV-WATCHED-HIDDEN');
        }
      }

      if (dimmedItem && (state === 'dimmed' || state === 'hidden')) {
        dimmedItem.classList.add('YT-HWV-WATCHED-DIMMED');
      }
    });
  }

  function updateClassOnShortsItems() {
    document.querySelectorAll('.YT-HWV-SHORTS-DIMMED').forEach((el) => el.classList.remove('YT-HWV-SHORTS-DIMMED'));
    document.querySelectorAll('.YT-HWV-SHORTS-HIDDEN').forEach((el) => el.classList.remove('YT-HWV-SHORTS-HIDDEN'));

    const section = determineYoutubeSection();
    const state = settings.shortsStates[section] || 'normal';

    if (state === 'normal') return;

    const shortsContainers = findShortsContainers();

    shortsContainers.forEach((item) => {
      if (state === 'dimmed') {
        item.classList.add('YT-HWV-SHORTS-DIMMED');
      } else if (state === 'hidden') {
        item.classList.add('YT-HWV-SHORTS-HIDDEN');
      }
    });
  }

  function applyHiding() {
    logDebug('Applying hiding/dimming');
    updateClassOnWatchedItems();
    updateClassOnShortsItems();
  }

  const debounce = function(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  };

  const debouncedApplyHiding = debounce(applyHiding, 250);

  async function init() {
    injectStyles();
    await loadSettings();
    applyHiding();

    const observer = new MutationObserver((mutations) => {
      if (mutations.length === 1 && 
          (mutations[0].target.classList?.contains('YT-HWV-WATCHED-DIMMED') ||
           mutations[0].target.classList?.contains('YT-HWV-WATCHED-HIDDEN') ||
           mutations[0].target.classList?.contains('YT-HWV-SHORTS-DIMMED') ||
           mutations[0].target.classList?.contains('YT-HWV-SHORTS-HIDDEN'))) {
        return;
      }
      debouncedApplyHiding();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(method, url) {
      this._url = url;
      return originalOpen.apply(this, arguments);
    };
    
    XMLHttpRequest.prototype.send = function() {
      this.addEventListener('readystatechange', function() {
        if (this.readyState === 4 && this._url && 
            (this._url.includes('browse_ajax') || this._url.includes('browse?'))) {
          setTimeout(debouncedApplyHiding, 100);
        }
      });
      return originalSend.apply(this, arguments);
    };

    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        setTimeout(debouncedApplyHiding, 100);
      }
    }).observe(document, {subtree: true, childList: true});
  }

  chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.action === 'settingsUpdated') {
      await loadSettings();
      applyHiding();
    } else if (request.action === 'resetSettings') {
      await loadSettings();
      applyHiding();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  logDebug('YouTube Hide Watched Videos extension loaded');
})();