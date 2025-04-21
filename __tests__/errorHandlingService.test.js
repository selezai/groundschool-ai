import * as service from '../src/services/errorHandlingService';
import { ErrorUtils as _ErrorUtils } from 'react-native';

// Mock console methods to verify logging
const originalConsole = { ...console };
beforeAll(() => {
  // These are intentional mocks for testing, so we disable the ESLint warning
  console.error = jest.fn(); // eslint-disable-line no-console
  console.log = jest.fn(); // eslint-disable-line no-console
});

afterAll(() => {
  // Restore original console methods after tests
  console.error = originalConsole.error; // eslint-disable-line no-console
  console.log = originalConsole.log; // eslint-disable-line no-console
});

// Create mock functions for ErrorUtils
const mockOriginalHandler = jest.fn();
const mockGetGlobalHandler = jest.fn().mockReturnValue(mockOriginalHandler);
const mockSetGlobalHandler = jest.fn();

// Mock ErrorUtils
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    ErrorUtils: {
      getGlobalHandler: mockGetGlobalHandler,
      setGlobalHandler: mockSetGlobalHandler,
    },
    Platform: {
      ...RN.Platform,
      OS: 'ios',
    },
  };
});

describe('errorHandlingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    service.clearErrorLogs(); // Clear logs before each test
  });

  describe('setupGlobalErrorHandlers', () => {
    beforeEach(() => {
      // Reset mocks for each test
      mockGetGlobalHandler.mockReturnValue(mockOriginalHandler);
      mockSetGlobalHandler.mockClear();
      mockOriginalHandler.mockClear();
    });
    
    it.skip('sets up global error handlers', () => {
      service.setupGlobalErrorHandlers();
      
      expect(mockSetGlobalHandler).toHaveBeenCalled();
    });
    
    it.skip('calls the original error handler', () => {
      service.setupGlobalErrorHandlers();
      
      // Get the new handler that was set
      const newHandler = mockSetGlobalHandler.mock.calls[0][0];
      
      // Simulate an error
      const testError = new Error('Test error');
      newHandler(testError, true);
      
      // Original handler should be called
      expect(mockOriginalHandler).toHaveBeenCalledWith(testError, true);
      
      // Error should be logged locally
      const logs = service.getErrorLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].message).toBe('Test error');
      expect(logs[0].context).toEqual({ isFatal: true });
    });
  });

  describe('logError', () => {
    it('logs errors with context', () => {
      const error = new Error('Test error');
      const context = { userId: '123', action: 'test' };
      
      service.logError(error, context);
      
      const logs = service.getErrorLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].message).toBe('Test error');
      expect(logs[0].context).toEqual(context);
      expect(logs[0].type).toBe('exception');
    });
    
    it('logs error strings as messages', () => {
      service.logError('String error', { source: 'test' });
      
      const logs = service.getErrorLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].message).toBe('String error');
      expect(logs[0].context).toEqual({ source: 'test' });
      expect(logs[0].type).toBe('message');
    });
  });

  describe('handleApiError', () => {
    it('formats API errors with status codes', () => {
      const apiError = {
        status: 404,
        message: 'Not found',
      };
      
      const result = service.handleApiError(apiError);
      
      expect(result).toEqual({
        message: 'Not found',
        code: 'api_error',
        status: 404,
      });
      
      // Should log locally
      const logs = service.getErrorLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].context.apiError).toBe(true);
    });
    
    it('handles network errors', () => {
      const networkError = new Error('Network request failed');
      
      const result = service.handleApiError(networkError);
      
      expect(result).toEqual({
        message: 'Network connection failed. Please check your internet connection.',
        code: 'network_error',
        status: 0,
      });
      
      // Should log locally
      const logs = service.getErrorLogs();
      expect(logs.length).toBe(1);
    });
    
    it('handles unknown errors', () => {
      const result = service.handleApiError();
      
      expect(result).toEqual({
        message: 'An unexpected error occurred',
        code: 'unknown_error',
        status: 500,
      });
      
      // Should log locally
      const logs = service.getErrorLogs();
      expect(logs.length).toBe(1);
    });
  });

  describe('logMessage', () => {
    it('logs messages with context', () => {
      const message = 'Test message';
      const context = { userId: '123' };
      
      service.logMessage(message, context);
      
      const logs = service.getErrorLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].message).toBe(message);
      expect(logs[0].context).toEqual(context);
      expect(logs[0].level).toBe('info');
    });
    
    it('uses info level by default', () => {
      service.logMessage('Default level');
      
      const logs = service.getErrorLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].message).toBe('Default level');
      expect(logs[0].level).toBe('info');
    });
  });

  describe('addBreadcrumb', () => {
    it('adds a breadcrumb to local logs', () => {
      service.addBreadcrumb('Test breadcrumb', { category: 'test', level: 'info' });
      
      const logs = service.getErrorLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].message).toBe('Test breadcrumb');
      expect(logs[0].context).toEqual({ category: 'test', level: 'info', data: {} });
    });
    
    it('uses default values for missing options', () => {
      service.addBreadcrumb('Test breadcrumb');
      
      const logs = service.getErrorLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].message).toBe('Test breadcrumb');
      expect(logs[0].context).toEqual({ category: 'app', level: 'info', data: {} });
    });
  });

  describe('getErrorLogs and clearErrorLogs', () => {
    it('retrieves all error logs', () => {
      service.logError('Error 1');
      service.logError('Error 2');
      service.logMessage('Message 1');
      
      const logs = service.getErrorLogs();
      expect(logs.length).toBe(3);
      expect(logs[0].message).toBe('Message 1'); // Most recent first
      expect(logs[1].message).toBe('Error 2');
      expect(logs[2].message).toBe('Error 1');
    });
    
    it('clears all error logs', () => {
      service.logError('Test error');
      service.logMessage('Test message');
      
      expect(service.getErrorLogs().length).toBe(2);
      
      service.clearErrorLogs();
      
      expect(service.getErrorLogs().length).toBe(0);
    });
    
    it('limits the number of stored logs', () => {
      // Store more than MAX_ERROR_LOGS entries
      for (let i = 0; i < 101; i++) {
        service.logError(`Error ${i}`);
      }
      
      const logs = service.getErrorLogs();
      expect(logs.length).toBe(100); // Should be limited to MAX_ERROR_LOGS
      expect(logs[0].message).toBe('Error 100'); // Most recent should be first
    });
  });
});
