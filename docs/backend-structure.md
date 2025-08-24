# Backend Structure

## Overview
This document outlines the backend architecture of the YouTube Hide Watched Video Extension.

## Directory Structure
```
/
├── manifest.json           # Extension manifest configuration
├── background.js          # Background script
├── content.js            # Content script for YouTube pages
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
├── scripts/          # Build and utility scripts
│   └── build-extension.sh # Creates Chrome Web Store package
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

### Content Scripts
- Injected into YouTube pages
- Handles DOM manipulation
- Detects watched videos
- Implements hiding logic

### Storage Layer
- Browser storage API wrapper
- Settings persistence
- Cache management
- Cross-tab synchronization

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
- `saveHiddenVideo(videoId, state, title)` - Save hidden video with title

### Browser APIs Used
- chrome.storage
- chrome.runtime
- chrome.tabs
- chrome.scripting

## Security Considerations
- Content Security Policy enforced
- Minimal permissions requested
- No external API calls
- User data stays local