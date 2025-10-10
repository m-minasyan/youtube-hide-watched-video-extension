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
│   │   └── dom.js       # DOM helper functions
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
│   │   └── xhrObserver.js      # XHR interception
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
│   └── cssClasses.test.js   # CSS class application tests
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
**Debug Flag**: Global debug mode toggle

**Architecture**:
- Content scripts import via re-export in `content/utils/constants.js` (bundled by webpack)
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
- **Utils**: Shared constants, DOM helpers, debounce, and logging utilities
- **Storage**: Cache management, settings access, and messaging with background script
- **Detection**: Video detection (watched/shorts), section detection (homepage/subscriptions/etc)
- **UI**: Style injection, eye button management, accessibility handling
- **Hiding**: Individual video hiding, watched video hiding, shorts hiding logic
- **Observers**: Mutation observer, URL observer, XHR observer for dynamic content
- **Events**: Event handling and coordination between modules

**Benefits:**
- Clear separation of concerns
- Each module < 200 lines, highly focused
- Testable in isolation
- Easier to maintain and extend
- No circular dependencies
- Webpack bundles into single `content.js` for deployment

### Storage Layer
- IndexedDB-backed hidden video repository exposed through the background service worker
- Settings persistence remain in `chrome.storage.sync`
- Lazy caching of visible hidden video state inside content scripts for responsive toggles
- Batched CRUD endpoints with pagination cursors and state-aware indexing
- Legacy `chrome.storage` data automatically migrated into IndexedDB on startup before removal

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