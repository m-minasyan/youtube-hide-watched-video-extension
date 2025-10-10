# Application Flow

## Overview
This document describes the application flow for the YouTube Hide Watched Video Extension.

## User Journey

### 1. Extension Installation
- User installs the extension from the browser store
- Extension icon appears in the browser toolbar
- Default settings are applied with theme set to 'auto'
- Theme automatically detected when popup opens based on system preference

### 2. First Time Setup
- User clicks on extension icon
- Popup interface displays with options
- User can configure initial preferences

### 3. YouTube Page Navigation
- User navigates to YouTube
- Extension detects YouTube page load
- Content script is injected

### 4. Video Detection
- Extension scans page for video elements
- Identifies watched videos based on progress indicators
- Applies hiding logic

### 5. Hiding Mechanism
- Watched videos are processed according to user settings
- Individual videos can be hidden/dimmed via eye icon
- Videos can be immediately unhidden by clicking the eye icon again (no page reload required)
- Visual feedback is provided instantly for hidden/unhidden content
- User can toggle visibility in real-time
- Hidden videos are tracked and manageable
- State changes are immediately reflected in the UI

## Technical Flow

### Content Script Initialization
1. Script loads on YouTube pages
2. **Waits for background script readiness**:
   - Sends health check messages to verify background initialization
   - Retries up to 10 times with 500ms delays
   - Continues with limited functionality if background not ready
3. Establishes communication with background script
4. Applies user preferences from storage

### Event Handling
1. Page mutation observation
2. Video element detection
3. Watch status verification
4. Hide/show decision making
5. Immediate UI feedback on user interactions
6. Asynchronous state persistence in background

### Background Script Operations
1. **Initializes service worker**:
   - Registers message listeners synchronously
   - Initializes IndexedDB asynchronously
   - Runs legacy data migration
   - Provides health check endpoint
2. Manages extension state
3. Handles cross-tab communication
4. Stores user preferences
5. Manages extension lifecycle
6. **Maintains service worker availability**:
   - Keep-alive ping every 20 seconds during active usage
   - Cleans up on suspend

## State Management
- User preferences stored in browser storage
- Individual video hide states persisted in IndexedDB via background service worker
- Session state maintained in memory
- Synchronization across tabs

## Error Handling
- **Network failures gracefully handled**:
  - Automatic retry with exponential backoff (5 attempts)
  - Enhanced error classification (timeout, no response, connection failures)
  - User notifications for persistent errors
- **Background script communication**:
  - Health check system for readiness verification
  - Initialization wait logic with graceful degradation
  - Message timeout handling (5 seconds)
- Invalid DOM structures managed
- User feedback for errors via notification system