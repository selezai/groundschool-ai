import * as apiErrorHandler from '../src/utils/apiErrorHandler';
import NetInfo from '@react-native-community/netinfo';

// Mock error handling service
jest.mock('../src/services/errorHandlingService', () => ({
  logApiError: jest.fn(),
  createError: jest.fn((message, code, details) => ({
    message,
    code,
    ...details,
    toString: () => message
  }))
}));

// Mock logger service
jest.mock('../src/services/loggerService', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(),
}));

describe('apiErrorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset fetch mock
    global.fetch = jest.fn();
  });

  describe('isOnline', () => {
    it('returns true when network is connected', async () => {
      NetInfo.fetch.mockResolvedValue({ isConnected: true, isInternetReachable: true });
      
      const result = await apiErrorHandler.isOnline();
      
      expect(result).toBe(true);
      expect(NetInfo.fetch).toHaveBeenCalled();
    });
    
    it('returns false when network is not connected', async () => {
      NetInfo.fetch.mockResolvedValue({ isConnected: false });
      
      const result = await apiErrorHandler.isOnline();
      
      expect(result).toBe(false);
      expect(NetInfo.fetch).toHaveBeenCalled();
    });
    
    it('returns false when internet is not reachable', async () => {
      NetInfo.fetch.mockResolvedValue({ isConnected: true, isInternetReachable: false });
      
      const result = await apiErrorHandler.isOnline();
      
      expect(result).toBe(false);
      expect(NetInfo.fetch).toHaveBeenCalled();
    });
    
    it('returns false when NetInfo throws an error', async () => {
      NetInfo.fetch.mockRejectedValue(new Error('NetInfo error'));
      
      const result = await apiErrorHandler.isOnline();
      
      expect(result).toBe(false);
      expect(NetInfo.fetch).toHaveBeenCalled();
    });
  });

  describe('withApiErrorHandling', () => {
    it('successfully executes the API request when network is available', async () => {
      // Mock network status
      NetInfo.fetch.mockResolvedValue({ isConnected: true, isInternetReachable: true });
      
      // Mock API request function
      const mockApiRequest = jest.fn().mockResolvedValue({ data: 'success' });
      
      jest.spyOn(apiErrorHandler, 'isOnline').mockResolvedValue(true);
      
      const result = await apiErrorHandler.withApiErrorHandling(mockApiRequest);
      
      expect(result).toEqual({ data: 'success' });
      expect(mockApiRequest).toHaveBeenCalled();
    });
    
    it('throws a network error when network is not available', async () => {
      // Mock network status
      NetInfo.fetch.mockResolvedValue({ isConnected: false });
      
      // Mock API request function
      const mockApiRequest = jest.fn();
      
      jest.spyOn(apiErrorHandler, 'isOnline').mockResolvedValue(false);
      
      await expect(apiErrorHandler.withApiErrorHandling(mockApiRequest))
        .rejects.toThrow('Network connection unavailable');
      
      expect(mockApiRequest).not.toHaveBeenCalled();
    });
    
    it('handles API errors and formats them properly', async () => {
      // Mock network status
      NetInfo.fetch.mockResolvedValue({ isConnected: true, isInternetReachable: true });
      
      // Mock API request function that throws an error
      const apiError = { status: 404, message: 'Not found' };
      const mockApiRequest = jest.fn().mockRejectedValue(apiError);
      
      jest.spyOn(apiErrorHandler, 'isOnline').mockResolvedValue(true);
      
      try {
        await apiErrorHandler.withApiErrorHandling(mockApiRequest);
        // This line should not be reached if the test is working correctly
        expect('no error thrown').toBe('error should have been thrown');
      } catch (error) {
        expect(error).toEqual({
          message: 'Not found',
          status: 404,
          code: 'api_error',
        });
      }
      
      expect(mockApiRequest).toHaveBeenCalled();
    });
    
    it('handles unexpected errors during API requests', async () => {
      // Mock network status
      NetInfo.fetch.mockResolvedValue({ isConnected: true, isInternetReachable: true });
      
      // Mock API request function that throws an unexpected error
      const unexpectedError = new Error('Unexpected error');
      const mockApiRequest = jest.fn().mockImplementation(() => {
        throw unexpectedError;
      });
      
      jest.spyOn(apiErrorHandler, 'isOnline').mockResolvedValue(true);
      
      try {
        await apiErrorHandler.withApiErrorHandling(mockApiRequest);
        // This line should not be reached if the test is working correctly
        expect('no error thrown').toBe('error should have been thrown');
      } catch (error) {
        expect(error.message).toContain('Unexpected error');
      }
      
      expect(mockApiRequest).toHaveBeenCalled();
    });
  });

  describe('withTimeout', () => {
    it('resolves when the promise completes before timeout', async () => {
      jest.useFakeTimers();
      
      const mockPromise = new Promise(resolve => {
        setTimeout(() => resolve('success'), 100);
      });
      
      const promise = apiErrorHandler.withTimeout(mockPromise, 200);
      
      // Fast-forward time
      jest.advanceTimersByTime(100);
      
      await expect(promise).resolves.toBe('success');
      
      jest.useRealTimers();
    });
    
    it('rejects with timeout error when promise takes too long', async () => {
      jest.useFakeTimers();
      
      const mockPromise = new Promise(resolve => {
        setTimeout(() => resolve('success'), 300);
      });
      
      const promise = apiErrorHandler.withTimeout(mockPromise, 200);
      
      // Fast-forward time past the timeout
      jest.advanceTimersByTime(201);
      
      await expect(promise).rejects.toEqual({
        message: 'Request timed out',
        status: 408,
        code: 'timeout_error',
      });
      
      jest.useRealTimers();
    });
  });
});
