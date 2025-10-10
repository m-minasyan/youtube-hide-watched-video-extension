// Storage Keys
export const STORAGE_KEYS = {
  THRESHOLD: 'YTHWV_THRESHOLD',
  WATCHED_STATE: 'YTHWV_STATE',
  SHORTS_STATE: 'YTHWV_STATE_SHORTS',
  HIDDEN_VIDEOS: 'YTHWV_HIDDEN_VIDEOS',
  INDIVIDUAL_MODE: 'YTHWV_INDIVIDUAL_MODE',
  INDIVIDUAL_MODE_ENABLED: 'YTHWV_INDIVIDUAL_MODE_ENABLED',
  THEME: 'YTHWV_THEME'
};

// Hidden Video Message Types
export const HIDDEN_VIDEO_MESSAGES = {
  HEALTH_CHECK: 'HIDDEN_VIDEOS_HEALTH_CHECK',
  GET_MANY: 'HIDDEN_VIDEOS_GET_MANY',
  GET_PAGE: 'HIDDEN_VIDEOS_GET_PAGE',
  GET_STATS: 'HIDDEN_VIDEOS_GET_STATS',
  SET_STATE: 'HIDDEN_VIDEOS_SET_STATE',
  CLEAR_ALL: 'HIDDEN_VIDEOS_CLEAR_ALL'
};

// Default Settings
export const DEFAULT_SETTINGS = {
  threshold: 10,
  theme: 'auto',
  individualMode: 'dimmed',
  individualModeEnabled: true,
  states: {
    watched: {
      misc: 'normal',
      subscriptions: 'normal',
      channel: 'normal',
      watch: 'normal',
      trending: 'normal',
      playlist: 'normal'
    },
    shorts: {
      misc: 'normal',
      subscriptions: 'normal',
      channel: 'normal',
      watch: 'normal',
      trending: 'normal'
    }
  }
};

// CSS Classes (content script specific, but defined here for completeness)
export const CSS_CLASSES = {
  WATCHED_HIDDEN: 'YT-HWV-WATCHED-HIDDEN',
  WATCHED_DIMMED: 'YT-HWV-WATCHED-DIMMED',
  SHORTS_HIDDEN: 'YT-HWV-SHORTS-HIDDEN',
  SHORTS_DIMMED: 'YT-HWV-SHORTS-DIMMED',
  HIDDEN_ROW_PARENT: 'YT-HWV-HIDDEN-ROW-PARENT',
  INDIVIDUAL_HIDDEN: 'YT-HWV-INDIVIDUAL-HIDDEN',
  INDIVIDUAL_DIMMED: 'YT-HWV-INDIVIDUAL-DIMMED',
  EYE_BUTTON: 'yt-hwv-eye-button',
  HAS_EYE_BUTTON: 'yt-hwv-has-eye-button'
};

// Selectors (content script specific)
export const SELECTORS = {
  PROGRESS_BAR: [
    '.ytd-thumbnail-overlay-resume-playback-renderer',
    '.ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment',
    '.ytp-progress-bar-played'
  ],
  SHORTS_CONTAINERS: [
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
  ],
  THUMBNAILS: [
    'yt-thumbnail-view-model:not(.yt-hwv-has-eye-button)',
    'ytd-thumbnail:not(.yt-hwv-has-eye-button)'
  ],
  VIDEO_CONTAINERS: [
    'ytd-rich-item-renderer',
    'ytd-video-renderer',
    'ytd-grid-video-renderer',
    'ytd-compact-video-renderer',
    'yt-lockup-view-model',
    'ytm-shorts-lockup-view-model'
  ],
  TITLE_ELEMENTS: [
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
  ]
};

// Error handling configuration
export const ERROR_CONFIG = {
  MAX_RETRY_ATTEMPTS: 3,
  INITIAL_RETRY_DELAY: 100,
  MAX_RETRY_DELAY: 5000,
  MESSAGE_TIMEOUT: 5000,
  MAX_ERROR_LOG_SIZE: 100
};

// Background service worker configuration
export const SERVICE_WORKER_CONFIG = {
  KEEP_ALIVE_INTERVAL: 20000 // 20 seconds - keeps service worker active during usage
};

// Pre-computed selector strings for performance
export const SELECTOR_STRINGS = {
  VIDEO_CONTAINERS: SELECTORS.VIDEO_CONTAINERS.join(', '),
  THUMBNAILS: SELECTORS.THUMBNAILS.join(', '),
  SHORTS_CONTAINERS: SELECTORS.SHORTS_CONTAINERS.join(', ')
};

// Debug flag
export const DEBUG = false;

// DOM Cache Configuration
export const CACHE_CONFIG = {
  DOCUMENT_QUERY_TTL: 1000,        // 1 second TTL for document queries
  PROGRESS_BAR_TTL: 500,           // 500ms for progress bars (update frequently)
  STATS_LOG_INTERVAL: 30000,       // Log stats every 30 seconds in debug mode
  ENABLE_PERFORMANCE_MONITORING: true
};

// IntersectionObserver Configuration
// Note: These values are validated to ensure proper observer behavior
// - ROOT_MARGIN: 100px provides smooth pre-loading before viewport entry
// - THRESHOLD: Multiple points track granular visibility changes
// - VISIBILITY_THRESHOLD: 25% visibility balances accuracy with performance
// - BATCH_DELAY: 100ms reduces callback frequency during rapid scrolling
export const INTERSECTION_OBSERVER_CONFIG = (function() {
  const config = {
    ROOT_MARGIN: '100px',
    THRESHOLD: [0, 0.25, 0.5],
    VISIBILITY_THRESHOLD: 0.25,
    BATCH_DELAY: 100,
    ENABLE_LAZY_PROCESSING: true
  };

  // Validate configuration values
  if (!Array.isArray(config.THRESHOLD) || config.THRESHOLD.length === 0) {
    console.error('[YT-HWV] Invalid THRESHOLD config, using defaults');
    config.THRESHOLD = [0, 0.25, 0.5];
  }

  // Validate threshold values are between 0 and 1
  config.THRESHOLD = config.THRESHOLD.filter(t => typeof t === 'number' && t >= 0 && t <= 1);

  if (typeof config.VISIBILITY_THRESHOLD !== 'number' ||
      config.VISIBILITY_THRESHOLD < 0 ||
      config.VISIBILITY_THRESHOLD > 1) {
    console.error('[YT-HWV] Invalid VISIBILITY_THRESHOLD config, using default 0.25');
    config.VISIBILITY_THRESHOLD = 0.25;
  }

  if (typeof config.BATCH_DELAY !== 'number' || config.BATCH_DELAY < 0) {
    console.error('[YT-HWV] Invalid BATCH_DELAY config, using default 100ms');
    config.BATCH_DELAY = 100;
  }

  return config;
})();

// IndexedDB Optimization Configuration
export const INDEXEDDB_CONFIG = {
  // Cache settings
  CONTENT_CACHE_MAX_SIZE: 1000,
  BACKGROUND_CACHE_TTL: 30000, // 30 seconds

  // Write batching
  WRITE_BATCH_DELAY: 100, // milliseconds
  WRITE_BATCH_MAX_SIZE: 50,

  // Query optimization
  GET_CURSOR_THRESHOLD: 50, // Use cursor for 50+ IDs
  STATS_CURSOR_THRESHOLD: 100, // Use cursor for 100+ records

  // Pagination
  ENABLE_PREFETCH: false, // Disabled by default (Phase 6)
  PREFETCH_DELAY: 100,

  // Broadcast
  BROADCAST_DEBOUNCE: 100
};

// Feature flags for IndexedDB optimizations
export const FEATURE_FLAGS = {
  ENABLE_WRITE_BATCHING: false, // Disabled by default - needs testing
  ENABLE_BACKGROUND_CACHE: true,
  ENABLE_LRU_EVICTION: true,
  ENABLE_CURSOR_OPTIMIZATION: true,
  ENABLE_STATS_OPTIMIZATION: true,
  ENABLE_PAGINATION_PREFETCH: false, // Phase 6
  ENABLE_BROADCAST_BATCHING: false // Phase 6
};
