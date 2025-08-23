# Frontend Guidelines

## Overview
This document provides guidelines for frontend development of the YouTube Hide Watched Video Extension.

## Design Principles

### User Experience
- Minimal and intuitive interface
- Fast and responsive interactions
- Clear visual feedback
- Accessibility first approach

### Performance
- Lightweight DOM operations
- Efficient selectors
- Debounced event handlers
- Lazy loading where appropriate

## UI Components

### Popup Interface
- Clean, modern design with gradient header
- Theme toggle with sun/moon icons
- Clear toggle switches with three states (Normal, Dimmed, Hidden)
- Individual mode selector for per-video hiding
- Collapsible sections for Watched Videos and Shorts with dropdown functionality
- Separate Quick Toggle buttons for each section (Watched Videos and Shorts)
- Link to Hidden Videos Manager
- Intuitive icons and visual feedback
- Responsive layout with 420px width
- Smooth animations and transitions for dropdowns

### Hidden Videos Manager
- Full-page interface for managing hidden videos
- Filter options for viewing all, dimmed, or hidden videos
- Statistics display with counts
- Individual video cards with thumbnails
- Actions to toggle state, view, or remove videos
- Consistent theming with popup interface

### Options Page
- Organized settings sections
- Clear descriptions for each option
- Visual grouping of related settings
- Save confirmation feedback

### Content Injection
- Non-intrusive modifications
- Preserve YouTube's native experience
- Smooth animations
- Respect user preferences

## Styling Guidelines

### CSS Architecture
- BEM naming convention
- Scoped styles to prevent conflicts
- CSS custom properties for theming
- Mobile-first responsive design

### Color Scheme
- Follow YouTube's color palette
- Support dark/light themes with toggle functionality
- CSS custom properties for theme switching
- Sufficient contrast ratios (WCAG 2.1 AA compliant)
- Consistent color usage with semantic meaning:
  - Primary gradient: Purple (#667eea to #764ba2)
  - Dimmed state: Orange gradient
  - Hidden state: Red gradient
  - Dark theme optimized colors for reduced eye strain

### Typography
- System fonts for performance
- Readable font sizes
- Proper line heights
- Clear hierarchy

## JavaScript Guidelines

### Code Style
- ES6+ syntax
- Async/await for asynchronous operations
- Destructuring where appropriate
- Clear variable naming

### DOM Manipulation
- Use querySelector for single elements
- Use querySelectorAll for multiple elements
- Cache DOM references
- Batch DOM updates

### Event Handling
- Delegate events where possible
- Remove listeners when not needed
- Prevent default behaviors appropriately
- Handle edge cases

## Accessibility

### ARIA Support
- Proper ARIA labels
- Role attributes where needed
- Keyboard navigation support
- Screen reader compatibility

### Focus Management
- Visible focus indicators
- Logical tab order
- Focus trapping in modals
- Skip links where appropriate

## Testing Approach

### Manual Testing
- Cross-browser testing
- Different viewport sizes
- Keyboard-only navigation
- Screen reader testing

### Automated Testing
- Unit tests for utilities
- Integration tests for features
- Visual regression testing
- Performance monitoring

## Browser Compatibility
- Chrome/Chromium (primary)
- Firefox (secondary)
- Edge (Chromium-based)
- Opera (if applicable)

## Performance Metrics
- First paint < 100ms
- Interactive < 200ms
- Minimal memory footprint
- No memory leaks