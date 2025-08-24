# Changelog

All notable changes to the YouTube Hide Watched Video Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Pagination for Hidden Videos Manager page with 12 videos per page
- Navigation controls with Previous/Next buttons and page indicator
- Automatic pagination reset when switching filters
- Video titles are now captured and displayed in Hidden Videos Manager page
- Automatic theme detection based on system/Chrome preferences (uses 'auto' as default)
- Comprehensive YouTube DOM structure analysis documentation (docs/youtube-dom-analysis.md) for future automation and feature development

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
