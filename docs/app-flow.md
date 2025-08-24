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
- Visual feedback is provided for hidden content
- User can toggle visibility if needed
- Hidden videos are tracked and manageable

## Technical Flow

### Content Script Initialization
1. Script loads on YouTube pages
2. Establishes communication with background script
3. Applies user preferences from storage

### Event Handling
1. Page mutation observation
2. Video element detection
3. Watch status verification
4. Hide/show decision making

### Background Script Operations
1. Manages extension state
2. Handles cross-tab communication
3. Stores user preferences
4. Manages extension lifecycle

## State Management
- User preferences stored in browser storage
- Individual video hide states persisted
- Session state maintained in memory
- Synchronization across tabs

## Error Handling
- Network failures gracefully handled
- Invalid DOM structures managed
- User feedback for errors