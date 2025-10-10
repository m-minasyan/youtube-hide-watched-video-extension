# Error Handling and Recovery

The extension includes comprehensive error handling to ensure reliable operation even when issues occur.

## Automatic Recovery

The extension automatically handles:

- **Network Issues**: Retries failed operations with exponential backoff
- **Storage Quota**: Automatically cleans up old data when storage is full
- **Database Corruption**: Resets and rebuilds database if corruption is detected
- **Service Worker Unavailability**: Retries communication with background script

## Error Classification

Errors are automatically classified into categories for appropriate handling:

### Transient Errors
- Transaction aborted errors
- Database busy errors
- Temporary connection issues

**Recovery**: Automatic retry with exponential backoff (3 attempts max)

### Quota Exceeded
- IndexedDB storage quota exceeded
- Browser storage limits reached

**Recovery**: Automatic cleanup of oldest records, then retry operation

### Corruption Errors
- Invalid data format
- Database corruption detected

**Recovery**: Database reset and reinitialization (data loss may occur)

### Network Errors
- Message passing failures
- Background script disconnected
- Communication timeout

**Recovery**: Retry with timeout and exponential backoff

### Permission Errors
- Security errors
- Permission denied

**Recovery**: No automatic recovery, user action required

### Permanent Errors
- Invalid parameters
- Logic errors
- Unknown errors

**Recovery**: No retry, error logged and reported

## User Notifications

When errors occur that require user attention, you'll see notifications in the popup or hidden videos manager:

- **Red notifications**: Critical errors requiring action
- **Yellow notifications**: Warnings about potential issues
- **Green notifications**: Successful recovery or operation
- **Blue notifications**: Informational messages

Notifications automatically dismiss after 3 seconds, or you can click the X to dismiss them.

## Retry Strategy

The extension uses intelligent retry logic:

1. **Initial delay**: 100-200ms depending on operation
2. **Exponential backoff**: Each retry doubles the delay
3. **Maximum delay**: Capped at 5 seconds to prevent excessive waiting
4. **Maximum attempts**: 3 attempts before giving up

Example retry timeline:
- Attempt 1: Immediate
- Attempt 2: After 200ms
- Attempt 3: After 400ms
- Give up if still failing

## What to Do If Errors Persist

If you experience persistent errors:

1. **Refresh the YouTube page**: Often resolves temporary issues
2. **Restart your browser**: Clears temporary state
3. **Check browser storage**: Ensure you haven't disabled storage for extensions
4. **Clear extension data**: Use "Clear All" in hidden videos manager (this will delete all hidden video records)
5. **Reinstall extension**: Last resort if issues persist

## Error Reporting

The extension logs errors for debugging. If you experience issues:

1. Open browser DevTools (F12)
2. Check the Console tab for error messages
3. Look for messages prefixed with context like `[IndexedDB]`, `[ContentMessaging]`, etc.
4. Report issues with error details to the extension support

## Privacy Note

Error logs are stored locally and never transmitted. They contain only technical information about errors, not your personal data or video history.

## Technical Details

### Error Handler Module
Location: `/shared/errorHandler.js`

Key functions:
- `classifyError(error)`: Determines error type
- `retryOperation(operation, options)`: Executes operation with retry logic
- `logError(context, error, metadata)`: Logs error with context

### IndexedDB Recovery
Location: `/background/indexedDb.js`

Features:
- Automatic retry on transaction failures
- Quota exceeded handling with automatic cleanup
- Database corruption detection and reset
- Connection pooling and error recovery

### Message Passing Resilience
Location: `/content/storage/messaging.js`

Features:
- Timeout handling (5 second default)
- Automatic retry on network errors
- Optimistic updates with rollback
- Cache fallback on communication failure

## Performance Impact

Error handling adds minimal overhead:
- **Typical operation**: < 1ms overhead
- **First retry**: ~200ms delay
- **Maximum retry delay**: ~5 seconds total
- **Memory usage**: < 100KB for error log

## Configuration

Error handling behavior can be adjusted via constants in `/shared/constants.js`:

```javascript
export const ERROR_CONFIG = {
  MAX_RETRY_ATTEMPTS: 3,
  INITIAL_RETRY_DELAY: 100,
  MAX_RETRY_DELAY: 5000,
  MESSAGE_TIMEOUT: 5000,
  MAX_ERROR_LOG_SIZE: 100
};
```

Note: Modifying these values requires rebuilding the extension.

## Best Practices for Developers

When adding new features:

1. **Wrap async operations** with `retryOperation()` for automatic retry
2. **Classify errors appropriately** to ensure correct recovery strategy
3. **Log errors with context** using `logError()` for debugging
4. **Show user feedback** via notification system for user-facing errors
5. **Implement optimistic updates** for better perceived performance
6. **Handle edge cases** like null/undefined gracefully

## Known Limitations

- Database reset causes data loss (all hidden videos cleared)
- Cannot recover from browser storage disabled
- Network retries limited to 3 attempts
- Error log limited to 100 most recent entries
- No automatic backup/restore mechanism

## Future Improvements

Planned enhancements:
- Cloud sync for data backup
- More granular retry strategies
- User-configurable retry behavior
- Automatic error reporting (opt-in)
- Circuit breaker pattern for persistent failures
