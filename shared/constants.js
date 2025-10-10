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
