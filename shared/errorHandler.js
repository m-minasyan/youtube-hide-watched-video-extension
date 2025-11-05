import { error as logErrorMessage } from './logger.js';

// Error categories
export const ErrorType = {
  TRANSIENT: 'transient',      // Retry automatically
  TIMEOUT: 'timeout',           // Operation timeout - may be retryable
  QUOTA_EXCEEDED: 'quota',      // Special handling needed
  PERMISSION: 'permission',     // User action required
  CORRUPTION: 'corruption',     // Data recovery needed
  NETWORK: 'network',           // Connectivity issue
  PERMANENT: 'permanent'        // No recovery possible
};

// Classify errors
export function classifyError(error) {
  if (!error) return ErrorType.PERMANENT;

  const message = error.message?.toLowerCase() || '';
  const name = error.name?.toLowerCase() || '';

  // Timeout errors - check flag first, then name and message
  if (error.timeout === true ||
      name === 'timeouterror' ||
      (message.includes('timeout') && message.includes('operation'))) {
    return ErrorType.TIMEOUT;
  }

  // IndexedDB quota errors
  if (message.includes('quota') || name.includes('quotaexceedederror')) {
    return ErrorType.QUOTA_EXCEEDED;
  }

  // Transient errors
  if (message.includes('transaction') ||
      message.includes('aborted') ||
      message.includes('busy') ||
      name.includes('aborterror')) {
    return ErrorType.TRANSIENT;
  }

  // Extension context invalidated - PERMANENT (extension was reloaded/updated)
  if (message.includes('extension context invalidated') ||
      message.includes('context invalidated')) {
    return ErrorType.PERMANENT;
  }

  // Network/messaging errors - ENHANCED (but not our custom timeout errors)
  if (message.includes('message') ||
      message.includes('no response') ||
      message.includes('no receiver') ||
      message.includes('disconnected') ||
      message.includes('timeout') ||
      message.includes('could not establish connection') ||
      message.includes('receiving end does not exist')) {
    return ErrorType.NETWORK;
  }

  // Permission errors
  if (message.includes('permission') || name.includes('securityerror')) {
    return ErrorType.PERMISSION;
  }

  // Data corruption
  if (message.includes('corrupt') ||
      message.includes('invalid') ||
      name.includes('dataerror')) {
    return ErrorType.CORRUPTION;
  }

  return ErrorType.PERMANENT;
}

// Retry with exponential backoff
export async function retryOperation(
  operation,
  options = {}
) {
  const {
    maxAttempts = 3,
    initialDelay = 100,
    maxDelay = 5000,
    shouldRetry = (error) => classifyError(error) === ErrorType.TRANSIENT,
    onRetry = null
  } = options;

  let lastError;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts || !shouldRetry(error)) {
        throw error;
      }

      if (onRetry) {
        onRetry(attempt, error);
      }

      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * 2, maxDelay);
    }
  }

  throw lastError;
}

// Error logger with tracking
const errorLog = [];
const MAX_LOG_SIZE = 100;

export function logError(context, err, metadata = {}) {
  const entry = {
    timestamp: Date.now(),
    context,
    type: classifyError(err),
    message: err?.message || String(err),
    metadata
  };

  errorLog.unshift(entry);
  if (errorLog.length > MAX_LOG_SIZE) {
    errorLog.pop();
  }

  logErrorMessage(`[${context}]`, err, metadata);
  return entry;
}

export function getErrorLog() {
  return [...errorLog];
}

export function clearErrorLog() {
  errorLog.length = 0;
}
