(function() {
  const DEBUG = false;
  
  const STORAGE_KEYS = {
    THRESHOLD: 'YTHWV_THRESHOLD',
    WATCHED_STATE: 'YTHWV_STATE',
    SHORTS_STATE: 'YTHWV_STATE_SHORTS',
    HIDDEN_VIDEOS: 'YTHWV_HIDDEN_VIDEOS',
    INDIVIDUAL_MODE: 'YTHWV_INDIVIDUAL_MODE',
    INDIVIDUAL_MODE_ENABLED: 'YTHWV_INDIVIDUAL_MODE_ENABLED'
  };

  const HIDDEN_VIDEO_MESSAGES = {
    GET_MANY: 'HIDDEN_VIDEOS_GET_MANY',
    SET_STATE: 'HIDDEN_VIDEOS_SET_STATE'
  };

  const hiddenVideoCache = new Map();
  const hiddenVideoTimestamps = new Map();
  const pendingHiddenVideoRequests = new Map();
  let individualHidingIteration = 0;

  function getRecordTimestamp(record) {
    return record && Number.isFinite(record.updatedAt) ? record.updatedAt : -1;
  }

  function applyCacheUpdate(videoId, record) {
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

  function mergeFetchedRecord(videoId, record) {
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

  let settings = {
    threshold: 10,
    watchedStates: {},
    shortsStates: {},
    individualMode: 'dimmed',
    individualModeEnabled: true
  };

  const logDebug = (...msgs) => {
    if (DEBUG) console.log('[YT-HWV]', ...msgs);
  };

  async function sendHiddenVideosMessage(type, payload = {}) {
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

  function getCachedHiddenVideo(videoId) {
    if (!videoId) return null;
    return hiddenVideoCache.get(videoId) || null;
  }

  async function fetchHiddenVideoStates(videoIds) {
    const ids = Array.isArray(videoIds) ? videoIds.filter(Boolean) : [];
    if (ids.length === 0) return {};
    const unique = Array.from(new Set(ids));
    const result = {};
    const missing = [];
    const waiters = [];
    unique.forEach((videoId) => {
      if (hiddenVideoCache.has(videoId)) {
        result[videoId] = getCachedHiddenVideo(videoId);
        return;
      }
      if (pendingHiddenVideoRequests.has(videoId)) {
        waiters.push(pendingHiddenVideoRequests.get(videoId).then((record) => {
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
        missing.forEach((videoId) => pendingHiddenVideoRequests.delete(videoId));
      });
      missing.forEach((videoId) => {
        const promise = fetchPromise.then(() => getCachedHiddenVideo(videoId));
        pendingHiddenVideoRequests.set(videoId, promise);
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

  async function setHiddenVideoState(videoId, state, title) {
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

  function applyStateToEyeButton(button, state) {
    if (!button) return;
    button.classList.remove('dimmed', 'hidden');
    if (state === 'dimmed') {
      button.classList.add('dimmed');
    } else if (state === 'hidden') {
      button.classList.add('hidden');
    }
  }

  function extractVideoIdFromHref(href) {
    if (!href) return null;
    const watchMatch = href.match(/\/watch\?v=([^&]+)/);
    if (watchMatch) return watchMatch[1];
    const shortsMatch = href.match(/\/shorts\/([^?]+)/);
    if (shortsMatch) return shortsMatch[1];
    return null;
  }

  function collectVisibleVideoIds() {
    const ids = new Set();
    document.querySelectorAll('[data-ythwv-video-id]').forEach((element) => {
      const value = element.getAttribute('data-ythwv-video-id');
      if (value) ids.add(value);
    });
    document.querySelectorAll('a[href*="/watch?v="], a[href*="/shorts/"]').forEach((link) => {
      const id = extractVideoIdFromHref(link.getAttribute('href'));
      if (id) ids.add(id);
    });
    return Array.from(ids);
  }

  function findVideoContainers(videoId) {
    const containers = new Set();
    document.querySelectorAll(`.yt-hwv-eye-button[data-video-id="${videoId}"]`).forEach((button) => {
      const container = button.closest('ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer, yt-lockup-view-model, ytm-shorts-lockup-view-model');
      if (container) containers.add(container);
    });
    document.querySelectorAll(`a[href*="/watch?v=${videoId}"], a[href*="/shorts/${videoId}"]`).forEach((link) => {
      const container = link.closest('ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer, yt-lockup-view-model, ytm-shorts-lockup-view-model');
      if (container) containers.add(container);
    });
    return Array.from(containers);
  }

  function extractTitleFromContainer(container) {
    if (!container) return '';
    const selectors = [
      '#video-title',
      '#video-title-link',
      'a#video-title',
      'h3.title',
      'h3 a',
      'h4 a',
      '.title-and-badge a',
      'ytm-shorts-lockup-view-model-v2 .shortsLockupViewModelHostTextContent',
      'yt-formatted-string#video-title',
      'span#video-title'
    ];
    for (const selector of selectors) {
      const element = container.querySelector(selector);
      if (element && !element.classList.contains('yt-hwv-eye-button')) {
        const text = element.getAttribute('title') || element.getAttribute('aria-label') || element.textContent?.trim() || '';
        if (!text) return '';
        if (text.includes(' - ')) {
          return text.split(' - ')[0];
        }
        if (text.includes(' by ')) {
          return text.split(' by ')[0];
        }
        return text;
      }
    }
    return '';
  }

  function handleHiddenVideosEvent(event) {
    if (!event || !event.type) return;
    if (event.type === 'updated' && event.record) {
      applyCacheUpdate(event.record.videoId, event.record);
      document.querySelectorAll(`.yt-hwv-eye-button[data-video-id="${event.record.videoId}"]`).forEach((button) => {
        applyStateToEyeButton(button, event.record.state);
      });
      applyIndividualHiding();
      return;
    }
    if (event.type === 'removed' && event.videoId) {
      applyCacheUpdate(event.videoId, null);
      document.querySelectorAll(`.yt-hwv-eye-button[data-video-id="${event.videoId}"]`).forEach((button) => {
        applyStateToEyeButton(button, 'normal');
      });
      applyIndividualHiding();
      return;
    }
    if (event.type === 'cleared') {
      hiddenVideoCache.clear();
      hiddenVideoTimestamps.clear();
      document.querySelectorAll('.yt-hwv-eye-button').forEach((button) => {
        applyStateToEyeButton(button, 'normal');
      });
      applyIndividualHiding();
    }
  }

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
      .YT-HWV-INDIVIDUAL-HIDDEN { display: none !important }
      .YT-HWV-INDIVIDUAL-DIMMED { opacity: 0.3 }
      
      .yt-hwv-eye-button {
        position: absolute !important;
        top: 8px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        z-index: 999 !important;
        background: rgba(0, 0, 0, 0.7) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        border-radius: 6px !important;
        padding: 6px 8px !important;
        cursor: pointer !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        transition: all 0.2s ease !important;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3) !important;
        opacity: 0.3 !important;
      }
      
      .yt-hwv-eye-button:hover {
        opacity: 1 !important;
        background: rgba(0, 0, 0, 1) !important;
        transform: translateX(-50%) scale(1.1) !important;
        box-shadow: 0 4px 8px rgba(0,0,0,0.7) !important;
      }
      
      .yt-hwv-eye-button svg {
        width: 20px !important;
        height: 20px !important;
        fill: white !important;
        pointer-events: none !important;
      }
      
      .yt-hwv-eye-button.hidden svg {
        fill: #ff4444 !important;
      }
      
      .yt-hwv-eye-button.dimmed svg {
        fill: #ffaa00 !important;
      }
      
      ytd-thumbnail, yt-thumbnail-view-model, #dismissible, #thumbnail-container {
        position: relative !important;
      }
    `;
    document.head.appendChild(style);
  }

  async function loadSettings() {
    const syncResult = await chrome.storage.sync.get(null);
    settings.threshold = syncResult[STORAGE_KEYS.THRESHOLD] || 10;
    settings.individualMode = syncResult[STORAGE_KEYS.INDIVIDUAL_MODE] || 'dimmed';
    settings.individualModeEnabled = syncResult[STORAGE_KEYS.INDIVIDUAL_MODE_ENABLED] !== undefined ?
      syncResult[STORAGE_KEYS.INDIVIDUAL_MODE_ENABLED] : true;
    const sections = ['misc', 'subscriptions', 'channel', 'watch', 'trending', 'playlist'];
    sections.forEach((section) => {
      settings.watchedStates[section] = syncResult[`${STORAGE_KEYS.WATCHED_STATE}_${section}`] || 'normal';
      if (section !== 'playlist') {
        settings.shortsStates[section] = syncResult[`${STORAGE_KEYS.SHORTS_STATE}_${section}`] || 'normal';
      }
    });
    logDebug('Settings loaded');
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
  
  function getVideoId(element) {
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
  }
  
  async function saveHiddenVideo(videoId, state, title = null) {
    if (!videoId) return null;
    return setHiddenVideoState(videoId, state, title || undefined);
  }
  
  function createEyeButton(videoContainer, videoId) {
    if (!videoId) return null;
    const button = document.createElement('button');
    button.className = 'yt-hwv-eye-button';
    button.setAttribute('data-video-id', videoId);
    button.setAttribute('tabindex', '-1');
    button.setAttribute('aria-label', 'Toggle video visibility');
    const cachedRecord = getCachedHiddenVideo(videoId);
    applyStateToEyeButton(button, cachedRecord?.state || 'normal');
    if (!cachedRecord) {
      fetchHiddenVideoStates([videoId]).then(() => {
        const refreshed = getCachedHiddenVideo(videoId);
        applyStateToEyeButton(button, refreshed?.state || 'normal');
      }).catch(() => {});
    }
    button.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
      </svg>
    `;
    button.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const cached = getCachedHiddenVideo(videoId);
      const currentState = cached?.state || 'normal';
      const nextState = currentState === 'normal' ? settings.individualMode : 'normal';
      const container = button.closest('ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer, yt-lockup-view-model, ytm-shorts-lockup-view-model');
      if (container) {
        container.setAttribute('data-ythwv-video-id', videoId);
      }
      const title = extractTitleFromContainer(container);
      const record = await saveHiddenVideo(videoId, nextState, title);
      const effectiveState = record ? record.state : 'normal';
      applyStateToEyeButton(button, effectiveState);
      if (container) {
        container.classList.remove('YT-HWV-INDIVIDUAL-DIMMED', 'YT-HWV-INDIVIDUAL-HIDDEN');
        if (effectiveState === 'dimmed') {
          container.classList.add('YT-HWV-INDIVIDUAL-DIMMED');
        } else if (effectiveState === 'hidden') {
          container.classList.add('YT-HWV-INDIVIDUAL-HIDDEN');
        }
      }
      applyIndividualHiding();
    });
    return button;
  }
  
  function addEyeButtons() {
    // Check if Individual Mode is enabled
    if (!settings.individualModeEnabled) {
      // Remove existing eye buttons if Individual Mode is disabled
      const existingButtons = document.querySelectorAll('.yt-hwv-eye-button');
      existingButtons.forEach(button => button.remove());
      
      const thumbnails = document.querySelectorAll('.yt-hwv-has-eye-button');
      thumbnails.forEach(thumbnail => thumbnail.classList.remove('yt-hwv-has-eye-button'));
      
      return;
    }
    
    // Support both old and new YouTube elements
    const thumbnails = document.querySelectorAll(
      'yt-thumbnail-view-model:not(.yt-hwv-has-eye-button), ' +
      'ytd-thumbnail:not(.yt-hwv-has-eye-button)'
    );
    
    logDebug('Found thumbnails:', thumbnails.length);
    
    thumbnails.forEach(thumbnail => {
      const existingButton = thumbnail.querySelector('.yt-hwv-eye-button');
      if (existingButton) return;
      
      // Find the link that contains the video ID
      const link = thumbnail.closest('a') || thumbnail.querySelector('a');
      if (!link) return;
      
      const href = link.getAttribute('href');
      if (!href) return;
      
      // Extract video ID
      let videoId = null;
      const watchMatch = href.match(/\/watch\?v=([^&]+)/);
      const shortsMatch = href.match(/\/shorts\/([^?]+)/);
      
      if (watchMatch) {
        videoId = watchMatch[1];
      } else if (shortsMatch) {
        videoId = shortsMatch[1];
      }
      
      if (!videoId) return;
      
      const eyeButton = createEyeButton(null, videoId);
      if (!eyeButton) return;
      thumbnail.style.position = 'relative';
      thumbnail.appendChild(eyeButton);
      thumbnail.classList.add('yt-hwv-has-eye-button');
      thumbnail.setAttribute('data-ythwv-video-id', videoId);
      const parentContainer = thumbnail.closest('ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer, yt-lockup-view-model, ytm-shorts-lockup-view-model');
      if (parentContainer) {
        parentContainer.setAttribute('data-ythwv-video-id', videoId);
      }
      fetchHiddenVideoStates([videoId]).then(() => {
        const record = getCachedHiddenVideo(videoId);
        if (!record || record.title) return;
        const container = thumbnail.closest('ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer, yt-lockup-view-model, ytm-shorts-lockup-view-model');
        if (container) {
          container.setAttribute('data-ythwv-video-id', videoId);
        }
        const videoTitle = extractTitleFromContainer(container);
        if (videoTitle && videoTitle !== 'Toggle video visibility') {
          saveHiddenVideo(videoId, record.state, videoTitle);
        }
      }).catch(() => {});
      logDebug('Added eye button to video:', videoId);
    });
    
    handleAriaHiddenConflicts();
  }
  
  function handleAriaHiddenConflicts() {
    const eyeButtons = document.querySelectorAll('.yt-hwv-eye-button');
    eyeButtons.forEach(button => {
      const ariaHiddenParent = button.closest('[aria-hidden="true"]');
      if (ariaHiddenParent) {
        ariaHiddenParent.removeAttribute('aria-hidden');
      }
    });
  }
  
  function syncIndividualContainerState(container, state) {
    if (!container) return;
    const hasDimmed = container.classList.contains('YT-HWV-INDIVIDUAL-DIMMED');
    const hasHidden = container.classList.contains('YT-HWV-INDIVIDUAL-HIDDEN');
    if (state === 'dimmed') {
      if (hasHidden) {
        container.classList.remove('YT-HWV-INDIVIDUAL-HIDDEN');
      }
      if (!hasDimmed) {
        container.classList.add('YT-HWV-INDIVIDUAL-DIMMED');
      }
      return;
    }
    if (state === 'hidden') {
      if (hasDimmed) {
        container.classList.remove('YT-HWV-INDIVIDUAL-DIMMED');
      }
      if (!hasHidden) {
        container.classList.add('YT-HWV-INDIVIDUAL-HIDDEN');
      }
      return;
    }
    if (hasDimmed) {
      container.classList.remove('YT-HWV-INDIVIDUAL-DIMMED');
    }
    if (hasHidden) {
      container.classList.remove('YT-HWV-INDIVIDUAL-HIDDEN');
    }
  }
  
  async function applyIndividualHiding() {
    if (!settings.individualModeEnabled) {
      document.querySelectorAll('.YT-HWV-INDIVIDUAL-DIMMED, .YT-HWV-INDIVIDUAL-HIDDEN').forEach((el) => {
        el.classList.remove('YT-HWV-INDIVIDUAL-DIMMED', 'YT-HWV-INDIVIDUAL-HIDDEN');
      });
      return;
    }
    individualHidingIteration += 1;
    const token = individualHidingIteration;
    const videoIds = collectVisibleVideoIds();
    if (videoIds.length === 0) {
      return;
    }
    try {
      await fetchHiddenVideoStates(videoIds);
    } catch (error) {
      logDebug('Failed to fetch hidden video states', error);
      return;
    }
    if (token !== individualHidingIteration) {
      return;
    }
    videoIds.forEach((videoId) => {
      const record = getCachedHiddenVideo(videoId);
      const state = record?.state || 'normal';
      const containers = findVideoContainers(videoId);
      containers.forEach((container) => {
        syncIndividualContainerState(container, state);
      });
    });
  }

  function findWatchedElements() {
    const selectors = [
      '.ytd-thumbnail-overlay-resume-playback-renderer',
      '.ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment',
      '.ytp-progress-bar-played'
    ];
    
    const watched = [];
    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        if (!watched.includes(el)) {
          watched.push(el);
        }
      });
    });
    
    const withThreshold = watched.filter((bar) => {
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
          item.closest('ytd-grid-video-renderer') ||
          item.closest('ytm-video-with-context-renderer') ||
          item.closest('ytm-item-section-renderer')
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
    setTimeout(() => {
      addEyeButtons();
      applyIndividualHiding();
    }, 500);
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
      let shouldApplyHiding = false;
      
      mutations.forEach(mutation => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'aria-hidden') {
          const target = mutation.target;
          if (target.getAttribute('aria-hidden') === 'true' && 
              target.querySelector('.yt-hwv-eye-button')) {
            target.removeAttribute('aria-hidden');
          }
        } else if (mutation.type === 'childList') {
          shouldApplyHiding = true;
        }
      });
      
      if (shouldApplyHiding) {
        if (mutations.length === 1 && 
            (mutations[0].target.classList?.contains('YT-HWV-WATCHED-DIMMED') ||
             mutations[0].target.classList?.contains('YT-HWV-WATCHED-HIDDEN') ||
             mutations[0].target.classList?.contains('YT-HWV-SHORTS-DIMMED') ||
             mutations[0].target.classList?.contains('YT-HWV-SHORTS-HIDDEN'))) {
          return;
        }
        debouncedApplyHiding();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-hidden']
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
    } else if (request.type === 'HIDDEN_VIDEOS_EVENT') {
      handleHiddenVideosEvent(request.event);
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  logDebug('YouTube Hide Watched Videos extension loaded');
})();