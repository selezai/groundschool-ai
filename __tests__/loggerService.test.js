import { debug, info, warn, error, critical, setLogLevel, LOG_LEVELS } from '../src/services/loggerService';
import * as Sentry from 'sentry-expo';

// Mock Sentry
jest.mock('sentry-expo', () => ({
  Native: {
    captureMessage: jest.fn(),
    addBreadcrumb: jest.fn(),
  },
}));

// Mock console methods
const originalConsole = { ...console };
beforeEach(() => {
  console.debug = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterEach(() => {
  // Restore console methods
  console.debug = originalConsole.debug;
  console.info = originalConsole.info;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

describe('loggerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('debug', () => {
    it('logs debug messages to console', () => {
      debug('Debug message', { source: 'test' });
      
      expect(console.debug).toHaveBeenCalledWith('[DEBUG]', 'Debug message', { source: 'test' });
    });
    
    it('does not log to Sentry by default', () => {
      debug('Debug message');
      
      expect(Sentry.Native.captureMessage).not.toHaveBeenCalled();
      expect(Sentry.Native.addBreadcrumb).not.toHaveBeenCalled();
    });
  });

  describe('info', () => {
    it('logs info messages to console', () => {
      info('Info message', { action: 'test' });
      
      expect(console.info).toHaveBeenCalledWith('[INFO]', 'Info message', { action: 'test' });
    });
    
    it('adds a breadcrumb to Sentry', () => {
      info('Info message', { action: 'test' });
      
      expect(Sentry.Native.addBreadcrumb).toHaveBeenCalledWith({
        message: 'Info message',
        data: { action: 'test' },
        level: 'info',
        category: 'app',
      });
    });
  });

  describe('warn', () => {
    it('logs warning messages to console', () => {
      warn('Warning message', { issue: 'test' });
      
      expect(console.warn).toHaveBeenCalledWith('[WARN]', 'Warning message', { issue: 'test' });
    });
    
    it('captures the message in Sentry', () => {
      warn('Warning message', { issue: 'test' });
      
      expect(Sentry.Native.captureMessage).toHaveBeenCalledWith('Warning message', {
        level: 'warning',
        tags: { issue: 'test' },
      });
    });
  });

  describe('error', () => {
    it('logs error messages to console', () => {
      error('Error message', { error: 'test' });
      
      expect(console.error).toHaveBeenCalledWith('[ERROR]', 'Error message', { error: 'test' });
    });
    
    it('captures the message in Sentry with error level', () => {
      error('Error message', { error: 'test' });
      
      expect(Sentry.Native.captureMessage).toHaveBeenCalledWith('Error message', {
        level: 'error',
        tags: { error: 'test' },
      });
    });
  });

  describe('critical', () => {
    it('logs critical messages to console', () => {
      critical('Critical message', { fatal: true });
      
      expect(console.error).toHaveBeenCalledWith('[CRITICAL]', 'Critical message', { fatal: true });
    });
    
    it('captures the message in Sentry with fatal level', () => {
      critical('Critical message', { fatal: true });
      
      expect(Sentry.Native.captureMessage).toHaveBeenCalledWith('Critical message', {
        level: 'fatal',
        tags: { fatal: true },
      });
    });
  });

  describe('setLogLevel', () => {
    it('changes the minimum log level', () => {
      // Set log level to warn (higher than info)
      setLogLevel('warning');
      
      // Info logs should be suppressed
      info('This should be suppressed');
      expect(console.info).not.toHaveBeenCalled();
      
      // Warning logs should still appear
      warn('This should appear');
      warn('This should appear');
      expect(console.warn).toHaveBeenCalled();
      
      // Reset log level
      setLogLevel('debug');
    });
  });
});
