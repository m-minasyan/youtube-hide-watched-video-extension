# Changelog

All notable changes to the YouTube Hide Watched Video Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.1] - 2025-01-23

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

## [2.1.0] - 2025-01-23

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
