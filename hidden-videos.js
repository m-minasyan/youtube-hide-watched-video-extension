import { STORAGE_KEYS, HIDDEN_VIDEO_MESSAGES } from './shared/constants.js';
import { isShorts } from './shared/utils.js';
import { initTheme, toggleTheme } from './shared/theme.js';
import { sendHiddenVideosMessage } from './shared/messaging.js';

/**
 * Debounce function to limit the rate of function calls
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} - Debounced function
 */
function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    const context = this;
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(context, args), delay);
  };
}

document.addEventListener('DOMContentLoaded', async () => {
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
    items: [],
    searchQuery: '',
    allItems: []
  };
  let hiddenVideoStats = { total: 0, dimmed: 0, hidden: 0 };

  /**
   * Normalizes a string for case-insensitive search
   * @param {string} str - String to normalize
   * @returns {string} - Normalized string
   */
  function normalizeString(str) {
    if (!str) return '';
    return String(str).toLowerCase().trim();
  }

  /**
   * Filters items by search query
   * @param {Array} items - Array of video items
   * @param {string} query - Search query
   * @returns {Array} - Filtered items
   */
  function filterItemsBySearch(items, query) {
    if (!query || !query.trim()) {
      return items;
    }

    const normalizedQuery = normalizeString(query);

    return items.filter(item => {
      const title = normalizeString(item.title || '');
      const videoId = normalizeString(item.videoId || '');

      // Search in title and videoId
      return title.includes(normalizedQuery) || videoId.includes(normalizedQuery);
    });
  }

  async function loadHiddenVideos() {
    const isSearching = hiddenVideosState.searchQuery.trim() !== '';

    if (isSearching) {
      // When searching, load all items and filter client-side
      await loadAllItemsForSearch();
    } else {
      // Normal pagination mode
      await loadPaginatedItems();
    }

    renderVideos();
  }

  async function loadPaginatedItems() {
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
  }

  async function loadAllItemsForSearch() {
    // Clear allItems array to prevent memory leak on repeated searches
    hiddenVideosState.allItems = [];

    const loadingIndicator = document.getElementById('search-loading');
    if (loadingIndicator) {
      loadingIndicator.style.display = 'flex';
    }

    try {
      // Load all items for search filtering
      const stateFilter = hiddenVideosState.filter === 'all' ? null : hiddenVideosState.filter;
      let allItems = [];
      let cursor = null;
      let hasMore = true;

      // Fetch all items (limit to 1000 for performance)
      const maxItems = 1000;
      while (hasMore && allItems.length < maxItems) {
        const result = await sendHiddenVideosMessage(HIDDEN_VIDEO_MESSAGES.GET_PAGE, {
          state: stateFilter,
          cursor,
          limit: 100
        });

        if (result?.items) {
          allItems = allItems.concat(result.items);
        }

        hasMore = Boolean(result?.hasMore);
        cursor = result?.nextCursor;

        if (!hasMore || !cursor) {
          break;
        }
      }

      // Store all items
      hiddenVideosState.allItems = allItems;

      // Filter by search query
      const filteredItems = filterItemsBySearch(allItems, hiddenVideosState.searchQuery);

      // Paginate filtered results client-side
      const startIndex = (hiddenVideosState.currentPage - 1) * videosPerPage;
      const endIndex = startIndex + videosPerPage;
      hiddenVideosState.items = filteredItems.slice(startIndex, endIndex);
      hiddenVideosState.hasMore = endIndex < filteredItems.length;
    } catch (error) {
      console.error('Search failed:', error);
      // Display error message to user
      videosContainer.innerHTML = `
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <h3>Search failed</h3>
          <p>Unable to load search results. Please try again.</p>
        </div>
      `;
      // Reset state
      hiddenVideosState.items = [];
      hiddenVideosState.hasMore = false;
    } finally {
      if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
      }
    }
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

    const isSearching = hiddenVideosState.searchQuery.trim() !== '';

    let totalVideos;
    if (isSearching) {
      // Use filtered items count when searching
      const filteredItems = filterItemsBySearch(hiddenVideosState.allItems, hiddenVideosState.searchQuery);
      totalVideos = filteredItems.length;
    } else {
      // Use stats count when not searching
      totalVideos = getTotalVideosForCurrentFilter();
    }

    let totalPages = Math.max(1, Math.ceil(Math.max(totalVideos, 0) / videosPerPage));

    if (totalVideos === 0 && hiddenVideosState.items.length === 0) {
      paginationControls.style.display = 'none';
      return;
    }

    paginationControls.style.display = 'flex';
    currentPageSpan.textContent = hiddenVideosState.currentPage;
    totalPagesSpan.textContent = totalPages;
    prevBtn.disabled = hiddenVideosState.currentPage === 1;

    if (isSearching) {
      // For search mode, use client-side pagination
      nextBtn.disabled = hiddenVideosState.currentPage >= totalPages;
    } else {
      // For normal mode, use server-side pagination
      nextBtn.disabled = !hiddenVideosState.hasMore;
    }
  }

  /**
   * Escapes HTML special characters
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Highlights search term in text
   */
  function highlightSearchTerm(text, query) {
    if (!query || !query.trim()) {
      return escapeHtml(text);
    }

    const escapedText = escapeHtml(text);
    const normalizedQuery = normalizeString(query);
    const normalizedText = normalizeString(text);

    const index = normalizedText.indexOf(normalizedQuery);
    if (index === -1) {
      return escapedText;
    }

    // Get the actual substring from original text (preserving case)
    // Use normalizedQuery.length instead of query.length to handle Unicode correctly
    const actualMatchLength = normalizedQuery.length;
    const beforeMatch = text.substring(0, index);
    const match = text.substring(index, index + actualMatchLength);
    const afterMatch = text.substring(index + actualMatchLength);

    return `${escapeHtml(beforeMatch)}<mark style="background: var(--accent-color); color: white; padding: 2px 4px; border-radius: 3px;">${escapeHtml(match)}</mark>${escapeHtml(afterMatch)}`;
  }

  /**
   * Updates search results status for screen readers
   */
  function updateSearchResultsStatus() {
    const statusElement = document.getElementById('search-results-status');
    if (!statusElement) return;

    const isSearching = hiddenVideosState.searchQuery.trim() !== '';
    if (!isSearching) {
      statusElement.textContent = '';
      return;
    }

    // Only update if allItems has been loaded (prevent race condition)
    if (!hiddenVideosState.allItems || hiddenVideosState.allItems.length === 0) {
      // Don't announce until search results are loaded
      return;
    }

    const filteredItems = filterItemsBySearch(hiddenVideosState.allItems, hiddenVideosState.searchQuery);
    const count = filteredItems.length;
    const query = hiddenVideosState.searchQuery;

    if (count === 0) {
      statusElement.textContent = `No results found for "${query}"`;
    } else if (count === 1) {
      statusElement.textContent = `Found 1 result for "${query}"`;
    } else {
      statusElement.textContent = `Found ${count} results for "${query}"`;
    }
  }

  function renderVideos() {
    const videos = hiddenVideosState.items;
    const isSearching = hiddenVideosState.searchQuery.trim() !== '';

    updatePaginationControls();

    if (videos.length === 0) {
      const filter = hiddenVideosState.filter;

      if (isSearching) {
        // Show "no search results" message
        videosContainer.innerHTML = `
          <div class="search-no-results">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <h3>No results found</h3>
            <p>No videos match your search: <span class="search-term">"${escapeHtml(hiddenVideosState.searchQuery)}"</span></p>
            <p style="margin-top: 8px; font-size: 13px;">Try a different search term or clear the search.</p>
          </div>
        `;
      } else {
        // Show normal empty state
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
      }
      updateSearchResultsStatus();
      return;
    }

    // Render video cards
    videosContainer.innerHTML = videos.map((record) => {
      const videoId = record.videoId;
      const state = record.state;
      const title = record.title || '';
      const isShortsVideo = isShorts(videoId);
      const videoUrl = isShortsVideo
        ? `https://www.youtube.com/shorts/${videoId}`
        : `https://www.youtube.com/watch?v=${videoId}`;
      const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
      const displayTitle = title || (isShortsVideo ? 'YouTube Shorts' : 'YouTube Video');

      // Highlight search term in title if searching
      const highlightedTitle = isSearching ? highlightSearchTerm(displayTitle, hiddenVideosState.searchQuery) : escapeHtml(displayTitle);

      return `
        <div class="video-card ${state}" data-video-id="${escapeHtml(videoId)}">
          <div class="video-info">
            <img src="${thumbnailUrl}" alt="Video thumbnail" class="video-thumbnail" onerror="this.style.display='none'">
            <div class="video-details">
              <div class="video-title">${highlightedTitle}</div>
              <div class="video-id">${escapeHtml(videoId)}</div>
            </div>
          </div>
          <div class="video-actions">
            <button class="video-action-btn" data-action="toggle" data-video-id="${escapeHtml(videoId)}">
              ${state === 'dimmed' ? 'Hide' : 'Dim'}
            </button>
            <button class="video-action-btn" data-action="view" data-video-id="${escapeHtml(videoId)}">
              View on YouTube
            </button>
            <button class="video-action-btn remove" data-action="remove" data-video-id="${escapeHtml(videoId)}">
              Remove
            </button>
          </div>
        </div>
      `;
    }).join('');

    document.querySelectorAll('.video-action-btn').forEach((btn) => {
      btn.addEventListener('click', handleVideoAction);
    });

    updateSearchResultsStatus();
  }

  async function handleVideoAction(e) {
    e.stopPropagation();
    const action = e.target.dataset.action;
    const videoId = e.target.dataset.videoId;
    if (!videoId) return;
    if (action === 'view') {
      const isShortsVideo = isShorts(videoId);
      const videoUrl = isShortsVideo
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

  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search');

  // Debounced search handler
  const handleSearch = debounce(async (query) => {
    hiddenVideosState.searchQuery = query;
    hiddenVideosState.currentPage = 1;
    hiddenVideosState.pageCursors = [null];

    await loadHiddenVideos();
  }, 300); // 300ms debounce delay

  // Search input event
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value;

    // Show/hide clear button
    if (query.trim()) {
      clearSearchBtn.style.display = 'flex';
    } else {
      clearSearchBtn.style.display = 'none';
    }

    handleSearch(query);
  });

  // Clear search button event
  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    hiddenVideosState.searchQuery = '';
    hiddenVideosState.currentPage = 1;
    hiddenVideosState.pageCursors = [null];
    hiddenVideosState.allItems = [];
    loadHiddenVideos();
  });

  // Handle Enter key in search
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const query = searchInput.value;
      hiddenVideosState.searchQuery = query;
      hiddenVideosState.currentPage = 1;
      hiddenVideosState.pageCursors = [null];
      loadHiddenVideos();
    }
  });

  filterButtons.forEach((btn) => {
    btn.addEventListener('click', async () => {
      filterButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      hiddenVideosState.filter = btn.dataset.filter;
      hiddenVideosState.currentPage = 1;
      hiddenVideosState.pageCursors = [null];

      // Clear search when changing filter
      if (hiddenVideosState.searchQuery) {
        hiddenVideosState.searchQuery = '';
        hiddenVideosState.allItems = [];
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
      }

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
    const isSearching = hiddenVideosState.searchQuery.trim() !== '';

    if (isSearching) {
      // Client-side pagination for search
      const filteredItems = filterItemsBySearch(hiddenVideosState.allItems, hiddenVideosState.searchQuery);
      const totalPages = Math.ceil(filteredItems.length / videosPerPage);

      if (hiddenVideosState.currentPage < totalPages) {
        hiddenVideosState.currentPage += 1;
        await loadHiddenVideos();
      }
    } else {
      // Server-side pagination for normal mode
      if (!hiddenVideosState.hasMore) return;
      hiddenVideosState.currentPage += 1;
      await loadHiddenVideos();
    }
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