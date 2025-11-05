/**
 * @fileoverview Shared debug logging utility with build-time stripping for production
 *
 * This module provides logging functions that are automatically removed in production builds.
 * The DEBUG flag is imported from constants.js which is set at build time by webpack DefinePlugin.
 *
 * Usage:
 *   import { debug, error, warn, info } from './logger.js';
 *   debug('[Component]', 'Debug message', data);
 *   error('[Component]', 'Error occurred', errorObj);
 *
 * In production builds:
 * - DEBUG is replaced with false by webpack DefinePlugin
 * - Dead code elimination removes all if (DEBUG) blocks
 * - Terser's drop_console removes any remaining console statements
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
 * Log error information (removed in production)
 * @param {...any} args - Arguments to log
 */
export function error(...args) {
  if (DEBUG) {
    console.error(...args);
  }
}

/**
 * Log warning information (removed in production)
 * @param {...any} args - Arguments to log
 */
export function warn(...args) {
  if (DEBUG) {
    console.warn(...args);
  }
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

export default {
  debug,
  error,
  warn,
  info,
  createLogger,
};
