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
  CLEAR_ALL: 'HIDDEN_VIDEOS_CLEAR_ALL',
  EXPORT_ALL: 'HIDDEN_VIDEOS_EXPORT_ALL',
  IMPORT_RECORDS: 'HIDDEN_VIDEOS_IMPORT_RECORDS',
  VALIDATE_IMPORT: 'HIDDEN_VIDEOS_VALIDATE_IMPORT'
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
  MAX_ERROR_LOG_SIZE: 100,
  STORAGE_TIMEOUT: 10000 // 10 seconds - timeout for chrome.storage operations
};

// Background service worker configuration
// NOTE: Chrome's alarms API enforces a MINIMUM periodInMinutes of 1 minute for both
// packed and unpacked extensions. Values below 1 minute are rounded UP to 1 minute.
// This means we cannot ping more frequently than once per minute using chrome.alarms.
//
// Chrome suspends service workers after ~30 seconds of inactivity, so with a 1-minute
// alarm interval, the worker WILL be suspended between pings. This is acceptable because:
// - All critical data is persisted in IndexedDB (survives suspensions)
// - Message listeners are automatically re-registered on wake-up
// - The worker can restart quickly when needed (< 100ms typically)
//
// For more aggressive keep-alive, we would need long-lived connections from content
// scripts, but that adds complexity and battery drain. The current approach balances
// performance with resource efficiency.
export const SERVICE_WORKER_CONFIG = {
  KEEP_ALIVE_INTERVAL: 60000 // 1 minute - Chrome's enforced minimum for chrome.alarms
};

// Pre-computed selector strings for performance
export const SELECTOR_STRINGS = {
  VIDEO_CONTAINERS: SELECTORS.VIDEO_CONTAINERS.join(', '),
  THUMBNAILS: SELECTORS.THUMBNAILS.join(', '),
  SHORTS_CONTAINERS: SELECTORS.SHORTS_CONTAINERS.join(', ')
};

// Debug flag - replaced at build time by webpack DefinePlugin
// In development: true, In production: false
// For webpack builds: __DEV__ is defined by DefinePlugin
// For direct browser loads (popup.js): check if process exists before accessing
export const DEBUG = typeof __DEV__ !== 'undefined' ? __DEV__ :
  (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production');

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

  // Validate ROOT_MARGIN format (must be valid CSS margin: '10px', '10%', '10px 20px', etc.)
  // Format: 1-4 values, each being a number followed by 'px' or '%', separated by spaces
  const rootMarginPattern = /^(-?\d+(?:\.\d+)?(px|%)(\s+-?\d+(?:\.\d+)?(px|%)){0,3})$/;
  if (typeof config.ROOT_MARGIN !== 'string' || !rootMarginPattern.test(config.ROOT_MARGIN.trim())) {
    console.error('[YT-HWV] Invalid ROOT_MARGIN format, using default "100px"');
    config.ROOT_MARGIN = '100px';
  }

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
  BROADCAST_DEBOUNCE: 100,

  // Timeout settings
  OPERATION_TIMEOUT: 30000, // 30 seconds - timeout for individual operations
  CURSOR_TIMEOUT: 30000, // 30 seconds - initial timeout for cursor operations (optimized for 99% of users)
  CURSOR_TIMEOUT_RETRY_1: 60000, // 60 seconds - second attempt for slower devices
  CURSOR_TIMEOUT_RETRY_2: 90000, // 90 seconds - third attempt for edge cases (200k+ records on very slow devices)
  DB_OPEN_TIMEOUT: 30000, // 30 seconds - timeout for opening database (old Android devices need 15-20s)
  RESET_TIMEOUT: 60000, // 1 minute - timeout for database reset (handles large DB cleanup)

  // Progressive timeout retry settings
  ENABLE_CURSOR_PROGRESSIVE_TIMEOUT: true, // Enable progressive timeout for cursor operations
  CURSOR_MAX_RETRIES: 2 // Maximum retry attempts for cursor operations (total 3 attempts)
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

// Import/Export Configuration
export const IMPORT_EXPORT_CONFIG = {
  FORMAT_VERSION: 1,
  MAX_IMPORT_SIZE_MB: 50,
  MAX_IMPORT_RECORDS: 200000,
  IMPORT_BATCH_SIZE: 1000,        // Increased from 500 for better performance
  EXPORT_CHUNK_SIZE: 1000,        // Records per chunk for export
  STREAMING_READ_CHUNK_SIZE: 1024 * 1024, // 1MB chunks for file reading
  CONFLICT_STRATEGIES: {
    SKIP: 'skip',           // Skip existing records
    OVERWRITE: 'overwrite', // Overwrite with imported data
    MERGE: 'merge'          // Keep newer timestamp
  },
  // Progress update throttling (ms) to avoid UI updates too frequently
  PROGRESS_UPDATE_THROTTLE: 100
};

// Quota Management Configuration
export const QUOTA_CONFIG = {
  // Estimate record size (bytes) - typical video record with metadata
  ESTIMATED_RECORD_SIZE: 200,

  // Safety margin for cleanup (delete 20% more than estimated need)
  CLEANUP_SAFETY_MARGIN: 1.2,

  // Minimum records to delete (avoid too frequent cleanups)
  MIN_CLEANUP_COUNT: 100,

  // Maximum records to delete in one cleanup (prevent excessive deletions)
  MAX_CLEANUP_COUNT: 5000,

  // Maximum records to store in fallback storage
  // INCREASED from 1000 to 5000 to prevent data loss during high-volume operations
  MAX_FALLBACK_RECORDS: 5000,

  // Notification cooldown (5 minutes)
  NOTIFICATION_COOLDOWN_MS: 5 * 60 * 1000,

  // Maximum quota events to log
  MAX_QUOTA_EVENTS: 50,

  // Maximum retry attempts for quota exceeded operations
  MAX_RETRY_ATTEMPTS: 3,

  // Enable fallback storage for critical operations
  ENABLE_FALLBACK_STORAGE: true,

  // Enable user notifications for quota events
  ENABLE_QUOTA_NOTIFICATIONS: true
};

// Selector Fallback Chains
// Primary selectors listed first, fallbacks in order of preference
export const SELECTOR_CHAINS = {
  VIDEO_TITLE: [
    '#video-title',
    '#video-title-link',
    'a#video-title',
    'h3.title a',
    'h3 a',
    'h4 a',
    '.title-and-badge a',
    'yt-formatted-string#video-title',
    'span#video-title',
    // Fallback to any link in container
    'a[href*="/watch?v="]',
    'a[href*="/shorts/"]'
  ],

  PROGRESS_BAR: [
    // Modern selectors
    '.ytd-thumbnail-overlay-resume-playback-renderer',
    '.yt-thumbnail-overlay-resume-playback-renderer-wiz__progress-bar',
    '.ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment',
    // Legacy selectors
    '.ytp-progress-bar-played',
    'yt-thumbnail-overlay-resume-playback-renderer',
    '.ytm-thumbnail-overlay-resume-playback-renderer',
    // Generic fallbacks
    '[class*="progress"][class*="bar"]',
    '[class*="watched"]'
  ],

  VIDEO_THUMBNAIL: [
    'yt-thumbnail-view-model',
    'ytd-thumbnail',
    '.ytThumbnailViewModelImage',
    'img.yt-core-image',
    // Generic fallbacks
    '[class*="thumbnail"]'
  ],

  VIDEO_LINK: [
    'a[href*="/watch?v="]',
    'a[href^="/watch?"]',
    'a[href*="&v="]',
    'a.ytd-thumbnail',
    'a.yt-simple-endpoint'
  ],

  SHORTS_LINK: [
    'a[href*="/shorts/"]',
    'a[href^="/shorts/"]',
    'a.reel-item-endpoint',
    '.shortsLockupViewModelHost a'
  ],

  VIDEO_CONTAINERS: [
    'ytd-rich-item-renderer',
    'ytd-video-renderer',
    'ytd-grid-video-renderer',
    'ytd-compact-video-renderer',
    'yt-lockup-view-model',
    'ytm-shorts-lockup-view-model'
  ],

  THUMBNAILS: [
    'yt-thumbnail-view-model:not(.yt-hwv-has-eye-button)',
    'ytd-thumbnail:not(.yt-hwv-has-eye-button)'
  ]
};

// Critical selector health thresholds
// These values define when the extension detects that YouTube's DOM structure has changed
export const SELECTOR_HEALTH_CONFIG = {
  // 70% success rate minimum - Below this, selectors are considered unhealthy
  // This threshold allows for transient failures while catching structural changes
  CRITICAL_SUCCESS_RATE: 0.7,

  // Minimum 10 queries before health assessment - Prevents false positives during initial load
  // Statistical significance requires multiple samples before making health determinations
  MIN_QUERIES_FOR_HEALTH: 10,

  // Check selector health every 30 seconds (30000ms)
  // Balances responsiveness to DOM changes with performance overhead
  HEALTH_CHECK_INTERVAL: 30000,

  // 5 minute cooldown between notifications (300000ms)
  // Prevents notification spam while keeping users informed of persistent issues
  NOTIFICATION_COOLDOWN: 300000,

  // Show notification after 5 consecutive failures (currently unused - reserved for future use)
  // Would trigger alerts only after sustained failure pattern is established
  FAILURE_NOTIFICATION_THRESHOLD: 5
};
