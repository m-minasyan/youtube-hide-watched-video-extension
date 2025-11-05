# Quota Management System

## Overview

The quota management system provides comprehensive data loss prevention when IndexedDB quota is exceeded. This ensures that no video data is lost even when storage limits are reached.

## Problem

Previously, when IndexedDB quota was exceeded:
- A fixed 1000 records were deleted without calculating actual space needed
- Only one retry attempt was made
- Failed operations resulted in permanent data loss
- No user notification or logging of lost data
- Large bulk operations (500+ records) could fail repeatedly

## Solution

The new quota management system implements a multi-layered approach:

### 1. Smart Space Calculation
- Estimates the size of each operation based on record count
- Calculates how many records need to be deleted with a safety margin (20%)
- Applies min/max bounds to prevent excessive or inefficient deletions

### 2. Progressive Cleanup
- Deletes only as many records as needed for the operation
- If retry fails, performs additional cleanup (50% more each time)
- Up to 3 retry attempts with increasing cleanup

### 3. Fallback Storage
- **Critical Feature**: Before any cleanup, data is saved to `chrome.storage.local`
- Maximum 1000 records in fallback storage
- Older records are removed if fallback is full (with logging)
- Data persists until successfully written to IndexedDB

### 4. Automatic Retry Queue
- Background process checks fallback storage every 5 minutes
- Automatically retries failed operations when quota available
- Processes in batches of 100 to avoid overwhelming IndexedDB
- Removes records from fallback only after successful write

### 5. User Notifications
- Chrome notifications alert users to quota issues
- 5-minute cooldown prevents notification spam
- Different messages for different scenarios:
  - Successful cleanup: "Storage space optimized"
  - Cleanup failure: "Please manually clear old videos"
  - Critical error: "Unable to save video data"

### 6. Comprehensive Logging
- All quota events logged to `chrome.storage.local`
- Tracks cleanup operations, data loss events, fallback storage
- Maximum 50 recent events kept for debugging
- Statistics available for monitoring

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Operation Flow                           │
└─────────────────────────────────────────────────────────────┘

User Data (e.g., 500 records to save)
        ↓
┌───────────────────┐
│ upsertHiddenVideos │ ← Operation context added
└───────────────────┘
        ↓
┌───────────────────┐
│    withStore      │ ← Attempts IndexedDB write
└───────────────────┘
        ↓
   ❌ Quota Exceeded
        ↓
┌───────────────────────────────────────────────────────────┐
│              handleQuotaExceeded                          │
│  1. Save data to fallback storage (chrome.storage.local) │
│  2. Estimate space needed                                 │
│  3. Calculate cleanup count (smart)                       │
│  4. Delete oldest records                                 │
│  5. Log event                                             │
│  6. Notify user                                           │
└───────────────────────────────────────────────────────────┘
        ↓
┌───────────────────┐
│  Retry (3 times)  │
└───────────────────┘
   ↓           ↓
  ✓ Success   ❌ Fail
   ↓           ↓
  Return    Data stays in fallback
              ↓
        ┌─────────────────────┐
        │ Background Process  │ ← Every 5 minutes
        │ processFallbackStorage │
        └─────────────────────┘
              ↓
        Retry automatically
```

## Files Modified/Created

### New Files
1. **`background/quotaManager.js`**
   - Main quota management logic
   - Fallback storage operations
   - User notifications
   - Event logging and statistics

### Modified Files
1. **`background/indexedDb.js`**
   - Updated `withStore` to accept operation context
   - Integrated quota manager
   - Added progressive retry logic
   - Added `processFallbackStorage()` function

2. **`background.js`**
   - Added periodic fallback processing (every 5 minutes)
   - Integrated with chrome.alarms API

3. **`shared/constants.js`**
   - Added `QUOTA_CONFIG` with all configuration options

4. **`manifest.json`**
   - Added `notifications` permission

## Configuration

All configuration is in `shared/constants.js` → `QUOTA_CONFIG`:

```javascript
export const QUOTA_CONFIG = {
  ESTIMATED_RECORD_SIZE: 200,        // Bytes per record
  CLEANUP_SAFETY_MARGIN: 1.2,        // 20% extra cleanup
  MIN_CLEANUP_COUNT: 100,            // Minimum records to delete
  MAX_CLEANUP_COUNT: 5000,           // Maximum records to delete
  MAX_FALLBACK_RECORDS: 1000,        // Fallback storage limit
  NOTIFICATION_COOLDOWN_MS: 300000,  // 5 minutes
  MAX_QUOTA_EVENTS: 50,              // Event log size
  MAX_RETRY_ATTEMPTS: 3,             // Retry attempts
  ENABLE_FALLBACK_STORAGE: true,     // Enable/disable fallback
  ENABLE_QUOTA_NOTIFICATIONS: true   // Enable/disable notifications
};
```

## API Reference

### QuotaManager (`background/quotaManager.js`)

#### `handleQuotaExceeded(error, cleanupFunction, operationContext)`
Main handler for quota exceeded errors.

**Parameters:**
- `error`: The quota exceeded error
- `cleanupFunction`: Function to delete old records (e.g., `deleteOldestHiddenVideos`)
- `operationContext`: Object with `{ operationType, data, recordCount }`

**Returns:** Object with:
```javascript
{
  success: boolean,
  cleanupPerformed: boolean,
  recordsDeleted: number,
  fallbackSaved: boolean,
  fallbackRecords: number,
  recommendation: string
}
```

#### `getFromFallbackStorage(limit)`
Retrieves records from fallback storage.

#### `removeFromFallbackStorage(count)`
Removes records from fallback storage after successful write.

#### `clearFallbackStorage()`
Clears all fallback storage.

#### `getFallbackStats()`
Returns fallback storage statistics:
```javascript
{
  recordCount: number,
  maxRecords: number,
  utilizationPercent: number
}
```

#### `getQuotaStats()`
Returns comprehensive quota statistics:
```javascript
{
  totalEvents: number,
  eventsByType: object,
  totalCleanups: number,
  totalRecordsDeleted: number,
  totalDataLoss: number,
  fallback: object,
  lastEvent: object
}
```

### IndexedDB (`background/indexedDb.js`)

#### `processFallbackStorage()`
Processes fallback storage and retries failed operations.

**Returns:**
```javascript
{
  success: boolean,
  processed: number,
  remaining: number,
  message: string
}
```

## Data Loss Prevention

The system prevents data loss through:

1. **Immediate Fallback**: Data is saved to fallback storage BEFORE any cleanup
2. **Multiple Retries**: Up to 3 retry attempts with progressive cleanup
3. **Persistent Storage**: Fallback data persists in chrome.storage.local
4. **Automatic Recovery**: Background process retries every 5 minutes
5. **Logging**: All quota events are logged for auditing

## User Experience

### Normal Operation
User sees no difference - operations complete successfully.

### Quota Exceeded (First Time)
1. User performs operation (e.g., marks videos as watched)
2. Brief delay while cleanup occurs
3. Notification: "Storage space optimized. Deleted 150 old videos."
4. Operation completes successfully

### Quota Repeatedly Exceeded
1. User performs large operation
2. Notification: "Storage space optimized. Deleted 500 old videos."
3. If still failing, notification every 5 minutes (with cooldown)
4. Data safely preserved in fallback storage
5. Automatic retry every 5 minutes until success

### Critical Scenario
1. Even fallback storage is full
2. Notification: "Please export your data and clear old videos"
3. User is guided to take manual action
4. No silent data loss occurs

## Monitoring and Debugging

### View Quota Statistics
```javascript
import { getQuotaStats } from './background/quotaManager.js';

const stats = await getQuotaStats();
console.log(stats);
```

### View Fallback Storage
```javascript
import { getFallbackStats, getFromFallbackStorage } from './background/quotaManager.js';

const stats = await getFallbackStats();
console.log(`${stats.recordCount} records pending`);

const records = await getFromFallbackStorage();
console.log(records);
```

### View Event Log
```javascript
import { getQuotaEvents } from './background/quotaManager.js';

const events = await getQuotaEvents();
events.forEach(event => {
  console.log(`[${new Date(event.timestamp)}] ${event.type}:`, event);
});
```

## Testing

### Simulate Quota Exceeded
```javascript
// In browser console
chrome.storage.local.set({
  YTHWV_FALLBACK_STORAGE: [
    { videoId: 'test1', state: 'hidden', updatedAt: Date.now() },
    { videoId: 'test2', state: 'hidden', updatedAt: Date.now() }
  ]
});

// Trigger processing
import { processFallbackStorage } from './background/indexedDb.js';
const result = await processFallbackStorage();
console.log(result);
```

## Performance Impact

- **Fallback Storage**: Minimal - uses chrome.storage.local (fast, persistent)
- **Background Processing**: Every 5 minutes, only if fallback has data
- **Notifications**: Throttled with 5-minute cooldown
- **Event Logging**: Limited to 50 events (automatically pruned)
- **Space Overhead**: Up to 1000 records in fallback (≈200KB)

## Future Enhancements

1. **Smart Cleanup Priority**
   - Delete videos by multiple criteria (oldest, least accessed, etc.)
   - User-configurable cleanup strategy

2. **Export/Import Integration**
   - Automatic export when quota repeatedly exceeded
   - Suggest import after manual cleanup

3. **Storage Analytics**
   - Dashboard showing storage usage trends
   - Predictions of when quota will be exceeded

4. **Compression**
   - Compress fallback storage data
   - Store only essential fields in fallback

## Credits

This quota management system was implemented to address critical issue #5 (Quota Exceeded Data Loss).

**Key Features:**
- Zero data loss architecture
- Progressive cleanup strategy
- Automatic retry mechanism
- Comprehensive logging and monitoring
- User-friendly notifications
