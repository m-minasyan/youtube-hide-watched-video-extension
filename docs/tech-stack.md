# Tech Stack

## Overview
This document outlines the technology stack used in the YouTube Hide Watched Video Extension.

## Core Technologies

### Languages
- **JavaScript (ES6+)**: Primary programming language
- **HTML5**: Markup for popup and options pages
- **CSS3**: Styling and animations

### Browser APIs
- **Chrome Extensions Manifest V3**: Extension framework
- **WebExtensions API**: Cross-browser compatibility layer
- **IndexedDB API**: High-volume hidden video storage
- **Storage API**: Settings persistence
- **Runtime API**: Background script communication
- **Tabs API**: Tab management and injection
- **Scripting API**: Content script injection

## Development Tools

### Build Tools
- **Bash Script**: Automated packaging for Chrome Web Store
- **ZIP**: Extension packaging format
- **npm**: Package management and script runner
- **webpack (v5.89.0)**: Module bundling for content script
- **Terser**: JavaScript minification and optimization

### Testing
- **Jest**: Unit testing framework (v29.7.0)
- **jest-environment-jsdom**: DOM environment for Jest
- **@testing-library/jest-dom**: Additional Jest matchers
- **Chrome DevTools**: Manual testing and debugging
- **Puppeteer**: E2E testing (planned)
- **Test Coverage**: 171+ unit tests covering all business logic areas
  - Settings management and initialization
  - Video detection and hiding logic
  - Theme management and persistence
  - Pagination and filtering
  - Message passing between components
  - DOM manipulation and mutation observers
  - Storage synchronization
  - Error handling and performance optimization
  - Debouncing and caching mechanisms

### Code Quality
- **ESLint**: JavaScript linting
- **Prettier**: Code formatting
- **Husky**: Git hooks for quality checks

### Version Control
- **Git**: Source control
- **GitHub**: Repository hosting
- **GitHub Actions**: CI/CD pipeline

## Architecture Patterns

### Design Patterns
- **ES6 Modules**: Modular code organization with explicit imports/exports across all contexts
- **Message Passing**: Component communication between content and background scripts
- **Observer Pattern**: DOM mutation handling for dynamic content
- **Singleton**: Storage management and cache handling
- **Module Pattern**: Clear separation of concerns across modules
- **Centralized Constants**: Single source of truth for all configuration values

### Code Organization
- **Modular Architecture**: Content script split into 20+ focused modules
- **Separation of Concerns**: Clear module boundaries (utils, storage, detection, UI, hiding, observers, events)
- **DRY Principle**: Reusable utilities and shared constants (no duplication)
- **SOLID Principles**: Single responsibility per module, easy to extend
- **Webpack Bundling**: Modules bundled into optimized single file for deployment
- **Shared Constants Module**: `/shared/constants.js` used across background, popup, hidden-videos, and content scripts (via re-export)

## Libraries & Dependencies

### Runtime Dependencies
- None (vanilla JavaScript preferred for performance)

### Development Dependencies
- **Jest (v29.7.0)**: Testing framework
- **jest-environment-jsdom (v29.7.0)**: DOM testing environment
- **@testing-library/jest-dom (v6.1.5)**: Jest matchers
- **webpack (v5.89.0)**: Module bundler
- **webpack-cli (v5.1.4)**: Webpack command-line interface
- **terser-webpack-plugin (v5.3.9)**: Code minification
- **@babel/core (v7.28.4)**: JavaScript compiler
- **@babel/preset-env (v7.28.3)**: Smart presets for modern JavaScript
- **babel-jest (v30.1.2)**: Jest transformer for Babel
- **fake-indexeddb (v4.0.2)**: IndexedDB mock for testing

## Browser Support

### Primary Targets
- **Chrome**: Version 88+
- **Edge**: Chromium-based versions
- **Brave**: Latest versions
- **Opera**: Latest versions

### Secondary Targets
- **Firefox**: With WebExtensions polyfill

## Performance Considerations

### Optimization Techniques
- Lazy loading of resources
- Efficient DOM queries
- Debounced event handlers
- Minimal permission requests

### Bundle Size Targets
- Popup bundle: < 50KB
- Content script: ~15KB (minified and optimized via webpack)
- Background script: < 30KB
- Total extension size: < 500KB

### Build Process
- Source modules in `content/` directory (ES6 modules)
- Webpack compiles and bundles to single `content.js`
- Terser minification for production builds
- Source maps generated for debugging
- Build integrated into deployment pipeline

## Security Measures

### Content Security Policy
- Strict CSP headers
- No inline scripts
- No eval() usage
- Sanitized user inputs

### Permissions
- Minimal permission scope
- Host permissions only for YouTube
- No broad host permissions
- Storage permission for settings

## Future Considerations

### Potential Additions
- TypeScript for type safety
- React/Vue for complex UI (if needed)
- WebAssembly for performance-critical operations
- Service Worker enhancements

### Scalability
- Modular architecture for feature additions
- Performance monitoring
- Error tracking integration
- Analytics (privacy-respecting)