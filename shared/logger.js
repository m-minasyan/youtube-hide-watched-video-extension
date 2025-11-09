/**
 * @fileoverview Shared debug logging utility with build-time stripping for production
 *
 * This module provides logging functions with different behaviors in production:
 * - error(): ALWAYS logged (critical for debugging production issues)
 * - warn(): ALWAYS logged (important for production monitoring)
 * - debug(): Only in DEBUG mode (removed in production)
 * - info(): Only in DEBUG mode (removed in production)
 *
 * The DEBUG flag is imported from constants.js which is set at build time by webpack DefinePlugin.
 *
 * Usage:
 *   import { debug, error, warn, info } from './logger.js';
 *   debug('[Component]', 'Debug message', data);
 *   error('[Component]', 'Error occurred', errorObj);
 *
 * In production builds:
 * - DEBUG is replaced with false by webpack DefinePlugin
 * - Dead code elimination removes debug/info if (DEBUG) blocks
 * - error() and warn() remain active for production debugging
 */

import { DEBUG } from './constants.js';

/**
 * Log debug information (removed in production)
 * @param {...any} args - Arguments to log
 */
export function debug(...args) {
  if (DEBUG) {
    console.log(...args);
  }
}

/**
 * Log error information (ALWAYS logged, even in production)
 * Critical errors must be logged to debug production issues
 * @param {...any} args - Arguments to log
 */
export function error(...args) {
  // ALWAYS log errors, even in production
  // This is critical for debugging user-reported issues
  console.error(...args);
}

/**
 * Log warning information (ALWAYS logged, even in production)
 * Warnings are important for production monitoring
 * @param {...any} args - Arguments to log
 */
export function warn(...args) {
  // ALWAYS log warnings, even in production
  // Warnings help identify potential issues before they become errors
  console.warn(...args);
}

/**
 * Log informational messages (removed in production)
 * @param {...any} args - Arguments to log
 */
export function info(...args) {
  if (DEBUG) {
    console.info(...args);
  }
}

/**
 * Create a namespaced logger for a specific component
 * @param {string} namespace - Component or module name
 * @returns {Object} Logger object with namespaced methods
 */
export function createLogger(namespace) {
  const prefix = `[${namespace}]`;

  return {
    debug: (...args) => debug(prefix, ...args),
    error: (...args) => error(prefix, ...args),
    warn: (...args) => warn(prefix, ...args),
    info: (...args) => info(prefix, ...args),
  };
}

// FIXED: Export logDebug as alias for debug for backward compatibility
export const logDebug = debug;

export default {
  debug,
  logDebug, // Backward compatibility alias
  error,
  warn,
  info,
  createLogger,
};
