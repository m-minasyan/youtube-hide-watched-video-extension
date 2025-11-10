import { HIDDEN_VIDEO_MESSAGES } from './constants.js';
import { retryOperation, logError, classifyError, ErrorType } from './errorHandler.js';

const MESSAGE_TIMEOUT = 5000;

// Track if extension context has been invalidated
let contextInvalidated = false;

/**
 * Check if the extension context is still valid
 * @returns {boolean} True if context is valid, false if invalidated
 */
export function isExtensionContextValid() {
  if (contextInvalidated) {
    return false;
  }

  try {
    // Accessing chrome.runtime.id will throw if context is invalidated
    // This is a reliable way to check if the extension is still active
    const id = chrome.runtime?.id;
    return !!id;
  } catch (error) {
    // Context invalidated - mark it so we don't spam checks
    contextInvalidated = true;
    return false;
  }
}

/**
 * Send message with timeout
 */
function sendMessageWithTimeout(message, timeout = MESSAGE_TIMEOUT) {
  // Check if extension context is still valid before attempting to send
  if (!isExtensionContextValid()) {
    return Promise.reject(new Error('Extension context invalidated'));
  }

  return Promise.race([
    chrome.runtime.sendMessage(message),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Message timeout')), timeout)
    )
  ]).catch(error => {
    // Check if this is a context invalidation error
    const errorMsg = error?.message?.toLowerCase() || '';
    if (errorMsg.includes('extension context invalidated') ||
        errorMsg.includes('context invalidated')) {
      contextInvalidated = true;
    }
    throw error;
  });
}

/**
 * Send a message to background script for hidden videos operations
 * Includes automatic retry logic for transient failures
 *
 * Retry Configuration:
 * - maxAttempts: 5 (increased from 3 to handle service worker wake-up delays)
 * - initialDelay: 300ms (increased from 200ms to give background script more time to initialize)
 * - maxDelay: 3000ms (caps exponential backoff to prevent excessive waiting)
 *
 * These values are tuned for Manifest V3 service workers which may need time
 * to wake up and complete initialization before handling messages.
 *
 * Context Invalidation:
 * When the extension is reloaded/updated, the context becomes invalidated.
 * This is expected behavior and the function will fail gracefully without
 * logging errors to avoid console spam.
 *
 * @param {string} type - Message type
 * @param {Object} payload - Message payload
 * @param {number} [timeout] - Custom timeout in milliseconds (default: 5000ms)
 *                             Use longer timeouts for operations that scan large databases
 *                             (e.g., import with "Keep Newer" strategy)
 */
export async function sendHiddenVideosMessage(type, payload = {}, timeout = MESSAGE_TIMEOUT) {
  // Quick check before attempting message send
  if (!isExtensionContextValid()) {
    // Silently fail when context is invalidated - this is expected during extension reload
    // No need to log errors as this is a normal part of the extension lifecycle
    return Promise.reject(new Error('Extension context invalidated'));
  }

  return retryOperation(
    async () => {
      try {
        const response = await sendMessageWithTimeout({ type, ...payload }, timeout);

        if (!response) {
          throw new Error('No response from background script');
        }

        if (!response.ok) {
          const error = new Error(response.error || 'hidden video message failed');
          error.response = response;
          throw error;
        }

        return response.result;
      } catch (error) {
        // Don't log errors for context invalidation - this is expected behavior
        const errorType = classifyError(error);
        if (errorType !== ErrorType.PERMANENT || !error.message?.includes('context invalidated')) {
          logError('Messaging', error, { type, payload });
        }
        throw error;
      }
    },
    {
      maxAttempts: 5,
      initialDelay: 300,
      maxDelay: 3000,
      shouldRetry: (error) => {
        const errorType = classifyError(error);
        // Don't retry permanent errors (including context invalidation)
        return errorType === ErrorType.NETWORK || errorType === ErrorType.TRANSIENT;
      }
    }
  );
}
