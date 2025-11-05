# Unified Cache Manager

## Overview

The `UnifiedCacheManager` is a shared caching layer that eliminates cache inconsistency between background and content scripts by providing a single, configurable implementation that supports both use cases.

## Problem Solved

### Before Unification

**Background Cache (`background/indexedDbCache.js`):**
- 2 Map structures: `backgroundCache`, `cacheAccessOrder`
- TTL-based eviction (30 seconds)
- MAX_SIZE: 5000
- Duplicate eviction logic

**Content Cache (`content/storage/cache.js`):**
- 3 Map structures: `hiddenVideoCache`, `hiddenVideoTimestamps`, `cacheAccessOrder`
- Timestamp-based merging
- MAX_SIZE: 1000
- Duplicate eviction logic
- Additional pending request tracking

### Risks Eliminated

1. **Different Eviction Logic**: Each cache had its own LRU implementation with potential inconsistencies
2. **Different Synchronization**: Maps could get out of sync differently in each implementation
3. **Duplicate Code**: Same logic maintained in two places
4. **Different Failure Points**: Each implementation could fail in different ways

## Architecture

### Configuration Modes

#### 2-Map Mode (Background Script)
```javascript
const cache = new UnifiedCacheManager({
  maxSize: 5000,
  cacheTTL: 30000,          // 30 seconds
  separateTimestamps: false, // Store {record, timestamp} together
  trackPendingRequests: false
});
```

**Internal Structure:**
- `cache`: Map(videoId → {record, timestamp})
- `cacheAccessOrder`: Map(videoId → lastAccessTime)

**Behavior:**
- TTL-based expiration
- Automatic cleanup on get() for expired entries
- LRU eviction when exceeding maxSize

#### 3-Map Mode (Content Script)
```javascript
const cache = new UnifiedCacheManager({
  maxSize: 1000,
  cacheTTL: null,           // No TTL, use timestamp merging
  separateTimestamps: true, // Separate timestamps Map
  trackPendingRequests: true
});
```

**Internal Structure:**
- `cache`: Map(videoId → record)
- `timestamps`: Map(videoId → timestamp)
- `cacheAccessOrder`: Map(videoId → lastAccessTime)
- `pendingRequests`: Map(videoId → Promise)

**Behavior:**
- Timestamp-based merging via `mergeFetchedRecord()`
- No TTL expiration
- Pending request deduplication
- LRU eviction when exceeding maxSize

## Key Features

### 1. Unified LRU Eviction

Single implementation used by both modes:
- Prevents concurrent eviction with `isEvicting` flag
- Batch deletion for atomic operations
- Automatic consistency validation after eviction

```javascript
evictLRUEntries() {
  if (this.cache.size <= this.maxSize) return;
  if (this.isEvicting) return;

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

Both modes benefit from built-in consistency checks:

```javascript
// Validate consistency
const validation = cache.validateConsistency();
// { isValid: true/false, issues: [...], sizes: {...} }

// Repair inconsistencies
const repair = cache.repairConsistency();
// { actionsCount: N, actions: [...], finalSizes: {...} }
```

### 3. Timestamp-Based Merging (Content Mode)

Prevents overwriting newer data with older data:

```javascript
cache.mergeFetchedRecord(videoId, fetchedRecord);
// Only updates if fetchedRecord.updatedAt > cached.timestamp
```

### 4. Pending Request Tracking (Content Mode)

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

| Method | Description | All Modes |
|--------|-------------|-----------|
| `get(videoId)` | Retrieves cached record, handles TTL | ✅ |
| `set(videoId, record)` | Stores record with timestamp | ✅ |
| `has(videoId)` | Checks if video is cached | ✅ |
| `invalidate(videoId)` | Removes specific record | ✅ |
| `clear()` | Clears all caches | ✅ |

### Content-Specific Methods

| Method | Description | 3-Map Mode |
|--------|-------------|------------|
| `applyUpdate(videoId, record)` | Unconditional update (local changes) | ✅ |
| `mergeFetchedRecord(videoId, record)` | Timestamp-based merge (remote fetches) | ✅ |
| `hasPendingRequest(videoId)` | Check for pending request | ✅ |
| `setPendingRequest(videoId, promise)` | Track pending request | ✅ |
| `deletePendingRequest(videoId)` | Remove pending request | ✅ |
| `clearPendingRequests()` | Clear all pending requests | ✅ |

### Monitoring Methods

| Method | Description | All Modes |
|--------|-------------|-----------|
| `getStats()` | Cache statistics (size, mode, etc.) | ✅ |
| `getMemoryUsage()` | Estimated memory usage in bytes | ✅ |
| `validateConsistency()` | Check Map structure consistency | ✅ |
| `repairConsistency()` | Fix Map structure inconsistencies | ✅ |

## Usage Examples

### Background Script (IndexedDB Cache)

```javascript
// background/indexedDbCache.js
import { UnifiedCacheManager } from '../shared/cache/UnifiedCacheManager.js';

const cacheManager = new UnifiedCacheManager({
  maxSize: 5000,
  cacheTTL: 30000,
  separateTimestamps: false
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
  cacheTTL: null,
  separateTimestamps: true,
  trackPendingRequests: true
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

- **Before**: Orphaned entries in `cacheAccessOrder` could accumulate
- **After**: Atomic deletion ensures all Maps stay synchronized

### Consistency Guarantees

- **Before**: Each cache could fail differently, leading to inconsistent state
- **After**: Single eviction logic with built-in validation

### Code Deduplication

- **Before**: ~200 lines duplicated between background and content
- **After**: ~450 lines in shared module, ~70 lines per adapter

### Testing Coverage

- Comprehensive test suite covering both modes
- Consistency validation and repair tested
- TTL expiration tested
- Timestamp merging tested
- Pending request tracking tested

## Migration Guide

### Backward Compatibility

Both `background/indexedDbCache.js` and `content/storage/cache.js` maintain their original APIs, so no changes are required in code that uses these modules.

### Configuration Changes

If you need to adjust cache parameters, modify the initialization in the respective modules:

```javascript
// Adjust background cache size
const cacheManager = new UnifiedCacheManager({
  maxSize: 10000, // Increased from 5000
  cacheTTL: 60000, // Increased from 30000
  separateTimestamps: false
});
```

## Testing

Run the comprehensive test suite:

```bash
# Test content cache
npm test -- tests/content/storage/cache.test.js

# Test LRU eviction
npm test -- tests/cacheLRU.test.js

# Test unified cache manager (both modes)
npm test -- tests/unifiedCacheManager.test.js
```

## Future Enhancements

Potential improvements:

1. **Configurable Eviction Strategy**: Support LFU (Least Frequently Used) in addition to LRU
2. **Cache Warming**: Pre-populate cache on extension startup
3. **Metrics Export**: Export cache hit/miss rates for monitoring
4. **Automatic Repair**: Trigger `repairConsistency()` on detected issues
5. **Size-Based Eviction**: Evict based on memory usage, not just entry count

## References

- Original Issue: Cache Inconsistency between Background and Content (#7)
- Related Files:
  - `shared/cache/UnifiedCacheManager.js` - Core implementation
  - `background/indexedDbCache.js` - Background adapter
  - `content/storage/cache.js` - Content adapter
  - `tests/unifiedCacheManager.test.js` - Comprehensive tests
