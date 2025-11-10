# Unified Cache Manager

## Overview

The `UnifiedCacheManager` is a simplified, unified caching layer that provides consistent behavior across background and content scripts with a single 3-Map architecture.

## Problem Solved

### Before Simplification

**Multiple Cache Modes:**
- Background: 2-Map mode (cache + accessOrder) with TTL
- Content: 3-Map mode (cache + timestamps + accessOrder)
- Inconsistent behavior between modes
- TTL complexity not effectively used
- 523 lines of complex code

### After Simplification

**Single 3-Map Architecture:**
- Unified structure for all use cases
- Timestamp-based freshness (no TTL complexity)
- Consistent behavior everywhere
- Reduced to ~390 lines
- Simpler maintenance and testing

## Architecture

### Unified 3-Map Structure

All cache instances use the same internal structure:

```javascript
const cache = new UnifiedCacheManager({
  maxSize: 5000,  // Maximum cache entries
  trackPendingRequests: false  // Optional: track pending promises
});
```

**Internal Structure:**
- `cache`: Map(videoId → record)
- `timestamps`: Map(videoId → timestamp)
- `accessOrder`: Map(videoId → lastAccessTime)
- `pendingRequests`: Map(videoId → Promise) *(optional)*

**Behavior:**
- Timestamp-based record freshness
- LRU eviction when exceeding maxSize
- Atomic operations across all Maps
- Built-in consistency validation and repair

## Key Features

### 1. Unified LRU Eviction

Single implementation for all use cases:
- Prevents concurrent eviction with `isEvicting` flag
- Batch deletion for atomic operations
- Maintains consistency across all three Maps

```javascript
evictLRUEntries() {
  if (this.cache.size <= this.maxSize || this.isEvicting) return;

  try {
    this.isEvicting = true;
    // Sort by access time, evict oldest
    // Delete from ALL Maps atomically
  } finally {
    this.isEvicting = false;
  }
}
```

### 2. Consistency Validation & Repair

Built-in consistency checks for all cache instances:

```javascript
// Validate consistency
const validation = cache.validateConsistency();
// { isValid: true/false, issues: [...], sizes: {...} }

// Repair inconsistencies
const repair = cache.repairConsistency();
// { actionsCount: N, actions: [...], finalSizes: {...} }
```

### 3. Timestamp-Based Merging

Prevents overwriting newer data with older data:

```javascript
cache.mergeFetchedRecord(videoId, fetchedRecord);
// Only updates if fetchedRecord.updatedAt > cached.timestamp
```

### 4. Pending Request Tracking (Optional)

Prevents duplicate background requests:

```javascript
if (cache.hasPendingRequest(videoId)) {
  return cache.getPendingRequest(videoId);
}

const promise = fetchFromBackground(videoId);
cache.setPendingRequest(videoId, promise);
promise.finally(() => cache.deletePendingRequest(videoId));
```

## API Reference

### Core Methods

| Method | Description |
|--------|-------------|
| `get(videoId)` | Retrieves cached record |
| `set(videoId, record)` | Stores record with timestamp |
| `has(videoId)` | Checks if video is cached |
| `invalidate(videoId)` | Removes specific record |
| `clear()` | Clears all caches |

### Advanced Methods

| Method | Description |
|--------|-------------|
| `applyUpdate(videoId, record)` | Unconditional update (local changes) |
| `mergeFetchedRecord(videoId, record)` | Timestamp-based merge (remote fetches) |
| `hasPendingRequest(videoId)` | Check for pending request |
| `setPendingRequest(videoId, promise)` | Track pending request |
| `deletePendingRequest(videoId)` | Remove pending request |
| `clearPendingRequests()` | Clear all pending requests |

### Monitoring Methods

| Method | Description |
|--------|-------------|
| `getStats()` | Cache statistics (size, maxSize, etc.) |
| `getMemoryUsage()` | Estimated memory usage in bytes |
| `validateConsistency()` | Check Map structure consistency |
| `repairConsistency()` | Fix Map structure inconsistencies |

## Usage Examples

### Background Script (IndexedDB Cache)

```javascript
// background/indexedDbCache.js
import { UnifiedCacheManager } from '../shared/cache/UnifiedCacheManager.js';

const cacheManager = new UnifiedCacheManager({
  maxSize: 5000
});

export function getCachedRecord(videoId) {
  return cacheManager.get(videoId);
}

export function setCachedRecord(videoId, record) {
  cacheManager.set(videoId, record);
}
```

### Content Script (Hidden Video Cache)

```javascript
// content/storage/cache.js
import { UnifiedCacheManager } from '../../shared/cache/UnifiedCacheManager.js';

const cacheManager = new UnifiedCacheManager({
  maxSize: 1000,
  trackPendingRequests: true  // Enable pending request tracking
});

export function applyCacheUpdate(videoId, record) {
  cacheManager.applyUpdate(videoId, record);
}

export function mergeFetchedRecord(videoId, record) {
  cacheManager.mergeFetchedRecord(videoId, record);
}
```

## Performance Improvements

### Memory Leak Prevention

- **Before**: Orphaned entries could accumulate in accessOrder Map
- **After**: Atomic deletion ensures all Maps stay synchronized

### Consistency Guarantees

- **Before**: Different modes could fail differently
- **After**: Single implementation with built-in validation

### Code Simplification

- **Before**: 523 lines with dual-mode complexity
- **After**: ~390 lines with single unified architecture
- **Result**: 25% reduction in complexity

### Removed Complexity

- No TTL logic (timestamp-based freshness instead)
- No mode switching (separateTimestamps parameter removed)
- No conditional logic for different cache structures
- Simpler testing and maintenance

## Migration Guide

### Backward Compatibility

Both `background/indexedDbCache.js` and `content/storage/cache.js` maintain their original APIs, so no changes are required in code that uses these modules.

### Configuration Changes

The simplified API no longer requires `cacheTTL` or `separateTimestamps`:

```javascript
// Old API (no longer supported)
const cache = new UnifiedCacheManager({
  maxSize: 5000,
  cacheTTL: 30000,           // REMOVED
  separateTimestamps: false  // REMOVED
});

// New simplified API
const cache = new UnifiedCacheManager({
  maxSize: 5000  // Only required parameter
});
```

## Testing

Run the comprehensive test suite:

```bash
# Test unified cache manager
npm test -- tests/unifiedCacheManager.test.js

# Test content cache
npm test -- tests/content/storage/cache.test.js

# Test background cache
npm test -- tests/background/indexedDbCache.test.js
```

## Future Enhancements

Potential improvements:

1. **Configurable Eviction Strategy**: Support LFU (Least Frequently Used)
2. **Cache Warming**: Pre-populate cache on extension startup
3. **Metrics Export**: Export cache hit/miss rates for monitoring
4. **Automatic Repair**: Trigger `repairConsistency()` on detected issues
5. **Size-Based Eviction**: Evict based on memory usage, not entry count

## References

- Simplification PR: Unified Cache Manager Simplification
- Related Files:
  - `shared/cache/UnifiedCacheManager.js` - Core implementation (~390 lines)
  - `background/indexedDbCache.js` - Background adapter
  - `content/storage/cache.js` - Content adapter
  - `tests/unifiedCacheManager.test.js` - Comprehensive tests
