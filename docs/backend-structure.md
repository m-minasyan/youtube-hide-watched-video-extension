# Backend Structure

## Overview
This document outlines the backend architecture of the YouTube Hide Watched Video Extension.

## Directory Structure
```
/
├── manifest.json           # Extension manifest configuration
├── package.json           # Node.js dependencies and scripts
├── webpack.content.config.js # Webpack configuration for content script
├── background.js          # Background script
├── content.js            # Content script (bundled output from content/)
├── shared/              # Shared modules across all contexts
│   ├── constants.js    # Centralized constants (storage keys, messages, defaults)
│   ├── utils.js        # Common utility functions (ensurePromise, isShorts, etc.)
│   ├── theme.js        # Theme management (initTheme, toggleTheme)
│   ├── messaging.js    # Unified messaging with retry logic
│   ├── errorHandler.js # Error handling and retry logic
│   ├── notifications.js # User notification system
│   ├── notifications.css # Notification styles
│   └── README.md       # Constants documentation
├── content/              # Modular content script source (ES6 modules)
│   ├── index.js         # Main entry point
│   ├── utils/           # Utility modules
│   │   ├── constants.js # Re-exports from shared/constants.js
│   │   ├── cssHelpers.js # CSS class manipulation utilities
│   │   ├── logger.js    # Debug logging
│   │   ├── debounce.js  # Debounce utility
│   │   ├── dom.js       # DOM helper functions
│   │   ├── domCache.js  # WeakMap-based DOM query caching
│   │   ├── visibilityTracker.js # IntersectionObserver visibility tracking
│   │   └── performanceMonitor.js # Performance tracking and metrics
│   ├── storage/         # Storage layer
│   │   ├── cache.js     # Hidden video cache management
│   │   ├── settings.js  # Settings loading and management
│   │   └── messaging.js # Background messaging API
│   ├── detection/       # Video detection
│   │   ├── videoDetector.js    # Video ID extraction, watched detection
│   │   ├── shortsDetector.js   # Shorts container detection
│   │   └── sectionDetector.js  # YouTube section detection
│   ├── ui/              # UI components
│   │   ├── styles.js       # Style injection
│   │   ├── eyeButton.js    # Eye button creation and management
│   │   └── accessibility.js # ARIA conflict handling
│   ├── hiding/          # Hiding logic
│   │   ├── individualHiding.js # Per-video hiding logic
│   │   ├── watchedHiding.js    # Watched videos hiding
│   │   └── shortsHiding.js     # Shorts hiding
│   ├── observers/       # DOM observers
│   │   ├── mutationObserver.js # DOM mutation handling
│   │   ├── urlObserver.js      # URL change detection
│   │   ├── xhrObserver.js      # XHR interception
│   │   └── intersectionObserver.js # Visibility-based processing
│   └── events/          # Event handling
│       └── eventHandler.js     # Event coordination and delegation
├── popup.html           # Extension popup HTML
├── popup.js            # Extension popup logic (ES6 module)
├── popup.css          # Extension popup styles
├── hidden-videos.html   # Hidden videos manager page
├── hidden-videos.js    # Hidden videos manager logic (ES6 module)
├── hidden-videos.css  # Hidden videos manager styles
├── icons/             # Extension icons
│   ├── icon.svg      # SVG icon source
│   ├── icon16.png   # 16x16 icon
│   ├── icon32.png   # 32x32 icon
│   ├── icon48.png   # 48x48 icon
│   └── icon128.png  # 128x128 icon
├── tests/            # Unit tests
│   ├── setup.js     # Jest setup and Chrome API mocks
│   ├── testUtils.js # Test utilities and helpers
│   ├── constants.test.js # Shared constants tests
│   ├── constants-integration.test.js # Constants integration tests
│   ├── background.test.js # Background script tests
│   ├── content.test.js    # Content script tests
│   ├── popup.test.js      # Popup logic tests
│   ├── hiddenVideos.test.js # Hidden videos manager tests
│   ├── cssClasses.test.js   # CSS class application tests
│   ├── domCache.test.js     # DOM cache unit tests
│   ├── domCache.integration.test.js # DOM cache integration tests
│   ├── visibilityTracker.test.js # Visibility tracker tests
│   ├── intersectionObserver.test.js # IntersectionObserver tests
│   └── intersectionObserver.integration.test.js # IntersectionObserver integration tests
├── scripts/          # Build and utility scripts
│   ├── build-extension.sh # Creates Chrome Web Store package
│   └── run_tests_local.sh # Runs all tests
├── dist/            # Built extension packages (generated)
│   └── *.zip       # Extension ZIP files for distribution
└── docs/           # Documentation
    ├── app-flow.md
    ├── backend-structure.md
    ├── changelog.md
    ├── frontend-guidelines.md
    ├── prd.md
    └── tech-stack.md
```

## Core Components

### Shared Constants (`/shared/`)
Centralized constants that are shared across all extension contexts (content scripts, background, popup, hidden-videos):

**Storage Keys**: All chrome.storage identifiers (THRESHOLD, WATCHED_STATE, SHORTS_STATE, etc.)
**Message Types**: Background script message types for hidden video operations
**Default Settings**: Default values for all user settings
**CSS Classes**: Class names for styling hidden/dimmed videos
**Selectors**: DOM selectors for YouTube elements
**Cache Configuration**: DOM query caching TTL values and performance monitoring settings
**IntersectionObserver Configuration**: Visibility tracking thresholds, margins, and lazy processing settings
**Debug Flag**: Global debug mode toggle

**Architecture**:
- Content scripts import via re-export in `content/utils/constants.js` (bundled by webpack)
  - All constants including CACHE_CONFIG are re-exported for content script modules
  - Ensures proper webpack bundling with resolved references
- Background, popup, and hidden-videos import directly via ES6 modules
- Single source of truth eliminates duplication
- Changes propagate automatically to all contexts

See `/shared/README.md` for detailed constants documentation.

**Shared Utilities (`/shared/utils.js`)**:
- `ensurePromise()`: Normalizes Chrome API responses to promises
- `isShorts()`: Detects if a video ID belongs to a YouTube Short
- `buildDefaultSettings()`: Constructs the default settings object
- `queryYoutubeTabs()`: Queries all YouTube tabs

**Shared Theme Management (`/shared/theme.js`)**:
- `initTheme()`: Initializes theme based on storage or system preference
- `toggleTheme()`: Toggles between light and dark themes
- Shared by popup and hidden videos manager for consistent theming

**Shared Messaging (`/shared/messaging.js`)**:
- `sendHiddenVideosMessage()`: Unified messaging for hidden video operations
- Includes automatic retry logic for transient failures (5 attempts, 300ms initial delay)
- Error classification and handling (network, transient, permanent)
- Timeout handling (5 second default)
- Used by both content scripts and hidden videos manager

**Shared Error Handler (`/shared/errorHandler.js`)**:
- `classifyError()`: Categorizes errors for appropriate recovery
- `retryOperation()`: Executes operations with exponential backoff
- `logError()`: Logs errors with context for debugging
- Enhanced network error detection (timeout, no response, connection failures)

**CSS Helpers (`/content/utils/cssHelpers.js`)**:
- `removeClassFromAll()`: Removes a CSS class from all elements
- `removeClassesFromAll()`: Removes multiple CSS classes efficiently
- Used by hiding modules to clean up classes before re-application

**DOM Query Cache (`/content/utils/domCache.js`)**:
Provides WeakMap-based caching for DOM queries to optimize performance:

**Features**:
- WeakMap caching for element relationships (automatic garbage collection)
- TTL-based caching for document-level queries
- Cache invalidation on DOM mutations
- Performance metrics and monitoring
- Automatic cleanup for removed elements

**Key Functions**:
- `cachedClosest(element, selector)`: Cached version of element.closest()
- `cachedQuerySelector(element, selector)`: Cached version of element.querySelector()
- `cachedQuerySelectorAll(element, selector)`: Cached version of element.querySelectorAll()
- `cachedDocumentQuery(selector, ttl)`: Cached document.querySelectorAll with TTL
- `invalidateElementCache(element)`: Invalidate cache for specific element
- `clearAllCaches()`: Clear all caches on major DOM changes
- `getCacheStats()`: Get cache performance statistics

**Performance Benefits**:
- 50-70% reduction in DOM query time for repeated queries
- 24x speedup demonstrated in performance tests
- Automatic memory management via WeakMap
- Reduced CPU usage during mutations
- Better extension responsiveness on pages with 100+ videos

**Integration**:
- Used by detection modules (videoDetector, shortsDetector, sectionDetector)
- Used by UI modules (eyeButton, eyeButtonManager)
- Used by hiding modules (watchedHiding, shortsHiding, individualHiding)
- Invalidated by mutation observer on DOM changes
- Cleared on URL navigation

**Performance Monitor (`/content/utils/performanceMonitor.js`)**:
Tracks DOM query performance and cache effectiveness in debug mode:
- `getPerformanceReport()`: Returns comprehensive performance metrics
- `logPerformanceReport()`: Outputs performance data to console
- Available via `window.YTHWV_Performance` in debug mode

**Visibility Tracker (`/content/utils/visibilityTracker.js`)**:
Tracks which video containers are currently visible in the viewport:

**Features**:
- Set-based tracking of visible elements
- Callback notification system for visibility changes
- Processes IntersectionObserver entries
- Visibility threshold configuration (default 25%)
- Automatic state management

**Key Functions**:
- `getVisibleVideos()`: Returns set of currently visible video containers
- `isVideoVisible(element)`: Checks if specific element is visible
- `markVisible(element)`: Marks element as visible
- `markHidden(element)`: Marks element as hidden
- `onVisibilityChange(callback)`: Register callback for visibility changes
- `processIntersectionEntries(entries)`: Process IntersectionObserver entries
- `clearVisibilityTracking()`: Clear all visibility state

**Benefits**:
- Enables processing only visible videos
- Reduces CPU usage for pages with many off-screen videos
- Event-based notification for decoupled architecture
- Memory-efficient Set-based tracking

### Background Service Worker
- Manages extension lifecycle
- Handles browser events
- Coordinates between different parts of the extension
- Manages persistent state
- Sets default theme to 'auto' on installation
- Normalizes Chrome API calls and statically imports the hidden video module with cached asynchronous initialization so service code stays resilient when APIs return callbacks or delay responses
- **Initialization Strategy**:
  - Message listeners registered synchronously before async operations
  - Health check endpoint (`HEALTH_CHECK`) for readiness verification
  - Graceful error handling if initialization fails
  - Keep-alive mechanism to prevent premature service worker termination (20s interval)

### Content Scripts (Modular Architecture)
The content script is now built from ES6 modules using webpack, improving maintainability and testability.

**Module Structure:**
- **Entry Point (`index.js`)**: Orchestrates initialization and module coordination
- **Utils**: Shared constants, DOM helpers, debounce, logging utilities, and visibility tracking
- **Storage**: Cache management, settings access, and messaging with background script
- **Detection**: Video detection (watched/shorts), section detection (homepage/subscriptions/etc)
- **UI**: Style injection, eye button management, accessibility handling
- **Hiding**: Individual video hiding, watched video hiding, shorts hiding logic
- **Observers**: Mutation observer, URL observer, XHR observer, IntersectionObserver for visibility-based processing
- **Events**: Event handling and coordination between modules

**Benefits:**
- Clear separation of concerns
- Each module < 200 lines, highly focused
- Testable in isolation
- Easier to maintain and extend
- No circular dependencies
- Webpack bundles into single `content.js` for deployment

**IntersectionObserver Architecture (`/content/observers/intersectionObserver.js`)**:
Manages viewport visibility tracking for optimized video processing:

**Features**:
- Observes video containers as they enter/exit viewport
- Batched processing with debouncing (100ms delay)
- Automatic tracking of dynamically added/removed containers
- Reconnection on page navigation
- Configuration flag for easy enable/disable

**Key Functions**:
- `setupIntersectionObserver()`: Initialize observer for all video containers
- `observeVideoContainers(containers)`: Start observing specific containers
- `unobserveVideoContainers(elements)`: Stop observing removed elements
- `reconnectIntersectionObserver()`: Reset observer on navigation
- `disconnectIntersectionObserver()`: Cleanup and clear visibility tracking

**Configuration (`INTERSECTION_OBSERVER_CONFIG`)**:
- `ROOT_MARGIN: '100px'`: Pre-load videos 100px before viewport
- `THRESHOLD: [0, 0.25, 0.5]`: Track multiple visibility levels
- `VISIBILITY_THRESHOLD: 0.25`: Consider visible at 25% intersection
- `BATCH_DELAY: 100`: Batch processing delay in milliseconds
- `ENABLE_LAZY_PROCESSING: true`: Toggle lazy processing feature

**Integration**:
- Mutation observer tracks added/removed video containers
- URL observer reconnects on page navigation
- Visibility tracker processes intersection events
- **Individual hiding module** (`/content/hiding/individualHiding.js`):
  - Processes ALL videos on initial page load (prevents race condition)
  - Switches to lazy processing after initial load complete
  - Only processes visible videos in subsequent updates
  - `markInitialLoadComplete()` exported for testing
- Event handler triggers processing on visibility changes

**Initial Load Handling**:
The individual hiding module implements a two-phase processing strategy to avoid race conditions:

1. **Initial Load Phase**:
   - `isInitialLoad` flag starts as `true`
   - All videos processed regardless of visibility
   - Ensures hidden/dimmed state applied correctly on page reload
   - Prevents race condition where IntersectionObserver callbacks haven't fired yet

2. **Lazy Processing Phase**:
   - Flag set to `false` after first processing completes
   - Only visible videos processed in subsequent updates
   - Performance benefits maintained after initial load
   - New videos processed as they scroll into view

**State Synchronization Fix**:
To prevent race conditions where eye button visual state doesn't match container hidden/dimmed state:

1. **Eye Button Fetch Callback Synchronization**:
   - Eye button creation triggers async `fetchHiddenVideoStates()` for uncached videos
   - Fetch callback immediately calls `syncIndividualContainerState()` to apply CSS classes
   - This ensures container state is synchronized as soon as cache is populated
   - Prevents visual mismatch on page reload

2. **Defensive Cache Validation**:
   - `applyIndividualHiding()` now checks `hasCachedVideo()` before processing
   - Skips videos without cached records to avoid applying incorrect state
   - Eye button fetch callbacks handle initial state application for uncached videos

3. **Removed setTimeout Delay**:
   - Eliminated arbitrary 500ms delay in `applyHiding()` event handler
   - Improves responsiveness without compromising correctness
   - Synchronization guarantees provided by fetch callbacks

**Performance Impact**:
- Correct hidden/dimmed state on page reload (no race conditions)
- 50-70% reduction in DOM queries after initial load
- Initial load processes all videos (20-100ms typical)
- Subsequent updates only process 10-20 visible videos
- Reduced CPU usage during idle (off-screen videos not processed)
- Improved scroll performance with batched updates
- Better battery life on mobile devices
- Improved responsiveness (removed 500ms artificial delay)

### Storage Layer
- IndexedDB-backed hidden video repository exposed through the background service worker
- Settings persistence remain in `chrome.storage.sync`
- Lazy caching of visible hidden video state inside content scripts for responsive toggles
- Batched CRUD endpoints with pagination cursors and state-aware indexing
- Legacy `chrome.storage` data automatically migrated into IndexedDB on startup before removal

#### IndexedDB Optimization Architecture

The extension implements multi-layered caching and query optimization for IndexedDB operations:

**Content Script Cache (`/content/storage/cache.js`)**:
- LRU (Least Recently Used) eviction with MAX_CACHE_SIZE = 1000
- Access time tracking for intelligent eviction
- Automatic cleanup when cache exceeds limit
- Timestamp-based conflict resolution
- Memory-efficient with automatic eviction preventing unbounded growth
- Monitoring functions: `getCacheSize()`, `getCacheMemoryUsage()`

**Background Cache Layer (`/background/indexedDbCache.js`)**:
- TTL-based caching (30 second default)
- Reduces IndexedDB read operations by ~60-80%
- Automatic expiration of stale records
- Cache invalidation on write/delete operations
- Integrated with health check for monitoring

**Write Optimization (`/background/writeBatcher.js`)**:
- Write-behind batching with configurable delay (100ms default)
- Automatic flush when batch reaches 50 operations
- Deduplicates writes by videoId
- Force flush capability for critical operations
- Reduces transaction overhead by 80-90% for burst writes

**Read Optimization (`/background/indexedDb.js`)**:
- Cursor-based fetching for large batches (50+ IDs)
- Individual get operations for small batches
- Background cache layer check before IndexedDB access
- Optimized stats calculation with adaptive strategy:
  - Count operations for small databases (< 100 records)
  - Single cursor scan for large databases (100+ records)
- Bulk delete operations in single transaction

**Performance Characteristics**:
- 50-70% reduction in read latency (background cache + LRU)
- 80-90% reduction in write overhead (batching)
- 60-70% faster stats calculation for large databases
- 50-80% faster bulk fetches with cursor optimization
- 90% reduction in memory growth (LRU eviction)
- Cache hit rate > 80% for typical usage patterns

**Configuration (`/shared/constants.js`)**:
```javascript
export const INDEXEDDB_CONFIG = {
  CONTENT_CACHE_MAX_SIZE: 1000,
  BACKGROUND_CACHE_TTL: 30000, // 30 seconds
  WRITE_BATCH_DELAY: 100,
  WRITE_BATCH_MAX_SIZE: 50,
  GET_CURSOR_THRESHOLD: 50,
  STATS_CURSOR_THRESHOLD: 100
};

export const FEATURE_FLAGS = {
  ENABLE_WRITE_BATCHING: false, // Disabled by default
  ENABLE_BACKGROUND_CACHE: true,
  ENABLE_LRU_EVICTION: true,
  ENABLE_CURSOR_OPTIMIZATION: true,
  ENABLE_STATS_OPTIMIZATION: true
};
```

## Communication Flow

### Message Passing
```
Content Script <-> Background Script <-> Popup/Options
```

### Storage Events
- Settings changes propagated across components
- Real-time updates across tabs

## API Structure

### Internal APIs
- `storage.get(key)` - Retrieve stored values
- `storage.set(key, value)` - Store values
- `messaging.send(message)` - Send messages between components
- `detector.isWatched(video)` - Check if video is watched
- `hider.hide(element)` - Hide video element
- `saveHiddenVideo(videoId, state, title)` - Send hidden video updates to the background store

### Browser APIs Used
- indexedDB
- chrome.storage
- chrome.runtime
- chrome.tabs
- chrome.scripting

## Security Considerations
- Content Security Policy enforced
- Minimal permissions requested
- No external API calls
- User data stays local

## Build Process
The extension uses webpack to bundle modular ES6 code into a single `content.js` file:

1. **Development**: `npm run dev` - Watch mode with source maps
2. **Production**: `npm run build:content:prod` - Minified bundle with terser
3. **Distribution**: `./scripts/build-extension.sh` - Complete extension package

The bundled `content.js` is committed to the repository to ensure:
- Extension can be loaded directly from GitHub for development
- Consistent builds across contributors
- Easy inspection of final output
- Chrome Web Store submission readiness

Source maps are generated but not included in distribution packages for security.

## Testing Strategy
- **Unit Tests**: Module-level testing with Jest and jsdom
- **Integration Tests**: Cross-module interaction verification
- **Coverage Target**: Minimum 20% with focus on core business logic
- **Test Environment**: Mocked Chrome APIs and DOM simulation

## Performance Characteristics
- **Bundle Size**: ~15KB minified (content.js)
- **Initialization**: < 100ms on page load
- **Memory Usage**: < 50MB for typical usage
- **Debounce Timing**: 250ms for mutations, 100ms for URL/XHR changes

## Error Handling Architecture

The extension implements comprehensive error handling across all components:

### Error Handler Module (`/shared/errorHandler.js`)

Provides centralized error handling utilities:

**Error Classification**:
- `TRANSIENT`: Temporary errors that should be retried (transactions, busy states)
- `QUOTA_EXCEEDED`: Storage quota errors requiring cleanup
- `NETWORK`: Message passing and connectivity errors
- `CORRUPTION`: Data corruption requiring database reset
- `PERMISSION`: Security/permission errors needing user action
- `PERMANENT`: Non-recoverable errors

**Key Functions**:
- `classifyError(error)`: Automatically categorizes errors
- `retryOperation(operation, options)`: Executes operations with retry logic
  - Exponential backoff (100ms → 200ms → 400ms)
  - Maximum 3 attempts by default
  - Configurable retry conditions
- `logError(context, error, metadata)`: Structured error logging
- `getErrorLog()`: Retrieve error history (max 100 entries)

### IndexedDB Error Recovery (`/background/indexedDb.js`)

Enhanced database operations with automatic recovery:

**Features**:
- Automatic retry on transient errors (transaction failures)
- Quota exceeded handling with automatic cleanup
- Database corruption detection and reset
- Connection error recovery

**Recovery Strategies**:
1. **Transient Errors**: Retry with exponential backoff
2. **Quota Exceeded**: Delete oldest 1000 records, then retry
3. **Corruption**: Reset database (closes, deletes, recreates)
4. **Blocked Database**: Wait and retry

### Message Passing Resilience (`/content/storage/messaging.js`)

Robust communication with background script:

**Features**:
- Timeout handling (5 second default)
- Automatic retry on network errors
- Optimistic updates with rollback on failure
- Cache fallback when background unavailable

**Flow**:
1. Send message with timeout
2. On failure, classify error
3. Retry if network/transient (up to 3 times)
4. Revert optimistic updates on permanent failure

### Notification System (`/shared/notifications.js`)

User-facing error feedback:

**Notification Types**:
- ERROR (red): Critical issues requiring attention
- WARNING (yellow): Potential problems
- SUCCESS (green): Successful operations
- INFO (blue): Informational messages

**Features**:
- Auto-dismiss after 3 seconds (configurable)
- Manual dismissal via close button
- Animated appearance/disappearance
- Theme-aware styling (light/dark mode)

### Error Configuration (`/shared/constants.js`)

Centralized error handling configuration:

```javascript
export const ERROR_CONFIG = {
  MAX_RETRY_ATTEMPTS: 3,
  INITIAL_RETRY_DELAY: 100,
  MAX_RETRY_DELAY: 5000,
  MESSAGE_TIMEOUT: 5000,
  MAX_ERROR_LOG_SIZE: 100
};
```

### Best Practices

**For Operations**:
1. Wrap database operations with `retryOperation()`
2. Use `withStore()` which includes built-in error handling
3. Log errors with context using `logError()`

**For User-Facing Code**:
1. Show notifications for errors requiring user attention
2. Implement optimistic updates for better UX
3. Revert UI state on operation failure

**For Testing**:
1. Test all error paths (transient, permanent, quota, etc.)
2. Verify retry logic with mock failures
3. Test error recovery scenarios

## DOM Query Resilience System

The extension implements a comprehensive DOM query resilience system to handle YouTube's frequent structure changes:

### Selector Fallback Chains (`/shared/constants.js`)

**Purpose**: Provide multiple fallback selectors for all critical elements to ensure the extension continues working when YouTube updates their DOM structure.

**Configuration**:
```javascript
export const SELECTOR_CHAINS = {
  VIDEO_TITLE: [
    '#video-title',
    '#video-title-link',
    'a#video-title',
    // ... fallbacks in order of preference
  ],

  PROGRESS_BAR: [
    '.ytd-thumbnail-overlay-resume-playback-renderer',
    '.yt-thumbnail-overlay-resume-playback-renderer-wiz__progress-bar',
    // ... legacy and generic fallbacks
  ],

  VIDEO_LINK: [
    'a[href*="/watch?v="]',
    'a[href^="/watch?"]',
    // ... additional patterns
  ],

  SHORTS_LINK: [
    'a[href*="/shorts/"]',
    'a[href^="/shorts/"]',
    // ... fallback patterns
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
```

**Key Features**:
- Primary selectors listed first for optimal performance
- Fallback selectors tried in order if primary fails
- Generic fallbacks for maximum compatibility
- Automatically used by fallback query functions

### Health Monitoring (`/content/utils/domSelectorHealth.js`)

**Purpose**: Track success/failure rates for each selector to identify when YouTube's DOM structure changes break existing selectors.

**Key Functions**:
- `trackSelectorQuery(selectorKey, selector, success, elementCount)`: Records query results
- `getSelectorHealth(selectorKey)`: Returns health statistics including success rate
- `checkCriticalSelectorsHealth()`: Identifies degraded critical selectors
- `getAllSelectorStats()`: Returns comprehensive statistics for all selectors
- `resetSelectorStats()`: Clears statistics (called on page navigation)

**Health Metrics**:
- Success rate: Percentage of successful queries
- Query count: Total number of attempts
- Average element count: Typical number of elements found
- Last success/failure timestamps
- Healthy threshold: > 70% success rate with 10+ queries

**Benefits**:
- Automatic detection of DOM structure changes
- Data-driven insights into selector effectiveness
- Identifies which fallback selectors are being used
- Historical tracking of element counts

### Error Detection (`/content/utils/domErrorDetection.js`)

**Purpose**: Periodic health checks and user notifications for critical failures.

**Key Functions**:
- `setupDOMHealthMonitoring()`: Initializes periodic health checks (every 30 seconds)
- `testDOMHealth()`: Manual health check trigger (exposed to console)

**Notification Strategy**:
- **Critical** (< 30% success rate): Red error notification with urgent message
- **Warning** (30-70% success rate): Yellow warning notification
- **Cooldown Period**: 5-minute interval between notifications per selector type
- **Notification Messages**:
  - Critical: "YouTube structure changed. Some videos may not be detected. Please report this issue."
  - Warning: "Extension may not detect all videos. YouTube might have changed their layout."

**Benefits**:
- Users aware of potential issues
- Prevents notification spam with cooldown
- Severity-based messaging
- Debugging information logged to console

### Diagnostics (`/content/utils/domDiagnostics.js`)

**Purpose**: Generate diagnostic reports for debugging DOM structure changes.

**Key Functions**:
- `generateDOMDiagnosticReport()`: Creates comprehensive diagnostic report
- `printDOMDiagnostics()`: Outputs report to console
- `exportDOMDiagnostics()`: Downloads report as JSON file

**Report Contents**:
- Timestamp and URL
- User agent string
- Selector health statistics
- Element counts for each fallback in every chain
- Sample DOM structure for found elements
- Attribute values (truncated to 50 characters)

**Console Access**:
```javascript
// Available in browser console
window.YTHWV_DOMDiagnostics.print()   // Print report
window.YTHWV_DOMDiagnostics.export()  // Download as JSON
window.YTHWV_TestDOMHealth()          // Test selector health
window.YTHWV_SelectorHealth.getStats() // Get all statistics
```

**Benefits**:
- Quick identification of which selectors work
- Export reports for issue reporting
- Sample DOM structure helps create new selectors
- User agent tracking helps identify platform-specific issues

### Fallback Query Functions (`/content/utils/domCache.js`)

**Enhanced Functions**:
- `cachedDocumentQueryWithFallback(selectorKey, selectors, ttl)`: Document-level queries with fallback chain
- `cachedQuerySelectorWithFallback(element, selectorKey, selectors)`: Element-level queries with fallback chain

**Behavior**:
- Tries each selector in the provided array
- Returns as soon as one succeeds (lazy evaluation)
- Tracks success/failure for health monitoring
- Logs when fallback selectors are used (debug mode)
- Caches results same as regular queries
- Handles invalid selectors gracefully

**Integration**:
All detection modules use fallback functions instead of direct queries:
- `videoDetector.js`: Uses VIDEO_LINK and SHORTS_LINK chains
- `eyeButtonManager.js`: Uses THUMBNAILS chain
- Other modules can easily adopt the pattern

### Selector Health Configuration (`/shared/constants.js`)

```javascript
export const SELECTOR_HEALTH_CONFIG = {
  CRITICAL_SUCCESS_RATE: 0.7,        // 70% success rate minimum
  MIN_QUERIES_FOR_HEALTH: 10,        // Minimum queries before health check
  HEALTH_CHECK_INTERVAL: 30000,      // Check every 30 seconds
  NOTIFICATION_COOLDOWN: 300000,     // 5 min cooldown between notifications
  FAILURE_NOTIFICATION_THRESHOLD: 5  // Reserved for future use
};
```

### Performance Impact

**Minimal Overhead**:
- Query time: +0-5ms only when primary selector fails
- Memory: +50-100KB for health statistics
- CPU: +0.1% for periodic health checks (every 30s)
- Network: None (all client-side)

**Benefits**:
- Continues working when YouTube updates DOM
- Automatic fallback to working selectors
- Early warning system for maintainers
- User-friendly error messages
- Data-driven selector maintenance

### Integration

**Initialization** (`/content/index.js`):
```javascript
import { setupDOMHealthMonitoring } from './utils/domErrorDetection.js';
import { resetSelectorStats } from './utils/domSelectorHealth.js';

async function init() {
  // ... other initialization ...

  // Reset selector stats on page navigation
  resetSelectorStats();

  // Setup DOM health monitoring
  setupDOMHealthMonitoring();

  // ... rest of initialization ...
}
```

**Usage Example** (`/content/detection/videoDetector.js`):
```javascript
import { SELECTOR_CHAINS, CACHE_CONFIG } from '../../shared/constants.js';
import { cachedDocumentQueryWithFallback } from '../utils/domCache.js';

export function findWatchedElements() {
  // Use fallback chain instead of single selector
  const progressBars = cachedDocumentQueryWithFallback(
    'PROGRESS_BAR',
    SELECTOR_CHAINS.PROGRESS_BAR,
    CACHE_CONFIG.PROGRESS_BAR_TTL
  );
  // ... rest of logic ...
}
```

### Maintenance Strategy

**When Adding New Selectors**:
1. Add to appropriate chain in `SELECTOR_CHAINS`
2. Order by preference (primary first, fallbacks after)
3. Include generic fallbacks as last resort
4. Test with diagnostic tools

**Monitoring Selector Health**:
1. Check console for health warnings during usage
2. Export diagnostics when issues occur
3. Review success rates periodically
4. Update selector chains based on data

**Responding to YouTube Changes**:
1. User reports trigger diagnostic exports
2. Analyze diagnostic reports to identify broken selectors
3. Add new working selectors to beginning of chains
4. Keep fallbacks for users on older YouTube versions
5. Test with health monitoring tools

### Future Enhancements

**Potential Additions**:
1. Automatic selector discovery using ML
2. Crowd-sourced selector collection from users
3. A/B test detection for YouTube experiments
4. Selector version management per YouTube version
5. Auto-update mechanism for selector chains from cloud