# YouTube Hide Watched Videos - Clean Up Your YouTube Experience

## Overview

Take control of your YouTube browsing with intelligent video filtering, individual video management, and powerful search capabilities.

## 🎯 KEY FEATURES

### Smart Video Management
- **Automatic Detection**: Instantly hide or dim watched videos and Shorts based on watch progress
- **Three Visibility Modes**: Choose between Normal, Dimmed (semi-transparent), or Hidden for complete control
- **Separate Controls**: Independent settings for regular videos and YouTube Shorts
- **Customizable Threshold**: Set watch percentage (0-100%) to determine when videos are considered "watched"

### Individual Video Control
- **Eye Icon Controls**: Quick hide/dim toggle on every video thumbnail
- **Hidden Videos Manager**: Full-featured management interface with search, filter, and bulk operations
- **Search Functionality**: Find any hidden video instantly by title or video ID with highlighted results
- **Export & Import**: Backup your hidden videos list as JSON with smart conflict resolution (skip existing, keep newer, or overwrite all)

### Performance & Reliability
- **Rock-Solid Stability**: Extension adapts to YouTube layout changes automatically using resilient DOM selectors with multiple fallbacks
- **Lightning Fast**: Optimized caching, lazy loading, and visibility-aware processing focus work only on videos currently on screen
- **Memory Efficient**: Advanced LRU cache with leak prevention ensures minimal memory footprint
- **Zero-Lag Interactions**: Instant UI feedback with non-blocking operations

### User Experience
- **Smart Theme System**: Auto-detects system preference, plus manual dark/light mode switching
- **Quick Toggle Buttons**: Set all videos to Normal, Dimmed, or Hidden at once
- **Collapsible Sections**: Organized, clean interface with dropdown controls
- **Works Everywhere**: Homepage, subscriptions, search results, recommendations, and watch page sidebar

## ✨ WHY USE THIS EXTENSION?

- **Focus on Fresh Content**: Stop seeing videos you've already watched
- **Manually Curate**: Hide specific videos you don't want to see again with the eye icon
- **Never Lose Track**: Search and manage all hidden content in one place
- **Save Time**: Find new videos faster without scrolling through watched content
- **Cleaner Interface**: Reduce visual clutter and improve content discovery
- **Prevent Re-watching**: Automatically filter out content you've already seen

## 🚀 WHAT'S NEW IN VERSION 2.12.0

### Major Improvements Since 2.5.1

**Backup & Data Management**
- Export and import your hidden videos list as JSON files
- Comprehensive validation with file size (50MB) and record count (200K) limits
- Three conflict resolution strategies for imports: skip existing, keep newer, or overwrite all
- Import preview with projected changes before execution
- XSS protection with HTML escaping for all imported data

**Powerful Search & Discovery**
- Search hidden videos by title or video ID with real-time results
- 300ms debounce for optimal performance and responsiveness
- Search term highlighting in results with accessible status messages
- Client-side pagination (12 videos per page) with instant navigation
- Memory-efficient with automatic cleanup

**Performance Revolution**
- **60-80% faster** with multi-layered caching and optimization
- Unified cache architecture eliminates 80% code duplication
- LRU (Least Recently Used) eviction prevents memory leaks
- Visibility-aware processing focuses only on videos currently on screen
- Cursor-based fetching for large batch operations (50+ videos)

**Rock-Solid Reliability**
- Resilient DOM query system with multiple fallback selectors adapts to YouTube changes
- DOM selector health monitoring tracks success/failure rates
- Automatic fallback to alternative selectors when primary ones fail
- Comprehensive timeout protection for all IndexedDB operations
- Fixed all race conditions in Service Worker initialization and storage operations

**Seamless Synchronization**
- Eye icon state and container visibility perfectly synchronized across page loads and tabs
- Fixed race conditions preventing videos from hiding properly after page reload
- Cache-first approach with immediate state synchronization
- No more visual mismatches between button state and actual visibility

**Enhanced Stability**
- Fixed critical memory leaks in cache tracking, import/export, and search
- Fixed Service Worker initialization preventing proper extension startup
- Fixed IndexedDB connection leaks causing database blocking
- Fixed messaging errors ("No response from background script")
- Comprehensive error handling with automatic retry and exponential backoff
- Graceful quota management prevents data loss

**Security & Quality**
- Fixed XSS vulnerability in search with DOM-based rendering
- Fixed potential CSS selector injection in event handlers
- Enhanced security by removing user-facing notifications from YouTube page
- Improved error messages and user feedback
- Build-time debug logging stripping for production performance

## 🔧 EASY TO USE

1. **Install**: Click "Add to Chrome" to install the extension
2. **Configure**: Click the extension icon to open settings
3. **Choose Modes**: Select Normal, Dimmed, or Hidden for videos and Shorts
4. **Hide Individual Videos**: Click the eye icon on any video thumbnail
5. **Manage Hidden Videos**: Click "View Hidden Videos" to search, filter, export, or import
6. **Adjust Threshold**: Use the slider to set when videos are considered "watched" (0-100%)
7. **Instant Apply**: All changes apply immediately - no page reload needed

## 🔒 PRIVACY FOCUSED

- **Zero Tracking**: No data collection, analytics, or telemetry
- **100% Local**: All settings and data stored on your device only
- **No External Servers**: Everything runs locally in your browser
- **Minimal Permissions**: Only requests essential YouTube access
- **Open Source**: Transparent code available for review
- **Secure**: Strict Content Security Policy prevents malicious code injection

## ⚡ PERFORMANCE

- **Lightweight**: ~15KB minified content script with optimized bundle size
- **Zero-Lag UI**: Instant button responses and smooth animations
- **No YouTube Impact**: Extension doesn't slow down YouTube loading
- **Smart Processing**: Only processes visible videos using IntersectionObserver
- **Memory Safe**: LRU cache with automatic eviction prevents unbounded growth
- **Battery Friendly**: Reduced CPU usage with lazy processing and efficient caching

## 📱 COMPATIBILITY

- **Chrome**: Version 88+ (fully supported)
- **Edge**: Chromium-based versions (fully supported)
- **Brave**: Latest versions (fully supported)
- **Opera**: Latest versions (fully supported)
- **Manifest V3**: Future-proof with latest Chrome extension standards
- **YouTube**: Works with latest interface changes and adapts automatically

## 🛠️ TECHNICAL HIGHLIGHTS

- **Resilient Architecture**: Automatic adaptation to YouTube DOM changes with fallback selectors
- **IndexedDB Storage**: Unlimited hidden video storage with efficient indexing
- **Multi-Layer Caching**: Background cache (30s TTL) + content cache (LRU 1000) for optimal performance
- **Service Worker**: Robust initialization with health checks and keep-alive mechanism
- **Error Recovery**: Comprehensive retry logic with exponential backoff for transient failures
- **Modular Design**: 20+ focused ES6 modules for maintainability
- **Test Coverage**: 171+ unit tests covering all business logic areas

## 💡 PRO TIPS

- Use the **Quick Toggle** buttons to rapidly switch all videos between modes
- Set the **watch threshold** to 50% if you want to hide videos you started but didn't finish
- Use the **search** in Hidden Videos Manager to quickly find and unhide specific videos
- **Export your list** regularly to backup your hidden videos preferences
- Enable **Individual Mode** to manually curate exactly which videos to hide
- The eye icon shows current state: **yellow** = dimmed, **red** = hidden, **gray** = normal

## 🌟 UPDATES & SUPPORT

- **Regular Updates**: Continuous improvements and YouTube compatibility fixes
- **Active Development**: Rapid response to YouTube interface changes
- **Community Driven**: Open to feature requests and bug reports
- **Automatic Migration**: Settings and data preserved across all updates

## 📊 STATS & ANALYTICS

The Hidden Videos Manager provides:
- Total hidden videos count
- Breakdown by dimmed vs hidden
- Filter by state (All, Dimmed, Hidden)
- Pagination controls for large lists
- Search results count with accessibility support

---

**Perfect for regular YouTube viewers who want a cleaner, more organized viewing experience. Take control of your YouTube and focus on the content that matters to you!**

---

**Version**: 2.12.0
**Last Updated**: November 2025
**Developer**: YouTube Hide Watched Videos Team
**Support**: Report issues on GitHub
**License**: Open Source
