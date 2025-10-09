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
├── content/              # Modular content script source (ES6 modules)
│   ├── index.js         # Main entry point
│   ├── utils/           # Utility modules
│   │   ├── constants.js # Shared constants and selectors
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
├── popup.js            # Extension popup logic
├── popup.css          # Extension popup styles
├── hidden-videos.html   # Hidden videos manager page
├── hidden-videos.js    # Hidden videos manager logic
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

### Background Service Worker
- Manages extension lifecycle
- Handles browser events
- Coordinates between different parts of the extension
- Manages persistent state
- Sets default theme to 'auto' on installation
- Normalizes Chrome API calls and statically imports the hidden video module with cached asynchronous initialization so service code stays resilient when APIs return callbacks or delay responses

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