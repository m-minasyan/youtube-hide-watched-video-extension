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
- **State Synchronization**: Eye button visual state is always synchronized with container CSS classes to prevent visual inconsistencies after page reload

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

## Performance Optimization

### DOM Query Caching
1. WeakMap-based caching for element relationships (automatic garbage collection)
2. TTL-based caching for document-level queries
3. Cache invalidation on DOM mutations and URL changes
4. Performance metrics tracked in debug mode
5. Cache statistics available via `window.YTHWV_Performance.getReport()`

**Benefits**:
- 50-70% reduction in DOM query time for repeated queries
- 24x speedup demonstrated in performance tests
- Reduced CPU usage during scroll and mutation events
- Improved responsiveness on pages with 100+ videos
- Automatic memory management (no leaks)

**Integration**:
- All video detection modules use cached queries
- Eye button management uses cached element lookups
- Hiding logic uses cached closest() calls
- Cache automatically cleared on page navigation
- Cache invalidated when elements are added/removed

### Visibility-Based Processing

**IntersectionObserver Implementation**:
1. Tracks which video containers are visible in viewport
2. **Initial Load Handling**: Processes ALL videos on first page load to ensure hidden state is applied correctly
3. **Lazy Processing**: After initial load, only processes visible videos for performance
4. Processes newly visible videos as user scrolls
5. Automatic observation of dynamically added containers
6. Reconnects on page navigation for clean state

**Benefits**:
- Correct hidden/dimmed state on page reload (no race conditions)
- 50-70% reduction in subsequent processing time (lazy mode)
- Processes 10-20 visible videos instead of 100+ total after initial load
- Lower CPU usage during idle periods
- Better scroll performance with batched updates
- Improved battery life on mobile devices

**Configuration** (`INTERSECTION_OBSERVER_CONFIG`):
- `ROOT_MARGIN: '100px'`: Pre-load videos before entering viewport
- `THRESHOLD: [0, 0.25, 0.5]`: Multiple visibility level tracking
- `VISIBILITY_THRESHOLD: 0.25`: Video considered visible at 25%
- `BATCH_DELAY: 100`: Debounce delay for batch processing
- `ENABLE_LAZY_PROCESSING: true`: Toggle feature on/off

**Flow**:
1. IntersectionObserver setup on page load
2. All video containers observed for visibility
3. **Initial Load**: Process ALL videos regardless of visibility to apply hidden states
4. **Eye Button Synchronization**: Eye buttons fetch state and immediately sync container CSS classes to prevent race conditions
5. **Subsequent Updates**: Visibility changes batched and debounced
6. **Lazy Mode**: Only visible videos fetched and processed after initial load
7. Individual hiding applied based on visibility (all on initial, visible only after)
8. New videos processed as they scroll into view

**State Synchronization Mechanism**:
- Eye button creation triggers async fetch of video state from background script
- Fetch callback immediately applies container CSS classes (`syncIndividualContainerState`)
- This ensures eye button visual state matches container hidden/dimmed state
- Prevents race condition where `applyIndividualHiding()` runs before cache is populated
- Defensive check: `applyIndividualHiding()` skips videos without cached records
- Cache-first approach: Eye buttons use cached state if available, only fetch if missing

### Hidden Videos Manager Search

**Overview**:
- Users can search hidden videos by title or video ID
- Search is performed client-side after fetching all items (limited to 1000 for performance)
- Search is case-insensitive with 300ms debounce delay
- Results are paginated client-side (12 videos per page)
- Search term is highlighted in results for better visibility

**Search Flow**:
1. User types in search input field
2. Input is debounced (300ms delay) to prevent excessive re-renders
3. On search trigger, system loads all hidden videos (up to 1000) from IndexedDB
4. Videos are filtered client-side by search query
5. Filtered results are paginated and displayed
6. Search term is highlighted in video titles using `<mark>` tags
7. Pagination controls updated for search results

**Features**:
- **Real-time search**: Results update as user types (with debounce)
- **Case-insensitive**: Matches regardless of case
- **Dual-field search**: Searches both video title and video ID
- **Clear button**: Visible when search has text, clears search on click
- **Enter key support**: Pressing Enter triggers immediate search (bypasses debounce)
- **Filter integration**: Changing filters (all/dimmed/hidden) clears active search
- **Loading indicator**: Shows "Searching..." during data fetch
- **No results state**: Displays helpful message when no matches found
- **Accessibility**: Screen reader announces search results count via ARIA live region
- **XSS protection**: All user input is escaped using `escapeHtml()` function

**Performance**:
- Client-side filtering: Fast search after initial load (<100ms for 1000 videos)
- Debouncing: Prevents excessive re-renders during typing
- Limit: Searches up to 1000 videos maximum for performance
- Pagination: Only 12 results rendered per page
- Cache: Search results cached until filter change or search clear