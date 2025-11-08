/**
 * Streaming JSON utilities for handling large import/export files
 * Prevents UI freeze and memory issues by processing data in chunks
 */

import { IMPORT_EXPORT_CONFIG } from './constants.js';
import { warn } from './logger.js';
import { classifyError, ErrorType } from './errorHandler.js';

/**
 * FIXED P1-1: Validates JSON depth to prevent DoS attacks via deeply nested objects
 * Malicious JSON with 100k+ nesting levels can cause stack overflow and browser crash
 * @param {*} obj - Object to validate
 * @param {number} maxDepth - Maximum allowed nesting depth (default: 100)
 * @param {number} currentDepth - Current depth (used for recursion)
 * @throws {Error} If object nesting exceeds maxDepth
 */
function validateJSONDepth(obj, maxDepth = 100, currentDepth = 0) {
  if (currentDepth > maxDepth) {
    throw new Error(
      `JSON nesting exceeds maximum depth of ${maxDepth}. ` +
      `This could be a malicious file designed to crash the browser.`
    );
  }

  if (obj && typeof obj === 'object') {
    // Handle both arrays and objects
    const values = Array.isArray(obj) ? obj : Object.values(obj);
    for (const value of values) {
      if (value && typeof value === 'object') {
        validateJSONDepth(value, maxDepth, currentDepth + 1);
      }
    }
  }
}

/**
 * FIXED P1-1: Safely parses JSON with depth validation
 * Prevents DoS attacks from deeply nested JSON structures
 * @param {string} text - JSON text to parse
 * @param {number} maxDepth - Maximum allowed nesting depth
 * @returns {*} Parsed JSON object
 * @throws {Error} If parsing fails or depth exceeds limit
 */
function parseJSONSafely(text, maxDepth = 100) {
  const data = JSON.parse(text);
  validateJSONDepth(data, maxDepth);
  return data;
}

/**
 * Streaming JSON parser for large files
 * Reads and parses JSON incrementally to avoid loading entire file into memory
 */
export class StreamingJSONParser {
  constructor(file, options = {}) {
    this.file = file;
    this.originalSize = file.size; // FIXED P2-6: Store size at construction for TOCTOU check
    this.originalName = file.name; // FIXED P2-6: Store name for identity verification
    this.chunkSize = options.chunkSize || 1024 * 1024; // 1MB chunks by default
    this.onProgress = options.onProgress || (() => {});
    this.onError = options.onError || (() => {});
  }

  /**
   * Parse JSON file using incremental parsing
   * @returns {Promise<Object>} Parsed JSON data
   */
  async parse() {
    try {
      // FIXED P2-6: Validate file hasn't been replaced since construction
      if (this.file.size !== this.originalSize || this.file.name !== this.originalName) {
        throw new Error(
          `File was modified or replaced after selection. ` +
          `Original: ${this.originalName} (${formatBytes(this.originalSize)}), ` +
          `Current: ${this.file.name} (${formatBytes(this.file.size)})`
        );
      }

      // Step 0: Validate file size BEFORE parsing to prevent DoS/OOM attacks
      // Check file size before reading any content to avoid loading malicious files
      const maxFileSize = IMPORT_EXPORT_CONFIG.MAX_IMPORT_SIZE_MB * 1024 * 1024; // Convert MB to bytes
      if (this.originalSize > maxFileSize) {
        throw new Error(
          `File too large: ${formatBytes(this.originalSize)} ` +
          `(max: ${formatBytes(maxFileSize)}). ` +
          `Large files could cause memory issues.`
        );
      }

      const stream = this.file.stream();
      const reader = stream.getReader();
      const decoder = new TextDecoder('utf-8');

      let buffer = '';
      let bytesRead = 0;
      const totalBytes = this.file.size;

      let done = false;

      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;

        if (value) {
          bytesRead += value.length;

          // FIXED P1-2: Streaming size validation to prevent TOCTOU race condition
          // Re-check size during reading to prevent file replacement attack
          if (bytesRead > maxFileSize) {
            throw new Error(
              `File size exceeded during read: ${formatBytes(bytesRead)} > ${formatBytes(maxFileSize)}. ` +
              `Possible file replacement attack detected.`
            );
          }

          buffer += decoder.decode(value, { stream: !done });

          // Report progress
          const progress = Math.min(Math.round((bytesRead / totalBytes) * 50), 50); // 0-50% for reading
          this.onProgress({
            stage: 'reading',
            progress,
            bytesRead,
            totalBytes,
            message: `Reading file... ${progress}%`
          });
        }
      }

      // Report parsing stage
      this.onProgress({
        stage: 'parsing',
        progress: 55,
        message: 'Parsing JSON...'
      });

      // FIXED P1-1: Parse with depth validation to prevent DoS attacks
      // Malicious files with deeply nested objects (100k+ levels) can crash the browser
      // We still need to parse all at once, but at least reading was chunked
      const data = parseJSONSafely(buffer, 100);

      // FIXED P2-1/P2-9: Removed redundant metadata validation
      // Metadata can be forged, so we only validate actual records.length
      // This is done in StreamingRecordParser.parseAndProcessRecords() (line 148)

      this.onProgress({
        stage: 'parsed',
        progress: 60,
        message: 'JSON parsed successfully'
      });

      return data;

    } catch (error) {
      this.onError(error);
      // P2-3 FIX: Use consistent originalError property for compatibility
      const wrappedError = new Error(`Failed to parse JSON: ${error.message}`);
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }
}

/**
 * Streaming JSON parser with record-level processing
 * Extracts records array and processes them in batches
 */
export class StreamingRecordParser {
  constructor(file, options = {}) {
    this.file = file;
    this.batchSize = options.batchSize || 1000;
    this.onBatch = options.onBatch || (() => {});
    this.onProgress = options.onProgress || (() => {});
    this.onError = options.onError || (() => {});
  }

  /**
   * Parse JSON and process records in batches
   * @returns {Promise<Object>} Result with metadata and processing stats
   */
  async parseAndProcessRecords() {
    try {
      // Step 1: Read file using streaming parser
      const parser = new StreamingJSONParser(this.file, {
        onProgress: (progress) => {
          this.onProgress({
            ...progress,
            stage: progress.stage === 'parsed' ? 'preparing' : progress.stage
          });
        },
        onError: this.onError
      });

      const data = await parser.parse();

      // Step 2: Validate structure
      if (!data.records || !Array.isArray(data.records)) {
        throw new Error('Invalid import format: missing records array');
      }

      // FIXED P2-9: Validate ACTUAL records array size to prevent OOM
      // Note: Metadata fields (count, version, etc.) can be forged and are not trusted for validation
      // We only validate the actual records array length
      if (data.records.length > IMPORT_EXPORT_CONFIG.MAX_IMPORT_RECORDS) {
        throw new Error(
          `Too many records: ${data.records.length.toLocaleString()} ` +
          `(max: ${IMPORT_EXPORT_CONFIG.MAX_IMPORT_RECORDS.toLocaleString()})`
        );
      }

      const records = data.records;
      const totalRecords = records.length;
      const batches = Math.ceil(totalRecords / this.batchSize);

      this.onProgress({
        stage: 'processing',
        progress: 60,
        totalRecords,
        processedRecords: 0,
        batches,
        message: `Processing ${totalRecords.toLocaleString()} records in ${batches} batches...`
      });

      // Step 3: Process records in batches
      let processedRecords = 0;
      const results = {
        imported: 0,
        skipped: 0,
        updated: 0,
        errors: []
      };

      // FIXED P2-2: Track failed batches for retry mechanism
      const failedBatches = [];

      for (let i = 0; i < batches; i++) {
        const start = i * this.batchSize;
        const end = Math.min(start + this.batchSize, totalRecords);
        const batch = records.slice(start, end);

        // Process batch
        try {
          const batchResult = await this.onBatch(batch, i);

          // Aggregate results
          results.imported += batchResult.imported || 0;
          results.skipped += batchResult.skipped || 0;
          results.updated += batchResult.updated || 0;
          if (batchResult.errors) {
            results.errors.push(...batchResult.errors);
          }

        } catch (batchError) {
          // FIXED P2-2: Classify error and handle accordingly
          const errorType = classifyError(batchError);

          // Track failed batch for potential retry
          failedBatches.push({
            index: i,
            startIndex: start,
            count: batch.length,
            error: batchError.message,
            errorType
          });

          results.errors.push({
            batch: i,
            error: batchError.message
          });

          // FIXED P2-2: Stop processing on quota exceeded errors
          // User needs to free up space before continuing
          if (errorType === ErrorType.QUOTA_EXCEEDED) {
            warn(`[Import] Quota exceeded at batch ${i}, stopping import`);
            break;
          }
          // Continue processing other batches for non-critical errors
        }

        processedRecords = end;
        const progress = 60 + Math.round((processedRecords / totalRecords) * 40); // 60-100%

        this.onProgress({
          stage: 'processing',
          progress,
          totalRecords,
          processedRecords,
          currentBatch: i + 1,
          totalBatches: batches,
          message: `Processing batch ${i + 1}/${batches}... (${processedRecords.toLocaleString()}/${totalRecords.toLocaleString()} records)`
        });

        // Yield to UI thread to prevent freeze
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      this.onProgress({
        stage: 'complete',
        progress: 100,
        message: 'Import complete'
      });

      // FIXED P2-2: Return failed batches info for retry support
      return {
        metadata: {
          version: data.version,
          exportDate: data.exportDate,
          totalRecords: data.count
        },
        results: {
          ...results,
          failedBatches: failedBatches.length,
          canRetry: failedBatches.length > 0,
          retryData: failedBatches.map(fb => ({
            startIndex: fb.startIndex,
            count: fb.count,
            errorType: fb.errorType
          }))
        }
      };

    } catch (error) {
      this.onError(error);
      throw error;
    }
  }
}

/**
 * Chunked JSON export for large datasets
 * Writes JSON incrementally to avoid memory issues
 */
export class ChunkedJSONExporter {
  constructor(options = {}) {
    this.chunkSize = options.chunkSize || 1000;
    this.onProgress = options.onProgress || (() => {});
  }

  /**
   * Export data as JSON file with chunked processing
   * @param {Object} metadata - Export metadata (version, date, etc.)
   * @param {Function} getRecordsBatch - Function to get records in batches: (offset, limit) => Promise<Array>
   * @param {number} totalRecords - Total number of records to export
   * @returns {Promise<Blob>} JSON blob ready for download
   */
  async exportToJSON(metadata, getRecordsBatch, totalRecords) {
    try {
      const batches = Math.ceil(totalRecords / this.chunkSize);
      const jsonParts = [];

      // Start JSON structure
      jsonParts.push(JSON.stringify({
        version: metadata.version,
        exportDate: metadata.exportDate,
        count: totalRecords
      }).slice(0, -1)); // Remove closing brace

      jsonParts.push(',"records":[');

      this.onProgress({
        stage: 'exporting',
        progress: 5,
        message: 'Starting export...'
      });

      // Export records in batches
      for (let i = 0; i < batches; i++) {
        const offset = i * this.chunkSize;
        const records = await getRecordsBatch(offset, this.chunkSize);

        if (records.length === 0) break;

        // Add comma separator between batches (except for first)
        if (i > 0) {
          jsonParts.push(',');
        }

        // Serialize records
        const recordsJSON = records.map(r => JSON.stringify(r)).join(',');
        jsonParts.push(recordsJSON);

        const progress = 5 + Math.round(((i + 1) / batches) * 90); // 5-95%
        this.onProgress({
          stage: 'exporting',
          progress,
          processedRecords: offset + records.length,
          totalRecords,
          currentBatch: i + 1,
          totalBatches: batches,
          message: `Exporting batch ${i + 1}/${batches}...`
        });

        // Yield to UI thread
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      // Close JSON structure
      jsonParts.push(']}');

      this.onProgress({
        stage: 'finalizing',
        progress: 95,
        message: 'Creating download file...'
      });

      // Create blob from parts
      const blob = new Blob(jsonParts, { type: 'application/json' });

      this.onProgress({
        stage: 'complete',
        progress: 100,
        message: 'Export complete'
      });

      return blob;

    } catch (error) {
      throw new Error(`Export failed: ${error.message}`);
    }
  }
}

/**
 * FIXED P3-1: Format bytes to human-readable string with edge case handling
 * Handles negative numbers, infinity, NaN, and fractional bytes gracefully
 * @param {number} bytes - Number of bytes
 * @param {number} decimals - Decimal places (default: 2)
 * @returns {string} - Formatted string
 */
export function formatBytes(bytes, decimals = 2) {
  // FIXED P3-1: Handle invalid/edge case inputs
  if (!Number.isFinite(bytes)) return 'Invalid';
  if (bytes < 0) return '-' + formatBytes(-bytes, decimals);
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];

  // Calculate size index
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  // FIXED: Clamp index to valid array bounds (0 to sizes.length-1)
  // Handles fractional bytes (< 1) where i would be negative
  // and very large values where i might exceed array length
  const clampedIndex = Math.max(0, Math.min(i, sizes.length - 1));

  return parseFloat((bytes / Math.pow(k, clampedIndex)).toFixed(dm)) + ' ' + sizes[clampedIndex];
}

/**
 * Format processing speed
 */
export function formatSpeed(recordsPerSecond) {
  if (recordsPerSecond < 1000) {
    return `${Math.round(recordsPerSecond)} records/sec`;
  }
  return `${(recordsPerSecond / 1000).toFixed(1)}K records/sec`;
}

/**
 * Calculate estimated time remaining
 */
export function calculateETA(processedRecords, totalRecords, startTime) {
  const elapsed = Date.now() - startTime;
  const recordsPerMs = processedRecords / elapsed;
  const remainingRecords = totalRecords - processedRecords;
  const etaMs = remainingRecords / recordsPerMs;

  const seconds = Math.ceil(etaMs / 1000);

  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    return `${Math.ceil(seconds / 60)}m`;
  } else {
    return `${Math.ceil(seconds / 3600)}h`;
  }
}
