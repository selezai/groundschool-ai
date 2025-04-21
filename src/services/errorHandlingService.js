import React from 'react';
import { Alert, Platform, ErrorUtils } from 'react-native';

// Local error log storage
const errorLogs = [];
const MAX_ERROR_LOGS = 100; // Limit the number of stored errors

/**
 * Set up global error handlers for uncaught exceptions
 */
export const setupGlobalErrorHandlers = () => {
  let originalErrorHandler = null;
  
  // Make sure ErrorUtils is defined (for testing environment)
  if (typeof ErrorUtils !== 'undefined') {
    // Handle uncaught JS exceptions
    originalErrorHandler = ErrorUtils.getGlobalHandler ? ErrorUtils.getGlobalHandler() : null;
    
    if (ErrorUtils.setGlobalHandler) {
      ErrorUtils.setGlobalHandler((error, isFatal) => {
        // Log the error locally
        logError(error, { isFatal });
        
        // Show an alert in development
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          Alert.alert(
            'Unexpected Error',
            `An unexpected error occurred: ${error.message}\n\nThe error has been logged.`,
            [{ text: 'OK' }]
          );
        }
        
        // Call the original handler
        if (originalErrorHandler) {
          originalErrorHandler(error, isFatal);
        }
      });
    }
  }
  
  // Handle unhandled promise rejections
  if (Platform.OS !== 'web') {
    // React Native
    if (global && global.addEventListener) {
      global.addEventListener('unhandledrejection', (event) => {
        logError(event.reason, { type: 'unhandledPromiseRejection' });
      });
    }
  } else {
    // Web
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('unhandledrejection', (event) => {
        logError(event.reason, { type: 'unhandledPromiseRejection' });
      });
    }
  }
  
  // Log that error handlers have been set up
  logMessage('Global error handlers set up', {}, 'info');
  
  return originalErrorHandler; // Return for testing purposes
};

/**
 * Create a try/catch wrapper for async functions
 * @param {Function} fn - The function to wrap
 * @param {Object} errorContext - Additional context for errors
 * @returns {Function} Wrapped function
 */
export const withErrorHandling = (fn, errorContext = {}) => {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      logError(error, {
        ...errorContext,
        args: JSON.stringify(args),
      });
      throw error; // Re-throw to allow caller to handle
    }
  };
};

/**
 * Wrap a component with error logging
 * @param {Function} Component - React component to wrap
 * @param {Object} errorContext - Additional context for errors
 * @returns {Function} Wrapped component
 */
export const withErrorLogging = (Component, errorContext = {}) => {
  return (props) => {
    try {
      return <Component {...props} />;
    } catch (error) {
      logError(error, {
        component: Component.name,
        props: JSON.stringify(props),
        ...errorContext,
      });
      throw error; // Re-throw to be caught by ErrorBoundary
    }
  };
};

/**
 * Log a message to local storage
 * @param {string} message - The message to log
 * @param {Object} context - Additional context
 * @param {string} level - Log level
 */
export const logMessage = (message, context = {}, level = 'info') => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    message,
    level,
    context,
  };
  
  // Store in local logs
  storeLog(logEntry);
  
  // Also log to console in development
  if (__DEV__) {
    // console statements removed for production cleanliness
// [Removed undefined 'log' function call for ESLint compliance]
// Use an appropriate logger if needed, e.g., logger.info(`[${level.toUpperCase()}] ${message}`, context);
  }
};

/**
 * Log an error to local storage
 * @param {Error|string} error - The error object or message
 * @param {Object} context - Additional context
 */
export const logError = (error, context = {}) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: 'error',
    context,
  };
  
  if (typeof error === 'string') {
    // If error is a string, log as message
    logEntry.message = error;
    logEntry.type = 'message';
  } else {
    // Log as exception
    logEntry.message = error.message;
    logEntry.stack = error.stack;
    logEntry.name = error.name;
    logEntry.type = 'exception';
  }
  
  // Store in local logs
  storeLog(logEntry);
  
  // Also log to console in development
  if (__DEV__) {
    // console statements removed for production cleanliness
error('Error:', logEntry.message, context);
    if (logEntry.stack) // console statements removed for production cleanliness
error(logEntry.stack);
  }
};

/**
 * Add a breadcrumb to local logs
 * @param {string} message - Breadcrumb message
 * @param {Object} options - Breadcrumb options
 */
export const addBreadcrumb = (message, options = {}) => {
  const { category = 'app', level = 'info', data = {} } = options;
  
  const breadcrumb = {
    timestamp: new Date().toISOString(),
    message,
    type: 'breadcrumb',
    context: { category, level, data } // Store category and level in context to match test expectations
  };
  
  // Store in local logs
  storeLog(breadcrumb);
  
  // Also log to console in development
  if (__DEV__) {
    // console statements removed for production cleanliness
// [Removed undefined 'log' function call for ESLint compliance]
// Use an appropriate logger if needed, e.g., logger.info(`[${category}] ${message}`, data);
  }
};

/**
 * Handle API errors and format them consistently
 * @param {Error|Object} error - The error object
 * @returns {Object} Formatted error
 */
export const handleApiError = (error) => {
  let formattedError = {
    message: 'An unexpected error occurred',
    code: 'unknown_error',
    status: 500,
  };
  
  if (error) {
    // Handle network errors
    if (error.message && error.message.includes('Network request failed')) {
      formattedError = {
        message: 'Network connection failed. Please check your internet connection.',
        code: 'network_error',
        status: 0,
      };
    }
    // Handle API response errors
    else if (error.status) {
      formattedError = {
        message: error.message || `Error ${error.status}`,
        code: error.code || 'api_error',
        status: error.status,
      };
    }
    // Handle other errors
    else if (error.message) {
      formattedError.message = error.message;
      if (error.code) formattedError.code = error.code;
    }
  }
  
  // Log the error locally
  logError(error || new Error(formattedError.message), { 
    apiError: true, 
    ...formattedError 
  });
  
  return formattedError;
};

/**
 * Log an API error with standardized format
 * @param {Error} error - The error object
 * @param {string} endpoint - API endpoint
 * @param {Object} params - API parameters
 */
export const logApiError = (error, endpoint, params = {}) => {
  const context = {
    endpoint,
    params: JSON.stringify(params),
  };
  
  logError(error, context);
};

/**
 * Store a log entry in the local logs array
 * @param {Object} logEntry - The log entry to store
 * @private
 */
const storeLog = (logEntry) => {
  // Add to the beginning for most recent first
  errorLogs.unshift(logEntry);
  
  // Trim if exceeds max size
  if (errorLogs.length > MAX_ERROR_LOGS) {
    errorLogs.pop();
  }
};

/**
 * Get all stored error logs
 * @returns {Array} Array of error logs
 */
export const getErrorLogs = () => {
  return [...errorLogs];
};

/**
 * Clear all stored error logs
 */
export const clearErrorLogs = () => {
  errorLogs.length = 0;
};

/**
 * Create a standardized error object
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @param {Object} details - Additional error details
 * @returns {Error} Standardized error object
 */
export const createError = (message, code = 'UNKNOWN_ERROR', details = {}) => {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
};
