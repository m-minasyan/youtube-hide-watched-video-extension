# YouTube DOM Structure Analysis

## Overview
This document provides a comprehensive analysis of YouTube's DOM structure as of August 2025, focusing on elements crucial for browser extension development and feature injection.

## Main Page Structure

### Core Container Hierarchy
```
ytd-app (Root application container)
└── ytd-page-manager (Page state manager)
    └── ytd-browse (Browse page wrapper)
        └── ytd-two-column-browse-results-renderer (Two-column layout)
            └── ytd-rich-grid-renderer (Video grid container)
                └── ytd-rich-item-renderer (Individual video items)
```

### Key Container Selectors
- **Application Root**: `ytd-app`
- **Page Manager**: `ytd-page-manager`
- **Browse Results**: `ytd-two-column-browse-results-renderer`
- **Video Grid**: `ytd-rich-grid-renderer`
- **Video Items**: `ytd-rich-item-renderer`

## Video Item Structure

### Modern Video Renderer (2025)
YouTube now uses a new component architecture with view models:

```html
<ytd-rich-item-renderer>
  <yt-lockup-view-model class="content-id-VIDEO_ID">
    <!-- Thumbnail Section -->
    <a href="/watch?v=VIDEO_ID" class="yt-lockup-view-model-wiz__content-image">
      <yt-thumbnail-view-model>
        <div class="ytThumbnailViewModelImage">
          <img src="thumbnail_url" />
        </div>
        <yt-thumbnail-overlay-badge-view-model>
          <!-- Video duration badge -->
        </yt-thumbnail-overlay-badge-view-model>
      </yt-thumbnail-view-model>
    </a>
    
    <!-- Metadata Section -->
    <yt-lockup-metadata-view-model>
      <!-- Channel avatar -->
      <yt-decorated-avatar-view-model>
        <yt-avatar-shape>
          <img src="channel_avatar" />
        </yt-avatar-shape>
      </yt-decorated-avatar-view-model>
      
      <!-- Video title -->
      <h3>
        <a href="/watch?v=VIDEO_ID">Video Title</a>
      </h3>
      
      <!-- Channel name and metadata -->
      <yt-content-metadata-view-model>
        <a href="/@channel">Channel Name</a>
        <span>Views • Time ago</span>
      </yt-content-metadata-view-model>
    </yt-lockup-metadata-view-model>
  </yt-lockup-view-model>
</ytd-rich-item-renderer>
```

### Key Selectors for Video Elements

#### Video Container
- Primary: `ytd-rich-item-renderer`
- Alternative: `yt-lockup-view-model`
- Class pattern: `.content-id-[VIDEO_ID]`

#### Thumbnail Elements
- Container: `yt-thumbnail-view-model`
- Image wrapper: `.ytThumbnailViewModelImage`
- Image: `.ytThumbnailViewModelImage img`
- Overlay container: `yt-thumbnail-overlay-badge-view-model`
- Duration badge: `.badge-shape-wiz__text`

#### Metadata Elements
- Container: `yt-lockup-metadata-view-model`
- Title link: `h3 a[href^="/watch"]`
- Channel avatar: `yt-decorated-avatar-view-model`
- Channel link: `a[href^="/@"]`
- Views/time: `.yt-content-metadata-view-model-wiz__metadata-row`

## Progress Bar Detection (Watched Videos)

### Progress Bar Selectors
YouTube uses multiple selectors for progress bars across different contexts:

1. **Standard Progress Bar**
   - `.ytd-thumbnail-overlay-resume-playback-renderer`
   - `yt-thumbnail-overlay-resume-playback-renderer`

2. **New Wiz-style Progress Bar**
   - `.yt-thumbnail-overlay-resume-playback-renderer-wiz__progress-bar`
   - `.ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment`

3. **Mobile/Responsive Progress Bar**
   - `.ytm-thumbnail-overlay-resume-playback-renderer`

## YouTube Shorts Detection

### Shorts Selectors
```javascript
// URL-based detection
'[href*="/shorts/"]'

// Component-based detection
'ytd-reel-item-renderer'
'yt-reel-item-view-model'
'ytm-shorts-lockup-view-model'

// Container detection
'ytd-rich-shelf-renderer[is-shorts]'
'#shorts-container'
```

### Shorts Container Structure
```html
<ytd-rich-shelf-renderer is-shorts>
  <ytd-rich-item-renderer>
    <a href="/shorts/VIDEO_ID">
      <!-- Shorts thumbnail and metadata -->
    </a>
  </ytd-rich-item-renderer>
</ytd-rich-shelf-renderer>
```

## Video ID Extraction Methods

### Method 1: URL Parsing
```javascript
const link = element.querySelector('a[href*="watch?v="]');
const videoId = link.href.match(/v=([^&]+)/)?.[1];
```

### Method 2: Class Name Parsing
```javascript
const lockup = element.querySelector('yt-lockup-view-model');
const videoId = lockup.className.match(/content-id-([^\s]+)/)?.[1];
```

### Method 3: Data Attributes
```javascript
// Some elements may have data attributes
const videoId = element.dataset.videoId || element.getAttribute('video-id');
```

## Custom Button Integration Points

### Recommended Injection Points

1. **Eye Button on Thumbnails**
   - Parent: `yt-thumbnail-view-model`
   - Position: Absolute positioning within thumbnail container
   - Z-index: Higher than thumbnail but lower than overlays

2. **Action Buttons in Metadata**
   - Parent: `yt-lockup-metadata-view-model`
   - Position: After the three-dot menu button
   - Class: Use YouTube's button styling classes

### Example Eye Button Implementation
```html
<button class="yt-hwv-eye-button" 
        data-video-id="VIDEO_ID"
        style="position: absolute; top: 8px; right: 8px; z-index: 10;">
  <svg><!-- Eye icon --></svg>
</button>
```

## Navigation and Sidebar

### Main Navigation
- Guide button: `#guide-button`
- Logo: `ytd-topbar-logo-renderer`
- Search box: `ytd-searchbox`
- User menu: `#avatar-btn`

### Mini Sidebar
- Container: `ytd-mini-guide-renderer`
- Items: `ytd-mini-guide-entry-renderer`
- Links: `ytd-mini-guide-entry-renderer a`

## Chip Bar (Filter Tags)

### Structure
```html
<ytd-feed-filter-chip-bar-renderer>
  <yt-chip-cloud-chip-renderer>
    <button>Filter Name</button>
  </yt-chip-cloud-chip-renderer>
</ytd-feed-filter-chip-bar-renderer>
```

### Common Filters
- All
- Gaming
- Music
- Live
- Mixes
- Recently uploaded
- Watched
- New to you

## Dynamic Content Loading

### Mutation Observers Required For
1. **Infinite Scroll**: New `ytd-rich-item-renderer` elements
2. **Page Navigation**: YouTube uses single-page app navigation
3. **Shorts Loading**: Dynamic insertion of shorts containers
4. **Progress Bar Updates**: Real-time watch progress updates

### Key Events to Monitor
```javascript
// Page navigation
document.addEventListener('yt-navigate-start', handler);
document.addEventListener('yt-navigate-finish', handler);

// Dynamic content
const observer = new MutationObserver(mutations => {
  // Check for new video items
});
observer.observe(document.querySelector('ytd-rich-grid-renderer'), {
  childList: true,
  subtree: true
});
```

## CSS Class Patterns

### YouTube's BEM-like Naming
- Component: `yt-[component-name]`
- Wiz components: `[component]-wiz`
- Modifiers: `--[modifier]`
- States: `--[state]`

### Common Class Prefixes
- `ytd-` : YouTube Desktop components
- `yt-` : Generic YouTube components
- `ytm-` : YouTube Mobile components
- `tp-yt-` : Third-party YouTube components

## Accessibility Attributes

### ARIA Labels
- Video links: `aria-label` contains full title and duration
- Buttons: `aria-label` describes action
- Navigation: `role="navigation"`
- Main content: `role="main"`

### Tab Navigation
- Videos: `tabindex="0"` or `tabindex="-1"`
- Interactive elements: Proper focus management

## Performance Considerations

### Efficient Selectors
```javascript
// Good: Specific and fast
document.querySelectorAll('ytd-rich-item-renderer')

// Avoid: Too generic
document.querySelectorAll('*[href*="watch"]')
```

### Batch DOM Operations
- Cache selectors results
- Use DocumentFragment for multiple insertions
- Minimize reflows and repaints

## Browser Compatibility Notes

### Chrome/Edge (Chromium)
- Full support for all selectors
- Native custom elements support
- Best performance

### Firefox
- May require polyfills for some custom elements
- Slightly different rendering of shadows

## Future-Proofing Strategies

1. **Use Multiple Selectors**: YouTube frequently changes class names
2. **Feature Detection**: Check if elements exist before using
3. **Graceful Degradation**: Fallback for missing elements
4. **Version Detection**: Monitor YouTube's experiment flags

## Testing Recommendations

### Manual Testing Scenarios
1. Homepage with mixed content
2. Search results page
3. Channel pages
4. Playlists
5. Shorts section
6. Watch page sidebar

### Automated Testing
```javascript
// Check for essential elements
const essentialSelectors = [
  'ytd-rich-item-renderer',
  'yt-lockup-view-model',
  'yt-thumbnail-view-model'
];

essentialSelectors.forEach(selector => {
  if (!document.querySelector(selector)) {
    console.error(`Missing: ${selector}`);
  }
});
```

## Conclusion

YouTube's DOM structure in 2025 has evolved to use view-model based components with the "wiz" naming convention. Extensions must adapt to these new patterns while maintaining backwards compatibility with older elements that may still appear in certain contexts.