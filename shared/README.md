# Shared Constants

This directory contains constants shared across all extension components.

## Usage

### In Content Scripts
```javascript
import { STORAGE_KEYS, CSS_CLASSES } from '../utils/constants.js';
```

### In Background Script
```javascript
import { STORAGE_KEYS, DEFAULT_SETTINGS } from './shared/constants.js';
```

### In Popup/Hidden Videos
```javascript
import { STORAGE_KEYS, HIDDEN_VIDEO_MESSAGES } from './shared/constants.js';
```

## Constants Reference

### STORAGE_KEYS
All chrome.storage key identifiers:
- `THRESHOLD`: Storage key for watched threshold percentage
- `WATCHED_STATE`: Base key for watched videos state per section
- `SHORTS_STATE`: Base key for shorts state per section
- `HIDDEN_VIDEOS`: Storage key for individually hidden videos
- `INDIVIDUAL_MODE`: Storage key for individual mode type (dimmed/hidden)
- `INDIVIDUAL_MODE_ENABLED`: Storage key for individual mode enabled state
- `THEME`: Storage key for theme preference

### HIDDEN_VIDEO_MESSAGES
Message types for background script communication:
- `GET_MANY`: Get multiple hidden videos
- `GET_PAGE`: Get paginated hidden videos
- `GET_STATS`: Get statistics about hidden videos
- `SET_STATE`: Set state for a specific video
- `CLEAR_ALL`: Clear all hidden videos

### DEFAULT_SETTINGS
Default values for all settings:
- `threshold`: Default watched threshold (10%)
- `theme`: Default theme ('auto')
- `individualMode`: Default individual mode type ('dimmed')
- `individualModeEnabled`: Default individual mode state (true)
- `states`: Default state for each section (watched and shorts)

### CSS_CLASSES
CSS class names for content script styling:
- `WATCHED_HIDDEN`: Class for hidden watched videos
- `WATCHED_DIMMED`: Class for dimmed watched videos
- `SHORTS_HIDDEN`: Class for hidden shorts
- `SHORTS_DIMMED`: Class for dimmed shorts
- `HIDDEN_ROW_PARENT`: Class for parent row of hidden videos
- `INDIVIDUAL_HIDDEN`: Class for individually hidden videos
- `INDIVIDUAL_DIMMED`: Class for individually dimmed videos
- `EYE_BUTTON`: Class for eye button element
- `HAS_EYE_BUTTON`: Class to mark thumbnails with eye buttons

### SELECTORS
DOM selectors for YouTube elements:
- `PROGRESS_BAR`: Selectors for video progress indicators
- `SHORTS_CONTAINERS`: Selectors for shorts containers
- `THUMBNAILS`: Selectors for video thumbnails
- `VIDEO_CONTAINERS`: Selectors for video container elements
- `TITLE_ELEMENTS`: Selectors for video title elements

### DEBUG
Debug mode flag (boolean). Set to `true` to enable console logging throughout the extension.

## Modification Guidelines

1. When adding new constants, add them to `/shared/constants.js`
2. Update this README with documentation for new constants
3. Ensure all components that need the constant import it
4. Test thoroughly across all extension contexts (content, background, popup)
5. Update the changelog when modifying constants

## Architecture Notes

- Content scripts bundle constants via webpack
- Background, popup, and hidden-videos scripts use ES6 module imports
- All scripts share the same source of truth from this directory
- No duplication of constant values across the codebase
