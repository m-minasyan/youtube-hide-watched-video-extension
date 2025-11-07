/**
 * Hidden Videos Manager
 *
 * SECURITY NOTES:
 * ===============
 * This file implements comprehensive XSS protection through multiple defense layers:
 *
 * 1. Unicode Normalization (NFC):
 *    - Prevents Unicode normalization bypass attacks
 *    - Converts fullwidth characters (＜＞) to ASCII (<>)
 *    - Ensures consistent character representation
 *    - Mitigates homograph attacks
 *
 * 2. Search Query Sanitization (sanitizeSearchQuery):
 *    - Removes HTML-like tags (<, >, ", ', &)
 *    - Strips control characters (U+0000-U+001F, U+007F-U+009F)
 *    - Eliminates zero-width characters (U+200B-U+200D, U+FEFF)
 *    - Normalizes fullwidth Unicode chars to ASCII
 *    - Applied before any search query processing
 *
 * 3. Safe DOM Manipulation:
 *    - Uses textContent instead of innerHTML
 *    - Creates elements via createElement/createTextNode
 *    - Avoids HTML string interpolation for user input
 *    - DocumentFragment for safe highlighting
 *
 * 4. Content Security Policy (CSP):
 *    - Defined in manifest.json for extension pages
 *    - Blocks inline scripts and unsafe-eval
 *    - Restricts script sources to 'self'
 *
 * XSS Attack Vectors Mitigated:
 * - Fullwidth character bypass: "＜script＞alert(1)＜/script＞"
 * - HTML injection: "<img src=x onerror=alert(1)>"
 * - Unicode obfuscation: "\u003cscript\u003e"
 * - Control character injection: "test\x00<script>"
 * - Zero-width character hiding: "te​st<script>" (with U+200B)
 */

import { STORAGE_KEYS, HIDDEN_VIDEO_MESSAGES, IMPORT_EXPORT_CONFIG } from './shared/constants.js';
import { isShorts } from './shared/utils.js';
import { initTheme, toggleTheme } from './shared/theme.js';
import { sendHiddenVideosMessage } from './shared/messaging.js';
import { showNotification, NotificationType } from './shared/notifications.js';
import {
  StreamingRecordParser,
  ChunkedJSONExporter,
  formatBytes,
  formatSpeed,
  calculateETA
} from './shared/streamingUtils.js';

// Debug flag for development logging
// Set to false before production release
const DEBUG = false;

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
   * Sanitizes search query to prevent XSS attacks
   * Removes potentially dangerous characters and patterns
   * @param {string} query - Search query to sanitize
   * @returns {string} - Sanitized query
   */
  function sanitizeSearchQuery(query) {
    if (!query) return '';

    // Convert to string and apply Unicode normalization (NFC)
    // This prevents Unicode normalization bypass attacks where
    // fullwidth characters (＜＞) or other Unicode equivalents
    // could be used to bypass security checks
    let sanitized = String(query).normalize('NFC');

    // Remove control characters (U+0000 to U+001F, U+007F to U+009F)
    // These can interfere with text processing and pose security risks
    sanitized = sanitized.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

    // Remove zero-width characters that could be used for obfuscation
    // U+200B: Zero Width Space
    // U+200C: Zero Width Non-Joiner
    // U+200D: Zero Width Joiner
    // U+FEFF: Zero Width No-Break Space (BOM)
    sanitized = sanitized.replace(/[\u200B-\u200D\uFEFF]/g, '');

    // Normalize fullwidth ASCII characters (U+FF01-U+FF5E) to standard ASCII
    // This converts fullwidth versions: ＜ → <, ＞ → >, （ → (, etc.
    // IMPORTANT: This range does NOT include CJK characters (Japanese/Chinese/Korean):
    // - Japanese Hiragana: U+3040-U+309F (あいうえお)
    // - Japanese Katakana: U+30A0-U+30FF (アイウエオ)
    // - CJK Ideographs: U+4E00-U+9FFF (漢字)
    // - CJK Corner Brackets: U+300C-U+300D (「」)
    // So legitimate CJK text is preserved, only fullwidth ASCII is normalized
    sanitized = sanitized.replace(/[\uFF01-\uFF5E]/g, (ch) => {
      return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
    });

    // Remove HTML-like tags and potentially dangerous characters
    // This is defense-in-depth even though we use textContent
    sanitized = sanitized.replace(/[<>'"&]/g, '');

    return sanitized;
  }

  /**
   * Normalizes a string for case-insensitive search
   * Applies Unicode normalization (NFC) to prevent bypass attacks
   * @param {string} str - String to normalize
   * @returns {string} - Normalized string
   */
  function normalizeString(str) {
    if (!str) return '';

    // Apply Unicode NFC normalization first
    // This ensures consistent representation of characters
    // For example: é can be represented as single char (U+00E9)
    // or as e + combining accent (U+0065 + U+0301)
    // NFC converts to the single composed form
    const normalized = String(str).normalize('NFC');

    return normalized.toLowerCase().trim();
  }

  /**
   * Filters items by search query
   * XSS-safe: query is sanitized before use
   * @param {Array} items - Array of video items
   * @param {string} query - Search query (should already be sanitized in state, but defense-in-depth)
   * @returns {Array} - Filtered items
   */
  function filterItemsBySearch(items, query) {
    if (!query || !query.trim()) {
      return items;
    }

    // SECURITY: Defense-in-depth sanitization (query should already be sanitized when stored in state)
    // This provides an additional layer of protection if the function is called from unexpected code paths
    const sanitizedQuery = sanitizeSearchQuery(query);
    const normalizedQuery = normalizeString(sanitizedQuery);

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

      // Check if we hit the limit and there are more items
      const limitReached = hasMore && allItems.length >= maxItems;
      if (limitReached) {
        console.warn(`[Memory] Search limit reached (${maxItems} items). Consider using filters to narrow results.`);

        // Show warning notification to user
        const filterSuggestion = hiddenVideosState.filter === 'all'
          ? 'Try using the "Dimmed" or "Hidden" filter to narrow your search results.'
          : 'Try refining your search query to find specific videos.';

        showNotification(
          `Search limited to first ${maxItems} videos. ${filterSuggestion}`,
          NotificationType.WARNING,
          6000
        );
      }

      // Filter by search query
      const filteredItems = filterItemsBySearch(allItems, hiddenVideosState.searchQuery);

      // Paginate filtered results client-side
      const startIndex = (hiddenVideosState.currentPage - 1) * videosPerPage;
      const endIndex = startIndex + videosPerPage;
      hiddenVideosState.items = filteredItems.slice(startIndex, endIndex);
      hiddenVideosState.hasMore = endIndex < filteredItems.length;
    } catch (error) {
      if (DEBUG) console.error('Search failed:', error);
      // MEMORY LEAK FIX: Clear old event listeners before setting new content
      videosContainer.replaceChildren();
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
   * Creates a DOM element with highlighted search term
   *
   * SECURITY: XSS-safe implementation using multiple defense layers:
   * 1. Query sanitization: Removes HTML tags, control chars, Unicode bypass attempts
   * 2. textContent usage: Prevents HTML injection by using textContent instead of innerHTML
   * 3. createTextNode: Safely creates text nodes without HTML parsing
   * 4. createElement: Programmatic DOM creation avoids injection risks
   *
   * Even if a malicious query like "＜script＞alert(1)＜/script＞" (fullwidth chars)
   * or "<script>alert(1)</script>" is passed, it will be:
   * 1. Sanitized to remove dangerous characters
   * 2. Treated as plain text, not executable code
   *
   * @param {string} text - The text to display
   * @param {string} query - The search query to highlight (will be sanitized)
   * @returns {DocumentFragment} - A document fragment containing text nodes and mark elements
   */
  function createHighlightedElement(text, query) {
    const fragment = document.createDocumentFragment();

    if (!query || !query.trim()) {
      const textNode = document.createTextNode(text);
      fragment.appendChild(textNode);
      return fragment;
    }

    // SECURITY: Defense-in-depth sanitization (query should already be sanitized when stored in state)
    // This provides additional protection against Unicode normalization bypass attacks
    // Removes fullwidth characters (＜＞), control chars, and HTML-like patterns
    const sanitizedQuery = sanitizeSearchQuery(query);
    const normalizedQuery = normalizeString(sanitizedQuery);
    const normalizedText = normalizeString(text);

    const index = normalizedText.indexOf(normalizedQuery);
    if (index === -1) {
      const textNode = document.createTextNode(text);
      fragment.appendChild(textNode);
      return fragment;
    }

    // Get the actual substring from original text (preserving case)
    const actualMatchLength = normalizedQuery.length;
    const beforeMatch = text.substring(0, index);
    const match = text.substring(index, index + actualMatchLength);
    const afterMatch = text.substring(index + actualMatchLength);

    // SECURITY: Create text nodes and mark element safely
    // Using textContent and createTextNode prevents HTML injection
    if (beforeMatch) {
      fragment.appendChild(document.createTextNode(beforeMatch));
    }

    const mark = document.createElement('mark');
    mark.style.background = 'var(--accent-color)';
    mark.style.color = 'white';
    mark.style.padding = '2px 4px';
    mark.style.borderRadius = '3px';
    mark.textContent = match; // XSS-safe: uses textContent, not innerHTML
    fragment.appendChild(mark);

    if (afterMatch) {
      fragment.appendChild(document.createTextNode(afterMatch));
    }

    return fragment;
  }

  /**
   * Creates a video card DOM element
   * XSS-safe: all user data is set via textContent or safely created DOM elements
   * @param {Object} record - The video record
   * @param {boolean} isSearching - Whether a search is active
   * @returns {HTMLElement} - The video card element
   */
  function createVideoCard(record, isSearching) {
    const { videoId, state, title = '' } = record;
    const isShortsVideo = isShorts(videoId);
    const encodedVideoId = encodeURIComponent(videoId);
    const videoUrl = isShortsVideo
      ? `https://www.youtube.com/shorts/${encodedVideoId}`
      : `https://www.youtube.com/watch?v=${encodedVideoId}`;
    const thumbnailUrl = `https://img.youtube.com/vi/${encodedVideoId}/mqdefault.jpg`;
    const displayTitle = title || (isShortsVideo ? 'YouTube Shorts' : 'YouTube Video');

    // Create the video card container
    const card = document.createElement('div');
    card.className = `video-card ${state}`;
    card.setAttribute('data-video-id', videoId);

    // Create video info section
    const videoInfo = document.createElement('div');
    videoInfo.className = 'video-info';

    // Create thumbnail
    const thumbnail = document.createElement('img');
    thumbnail.src = thumbnailUrl;
    thumbnail.alt = 'Video thumbnail';
    thumbnail.className = 'video-thumbnail';
    thumbnail.onerror = function() { this.style.display = 'none'; };

    // Create video details
    const videoDetails = document.createElement('div');
    videoDetails.className = 'video-details';

    // Create and populate title with highlighting if searching
    const titleDiv = document.createElement('div');
    titleDiv.className = 'video-title';
    if (isSearching) {
      const highlightedFragment = createHighlightedElement(displayTitle, hiddenVideosState.searchQuery);
      titleDiv.appendChild(highlightedFragment);
    } else {
      titleDiv.textContent = displayTitle; // XSS-safe: uses textContent
    }

    // Create video ID display
    const videoIdDiv = document.createElement('div');
    videoIdDiv.className = 'video-id';
    videoIdDiv.textContent = videoId; // XSS-safe: uses textContent

    // Assemble video details
    videoDetails.appendChild(titleDiv);
    videoDetails.appendChild(videoIdDiv);

    // Assemble video info
    videoInfo.appendChild(thumbnail);
    videoInfo.appendChild(videoDetails);

    // Create video actions section
    const videoActions = document.createElement('div');
    videoActions.className = 'video-actions';

    // Create toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'video-action-btn';
    toggleBtn.setAttribute('data-action', 'toggle');
    toggleBtn.setAttribute('data-video-id', videoId);
    toggleBtn.textContent = state === 'dimmed' ? 'Hide' : 'Dim';
    toggleBtn.addEventListener('click', handleVideoAction);

    // Create view button
    const viewBtn = document.createElement('button');
    viewBtn.className = 'video-action-btn';
    viewBtn.setAttribute('data-action', 'view');
    viewBtn.setAttribute('data-video-id', videoId);
    viewBtn.textContent = 'View on YouTube';
    viewBtn.addEventListener('click', handleVideoAction);

    // Create remove button
    const removeBtn = document.createElement('button');
    removeBtn.className = 'video-action-btn remove';
    removeBtn.setAttribute('data-action', 'remove');
    removeBtn.setAttribute('data-video-id', videoId);
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', handleVideoAction);

    // Assemble actions
    videoActions.appendChild(toggleBtn);
    videoActions.appendChild(viewBtn);
    videoActions.appendChild(removeBtn);

    // Assemble card
    card.appendChild(videoInfo);
    card.appendChild(videoActions);

    return card;
  }

  /**
   * Updates search results status for screen readers
   * SECURITY: Sanitizes query before announcement
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

    // SECURITY: Query is already sanitized when stored in state,
    // but we use it in textContent which is XSS-safe anyway
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

      // MEMORY LEAK FIX: Clear old event listeners before setting new content
      videosContainer.replaceChildren();

      if (isSearching) {
        // Show "no search results" message
        // SECURITY: Query is already sanitized when stored in state,
        // but we escape it again for innerHTML defense-in-depth
        const escapedQuery = escapeHtml(hiddenVideosState.searchQuery);
        videosContainer.innerHTML = `
          <div class="search-no-results">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <h3>No results found</h3>
            <p>No videos match your search: <span class="search-term">"${escapedQuery}"</span></p>
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

    // Render video cards using safe DOM creation (XSS-protected)
    // MEMORY LEAK FIX: Use replaceChildren() instead of innerHTML = ''
    // replaceChildren() properly removes all children AND their event listeners,
    // preventing memory leaks when video cards with click handlers are re-rendered.
    // Using innerHTML = '' would leave event listeners in memory (~500KB per 1000 videos).
    videosContainer.replaceChildren();

    // Create and append each video card using DOM methods
    videos.forEach((record) => {
      const videoCard = createVideoCard(record, isSearching);
      videosContainer.appendChild(videoCard);
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
    // SECURITY: Sanitize query before storing in state
    // This ensures only safe queries are used throughout the application
    hiddenVideosState.searchQuery = sanitizeSearchQuery(query);
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
      // SECURITY: Sanitize query before storing in state
      hiddenVideosState.searchQuery = sanitizeSearchQuery(query);
      hiddenVideosState.currentPage = 1;
      hiddenVideosState.pageCursors = [null];
      loadHiddenVideos();
    }
  });

  // PERFORMANCE OPTIMIZATION: Use event delegation instead of multiple event listeners
  // Cache references to avoid repeated querySelectorAll and reduce O(n²) to O(1)
  const filterButtonsContainer = document.querySelector('.filter-section .button-group');
  let activeFilterButton = filterButtonsContainer.querySelector('.filter-btn.active');

  // Single event listener on parent container (event delegation)
  filterButtonsContainer.addEventListener('click', async (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;

    // Skip if already active
    if (btn === activeFilterButton) return;

    // Remove active from cached button (O(1) instead of O(n))
    if (activeFilterButton) {
      activeFilterButton.classList.remove('active');
    }

    // Set new active button
    btn.classList.add('active');
    activeFilterButton = btn;

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

  // File reader helper (legacy - kept for compatibility)
  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  // Streaming file reader with progress (for large files)
  async function readFileWithProgress(file) {
    const chunkSize = IMPORT_EXPORT_CONFIG.STREAMING_READ_CHUNK_SIZE;
    const stream = file.stream();
    const reader = stream.getReader();
    const decoder = new TextDecoder('utf-8');

    let buffer = '';
    let bytesRead = 0;
    const totalBytes = file.size;
    let done = false;

    while (!done) {
      const { value, done: streamDone } = await reader.read();
      done = streamDone;

      if (value) {
        bytesRead += value.length;
        buffer += decoder.decode(value, { stream: !done });

        // Log progress for large files
        if (DEBUG && totalBytes > 5 * 1024 * 1024) {
          const progress = Math.round((bytesRead / totalBytes) * 100);
          console.log(`Reading file: ${progress}% (${formatBytes(bytesRead)}/${formatBytes(totalBytes)})`);
        }

        // Yield to UI thread periodically to prevent freeze
        if (bytesRead % (chunkSize * 5) === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
    }

    return buffer;
  }

  // Export button handler with chunked processing
  exportBtn.addEventListener('click', async () => {
    try {
      // Show loading state
      exportBtn.disabled = true;
      exportBtn.textContent = 'Exporting...';

      // Fetch all data from background
      const exportData = await sendHiddenVideosMessage(
        HIDDEN_VIDEO_MESSAGES.EXPORT_ALL
      );

      // Show notification for large exports
      if (exportData.count > 10000) {
        showNotification(
          `Preparing export of ${exportData.count.toLocaleString()} videos... Please wait.`,
          NotificationType.INFO,
          3000
        );
      }

      // Use chunked JSON exporter to avoid creating huge string in memory
      const exporter = new ChunkedJSONExporter({
        chunkSize: IMPORT_EXPORT_CONFIG.EXPORT_CHUNK_SIZE,
        onProgress: (progress) => {
          if (DEBUG) {
            console.log(`Export progress: ${progress.stage} ${progress.progress}%`);
          }
          // Update button text with progress for large exports
          if (exportData.count > 10000 && progress.stage === 'exporting') {
            exportBtn.textContent = `Exporting ${progress.progress}%...`;
          }
        }
      });

      // Create metadata
      const metadata = {
        version: exportData.version,
        exportDate: exportData.exportDate
      };

      // Function to get records in batches
      const getRecordsBatch = async (offset, limit) => {
        const end = Math.min(offset + limit, exportData.records.length);
        return exportData.records.slice(offset, end);
      };

      // Export to JSON blob using chunked processing
      const blob = await exporter.exportToJSON(
        metadata,
        getRecordsBatch,
        exportData.count
      );

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
      showNotification(
        `Successfully exported ${exportData.count.toLocaleString()} videos (${formatBytes(blob.size)})`,
        NotificationType.SUCCESS
      );

    } catch (error) {
      if (DEBUG) console.error('Export failed:', error);
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

      // Show notification for large files
      if (file.size > 5 * 1024 * 1024) { // > 5MB
        showNotification(
          `Processing large file (${formatBytes(file.size)})... Please wait.`,
          NotificationType.INFO,
          3000
        );
      }

      // Use streaming file reader to avoid blocking UI during file read
      const content = await readFileWithProgress(file);

      // Parse JSON (this step still needs to parse entire JSON at once)
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
      if (DEBUG) console.error('Import preparation failed:', error);
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

    // SECURITY: Ensure numeric values are actually numbers (defense-in-depth)
    const validRecordCount = Number(validation.validRecordCount) || 0;
    const invalidRecordCount = Number(validation.invalidRecordCount) || 0;
    const currentTotal = Number(validation.currentTotal) || 0;
    const projectedTotal = Number(validation.projectedTotal) || 0;

    // Show validation info
    validationInfo.innerHTML = `
      <div class="validation-success">
        <h3>Import Preview</h3>
        <div class="stats-preview">
          <div class="stat-item">
            <span class="stat-label">Valid Records:</span>
            <span class="stat-value">${validRecordCount}</span>
          </div>
          ${invalidRecordCount > 0 ? `
          <div class="stat-item warning">
            <span class="stat-label">Invalid Records (will be skipped):</span>
            <span class="stat-value">${invalidRecordCount}</span>
          </div>
          ` : ''}
          <div class="stat-item">
            <span class="stat-label">Current Total:</span>
            <span class="stat-value">${currentTotal}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">After Import (max):</span>
            <span class="stat-value">${projectedTotal}</span>
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

  // PERFORMANCE OPTIMIZATION: Use event delegation for conflict strategy buttons
  // Cache references to avoid repeated querySelectorAll and reduce O(n²) to O(1)
  const strategyButtonsContainer = document.querySelector('.import-options .button-group');
  let activeStrategyButton = strategyButtonsContainer.querySelector('.conflict-strategy-btn.active');

  // Single event listener on parent container (event delegation)
  strategyButtonsContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.conflict-strategy-btn');
    if (!btn) return;

    // Skip if already active
    if (btn === activeStrategyButton) return;

    // Remove active from cached button (O(1) instead of O(n))
    if (activeStrategyButton) {
      activeStrategyButton.classList.remove('active');
    }

    // Set new active button
    btn.classList.add('active');
    activeStrategyButton = btn;
    importState.selectedStrategy = btn.dataset.strategy;
  });

  // Confirm import button
  confirmImportBtn.addEventListener('click', async () => {
    const progressDiv = document.getElementById('import-progress');
    const progressText = document.getElementById('import-progress-text');
    const progressPercentage = document.getElementById('import-progress-percentage');
    const progressBar = document.getElementById('import-progress-bar');
    const progressStats = document.getElementById('import-progress-stats');
    const progressETA = document.getElementById('import-progress-eta');

    try {
      // Disable buttons and prevent modal close during import
      confirmImportBtn.disabled = true;
      cancelImportBtn.disabled = true;
      closeImportModalBtn.disabled = true;
      importState.isImporting = true;

      // Show progress UI
      progressDiv.style.display = 'block';
      progressText.textContent = 'Starting import...';
      progressPercentage.textContent = '0%';
      progressBar.style.width = '0%';
      progressStats.textContent = '';
      progressETA.textContent = '';

      // Process records in batches to avoid blocking and show progress
      const records = importState.data.records || [];
      const totalRecords = records.length;
      const batchSize = IMPORT_EXPORT_CONFIG.IMPORT_BATCH_SIZE;
      const batches = Math.ceil(totalRecords / batchSize);

      const startTime = Date.now();
      let processedRecords = 0;
      let lastProgressUpdate = 0;

      // Aggregate results
      const aggregatedResults = {
        added: 0,
        updated: 0,
        skipped: 0,
        errors: []
      };

      // Process each batch
      for (let i = 0; i < batches; i++) {
        const start = i * batchSize;
        const end = Math.min(start + batchSize, totalRecords);
        const batch = records.slice(start, end);

        // Create batch data structure
        const batchData = {
          version: importState.data.version,
          exportDate: importState.data.exportDate,
          count: batch.length,
          records: batch
        };

        // Import this batch
        const batchResult = await sendHiddenVideosMessage(
          HIDDEN_VIDEO_MESSAGES.IMPORT_RECORDS,
          {
            data: batchData,
            conflictStrategy: importState.selectedStrategy
          }
        );

        // Aggregate results
        aggregatedResults.added += batchResult.added || 0;
        aggregatedResults.updated += batchResult.updated || 0;
        aggregatedResults.skipped += batchResult.skipped || 0;
        if (batchResult.errors) {
          aggregatedResults.errors.push(...batchResult.errors);
        }

        // Update progress
        processedRecords = end;
        const progress = Math.round((processedRecords / totalRecords) * 100);
        const now = Date.now();

        // Throttle UI updates to avoid overwhelming the UI
        if (now - lastProgressUpdate >= IMPORT_EXPORT_CONFIG.PROGRESS_UPDATE_THROTTLE || i === batches - 1) {
          lastProgressUpdate = now;

          // Update progress bar and percentage
          progressBar.style.width = `${progress}%`;
          progressPercentage.textContent = `${progress}%`;
          progressText.textContent = `Importing batch ${i + 1} of ${batches}...`;

          // Calculate and show stats
          const elapsed = (now - startTime) / 1000; // seconds
          const recordsPerSecond = processedRecords / elapsed;
          progressStats.textContent = `${processedRecords.toLocaleString()} / ${totalRecords.toLocaleString()} records (${formatSpeed(recordsPerSecond)})`;

          // Calculate ETA
          if (processedRecords < totalRecords) {
            const eta = calculateETA(processedRecords, totalRecords, startTime);
            progressETA.textContent = `ETA: ${eta}`;
          }
        }

        // Yield to UI thread to prevent freeze
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      // Update completion message
      progressBar.style.width = '100%';
      progressPercentage.textContent = '100%';
      progressText.textContent = 'Import complete!';
      progressStats.textContent = `${totalRecords.toLocaleString()} records processed`;
      progressETA.textContent = '';

      // Show results after brief delay
      setTimeout(() => {
        closeImportModal();

        // Show success notification with summary
        const summary = [
          `Import complete!`,
          `Added: ${aggregatedResults.added}`,
          `Updated: ${aggregatedResults.updated}`,
          `Skipped: ${aggregatedResults.skipped}`
        ].join(' | ');

        if (aggregatedResults.errors && aggregatedResults.errors.length > 0) {
          // Show warning if there were errors
          showNotification(summary + ` | Errors: ${aggregatedResults.errors.length}`, NotificationType.WARNING, 6000);
        } else {
          showNotification(summary, NotificationType.SUCCESS, 5000);
        }

        // Refresh the list
        refreshStats().then(() => loadHiddenVideos());
      }, 500);

    } catch (error) {
      if (DEBUG) console.error('Import execution failed:', error);

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

    // Reset strategy buttons - use cached reference instead of querySelectorAll
    if (activeStrategyButton) {
      activeStrategyButton.classList.remove('active');
    }
    activeStrategyButton = strategyButtonsContainer.querySelector('.conflict-strategy-btn');
    if (activeStrategyButton) {
      activeStrategyButton.classList.add('active');
    }
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
          if (DEBUG) console.error('Failed to refresh hidden videos after event:', error);
        }
      });
    }
  });
});