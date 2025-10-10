import { HIDDEN_VIDEO_MESSAGES } from './constants.js';
import { retryOperation, logError, classifyError, ErrorType } from './errorHandler.js';

const MESSAGE_TIMEOUT = 5000;

/**
 * Send message with timeout
 */
function sendMessageWithTimeout(message, timeout = MESSAGE_TIMEOUT) {
  return Promise.race([
    chrome.runtime.sendMessage(message),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Message timeout')), timeout)
    )
  ]);
}

/**
 * Send a message to background script for hidden videos operations
 * Includes automatic retry logic for transient failures
 */
export async function sendHiddenVideosMessage(type, payload = {}) {
  return retryOperation(
    async () => {
      try {
        const response = await sendMessageWithTimeout({ type, ...payload });

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
        logError('Messaging', error, { type, payload });
        throw error;
      }
    },
    {
      maxAttempts: 3,
      initialDelay: 200,
      shouldRetry: (error) => {
        const errorType = classifyError(error);
        return errorType === ErrorType.NETWORK || errorType === ErrorType.TRANSIENT;
      }
    }
  );
}
