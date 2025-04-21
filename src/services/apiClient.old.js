/**
 * @deprecated This file is deprecated and will be removed in a future version.
 * Please use the new API client in src/services/apiClient.js instead.
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as logger from './loggerService';

// Base URL for API requests
const API_BASE_URL = 'https://api.groundschoolai.com/v1';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    } catch (error) {
      logger.error('API request interceptor error', { error: error.message });
      return config;
    }
  },
  (error) => {
    logger.error('API request error', { error: error.message });
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Handle token expiration
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Attempt to refresh token
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }
        
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });
        
        if (response.data.token) {
          // Save new tokens
          await AsyncStorage.setItem('auth_token', response.data.token);
          await AsyncStorage.setItem('refresh_token', response.data.refreshToken);
          
          // Update authorization header
          api.defaults.headers.common.Authorization = `Bearer ${response.data.token}`;
          originalRequest.headers.Authorization = `Bearer ${response.data.token}`;
          
          // Retry the original request
          return api(originalRequest);
        }
      } catch (refreshError) {
        logger.error('Token refresh error', { error: refreshError.message });
        
        // Clear auth data on refresh failure
        await AsyncStorage.removeItem('auth_token');
        await AsyncStorage.removeItem('refresh_token');
        
        // Redirect to login (handled by the app)
        return Promise.reject(new Error('Authentication expired. Please log in again.'));
      }
    }
    
    // Handle network errors
    if (!error.response) {
      logger.error('Network error', { error: error.message });
      return Promise.reject(new Error('Network error. Please check your connection.'));
    }
    
    // Handle API errors
    const errorResponse = {
      status: error.response.status,
      data: error.response.data,
      message: error.response.data?.message || error.message,
    };
    
    logger.error('API response error', errorResponse);
    return Promise.reject(error);
  }
);

/**
 * Make a GET request
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} - Response data
 */
export const get = async (endpoint, params = {}) => {
  const response = await api.get(endpoint, { params });
  return response.data;
};

/**
 * Make a POST request
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Request body
 * @returns {Promise<Object>} - Response data
 */
export const post = async (endpoint, data = {}) => {
  const response = await api.post(endpoint, data);
  return response.data;
};

/**
 * Make a PUT request
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Request body
 * @returns {Promise<Object>} - Response data
 */
export const put = async (endpoint, data = {}) => {
  const response = await api.put(endpoint, data);
  return response.data;
};

/**
 * Make a DELETE request
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} - Response data
 */
export const del = async (endpoint, params = {}) => {
  const response = await api.delete(endpoint, { params });
  return response.data;
};

export default {
  get,
  post,
  put,
  delete: del,
};
