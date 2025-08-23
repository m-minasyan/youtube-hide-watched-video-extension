# Backend Structure

## Overview
This document outlines the backend architecture of the YouTube Hide Watched Video Extension.

## Directory Structure
```
/
├── manifest.json           # Extension manifest configuration
├── background/            # Background scripts
│   ├── service-worker.js # Main background service worker
│   └── utils/            # Utility functions
├── content/              # Content scripts
│   ├── youtube.js       # YouTube-specific content script
│   ├── detector.js     # Video detection logic
│   └── hider.js       # Video hiding implementation
├── popup/               # Extension popup
│   ├── popup.html     # Popup HTML
│   ├── popup.js      # Popup logic
│   └── popup.css    # Popup styles
├── options/            # Options page
│   ├── options.html  # Options HTML
│   ├── options.js   # Options logic
│   └── options.css # Options styles
├── lib/               # Shared libraries
│   ├── storage.js   # Storage management
│   └── constants.js # Shared constants
└── assets/           # Static assets
    └── icons/       # Extension icons
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