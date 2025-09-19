document.addEventListener('DOMContentLoaded', async () => {
  const STORAGE_KEYS = {
    HIDDEN_VIDEOS: 'YTHWV_HIDDEN_VIDEOS',
    THEME: 'YTHWV_THEME'
  };

  const themeToggle = document.getElementById('theme-toggle');
  const filterButtons = document.querySelectorAll('.filter-btn');
  const clearAllBtn = document.getElementById('clear-all');
  const videosContainer = document.getElementById('videos-container');
  const totalCount = document.getElementById('total-count');
  const dimmedCount = document.getElementById('dimmed-count');
  const hiddenCount = document.getElementById('hidden-count');

  const videosPerPage = 12;
  const hiddenVideosState = {
    filter: 'all',
    currentPage: 1,
    pageCursors: [null],
    hasMore: false,
    items: []
  };
  let hiddenVideoStats = { total: 0, dimmed: 0, hidden: 0 };

  const HIDDEN_VIDEO_MESSAGES = {
    GET_PAGE: 'HIDDEN_VIDEOS_GET_PAGE',
    GET_STATS: 'HIDDEN_VIDEOS_GET_STATS',
    SET_STATE: 'HIDDEN_VIDEOS_SET_STATE',
    CLEAR_ALL: 'HIDDEN_VIDEOS_CLEAR_ALL'
  };

  async function sendHiddenVideosMessage(type, payload = {}) {
    try {
      const response = await chrome.runtime.sendMessage({ type, ...payload });
      if (!response || !response.ok) {
        throw new Error(response?.error || 'hidden videos request failed');
      }
      return response.result;
    } catch (error) {
      console.error('Hidden videos manager message failed', error);
      throw error;
    }
  }

  async function initTheme() {
    const result = await chrome.storage.sync.get(STORAGE_KEYS.THEME);
    let theme = result[STORAGE_KEYS.THEME];
    
    if (!theme || theme === 'auto') {
      const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      theme = isDarkMode ? 'dark' : 'light';
      
      if (!result[STORAGE_KEYS.THEME]) {
        await chrome.storage.sync.set({ [STORAGE_KEYS.THEME]: theme });
      }
    }
    
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  async function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    if (newTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    
    await chrome.storage.sync.set({ [STORAGE_KEYS.THEME]: newTheme });
  }

  async function loadHiddenVideos() {
    const cursorIndex = hiddenVideosState.currentPage - 1;
    const cursor = cursorIndex < hiddenVideosState.pageCursors.length ? hiddenVideosState.pageCursors[cursorIndex] : null;
    const stateFilter = hiddenVideosState.filter === 'all' ? null : hiddenVideosState.filter;
    const result = await sendHiddenVideosMessage(HIDDEN_VIDEO_MESSAGES.GET_PAGE, {
      state: stateFilter,
      cursor,
      limit: videosPerPage
    });
    hiddenVideosState.items = Array.isArray(result?.items) ? result.items : [];
    hiddenVideosState.hasMore = Boolean(result?.hasMore);
    if (hiddenVideosState.currentPage < hiddenVideosState.pageCursors.length) {
      hiddenVideosState.pageCursors[hiddenVideosState.currentPage] = result?.nextCursor || null;
    } else {
      hiddenVideosState.pageCursors.push(result?.nextCursor || null);
    }
    renderVideos();
  }

  function updateStats() {
    totalCount.textContent = hiddenVideoStats.total;
    dimmedCount.textContent = hiddenVideoStats.dimmed;
    hiddenCount.textContent = hiddenVideoStats.hidden;
  }

  async function refreshStats() {
    const result = await sendHiddenVideosMessage(HIDDEN_VIDEO_MESSAGES.GET_STATS);
    hiddenVideoStats = {
      total: result?.total || 0,
      dimmed: result?.dimmed || 0,
      hidden: result?.hidden || 0
    };
    updateStats();
    updatePaginationControls();
  }

  function getTotalVideosForCurrentFilter() {
    if (hiddenVideosState.filter === 'all') return hiddenVideoStats.total;
    if (hiddenVideosState.filter === 'dimmed') return hiddenVideoStats.dimmed;
    return hiddenVideoStats.hidden;
  }

  function updatePaginationControls() {
    const paginationControls = document.getElementById('pagination-controls');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const currentPageSpan = document.getElementById('current-page');
    const totalPagesSpan = document.getElementById('total-pages');
    const totalVideos = getTotalVideosForCurrentFilter();
    let totalPages = Math.max(1, Math.ceil(Math.max(totalVideos, 0) / videosPerPage));
    if (totalVideos === 0 && hiddenVideosState.items.length === 0) {
      paginationControls.style.display = 'none';
      return;
    }
    paginationControls.style.display = 'flex';
    currentPageSpan.textContent = hiddenVideosState.currentPage;
    totalPagesSpan.textContent = totalPages;
    prevBtn.disabled = hiddenVideosState.currentPage === 1;
    nextBtn.disabled = !hiddenVideosState.hasMore;
  }

  function renderVideos() {
    const videos = hiddenVideosState.items;
    updatePaginationControls();
    if (videos.length === 0) {
      const filter = hiddenVideosState.filter;
      videosContainer.innerHTML = `
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
            <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
            <line x1="2" y1="2" x2="22" y2="22"/>
          </svg>
          <h3>${filter === 'all' ? 'No hidden videos' : `No ${filter} videos`}</h3>
          <p>${filter === 'all' ? 'Videos you hide will appear here' : `No videos are currently ${filter}`}</p>
        </div>
      `;
      return;
    }
    videosContainer.innerHTML = videos.map((record) => {
      const videoId = record.videoId;
      const state = record.state;
      const title = record.title || '';
      const isShorts = videoId.length < 15;
      const videoUrl = isShorts
        ? `https://www.youtube.com/shorts/${videoId}`
        : `https://www.youtube.com/watch?v=${videoId}`;
      const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
      const displayTitle = title || (isShorts ? 'YouTube Shorts' : 'YouTube Video');
      return `
        <div class="video-card ${state}" data-video-id="${videoId}">
          <div class="video-info">
            <img src="${thumbnailUrl}" alt="Video thumbnail" class="video-thumbnail" onerror="this.style.display='none'">
            <div class="video-details">
              <div class="video-title">${displayTitle}</div>
              <div class="video-id">${videoId}</div>
            </div>
          </div>
          <div class="video-actions">
            <button class="video-action-btn" data-action="toggle" data-video-id="${videoId}">
              ${state === 'dimmed' ? 'Hide' : 'Dim'}
            </button>
            <button class="video-action-btn" data-action="view" data-video-id="${videoId}">
              View on YouTube
            </button>
            <button class="video-action-btn remove" data-action="remove" data-video-id="${videoId}">
              Remove
            </button>
          </div>
        </div>
      `;
    }).join('');
    document.querySelectorAll('.video-action-btn').forEach((btn) => {
      btn.addEventListener('click', handleVideoAction);
    });
  }

  async function handleVideoAction(e) {
    e.stopPropagation();
    const action = e.target.dataset.action;
    const videoId = e.target.dataset.videoId;
    if (!videoId) return;
    if (action === 'view') {
      const isShorts = videoId.length < 15;
      const videoUrl = isShorts
        ? `https://www.youtube.com/shorts/${videoId}`
        : `https://www.youtube.com/watch?v=${videoId}`;
      window.open(videoUrl, '_blank');
      return;
    }
    if (action === 'remove') {
      await sendHiddenVideosMessage(HIDDEN_VIDEO_MESSAGES.SET_STATE, {
        videoId,
        state: 'normal'
      });
    } else if (action === 'toggle') {
      const record = hiddenVideosState.items.find((item) => item.videoId === videoId);
      const currentState = record?.state || 'dimmed';
      const nextState = currentState === 'dimmed' ? 'hidden' : 'dimmed';
      await sendHiddenVideosMessage(HIDDEN_VIDEO_MESSAGES.SET_STATE, {
        videoId,
        state: nextState
      });
    }
    await refreshStats();
    const totalVideos = getTotalVideosForCurrentFilter();
    const itemsRemaining = hiddenVideosState.items.length - 1;
    const maxPages = Math.max(1, Math.ceil(Math.max(totalVideos, 0) / videosPerPage));
    if (hiddenVideosState.currentPage > maxPages || (itemsRemaining === 0 && hiddenVideosState.currentPage > 1)) {
      hiddenVideosState.currentPage = Math.max(1, maxPages);
      hiddenVideosState.pageCursors = hiddenVideosState.pageCursors.slice(0, hiddenVideosState.currentPage);
    }
    await loadHiddenVideos();
  }

  themeToggle.addEventListener('click', toggleTheme);

  filterButtons.forEach((btn) => {
    btn.addEventListener('click', async () => {
      filterButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      hiddenVideosState.filter = btn.dataset.filter;
      hiddenVideosState.currentPage = 1;
      hiddenVideosState.pageCursors = [null];
      await refreshStats();
      await loadHiddenVideos();
    });
  });

  document.getElementById('prev-page').addEventListener('click', async () => {
    if (hiddenVideosState.currentPage > 1) {
      hiddenVideosState.currentPage -= 1;
      await loadHiddenVideos();
    }
  });

  document.getElementById('next-page').addEventListener('click', async () => {
    if (!hiddenVideosState.hasMore) return;
    hiddenVideosState.currentPage += 1;
    await loadHiddenVideos();
  });

  clearAllBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to remove all hidden videos?')) {
      await sendHiddenVideosMessage(HIDDEN_VIDEO_MESSAGES.CLEAR_ALL);
      hiddenVideosState.pageCursors = [null];
      hiddenVideosState.currentPage = 1;
      await refreshStats();
      await loadHiddenVideos();
    }
  });

  await initTheme();
  await refreshStats();
  await loadHiddenVideos();
  
  chrome.runtime.onMessage.addListener((message) => {
    if (message && message.type === 'HIDDEN_VIDEOS_EVENT') {
      refreshStats().then(async () => {
        const totalVideos = getTotalVideosForCurrentFilter();
        const maxPages = Math.max(1, Math.ceil(Math.max(totalVideos, 0) / videosPerPage));
        
        if (hiddenVideosState.currentPage > maxPages && maxPages > 0) {
          hiddenVideosState.currentPage = maxPages;
          hiddenVideosState.pageCursors = hiddenVideosState.pageCursors.slice(0, hiddenVideosState.currentPage);
        }
        
        await loadHiddenVideos();
      }).catch(() => {});
    }
  });
});