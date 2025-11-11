import { logError } from './errorHandler.js';

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
    // Modern wiz-style selectors (most specific, highest priority)
    '.ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment',
    '.yt-thumbnail-overlay-resume-playback-renderer-wiz__progress-bar',
    // Standard selectors (legacy and current)
    '.ytd-thumbnail-overlay-resume-playback-renderer',
    '.ytd-thumbnail-overlay-resume-playback-progress-renderer',
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
  STORAGE_TIMEOUT: 10000, // 10 seconds - timeout for chrome.storage operations
  // FIXED P3-4: Quota-specific retry delays (used by quotaManager.js)
  // Longer delays for quota errors since they need time for cleanup/pruning
  QUOTA_RETRY_DELAYS: [5000, 30000, 120000] // 5s, 30s, 2min (exponential backoff)
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
// FIXED P1-5: Validate process.env is an object before accessing properties
export const DEBUG = typeof __DEV__ !== 'undefined' ? Boolean(__DEV__) :
  (typeof process !== 'undefined' &&
   typeof process.env === 'object' &&
   process.env !== null &&
   typeof process.env.NODE_ENV === 'string' &&
   process.env.NODE_ENV === 'development');

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
    logError('IntersectionObserverConfig', new Error('Invalid ROOT_MARGIN format'), {
      value: config.ROOT_MARGIN,
      default: '100px',
      message: 'Invalid ROOT_MARGIN format, using default "100px"'
    });
    config.ROOT_MARGIN = '100px';
  }

  // Validate configuration values
  if (!Array.isArray(config.THRESHOLD) || config.THRESHOLD.length === 0) {
    logError('IntersectionObserverConfig', new Error('Invalid THRESHOLD config'), {
      value: config.THRESHOLD,
      default: [0, 0.25, 0.5],
      message: 'Invalid THRESHOLD config, using defaults'
    });
    config.THRESHOLD = [0, 0.25, 0.5];
  }

  // Validate threshold values are between 0 and 1
  config.THRESHOLD = config.THRESHOLD.filter(t => typeof t === 'number' && t >= 0 && t <= 1);

  if (typeof config.VISIBILITY_THRESHOLD !== 'number' ||
      config.VISIBILITY_THRESHOLD < 0 ||
      config.VISIBILITY_THRESHOLD > 1) {
    logError('IntersectionObserverConfig', new Error('Invalid VISIBILITY_THRESHOLD config'), {
      value: config.VISIBILITY_THRESHOLD,
      default: 0.25,
      message: 'Invalid VISIBILITY_THRESHOLD config, using default 0.25'
    });
    config.VISIBILITY_THRESHOLD = 0.25;
  }

  if (typeof config.BATCH_DELAY !== 'number' || config.BATCH_DELAY < 0) {
    logError('IntersectionObserverConfig', new Error('Invalid BATCH_DELAY config'), {
      value: config.BATCH_DELAY,
      default: 100,
      message: 'Invalid BATCH_DELAY config, using default 100ms'
    });
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

  // Concurrency control
  // FIXED P3-6: Moved MAX_ACTIVE_OPERATIONS from hardcoded constant to config
  MAX_ACTIVE_OPERATIONS: 1000, // Maximum concurrent IndexedDB operations to prevent resource exhaustion

  // FIXED P3-11: Timeout settings with detailed rationale
  // These values are tuned based on:
  // - 99th percentile user device performance
  // - Database sizes from 1K to 200K+ records
  // - Network conditions and disk I/O speeds
  // - Service Worker lifecycle constraints (Chrome terminates after ~30s of inactivity)

  OPERATION_TIMEOUT: 30000, // 30s - Individual operations (write/read/update)
    // Rationale: Covers 99% of operations on modern devices. Large enough for
    // batch writes (1000 records ~5-10s), small enough to detect hangs quickly.

  CURSOR_TIMEOUT: 30000, // 30s - Initial cursor iteration timeout
    // Rationale: Optimized for common case (10K-50K records). Tests show:
    // - 10K records: 2-5s on average devices
    // - 50K records: 8-15s on average devices
    // - 100K records: 15-25s on average devices

  CURSOR_TIMEOUT_RETRY_1: 60000, // 60s - First retry for slower devices
    // Rationale: Handles 100K-150K records on slow devices (old Android, HDD)

  CURSOR_TIMEOUT_RETRY_2: 90000, // 90s - Final retry for extreme cases
    // Rationale: Handles 200K+ records on very slow devices. Beyond this,
    // operation likely hung (corrupted database, disk failure, etc.)

  DB_OPEN_TIMEOUT: 30000, // 30s - Database open operation
    // Rationale: Old Android devices (API 21-24) can take 15-20s to open
    // large IndexedDB databases. 30s provides buffer for worst case.

  RESET_TIMEOUT: 60000, // 60s - Database reset (delete + recreate)
    // Rationale: Deleting 100K+ records and recreating schema can take 30-45s
    // on slow devices. 60s provides safety margin.

  // Progressive timeout retry settings
  ENABLE_CURSOR_PROGRESSIVE_TIMEOUT: true, // Enable progressive timeout for cursor operations
  CURSOR_MAX_RETRIES: 2 // Maximum retry attempts for cursor operations (total 3 attempts)
};

/**
 * FIXED P3-6: Feature Flags for IndexedDB and Performance Optimizations
 *
 * These flags control experimental and production features.
 * To enable/disable a feature, change its value to true/false and rebuild the extension.
 *
 * @property {boolean} ENABLE_WRITE_BATCHING - [EXPERIMENTAL] Batches multiple write operations
 *   into single transactions. Improves performance but needs thorough testing. Default: false
 *
 * @property {boolean} ENABLE_BACKGROUND_CACHE - [STABLE] Caches frequently accessed records
 *   in background script memory using LRU strategy. Default: true
 *
 * @property {boolean} ENABLE_LRU_EVICTION - [STABLE] Automatically evicts least recently used
 *   cache entries to prevent unbounded memory growth. Default: true
 *
 * @property {boolean} ENABLE_CURSOR_OPTIMIZATION - [STABLE] Uses optimized cursor iteration
 *   for large dataset operations. Default: true
 *
 * @property {boolean} ENABLE_STATS_OPTIMIZATION - [STABLE] Uses index-based counting instead
 *   of full cursor iteration for statistics. Default: true
 *
 * @property {boolean} ENABLE_PAGINATION_PREFETCH - [EXPERIMENTAL/PHASE 6] Prefetches next
 *   page of results while user views current page. Default: false
 *
 * @property {boolean} ENABLE_BROADCAST_BATCHING - [EXPERIMENTAL/PHASE 6] Batches state change
 *   broadcasts to reduce message passing overhead. Default: false
 *
 * @example
 * // To enable write batching for testing:
 * // 1. Change ENABLE_WRITE_BATCHING to true
 * // 2. Run: npm run build
 * // 3. Test thoroughly before releasing
 */
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

// UI Configuration
export const UI_CONFIG = {
  // Hidden videos manager pagination
  VIDEOS_PER_PAGE: 12,

  // Search limits by device type
  MAX_SEARCH_ITEMS_MOBILE: 500,
  MAX_SEARCH_ITEMS_DESKTOP: 1000
};

// FIXED P3-12: Delay constants (previously hardcoded)
// Documented delays with rationale for better maintainability
export const DELAYS = {
  YIELD_TO_UI: 0,           // setTimeout(0) - Yield control to UI thread
  BATCH_PAUSE: 10,          // Small pause between batch operations
  FOCUS_DELAY: 100,         // Delay before focusing element after render
  DEBOUNCE_SHORT: 100,      // Short debounce for frequent operations
  DEBOUNCE_MEDIUM: 250,     // Medium debounce for DOM mutations
  RATE_LIMIT_BATCH: 10      // Delay between batches for API rate limiting
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

  // P3-1 FIX: Moved from UI_CONFIG to QUOTA_CONFIG for better organization
  // Batch size for aggressive fallback processing
  AGGRESSIVE_BATCH_SIZE: 50,

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
    // Modern wiz-style selectors (2025+) - Most specific and current
    '.ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment',
    '.yt-thumbnail-overlay-resume-playback-renderer-wiz__progress-bar',
    // Standard class selectors (legacy and current compatibility)
    '.ytd-thumbnail-overlay-resume-playback-renderer',
    '.ytd-thumbnail-overlay-resume-playback-progress-renderer',
    '.yt-thumbnail-overlay-resume-playback-progress-renderer',
    // Element tag selectors (no class prefix)
    'yt-thumbnail-overlay-resume-playback-renderer',
    'ytd-thumbnail-overlay-resume-playback-renderer',
    // Mobile/responsive selectors
    '.ytm-thumbnail-overlay-resume-playback-renderer',
    'ytm-thumbnail-overlay-resume-playback-renderer',
    // Legacy player selectors
    '.ytp-progress-bar-played',
    // Attribute-based selectors (more specific first - class + attribute combination)
    '.ytd-thumbnail-overlay-resume-playback-renderer[style*="width"]',
    '[class*="thumbnail-overlay"][class*="resume"]',
    '[class*="thumbnail-overlay"][class*="playback"]',
    // ID-based selectors (YouTube sometimes uses these)
    '#progress-bar',
    '#resume-playback-progress',
    // Generic fallbacks (most permissive - use class containment only)
    '[class*="progress"][class*="bar"]',
    '[class*="resume"][class*="playback"]',
    '[class*="watched"][class*="progress"]',
    '[aria-label*="progress"]'
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
    // Primary modern selectors (2025+)
    'yt-thumbnail-view-model:not(.yt-hwv-has-eye-button)',
    'ytd-thumbnail:not(.yt-hwv-has-eye-button)',
    // Alternative thumbnail containers
    'yt-thumbnail:not(.yt-hwv-has-eye-button)',
    'ytm-thumbnail:not(.yt-hwv-has-eye-button)',
    // Image wrapper elements
    '.ytThumbnailViewModelImage:not(.yt-hwv-has-eye-button)',
    '.yt-core-image-container:not(.yt-hwv-has-eye-button)',
    // Lockup model thumbnails
    '.yt-lockup-thumbnail:not(.yt-hwv-has-eye-button)',
    'yt-lockup-thumbnail:not(.yt-hwv-has-eye-button)',
    // Rich item thumbnails
    '#thumbnail:not(.yt-hwv-has-eye-button)',
    '.ytd-thumbnail:not(.yt-hwv-has-eye-button)',
    // Video renderer thumbnails
    'ytd-video-renderer #thumbnail:not(.yt-hwv-has-eye-button)',
    'ytd-grid-video-renderer #thumbnail:not(.yt-hwv-has-eye-button)',
    'ytd-compact-video-renderer #thumbnail:not(.yt-hwv-has-eye-button)',
    // Shorts thumbnails
    'ytm-shorts-lockup-view-model .thumbnail:not(.yt-hwv-has-eye-button)',
    '.shortsLockupViewModelHostThumbnail:not(.yt-hwv-has-eye-button)',
    // Generic fallbacks (most permissive)
    '[class*="thumbnail"]:not(.yt-hwv-has-eye-button):not(img)',
    '[id*="thumbnail"]:not(.yt-hwv-has-eye-button):not(img)',
    'a[href*="/watch"] > *:first-child:not(.yt-hwv-has-eye-button)',
    'a[href*="/shorts"] > *:first-child:not(.yt-hwv-has-eye-button)'
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

// FIXED P3-4: UI/UX timing constants
// Extracted hardcoded magic numbers for better maintainability and documentation
export const UI_TIMING = {
  // Search debounce delay (300ms)
  // Balance between responsiveness and reducing unnecessary API calls
  // Short enough for good UX, long enough to avoid excessive filtering
  SEARCH_DEBOUNCE_MS: 300,

  // Keep-alive alarm interval (20000ms = 20 seconds)
  // Prevents service worker from being terminated by Chrome
  // Set just below Chrome's 30-second inactivity threshold
  KEEP_ALIVE_INTERVAL_MS: 20000,

  // Maximum delete count per operation (1000000 = 1 million)
  // Safety limit to prevent accidental deletion of entire database
  // High enough for batch operations, low enough to prevent catastrophic errors
  MAX_DELETE_COUNT: 1000000,

  // Pending request timeout (30000ms = 30 seconds)
  // Timeout for background fetch operations to prevent memory leaks
  // Long enough for slow networks, short enough to prevent indefinite hangs
  PENDING_REQUEST_TIMEOUT_MS: 30000,

  // Database reset max wait time (10000ms = 10 seconds)
  // Maximum time to wait for active operations before forcing database reset
  // Balances data integrity with need to proceed with reset
  DB_RESET_MAX_WAIT_MS: 10000,

  // Batch processing yield delay (10ms)
  // Small delay between batches to allow UI thread to process events
  // Prevents UI blocking during large batch operations
  BATCH_YIELD_MS: 10
};

// CODE REVIEW FIX (P3-1): Validation and security limits
// Consolidated magic numbers for better maintainability
export const VALIDATION_LIMITS = {
  // Maximum notification entries in global rate limiter
  // Prevents unbounded memory growth from notification spam
  MAX_NOTIFICATION_ENTRIES: 50,

  // Maximum JSON nesting depth for import validation
  // Prevents DoS attacks via deeply nested JSON (stack overflow)
  MAX_JSON_DEPTH: 100,

  // Maximum quota retry depth
  // Prevents infinite recursion in quota handling
  MAX_QUOTA_RETRY_DEPTH: 2,

  // Maximum notification types tracked
  // Prevents Map growth from dynamic notification type generation
  MAX_NOTIFICATION_TYPES: 50,

  // Fallback lock timeout (30 seconds)
  // Prevents deadlock if lock is never released
  FALLBACK_LOCK_TIMEOUT_MS: 30000,

  // Per-type cleanup window (5 minutes)
  // Removes notification type entries older than this threshold
  PER_TYPE_CLEANUP_WINDOW_MS: 5 * 60 * 1000
};
