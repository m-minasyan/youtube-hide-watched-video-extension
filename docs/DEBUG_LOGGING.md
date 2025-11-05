# Debug Logging System

## Overview

The extension implements a comprehensive debug logging system that automatically removes all console logging statements in production builds while keeping them in development builds.

## Architecture

### Build-Time Stripping

For bundled files (`content.js`, `background.bundle.js`), logging is removed at build time through a three-layer approach:

1. **DefinePlugin**: Webpack replaces `__DEV__` with `false` in production
2. **Dead Code Elimination**: Webpack removes unreachable `if (DEBUG)` blocks
3. **Terser Optimization**: Removes any remaining console statements with `drop_console` and `pure_funcs`

### Runtime Flag

For non-bundled files (`popup.js`, `hidden-videos.js`), logging is controlled by a simple runtime flag:

```javascript
const DEBUG = false; // Set to true for development
```

## Usage

### In Bundled Files (content/, background/, shared/)

```javascript
import { debug, error, warn, info } from './utils/logger.js';

// Development: logs to console
// Production: completely removed from bundle
debug('[Component]', 'Debug message', data);
error('[Component]', 'Error occurred', errorObj);
warn('[Component]', 'Warning message');
info('[Component]', 'Info message');
```

### In Non-Bundled Files (popup.js, hidden-videos.js)

```javascript
// At top of file
const DEBUG = false; // Change to true for development

// Later in code
if (DEBUG) console.error('Error message', error);
```

## Logger API

### Functions

- `debug(...args)` - General debug logging (replaces console.log)
- `error(...args)` - Error logging (replaces console.error)
- `warn(...args)` - Warning logging (replaces console.warn)
- `info(...args)` - Informational logging (replaces console.info)

### Namespaced Logger

```javascript
import { createLogger } from './utils/logger.js';

const logger = createLogger('MyComponent');
logger.debug('Message'); // Outputs: [MyComponent] Message
logger.error('Error', err);
```

## File Structure

```
shared/logger.js          - Shared logger for background and popup
content/utils/logger.js   - Content script logger (imports from shared)
```

## Build Scripts

```bash
# Development build (logging enabled)
npm run build:content        # Content script dev build
npm run build:background     # Background script dev build
npm run dev                  # Watch mode for both

# Production build (logging removed)
npm run build:content:prod   # Content script production
npm run build:background:prod # Background script production
npm run build                # Full production build
```

## Verification

### Check Production Build

```bash
# Should output 0
grep -c "console\." content.js
grep -c "console\." background.bundle.js
```

### Check Development Build

```bash
# Should output multiple matches
npm run build:content
grep "console\." content.js
```

## Implementation Details

### Webpack Configuration

```javascript
// webpack.content.config.js
plugins: [
  new webpack.DefinePlugin({
    __DEV__: JSON.stringify(!isProduction),
    'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development')
  })
]

optimization: {
  minimizer: [
    new TerserPlugin({
      terserOptions: {
        compress: {
          drop_console: isProduction,
          drop_debugger: isProduction,
          pure_funcs: isProduction ? [
            'console.log',
            'console.info',
            'console.debug',
            'console.warn'
          ] : []
        }
      }
    })
  ]
}
```

### DEBUG Flag

The `DEBUG` constant in `shared/constants.js` is dynamically set:

```javascript
export const DEBUG = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';
```

In production builds:
- Webpack replaces `__DEV__` with `false`
- Expression evaluates to `false`
- All `if (DEBUG)` blocks are removed by dead code elimination

## Benefits

1. **Zero Runtime Overhead**: No logging code in production bundles
2. **Smaller Bundle Size**: Removes all debug strings and function calls
3. **Cleaner Console**: No debug output for end users
4. **Developer Friendly**: Full logging during development
5. **Type Safe**: No runtime errors from removed code

## Migration Guide

### Before

```javascript
console.log('[Component]', 'Message');
console.error('Error:', error);
console.warn('Warning');
```

### After

```javascript
import { debug, error, warn } from './utils/logger.js';

debug('[Component]', 'Message');
error('Error:', err);  // Note: rename 'error' param to 'err'
warn('Warning');
```

## Testing

Production builds are automatically tested to ensure no console statements remain:

```bash
npm run build
grep "console\." content.js && echo "FAIL: Console found" || echo "PASS: No console"
grep "console\." background.bundle.js && echo "FAIL: Console found" || echo "PASS: No console"
```

## Performance Impact

- **Development**: Minimal (runtime check for DEBUG flag)
- **Production**: Zero (all logging code removed at build time)
- **Bundle Size Reduction**: ~5-10KB for typical extension (depends on logging volume)

## Best Practices

1. Use appropriate log levels (debug, warn, error, info)
2. Include component name in log messages for better traceability
3. Avoid logging sensitive data (even in development)
4. Use namespaced loggers for large components
5. Keep DEBUG flag false in repository
6. Test both development and production builds before release

## Troubleshooting

### Logs not appearing in development

- Check that DEBUG is true in constants.js
- Rebuild with `npm run build:content` or `npm run build:background`
- Verify webpack is using development mode

### Logs appearing in production

- Check that build script uses `--mode production`
- Verify webpack.config.js has correct DefinePlugin setup
- Confirm terser has `drop_console: true` for production
- Run: `npm run build:content:prod` (not `npm run build:content`)

### Import errors

- Check relative path to logger.js is correct
- Ensure logger.js exports are correctly imported
- Verify no circular dependencies
