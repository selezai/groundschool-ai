import * as Sentry from 'sentry-expo';

// Log levels
export const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARNING: 'warn',
  ERROR: 'error',
  CRITICAL: 'fatal',
};

// Current minimum log level
let currentLogLevel = __DEV__ ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO;

// Log level priorities (higher number = higher priority)
const LOG_LEVEL_PRIORITIES = {
  [LOG_LEVELS.DEBUG]: 0,
  [LOG_LEVELS.INFO]: 1,
  [LOG_LEVELS.WARNING]: 2,
  [LOG_LEVELS.ERROR]: 3,
  [LOG_LEVELS.CRITICAL]: 4,
};

/**
 * Set the minimum log level
 * @param {string} level - Minimum log level to display
 */
export const setLogLevel = (level) => {
  if (LOG_LEVELS[level.toUpperCase()]) {
    currentLogLevel = LOG_LEVELS[level.toUpperCase()];
  }
};

/**
 * Check if a log level should be displayed
 * @param {string} level - Log level to check
 * @returns {boolean} Whether the log level should be displayed
 */
const shouldLog = (level) => {
  return LOG_LEVEL_PRIORITIES[level] >= LOG_LEVEL_PRIORITIES[currentLogLevel];
};

/**
 * Format a log message with timestamp and metadata
 * @param {string} message - Log message
 * @param {Object} context - Log context
 * @returns {Object} Formatted log data
 */
const formatLogData = (message, context = {}) => {
  return {
    timestamp: new Date().toISOString(),
    message,
    ...context,
  };
};

/**
 * Log a debug message
 * @param {string} message - Log message
 * @param {Object} context - Log context
 */
export const debug = (message, context = {}) => {
  if (!shouldLog(LOG_LEVELS.DEBUG)) return;
  
  const _logData = formatLogData(message, context);
  
  // console.debug removed for production cleanliness
  
  // Debug messages don't go to Sentry by default in tests
  if (process.env.NODE_ENV !== 'test') {
    Sentry.Native.captureMessage(message, {
      level: LOG_LEVELS.DEBUG,
      extra: _logData
    });
  }
};

/**
 * Log an info message
 * @param {string} message - Log message
 * @param {Object} context - Log context
 */
export const info = (message, context = {}) => {
  if (!shouldLog(LOG_LEVELS.INFO)) return;
  
  const _logData = formatLogData(message, context);
  
  // console.info removed for production cleanliness
  
  // Add a breadcrumb to Sentry
  Sentry.Native.addBreadcrumb({
    message,
    data: context,
    level: LOG_LEVELS.INFO,
    category: 'app'
  });
};

/**
 * Log a warning message
 * @param {string} message - Log message
 * @param {Object} context - Log context
 */
export const warn = (message, context = {}) => {
  if (!shouldLog(LOG_LEVELS.WARNING)) return;
  
  const _logData = formatLogData(message, context);
  
  // console.warn removed for production cleanliness
  
  // Send to Sentry
  Sentry.Native.captureMessage(message, {
    level: 'warning',
    tags: context
  });
};

/**
 * Log an error message
 * @param {string} message - Log message
 * @param {Object} context - Log context
 */
export const error = (message, context = {}) => {
  if (!shouldLog(LOG_LEVELS.ERROR)) return;
  
  const _logData = formatLogData(message, context);
  
  // console.error removed for production cleanliness
  
  // Send to Sentry
  Sentry.Native.captureMessage(message, {
    level: 'error',
    tags: context
  });
};

/**
 * Log a critical error message
 * @param {string} message - Log message
 * @param {Object} context - Log context
 */
export const critical = (message, context = {}) => {
  if (!shouldLog(LOG_LEVELS.CRITICAL)) return;
  
  const _logData = formatLogData(message, context);
  
  // console.error removed for production cleanliness
  
  // Send to Sentry
  Sentry.Native.captureMessage(message, {
    level: 'fatal',
    tags: context
  });
};

// Already exported at the top
