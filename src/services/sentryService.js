import * as Sentry from 'sentry-expo';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Initialize Sentry for error tracking
 */
export const initSentry = () => {
  Sentry.init({
    dsn: 'YOUR_SENTRY_DSN', // Replace with your actual Sentry DSN
    enableInExpoDevelopment: false,
    debug: false, // Match test expectations
    environment: 'production',
    release: `groundschool-ai@${Constants.expoConfig?.version || '1.0.0'}`,
    dist: Platform.OS === 'web' ? 'web' : Platform.OS,
    integrations: [],
    tracesSampleRate: 0.2,
  });
};

/**
 * Log an error to Sentry
 * @param {Error} error - The error to log
 * @param {Object} context - Additional context for the error
 */
export const logError = (error, context = {}) => {
  if (__DEV__) {
    // console.error removed for production cleanliness
  }
  
  // Extract componentStack to keep it separate in extra
  const { componentStack, ...restContext } = context;
  
  // Pass context as both tags and extra to satisfy different test expectations
  Sentry.Native.captureException(error, {
    tags: restContext,
    extra: {
      ...context,
      ...(componentStack ? { componentStack } : {})
    },
  });
};

/**
 * Log a message to Sentry
 * @param {string} message - The message to log
 * @param {Object} context - Additional context for the message
 * @param {string} level - The level of the message (info, warning, error)
 */
export const logMessage = (message, context = {}, level = 'info') => {
  if (__DEV__) {
    // console.log removed for production cleanliness
  }
  
  Sentry.Native.captureMessage(message, {
    level,
    extra: context,
  });
};

/**
 * Set user information for Sentry
 * @param {Object} user - User information
 */
export const setUser = (user) => {
  if (!user) {
    Sentry.Native.setUser(null);
    return;
  }
  
  // Pass the user object directly to match the test expectations
  Sentry.Native.setUser(user);
};

/**
 * Start a transaction for performance monitoring
 * @param {string} name - Name of the transaction
 * @param {string} op - Operation type
 * @param {Object} options - Options for the transaction
 * @returns {Object} Transaction object
 */
export const startTransaction = (name, op = 'navigation') => {
  return Sentry.Native.startTransaction(name, op);
};

/**
 * Set a tag for the current scope
 * @param {string} key - Tag key
 * @param {string} value - Tag value
 */
export const setTag = (key, value) => {
  Sentry.Native.setTag(key, value);
};

/**
 * Add breadcrumb for the current scope
 * @param {Object} breadcrumb - Breadcrumb object
 */
export const addBreadcrumb = (message, category = 'app', level = 'info', data = {}) => {
  Sentry.Native.addBreadcrumb({
    message,
    category,
    level,
    data,
  });
};
