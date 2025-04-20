// Mock Platform before importing modules
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    Version: 14,
  },
}));

// Mock Sentry
jest.mock('sentry-expo', () => ({
  init: jest.fn(),
  Native: {
    captureException: jest.fn(),
    captureMessage: jest.fn(),
    setUser: jest.fn(),
    clearUser: jest.fn(),
    addBreadcrumb: jest.fn(),
    startTransaction: jest.fn(() => ({
      finish: jest.fn(),
      setData: jest.fn(),
    })),
    setTag: jest.fn(),
  },
}));

// Mock expo-constants
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      version: '1.0.0'
    }
  }
}));

// Now import the modules
import * as Sentry from 'sentry-expo';
import { Platform } from 'react-native';
import { 
  initSentry, 
  logError, 
  logMessage, 
  setUser, 
  addBreadcrumb,
  startTransaction,
  setTag
} from '../src/services/sentryService';

// Mocks are defined at the top of the file

describe('sentryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initSentry', () => {
    it('initializes Sentry with correct configuration', () => {
      initSentry();
      
      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: expect.any(String),
          enableInExpoDevelopment: false,
          debug: false,
        })
      );
    });
  });

  describe('logError', () => {
    it('logs errors to Sentry with context', () => {
      const error = new Error('Test error');
      const context = { userId: '123' };
      
      logError(error, context);
      
      expect(Sentry.Native.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          extra: context,
        })
      );
    });
  });

  describe('logMessage', () => {
    it('logs messages to Sentry with context', () => {
      const message = 'Test message';
      const context = { source: 'test' };
      
      logMessage(message, context, 'warning');
      
      expect(Sentry.Native.captureMessage).toHaveBeenCalledWith(
        message,
        {
          level: 'warning',
          extra: context
        }
      );
    });
    
    it('uses info level by default', () => {
      logMessage('Test message');
      
      expect(Sentry.Native.captureMessage).toHaveBeenCalledWith(
        'Test message',
        {
          level: 'info',
          extra: {}
        }
      );
    });
  });

  describe('setUser', () => {
    it('sets user information in Sentry', () => {
      const user = { id: '123', email: 'test@example.com', username: 'testuser' };
      
      setUser(user);
      
      expect(Sentry.Native.setUser).toHaveBeenCalledWith(user);
    });
    
    it('handles minimal user information', () => {
      setUser({ id: '123' });
      
      expect(Sentry.Native.setUser).toHaveBeenCalledWith({ id: '123' });
    });
  });

  describe('addBreadcrumb', () => {
    it('adds breadcrumbs with category and level', () => {
      addBreadcrumb('Test breadcrumb', 'navigation', 'info', { screen: 'Home' });
      
      expect(Sentry.Native.addBreadcrumb).toHaveBeenCalledWith({
        message: 'Test breadcrumb',
        category: 'navigation',
        level: 'info',
        data: { screen: 'Home' },
      });
    });
    
    it('uses default values when not provided', () => {
      addBreadcrumb('Test breadcrumb');
      
      expect(Sentry.Native.addBreadcrumb).toHaveBeenCalledWith({
        message: 'Test breadcrumb',
        category: 'app',
        level: 'info',
        data: {},
      });
    });
  });

  describe('startTransaction', () => {
    it('starts a transaction with name and operation', () => {
      const transaction = startTransaction('Test Transaction', 'test-op');
      
      expect(Sentry.Native.startTransaction).toHaveBeenCalledWith(
        'Test Transaction',
        'test-op'
      );
      
      expect(transaction).toHaveProperty('finish');
      expect(transaction).toHaveProperty('setData');
    });
    
    it('uses default operation when not provided', () => {
      startTransaction('Test Transaction');
      
      expect(Sentry.Native.startTransaction).toHaveBeenCalledWith(
        'Test Transaction',
        'navigation'
      );
    });
  });

  describe('setTag', () => {
    it('sets a tag in Sentry', () => {
      setTag('key', 'value');
      
      expect(Sentry.Native.setTag).toHaveBeenCalledWith('key', 'value');
    });
  });
});
