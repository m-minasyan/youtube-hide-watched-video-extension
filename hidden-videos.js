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

  let hiddenVideos = {};
  let currentFilter = 'all';
  let currentPage = 1;
  const videosPerPage = 12;

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
    const [localResult, syncResult] = await Promise.all([
      chrome.storage.local.get(STORAGE_KEYS.HIDDEN_VIDEOS),
      chrome.storage.sync.get(STORAGE_KEYS.HIDDEN_VIDEOS)
    ]);
    let storedVideos = localResult[STORAGE_KEYS.HIDDEN_VIDEOS];
    const syncHiddenVideos = syncResult[STORAGE_KEYS.HIDDEN_VIDEOS];
    let shouldPersist = false;
    const now = Date.now();
    
    if ((!storedVideos || Object.keys(storedVideos).length === 0) && syncHiddenVideos) {
      storedVideos = syncHiddenVideos;
      shouldPersist = true;
    }
    
    hiddenVideos = {};
    if (storedVideos) {
      Object.entries(storedVideos).forEach(([videoId, data]) => {
        if (typeof data === 'string') {
          hiddenVideos[videoId] = {
            state: data,
            title: '',
            updatedAt: now
          };
          shouldPersist = true;
        } else {
          hiddenVideos[videoId] = {
            state: data.state,
            title: data.title || '',
            updatedAt: data.updatedAt || now
          };
          if (!data.updatedAt) {
            shouldPersist = true;
          }
        }
      });
    }
    
    if (shouldPersist) {
      await chrome.storage.local.set({ [STORAGE_KEYS.HIDDEN_VIDEOS]: hiddenVideos });
    }
    
    if (syncHiddenVideos) {
      await chrome.storage.sync.remove(STORAGE_KEYS.HIDDEN_VIDEOS);
    }
    
    updateStats();
    renderVideos();
  }

  function updateStats() {
    const videos = Object.entries(hiddenVideos);
    const dimmed = videos.filter(([_, data]) => {
      const state = data?.state || data;
      return state === 'dimmed';
    }).length;
    const hidden = videos.filter(([_, data]) => {
      const state = data?.state || data;
      return state === 'hidden';
    }).length;
    
    totalCount.textContent = videos.length;
    dimmedCount.textContent = dimmed;
    hiddenCount.textContent = hidden;
  }

  function updatePaginationControls(totalVideos, totalPages) {
    const paginationControls = document.getElementById('pagination-controls');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const currentPageSpan = document.getElementById('current-page');
    const totalPagesSpan = document.getElementById('total-pages');
    
    if (totalVideos === 0) {
      paginationControls.style.display = 'none';
      return;
    }
    
    paginationControls.style.display = 'flex';
    currentPageSpan.textContent = currentPage;
    totalPagesSpan.textContent = totalPages;
    
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
  }

  function renderVideos() {
    const videos = Object.entries(hiddenVideos);
    
    let filteredVideos = videos;
    if (currentFilter !== 'all') {
      filteredVideos = videos.filter(([_, data]) => {
        const state = data?.state || data;
        return state === currentFilter;
      });
    }

    const totalPages = Math.ceil(filteredVideos.length / videosPerPage);
    currentPage = Math.min(currentPage, Math.max(1, totalPages));
    
    updatePaginationControls(filteredVideos.length, totalPages);

    if (filteredVideos.length === 0) {
      videosContainer.innerHTML = `
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
            <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
            <line x1="2" y1="2" x2="22" y2="22"/>
          </svg>
          <h3>${currentFilter === 'all' ? 'No hidden videos' : `No ${currentFilter} videos`}</h3>
          <p>${currentFilter === 'all' ? 'Videos you hide will appear here' : `No videos are currently ${currentFilter}`}</p>
        </div>
      `;
      return;
    }

    const startIndex = (currentPage - 1) * videosPerPage;
    const endIndex = startIndex + videosPerPage;
    const paginatedVideos = filteredVideos.slice(startIndex, endIndex);

    videosContainer.innerHTML = paginatedVideos.map(([videoId, data]) => {
      const state = data?.state || data;
      const title = data?.title || '';
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

    document.querySelectorAll('.video-action-btn').forEach(btn => {
      btn.addEventListener('click', handleVideoAction);
    });
  }

  async function handleVideoAction(e) {
    e.stopPropagation();
    const action = e.target.dataset.action;
    const videoId = e.target.dataset.videoId;
    
    if (action === 'remove') {
      delete hiddenVideos[videoId];
      await chrome.storage.local.set({ [STORAGE_KEYS.HIDDEN_VIDEOS]: hiddenVideos });
      await loadHiddenVideos();
    } else if (action === 'toggle') {
      const currentData = hiddenVideos[videoId];
      const currentState = currentData?.state || currentData;
      const title = currentData?.title || '';
      const newState = currentState === 'dimmed' ? 'hidden' : 'dimmed';
      hiddenVideos[videoId] = {
        state: newState,
        title: title,
        updatedAt: Date.now()
      };
      await chrome.storage.local.set({ [STORAGE_KEYS.HIDDEN_VIDEOS]: hiddenVideos });
      await loadHiddenVideos();
    } else if (action === 'view') {
      const isShorts = videoId.length < 15;
      const videoUrl = isShorts 
        ? `https://www.youtube.com/shorts/${videoId}`
        : `https://www.youtube.com/watch?v=${videoId}`;
      window.open(videoUrl, '_blank');
    }
  }

  themeToggle.addEventListener('click', toggleTheme);

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      currentPage = 1;
      renderVideos();
    });
  });

  document.getElementById('prev-page').addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderVideos();
    }
  });

  document.getElementById('next-page').addEventListener('click', () => {
    const videos = Object.entries(hiddenVideos);
    let filteredVideos = videos;
    if (currentFilter !== 'all') {
      filteredVideos = videos.filter(([_, state]) => state === currentFilter);
    }
    const totalPages = Math.ceil(filteredVideos.length / videosPerPage);
    
    if (currentPage < totalPages) {
      currentPage++;
      renderVideos();
    }
  });

  clearAllBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to remove all hidden videos?')) {
      await chrome.storage.local.set({ [STORAGE_KEYS.HIDDEN_VIDEOS]: {} });
      await chrome.storage.sync.remove(STORAGE_KEYS.HIDDEN_VIDEOS);
      await loadHiddenVideos();
    }
  });

  await initTheme();
  await loadHiddenVideos();
  
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[STORAGE_KEYS.HIDDEN_VIDEOS]) {
      loadHiddenVideos();
    }
  });
});