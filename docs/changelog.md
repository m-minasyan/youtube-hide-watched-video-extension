# Changelog

All notable changes to the YouTube Hide Watched Video Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.6.1] - 2025-10-10

### Changed

- Centralized all constants (storage keys, message types, default settings, CSS classes, selectors) into shared/constants.js module to eliminate duplication across codebase.

### Added

- Shared constants module (/shared/) used across all extension contexts (content scripts, background, popup, hidden-videos).
- Comprehensive unit tests for shared constants (43 tests covering all constant values and cross-context integration).
- Documentation for shared constants in /shared/README.md with usage examples and modification guidelines.

### Technical Details

- Removed 138 lines of duplicated constant definitions from background.js, popup.js, hidden-videos.js, and content/utils/constants.js.
- Content script imports constants via re-export (bundled by webpack), while background/popup/hidden-videos use direct ES6 module imports.
- All HTML scripts updated to type="module" for ES6 import support.
- Build process updated to include shared/ directory in distribution packages.
- Single source of truth for all configuration values reduces maintenance overhead and prevents inconsistencies.

## [2.6.0] - 2025-10-10

### Changed

- Refactored content.js from monolithic 848-line IIFE into modular ES6 architecture with 20+ focused modules for improved maintainability and testability.

### Added

- Webpack build pipeline for content script module bundling with Terser minification.
- Modular content script architecture with clear separation of concerns across utils, storage, detection, UI, hiding, observers, and events layers.
- Comprehensive content architecture documentation in docs/content-architecture.md.
- Build script integration to automatically compile content modules before packaging.

### Technical Details

- Content script now built from ES6 modules in content/ directory and bundled via webpack into optimized content.js (~15KB minified).
- Module structure: utils (constants, logger, debounce, DOM helpers), storage (cache, settings, messaging), detection (video, shorts, section), UI (styles, eye button, accessibility), hiding (individual, watched, shorts), observers (mutation, URL, XHR), events (coordination).
- No breaking changes - bundled output maintains identical functionality to original monolithic script.

## [2.5.1] - 2025-09-20

### Added

- IndexedDB-backed storage layer for individually hidden videos with batched APIs and pagination support.
- Background service worker messaging that fronts all hidden video CRUD operations and keeps UI caches in sync across tabs.
- Developer utilities for exporting or clearing the hidden video database via `hidden-videos-db-tools.js`.

### Changed

- Hidden video persistence no longer relies on `chrome.storage`; legacy data is migrated into IndexedDB on startup and cleaned up after success.
- Content scripts and management UI now fetch hidden video state through the new message-based API with in-memory caching for visible items.
- Automated test suite expanded to cover IndexedDB behaviors and service messaging.

### Fixed

- Fixed pagination issue in Hidden Videos Manager where deleting a video would incorrectly reset page cursors and create phantom pages
- Improved pagination state management to properly maintain current page position after video deletion
- Fixed cursor array management to preserve pagination state across operations
- Removed logic that was incorrectly adding extra pages when hasMore flag was set
- Ensured proper page redirect only when the current page becomes empty after deletion
- Eliminated brief unhide flicker for individually hidden videos by preserving classes on unaffected cards during toggle operations.
- Ensured the packaged build bundles the background service worker module directory so registration succeeds in production installs.
- Prevented individual hide toggles from reverting when late IndexedDB reads resolve after user actions by tracking cache timestamps in the content script.
- Added a race condition regression test to ensure per-video eye button state remains stable under delayed fetch scenarios.
- Hardened background and popup messaging by replacing the service worker module loader with a cached static import that satisfies ServiceWorkerGlobalScope restrictions without sacrificing async resiliency.
- Added background initialization regression tests to ensure the service worker eagerly warms the hidden videos store on load and runtime restarts.
- Fixed MV3 service worker registration failures by removing the test-only global hook, keeping the static import path, and exposing a test helper to await the background initialization promise safely.

## [2.4.4] - 2025-09-19

### Fixed

- Migrated individually hidden video storage to `chrome.storage.local` to eliminate the previous ~62 item cap caused by sync storage quotas.
- Added automatic migration and metadata normalization for legacy hidden video records in both content script and Hidden Videos Manager.
- Expanded automated coverage to verify large-volume hidden video persistence and regression scenarios.

## [2.4.3] - 2025-09-05

### Fixed

- Packaged build now includes the Hidden Videos Manager page files (`hidden-videos.html`, `hidden-videos.css`, `hidden-videos.js`). This resolves `ERR_FILE_NOT_FOUND` when clicking “View Hidden Videos”.
- Updated `scripts/build-extension.sh` to copy the Hidden Videos Manager assets into the build directory and ZIP package.

## [2.4.2] - 2025-01-27

### Changed

- Modified dropdown behavior for Watched Videos and Shorts sections - dropdowns now only open via the collapse button (">") instead of clicking anywhere on the header
- Improved UX by making the interaction more explicit and preventing accidental toggles
- Updated section header cursor from pointer to default to better indicate clickable areas
- Enhanced collapse button hover state with subtle border for better visual feedback

## [2.4.1] - 2025-01-27

### Fixed

- Fixed UI latency issue in popup interface where mode selection buttons had delayed visual feedback
- Removed font-weight changes from active button states to eliminate layout reflow delays
- Replaced bold text with enhanced visual indicators (shadow and subtle scale) for active buttons
- Optimized button click handlers to provide immediate active state changes before async operations
- Improved user experience with instantaneous UI response to all button interactions
- Enhanced error handling to gracefully revert UI state on save failures

## [2.4.0] - 2025-01-26

### Added

- Comprehensive README update with detailed feature descriptions, installation methods, usage guide, technical architecture overview, and complete project documentation

### Added

- Individual Video Mode toggle switch to enable/disable the per-video hide/dim feature
- Visual indicator and disable state for Individual Mode options when toggled off
- Smooth transition animations for enabling/disabling Individual Mode options
- Individual Mode enabled state is now persisted in storage
- Automatic removal of eye buttons when Individual Mode is disabled
- Immediate visibility toggle for individually hidden videos - videos can now be unhidden without page reload
- Real-time visual feedback when clicking the eye button to hide/unhide videos
- Comprehensive unit test suite for business logic using Jest framework
- Test coverage for settings initialization, video detection, hiding logic, theme management, and pagination
- Test utilities for mocking Chrome APIs and DOM elements
- Enhanced test runner script with Jest integration
- Package.json with test dependencies and Jest configuration
- Added extensive business logic test files:
  - `businessLogic.test.js` - Settings management, video detection, hiding/dimming states, individual video management
  - `themeAndPagination.test.js` - Theme auto-detection, switching, persistence, and pagination logic
  - `messagingAndMigration.test.js` - Message passing, URL section detection, data migration
  - `domManipulation.test.js` - DOM manipulation, video element detection, eye button management
  - `advancedBusinessLogic.test.js` - Debouncing, storage synchronization, mutation observers, performance optimization, error handling
  - `coreBusinessLogic.test.js` - Core video detection, title extraction, state management, section detection, settings validation, cache management, error recovery
  - `integrationTests.test.js` - Component communication, storage synchronization, multi-tab sync, complete workflows
  - `edgeCases.test.js` - Concurrent operations, large data handling, DOM mutations, network failures, memory management
  - `performanceTests.test.js` - Debouncing performance, DOM query optimization, caching, memory leak prevention, batch processing
- 234 unit tests covering all core business logic areas with focus on:
  - Real implementation testing rather than isolated functions
  - Integration between components
  - Edge cases and error scenarios
  - Performance optimization strategies
  - Memory management and leak prevention
- Pagination for Hidden Videos Manager page with 12 videos per page
- Navigation controls with Previous/Next buttons and page indicator
- Automatic pagination reset when switching filters
- Video titles are now captured and displayed in Hidden Videos Manager page
- Automatic theme detection based on system/Chrome preferences (uses 'auto' as default)
- Comprehensive YouTube DOM structure analysis documentation (docs/youtube-dom-analysis.md) for future automation and feature development

### Fixed

- Suppressed console.error outputs in test suite for cleaner test results
  - Added proper console.error mocking with setup/teardown in error handling tests
  - Fixed console.error outputs in coreBusinessLogic.test.js and advancedBusinessLogic.test.js
  - Tests now run cleanly without displaying expected error messages from error handling scenarios

### Changed

- Theme now defaults to 'auto' which detects system preference on popup open
- Theme detection happens in popup/hidden-videos pages using window.matchMedia API
- Removed "Back to Settings" button from Hidden Videos Manager page for cleaner interface
- Replaced single Quick Toggle with separate collapsible sections for Watched Videos and Shorts
- Added individual Quick Toggle buttons for each section (Watched Videos and Shorts)
- Sections now have dropdown functionality with smooth animations
- Watched Videos and Shorts sections are collapsed by default on first launch
- Improved UI organization with better visual hierarchy
- Eye button on video thumbnails always visible with 30% opacity for better discoverability
- Eye button now has tabindex="-1" to prevent keyboard focus issues
- Centered action buttons (Hide, View on YouTube, Remove) in video cards on Hidden Videos Manager page

### Fixed

- Fixed Individual Mode "Dimmed" button not being selected by default on first installation
- Fixed loadSettings() function interfering with Individual Mode button states
- Individual Mode buttons are now properly excluded from regular mode button processing
- Corrected initialization order to ensure Individual Mode is set after loading other settings
- Hidden Videos Manager now displays actual video titles instead of generic "YouTube Shorts" or "YouTube Video" text
- Fixed issue where "Toggle video visibility" was captured instead of actual video title
- Improved title capture logic with multiple selector fallbacks
- Video titles are now properly extracted and cleaned from metadata
- Titles are automatically captured for previously hidden videos when page loads
- Added backwards compatibility for previously hidden videos
- Individual Video Mode buttons now properly display the selected state on popup load
- Improved initialization of Individual Mode settings to ensure one button is always selected
- Fixed first installation to automatically select "Dimmed" as default Individual Mode
- Background script now properly initializes Individual Mode setting on extension install
- Fixed reset functionality to properly reset Individual Mode to default value
- Quick Toggle buttons (Normal/Dimmed/Hidden) now correctly show active state when all section items have the same mode
- Quick Toggle button states now update dynamically when individual section settings are changed
- Eye button hover isolation - only the hovered video's button becomes fully visible
- Eye button visibility - maintains low opacity for all non-hovered buttons
- Fixed aria-hidden accessibility conflict when eye button is focused within aria-hidden parent elements
- Added automatic removal of aria-hidden attribute from parent elements containing eye buttons to prevent focus trapping
- Added MutationObserver to handle dynamic aria-hidden attribute changes
- Fixed video cards height on Hidden Videos Manager page to properly fit content
- Fixed theme toggle button on Hidden Videos Manager page showing both sun and moon icons in dark theme
- Fixed eye icon blinking when hovering over video thumbnail - icon now only becomes visible when directly hovering over it

## [2.2.0] - 2025-08-23

### Added

- Individual video hiding/dimming with eye icon on each video thumbnail
- Eye icon button in the center-top of each video card for quick hide/dim toggle
- Individual mode setting to choose between Dimmed and Hidden for individual videos
- New Hidden Videos Manager page to view and manage all individually hidden videos
- Filter options in Hidden Videos Manager (All, Dimmed, Hidden)
- Statistics display showing total, dimmed, and hidden video counts
- Ability to toggle state, view on YouTube, or remove videos from hidden list
- Persistent storage for individually hidden videos across sessions
- Support for new YouTube elements (yt-thumbnail-view-model, yt-lockup-view-model)

### Changed

- Enhanced content script to support individual video management
- Updated popup interface with individual mode selector
- Improved CSS with new styles for eye buttons and individual states
- Updated element selectors to work with latest YouTube HTML structure

### Fixed

- Eye button compatibility with new YouTube thumbnail elements
- Improved detection of video containers and thumbnails

## [2.1.2] - 2025-08-23

### Fixed

- Added support for new YouTube progress bar classes (ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment)
- Updated content.js to detect multiple progress bar selector variations
- Fixed test HTML page to use correct YouTube progress bar structure
- Added support for additional video container elements (ytm-video-with-context-renderer, ytm-item-section-renderer)
- Plugin now correctly detects and hides watched videos on the main YouTube page

## [2.1.1] - 2025-08-23

### Added

- Build script for creating Chrome Web Store package (`scripts/build-extension.sh`)
- Privacy policy document (PRIVACY.md)

### Fixed

- Improved YouTube Shorts detection on homepage
- Enhanced selector coverage for new YouTube HTML structure
- Added support for ytm-shorts-lockup-view-model elements
- Better detection of Shorts in rich shelf renderers
- More robust handling of reel-item-endpoint links
- Added fallback selectors for different Shorts container variations

## [2.1.0] - 2025-08-23

### Added

- Dark theme support with toggle button in the header
- Theme preference persistence across sessions
- Quick toggle buttons for setting all videos/shorts to normal, dimmed, or hidden at once
- Visual slider labels (0% and 100%) for better threshold understanding
- Improved hover effects and animations throughout the UI
- Better visual hierarchy with refined typography and spacing
- Smooth transitions and animations for all interactive elements
- Enhanced button states with subtle shadow effects

### Changed

- Completely redesigned UI with modern, clean aesthetics
- Improved color scheme with better contrast and readability
- Refined button groups with better visual feedback
- Updated gradients for active states (normal: purple, dimmed: orange, hidden: red)
- Better responsive design with consistent spacing
- Optimized CSS with CSS custom properties for easy theming
- Enhanced accessibility with proper ARIA labels

### Improved

- Overall user experience with more intuitive controls
- Visual consistency across light and dark themes
- Performance with optimized CSS transitions
- Code organization with better structure and modularity
