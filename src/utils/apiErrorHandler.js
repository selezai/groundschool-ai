import { logApiError } from '../services/errorHandlingService';
import * as logger from '../services/loggerService';
import NetInfo from '@react-native-community/netinfo';

/**
 * Standard error codes for API errors
 */
export const API_ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};

/**
 * Map HTTP status codes to error codes
 * @param {number} status - HTTP status code
 * @returns {string} Error code
 */
export const mapStatusToErrorCode = (status) => {
  if (!status) return API_ERROR_CODES.UNKNOWN_ERROR;
  
  if (status === 401 || status === 403) return API_ERROR_CODES.AUTH_ERROR;
  if (status === 404) return API_ERROR_CODES.NOT_FOUND;
  if (status === 422) return API_ERROR_CODES.VALIDATION_ERROR;
  if (status === 429) return API_ERROR_CODES.RATE_LIMIT_ERROR;
  if (status >= 500) return API_ERROR_CODES.SERVER_ERROR;
  
  return API_ERROR_CODES.UNKNOWN_ERROR;
};

/**
 * Format an error response
 * @param {Error} error - Error object
 * @param {string} endpoint - API endpoint
 * @param {Object} params - API parameters
 * @returns {Object} Formatted error
 */
export const formatErrorResponse = (error, endpoint, params = {}) => {
  // Log the error
  logApiError(error, endpoint, params);
  
  // Check if it's a network error
  if (error.message && (
    error.message.includes('Network request failed') ||
    error.message.includes('network error') ||
    error.message.includes('Failed to fetch')
  )) {
    logger.warn('Network error detected', { endpoint });
    return {
      code: API_ERROR_CODES.NETWORK_ERROR,
      message: 'Unable to connect to the server. Please check your internet connection.',
      originalError: error,
    };
  }
  
  // Check if it's a timeout error
  if (error.message && error.message.includes('timeout')) {
    logger.warn('Timeout error detected', { endpoint });
    return {
      code: API_ERROR_CODES.TIMEOUT_ERROR,
      message: 'The request timed out. Please try again.',
      originalError: error,
    };
  }
  
  // Handle Supabase errors
  if (error.code && error.message) {
    logger.warn('Supabase error detected', { endpoint, code: error.code });
    return {
      code: error.code,
      message: error.message,
      originalError: error,
    };
  }
  
  // Handle HTTP errors
  if (error.status) {
    const code = mapStatusToErrorCode(error.status);
    logger.warn('HTTP error detected', { endpoint, status: error.status, code });
    
    let message = 'An unexpected error occurred.';
    
    if (code === API_ERROR_CODES.AUTH_ERROR) {
      message = 'Authentication error. Please log in again.';
    } else if (code === API_ERROR_CODES.NOT_FOUND) {
      message = 'The requested resource was not found.';
    } else if (code === API_ERROR_CODES.VALIDATION_ERROR) {
      message = 'The request data is invalid.';
    } else if (code === API_ERROR_CODES.RATE_LIMIT_ERROR) {
      message = 'Too many requests. Please try again later.';
    } else if (code === API_ERROR_CODES.SERVER_ERROR) {
      message = 'Server error. Please try again later.';
    }
    
    return {
      code,
      message,
      status: error.status,
      originalError: error,
    };
  }
  
  // Default error
  logger.warn('Unknown error detected', { endpoint, error: error.message });
  return {
    code: API_ERROR_CODES.UNKNOWN_ERROR,
    message: error.message || 'An unexpected error occurred.',
    originalError: error,
  };
};

/**
 * Check if the device is online
 * @returns {Promise<boolean>} Whether the device is online
 */
export const isOnline = async () => {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected && state.isInternetReachable !== false;
  } catch (error) {
    logger.error('Error checking network status', { error });
    return false;
  }
};

/**
 * Wrap an API call with error handling
 * @param {Function} apiCall - API call function
 * @param {string} endpoint - API endpoint
 * @param {Object} params - API parameters
 * @param {Object} options - Options
 * @returns {Promise<Object>} API response
 */
export const withApiErrorHandling = async (apiCall, endpoint, params = {}, options = {}) => {
  // Check if online first
  const online = await isOnline();
  if (!online) {
    logger.warn('Network connection unavailable', { endpoint });
    throw new Error('Network connection unavailable');
  }
  
  // Add timeout if specified
  if (options.timeout) {
    return await withTimeout(apiCall(params), options.timeout);
  }
  
  // Execute the API call
  try {
    const response = await apiCall(params);
    
    // Log success
    logger.info('API call successful', { endpoint });
    
    return response;
  } catch (error) {
    // Format the error response
    if (error.status) {
      throw {
        message: error.message,
        status: error.status,
        code: 'api_error',
      };
    }
    throw error;
  }
};

/**
 * Create a promise that rejects after a timeout
 * @param {number} ms - Timeout in milliseconds
 * @returns {Promise} Promise that rejects after timeout
 */
const createTimeoutPromise = (ms) => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Request timed out after ${ms}ms`));
    }, ms);
  });
};

/**
 * Wrap a promise with a timeout
 * @param {Promise} promise - Promise to wrap
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise} Promise with timeout
 */
export const withTimeout = async (promise, timeoutMs) => {
  if (!timeoutMs) return promise;
  
  try {
    return await Promise.race([
      promise,
      createTimeoutPromise(timeoutMs),
    ]);
  } catch (error) {
    if (error.message && error.message.includes('timed out')) {
      throw {
        message: 'Request timed out',
        status: 408,
        code: 'timeout_error',
      };
    }
    throw error;
  }
};

/**
 * Create an API client with error handling
 * @param {Object} baseClient - Base API client
 * @returns {Object} Enhanced API client
 */
export const createApiClient = (baseClient) => {
  const enhancedClient = {};
  
  // Wrap each method with error handling
  Object.keys(baseClient).forEach(method => {
    if (typeof baseClient[method] === 'function') {
      enhancedClient[method] = async (...args) => {
        const endpoint = `${method}`;
        return withApiErrorHandling(
          () => baseClient[method](...args),
          endpoint,
          args[0] || {},
          { checkOnline: true }
        );
      };
    } else {
      enhancedClient[method] = baseClient[method];
    }
  });
  
  return enhancedClient;
};
