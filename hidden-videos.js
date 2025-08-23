document.addEventListener('DOMContentLoaded', async () => {
  const STORAGE_KEYS = {
    HIDDEN_VIDEOS: 'YTHWV_HIDDEN_VIDEOS',
    THEME: 'YTHWV_THEME'
  };

  const themeToggle = document.getElementById('theme-toggle');
  const filterButtons = document.querySelectorAll('.filter-btn');
  const clearAllBtn = document.getElementById('clear-all');
  const backBtn = document.getElementById('back-to-settings');
  const videosContainer = document.getElementById('videos-container');
  const totalCount = document.getElementById('total-count');
  const dimmedCount = document.getElementById('dimmed-count');
  const hiddenCount = document.getElementById('hidden-count');

  let hiddenVideos = {};
  let currentFilter = 'all';

  async function initTheme() {
    const result = await chrome.storage.sync.get(STORAGE_KEYS.THEME);
    const theme = result[STORAGE_KEYS.THEME] || 'light';
    
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
    const result = await chrome.storage.sync.get(STORAGE_KEYS.HIDDEN_VIDEOS);
    hiddenVideos = result[STORAGE_KEYS.HIDDEN_VIDEOS] || {};
    updateStats();
    renderVideos();
  }

  function updateStats() {
    const videos = Object.entries(hiddenVideos);
    const dimmed = videos.filter(([_, state]) => state === 'dimmed').length;
    const hidden = videos.filter(([_, state]) => state === 'hidden').length;
    
    totalCount.textContent = videos.length;
    dimmedCount.textContent = dimmed;
    hiddenCount.textContent = hidden;
  }

  function renderVideos() {
    const videos = Object.entries(hiddenVideos);
    
    let filteredVideos = videos;
    if (currentFilter !== 'all') {
      filteredVideos = videos.filter(([_, state]) => state === currentFilter);
    }

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

    videosContainer.innerHTML = filteredVideos.map(([videoId, state]) => {
      const isShorts = videoId.length < 15;
      const videoUrl = isShorts 
        ? `https://www.youtube.com/shorts/${videoId}`
        : `https://www.youtube.com/watch?v=${videoId}`;
      const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
      
      return `
        <div class="video-card ${state}" data-video-id="${videoId}">
          <div class="video-info">
            <img src="${thumbnailUrl}" alt="Video thumbnail" class="video-thumbnail" onerror="this.style.display='none'">
            <div class="video-details">
              <div class="video-title">${isShorts ? 'YouTube Shorts' : 'YouTube Video'}</div>
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
      await chrome.storage.sync.set({ [STORAGE_KEYS.HIDDEN_VIDEOS]: hiddenVideos });
      await loadHiddenVideos();
    } else if (action === 'toggle') {
      const currentState = hiddenVideos[videoId];
      hiddenVideos[videoId] = currentState === 'dimmed' ? 'hidden' : 'dimmed';
      await chrome.storage.sync.set({ [STORAGE_KEYS.HIDDEN_VIDEOS]: hiddenVideos });
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
      renderVideos();
    });
  });

  clearAllBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to remove all hidden videos?')) {
      await chrome.storage.sync.set({ [STORAGE_KEYS.HIDDEN_VIDEOS]: {} });
      await loadHiddenVideos();
    }
  });

  backBtn.addEventListener('click', () => {
    window.location.href = 'popup.html';
  });

  await initTheme();
  await loadHiddenVideos();
  
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes[STORAGE_KEYS.HIDDEN_VIDEOS]) {
      loadHiddenVideos();
    }
  });
});