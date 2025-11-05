import { STORAGE_KEYS, HIDDEN_VIDEO_MESSAGES, IMPORT_EXPORT_CONFIG } from './shared/constants.js';
import { isShorts } from './shared/utils.js';
import { initTheme, toggleTheme } from './shared/theme.js';
import { sendHiddenVideosMessage } from './shared/messaging.js';
import { showNotification, NotificationType } from './shared/notifications.js';

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

  /**
   * Detects if the current device is mobile
   * @returns {boolean} - True if mobile device
   */
  function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 768);
  }

  /**
   * Gets maximum items for search based on device type
   * Mobile: 500 items (~250KB) to prevent memory issues
   * Desktop: 1000 items (~500KB) for better search coverage
   * @returns {number} - Maximum items to load for search
   */
  function getMaxSearchItems() {
    return isMobileDevice() ? 500 : 1000;
  }

  const hiddenVideosState = {
    filter: 'all',
    currentPage: 1,
    pageCursors: [null],
    hasMore: false,
    items: [],
    searchQuery: '',
    allItems: [], // Cleared when search is cancelled, filter changed, or on error to prevent memory leaks
    isSearchMode: false // Track if we're in search mode to manage memory properly
  };
  let hiddenVideoStats = { total: 0, dimmed: 0, hidden: 0 };

  /**
   * Clears search memory to prevent memory leaks
   * Should be called when:
   * - Search is cleared/cancelled
   * - Filter is changed (switches to server-side pagination)
   * - Component encounters an error
   * - Switching from search mode to normal pagination mode
   * - After video actions that require data reload
   * @param {boolean} clearQuery - Whether to also clear the search query (default: true)
   */
  function clearSearchMemory(clearQuery = true) {
    if (hiddenVideosState.allItems.length > 0) {
      console.log('[Memory] Clearing search memory:', hiddenVideosState.allItems.length, 'items');
    }
    hiddenVideosState.allItems = [];
    if (clearQuery) {
      hiddenVideosState.searchQuery = '';
    }
    hiddenVideosState.isSearchMode = false;
  }

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
    // Clear search memory when switching to normal pagination mode
    // This prevents memory leaks when transitioning from search to normal browsing
    if (hiddenVideosState.isSearchMode || hiddenVideosState.allItems.length > 0) {
      clearSearchMemory(false); // Don't clear query as it's already empty in normal mode
    }

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
    const loadingIndicator = document.getElementById('search-loading');
    if (loadingIndicator) {
      loadingIndicator.style.display = 'flex';
    }

    try {
      // Mark that we're entering search mode
      hiddenVideosState.isSearchMode = true;

      // Load all items for search filtering
      const stateFilter = hiddenVideosState.filter === 'all' ? null : hiddenVideosState.filter;
      let allItems = [];
      let cursor = null;
      let hasMore = true;

      // Fetch items with dynamic limit based on device type
      // Mobile: 500 items (~250KB) to prevent memory issues on constrained devices
      // Desktop: 1000 items (~500KB) for better search coverage
      // Rationale: Loading more items causes significant memory usage and UI lag
      // during search filtering. Users with larger datasets should use pagination
      // or filter by state (dimmed/hidden) to narrow results.
      const maxItems = getMaxSearchItems();
      const isMobile = isMobileDevice();
      console.log(`[Memory] Loading search items (max: ${maxItems}, mobile: ${isMobile})`);

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

      // Log memory usage for monitoring
      const estimatedMemoryKB = Math.round((allItems.length * 500) / 1024);
      console.log(`[Memory] Loaded ${allItems.length} items (~${estimatedMemoryKB}KB) for search`);

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
      // Reset state and clear memory on error
      hiddenVideosState.items = [];
      clearSearchMemory();
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
      // Properly encode videoId for URLs to prevent injection
      const encodedVideoId = encodeURIComponent(videoId);
      const videoUrl = isShortsVideo
        ? `https://www.youtube.com/shorts/${encodedVideoId}`
        : `https://www.youtube.com/watch?v=${encodedVideoId}`;
      const thumbnailUrl = `https://img.youtube.com/vi/${encodedVideoId}/mqdefault.jpg`;
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
    clearSearchMemory(); // Clear search memory to prevent memory leaks
    hiddenVideosState.currentPage = 1;
    hiddenVideosState.pageCursors = [null];
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

      // Clear search when changing filter (switches to server-side pagination)
      if (hiddenVideosState.searchQuery) {
        clearSearchMemory(); // Clear search memory to prevent memory leaks
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

  // Export/Import functionality
  const exportBtn = document.getElementById('export-btn');
  const importBtn = document.getElementById('import-btn');
  const fileInput = document.getElementById('import-file-input');
  const importModal = document.getElementById('import-modal');
  const closeImportModalBtn = document.getElementById('close-import-modal');
  const cancelImportBtn = document.getElementById('cancel-import-btn');
  const confirmImportBtn = document.getElementById('confirm-import-btn');

  const importState = {
    file: null,
    data: null,
    validationResult: null,
    selectedStrategy: 'skip',
    isImporting: false
  };

  // File reader helper
  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  // Export button handler
  exportBtn.addEventListener('click', async () => {
    try {
      // Show loading state
      exportBtn.disabled = true;
      exportBtn.textContent = 'Exporting...';

      // Fetch all data from background
      const exportData = await sendHiddenVideosMessage(
        HIDDEN_VIDEO_MESSAGES.EXPORT_ALL
      );

      // Create JSON blob
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      link.download = `youtube-hidden-videos-${timestamp}.json`;

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Cleanup
      URL.revokeObjectURL(url);

      // Show success notification
      showNotification(`Successfully exported ${exportData.count} videos`, NotificationType.SUCCESS);

    } catch (error) {
      console.error('Export failed:', error);
      showNotification(`Export failed: ${error.message}`, NotificationType.ERROR);
    } finally {
      // Restore button state
      exportBtn.disabled = false;
      exportBtn.textContent = 'Export List';
    }
  });

  // Import button handler
  importBtn.addEventListener('click', () => {
    fileInput.click();
  });

  // File input change handler
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      // Validate file type
      const validTypes = ['application/json', 'text/json'];
      const fileExtension = file.name.split('.').pop().toLowerCase();

      if (!validTypes.includes(file.type) && fileExtension !== 'json') {
        throw new Error('Invalid file type. Please select a JSON file.');
      }

      // Check file size (50MB max)
      const maxSize = IMPORT_EXPORT_CONFIG.MAX_IMPORT_SIZE_MB * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error(`File is too large. Maximum size: ${IMPORT_EXPORT_CONFIG.MAX_IMPORT_SIZE_MB}MB`);
      }

      // Read file content
      const content = await readFileAsText(file);

      // Parse JSON
      let data;
      try {
        data = JSON.parse(content);
      } catch (parseError) {
        throw new Error('Invalid JSON format. Please ensure the file is a valid export.');
      }

      // Store file and data
      importState.file = file;
      importState.data = data;

      // Validate import data with backend
      const validationResult = await sendHiddenVideosMessage(
        HIDDEN_VIDEO_MESSAGES.VALIDATE_IMPORT,
        { data }
      );

      importState.validationResult = validationResult;

      if (!validationResult.valid) {
        showImportErrorModal(validationResult.errors);
      } else {
        showImportConfirmationModal(validationResult);
      }

    } catch (error) {
      console.error('Import preparation failed:', error);
      showNotification(`Import failed: ${error.message}`, NotificationType.ERROR);
    } finally {
      // Reset file input
      fileInput.value = '';
    }
  });

  // Focus trap helper for modal accessibility
  function trapFocus(modal) {
    const focusableElements = modal.querySelectorAll(
      'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    const handleEscapeKey = (e) => {
      if (e.key === 'Escape') {
        closeImportModal();
      }
    };

    modal.addEventListener('keydown', handleTabKey);
    modal.addEventListener('keydown', handleEscapeKey);

    // Store cleanup function
    modal._cleanupFocusTrap = () => {
      modal.removeEventListener('keydown', handleTabKey);
      modal.removeEventListener('keydown', handleEscapeKey);
    };

    // Focus first element
    if (firstElement) {
      setTimeout(() => firstElement.focus(), 100);
    }
  }

  function showImportErrorModal(errors) {
    const validationInfo = document.getElementById('import-validation-info');
    const confirmBtn = document.getElementById('confirm-import-btn');

    // Show error message
    validationInfo.innerHTML = `
      <div class="validation-error">
        <h3>Import Validation Failed</h3>
        <ul>
          ${errors.map(err => `<li>${escapeHtml(err)}</li>`).join('')}
        </ul>
        <p>Please check your file and try again.</p>
      </div>
    `;

    // Hide options and disable import
    document.querySelector('.import-options').style.display = 'none';
    confirmBtn.disabled = true;

    importModal.style.display = 'flex';
    trapFocus(importModal);
  }

  function showImportConfirmationModal(validation) {
    const validationInfo = document.getElementById('import-validation-info');
    const confirmBtn = document.getElementById('confirm-import-btn');

    // Show validation info
    validationInfo.innerHTML = `
      <div class="validation-success">
        <h3>Import Preview</h3>
        <div class="stats-preview">
          <div class="stat-item">
            <span class="stat-label">Valid Records:</span>
            <span class="stat-value">${validation.validRecordCount}</span>
          </div>
          ${validation.invalidRecordCount > 0 ? `
          <div class="stat-item warning">
            <span class="stat-label">Invalid Records (will be skipped):</span>
            <span class="stat-value">${validation.invalidRecordCount}</span>
          </div>
          ` : ''}
          <div class="stat-item">
            <span class="stat-label">Current Total:</span>
            <span class="stat-value">${validation.currentTotal}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">After Import (max):</span>
            <span class="stat-value">${validation.projectedTotal}</span>
          </div>
        </div>
      </div>
    `;

    // Show options and enable import
    document.querySelector('.import-options').style.display = 'block';
    confirmBtn.disabled = false;

    importModal.style.display = 'flex';
    trapFocus(importModal);
  }

  // Conflict strategy selection
  const strategyButtons = document.querySelectorAll('.conflict-strategy-btn');
  strategyButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      strategyButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      importState.selectedStrategy = btn.dataset.strategy;
    });
  });

  // Confirm import button
  confirmImportBtn.addEventListener('click', async () => {
    const progressDiv = document.getElementById('import-progress');
    const progressText = document.getElementById('import-progress-text');

    try {
      // Disable buttons and prevent modal close during import
      confirmImportBtn.disabled = true;
      cancelImportBtn.disabled = true;
      closeImportModalBtn.disabled = true;
      importState.isImporting = true;

      // Show loading state (no fake progress bar)
      progressDiv.style.display = 'block';
      progressText.textContent = 'Importing records...';

      // Execute import
      const result = await sendHiddenVideosMessage(
        HIDDEN_VIDEO_MESSAGES.IMPORT_RECORDS,
        {
          data: importState.data,
          conflictStrategy: importState.selectedStrategy
        }
      );

      // Update completion message
      progressText.textContent = 'Import complete!';

      // Show results after brief delay
      setTimeout(() => {
        closeImportModal();

        // Show success notification with summary
        const summary = [
          `Import complete!`,
          `Added: ${result.added}`,
          `Updated: ${result.updated}`,
          `Skipped: ${result.skipped}`
        ].join(' | ');

        if (result.errors && result.errors.length > 0) {
          // Show warning if there were errors
          showNotification(summary + ` | Errors: ${result.errors.length}`, NotificationType.WARNING, 6000);
        } else {
          showNotification(summary, NotificationType.SUCCESS, 5000);
        }

        // Refresh the list
        refreshStats().then(() => loadHiddenVideos());
      }, 500);

    } catch (error) {
      console.error('Import execution failed:', error);

      progressDiv.style.display = 'none';
      showNotification(`Import failed: ${error.message}`, NotificationType.ERROR);
    } finally {
      // Re-enable buttons
      importState.isImporting = false;
      confirmImportBtn.disabled = false;
      cancelImportBtn.disabled = false;
      closeImportModalBtn.disabled = false;
    }
  });

  // Modal close handlers
  function closeImportModal() {
    // Prevent closing during active import
    if (importState.isImporting) {
      return;
    }

    importModal.style.display = 'none';

    // Clean up focus trap
    if (importModal._cleanupFocusTrap) {
      importModal._cleanupFocusTrap();
      delete importModal._cleanupFocusTrap;
    }

    // Reset state
    importState.file = null;
    importState.data = null;
    importState.validationResult = null;
    importState.selectedStrategy = 'skip';
    importState.isImporting = false;

    // Reset modal UI
    document.getElementById('import-progress').style.display = 'none';

    // Reset strategy buttons
    document.querySelectorAll('.conflict-strategy-btn').forEach((btn, index) => {
      btn.classList.toggle('active', index === 0);
    });
  }

  closeImportModalBtn.addEventListener('click', closeImportModal);
  cancelImportBtn.addEventListener('click', closeImportModal);

  // Close modal on backdrop click
  importModal.addEventListener('click', (e) => {
    if (e.target.id === 'import-modal') {
      closeImportModal();
    }
  });

  // Cleanup memory on page unload to prevent memory leaks
  window.addEventListener('beforeunload', () => {
    clearSearchMemory();
    hiddenVideosState.items = [];
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
      }).catch((error) => {
        if (!error.message?.includes('context invalidated')) {
          console.error('Failed to refresh hidden videos after event:', error);
        }
      });
    }
  });
});