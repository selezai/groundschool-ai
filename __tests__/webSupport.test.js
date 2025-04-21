import React from 'react';
import { Platform } from 'react-native';
import { render, fireEvent as _fireEvent, waitFor } from '@testing-library/react-native';

// Mock logger services
jest.mock('../src/services/loggerService', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  critical: jest.fn()
}));

// Mock window object before importing modules that use it
const mockWindow = {
  location: {
    hostname: 'localhost',
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000'
  },
  addEventListener: jest.fn(),
  navigator: {
    serviceWorker: {
      ready: Promise.resolve({
        active: { state: 'activated' }
      }),
      register: jest.fn().mockResolvedValue({}),
      getRegistrations: jest.fn().mockResolvedValue([])
    }
  },
  matchMedia: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
  indexedDB: {
    open: jest.fn().mockReturnValue({
      onupgradeneeded: null,
      onsuccess: null,
      onerror: null
    })
  }
};

global.window = mockWindow;

// Now import the modules that use window
import { initializeWebFeatures, promptInstall, isRunningAsPWA } from '../src/web';
import OfflineNotification from '../src/web/OfflineNotification';
import { 
  ResponsiveContainer, 
  ResponsiveGrid, 
  ResponsiveSidebarLayout, 
  useResponsive as _useResponsive 
} from '../src/web/ResponsiveLayout';
import indexedDBService from '../src/web/indexedDBService';
import fileHandlingService from '../src/web/fileHandlingService';
import NetInfo from '@react-native-community/netinfo';

// Mock Platform
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Platform: {
      ...RN.Platform,
      OS: 'web',
    },
  };
});

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(),
}));

// Mock IndexedDB
jest.mock('../src/web/indexedDBService', () => ({
  initDB: jest.fn(() => Promise.resolve()),
  processOfflineQueue: jest.fn(() => Promise.resolve(true)),
}));

// Mock file handling service
jest.mock('../src/web/fileHandlingService', () => ({
  initializeFileSystem: jest.fn(() => Promise.resolve(true)),
}));

// Mock logger
jest.mock('../src/services/loggerService', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

// Mock Sentry
jest.mock('../src/services/sentryService', () => ({
  captureException: jest.fn(),
}));

// Mock useTheme
jest.mock('../src/contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#FFFFFF',
      card: '#F9FAFB',
      border: '#E5E7EB',
      error: '#EF4444',
    },
  }),
}));

// Mock safe area context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 20, left: 0, right: 0 }),
}));

describe('Web Support', () => {
  // Save original window properties
  let originalAddEventListener;
  let originalServiceWorker;
  let originalDeferredPrompt;
  let originalMatchMedia;

  beforeEach(() => {
    // Mock window properties for web tests
    if (typeof window !== 'undefined') {
      originalAddEventListener = window.addEventListener;
      originalServiceWorker = window.navigator.serviceWorker;
      originalDeferredPrompt = window.deferredPrompt;
      originalMatchMedia = window.matchMedia;

      window.addEventListener = jest.fn();
      window.navigator.serviceWorker = {
        ready: Promise.resolve({
          sync: {
            register: jest.fn(() => Promise.resolve()),
          },
          pushManager: {},
        }),
      };
      window.deferredPrompt = {
        prompt: jest.fn(),
        userChoice: Promise.resolve({ outcome: 'accepted' }),
      };
      window.matchMedia = jest.fn(() => ({ matches: false }));
    }

    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore window properties
    if (typeof window !== 'undefined') {
      window.addEventListener = originalAddEventListener;
      window.navigator.serviceWorker = originalServiceWorker;
      window.deferredPrompt = originalDeferredPrompt;
      window.matchMedia = originalMatchMedia;
    }
  });

  describe('initializeWebFeatures', () => {
    it('initializes web features when on web platform', async () => {
      indexedDBService.initDB.mockResolvedValueOnce(true);
      fileHandlingService.initializeFileSystem.mockResolvedValueOnce(true);
      
      // Mock Platform.OS to be 'web' for this test
      Platform.OS = 'web';
      
      const result = await initializeWebFeatures();
      
      expect(result).toBe(false);
      expect(indexedDBService.initDB).toHaveBeenCalled();
      expect(fileHandlingService.initializeFileSystem).toHaveBeenCalled();
    });
    
    it('handles errors during initialization', async () => {
      // Mock an error during initialization
      indexedDBService.initDB.mockRejectedValueOnce(new Error('DB init failed'));
      
      const result = await initializeWebFeatures();
      expect(result).toBe(false);
    });
  });

  describe('promptInstall', () => {
    it('prompts user to install the PWA when deferredPrompt is available', async () => {
      // Skip this test if window is not defined (in Node.js environment)
      if (typeof window === 'undefined') {
        return;
      }
      
      // Set up mock deferredPrompt
      const mockPrompt = jest.fn();
      window.deferredPrompt = {
        prompt: mockPrompt,
        userChoice: Promise.resolve({ outcome: 'accepted' })
      };
      
      const result = await promptInstall();
      
      expect(result).toBe(true);
      expect(mockPrompt).toHaveBeenCalled();
    });
    
    it('returns false when deferredPrompt is not available', async () => {
      window.deferredPrompt = null;
      
      const result = await promptInstall();
      
      expect(result).toBe(false);
    });
  });

  describe('isRunningAsPWA', () => {
    it('returns true when running in standalone mode', () => {
      if (typeof window !== 'undefined') {
        window.matchMedia = jest.fn(() => ({ matches: true }));
      }
      
      const result = isRunningAsPWA();
      
      expect(result).toBe(true);
    });
    
    it('returns false when not running in standalone mode', () => {
      if (typeof window !== 'undefined') {
        window.matchMedia = jest.fn(() => ({ matches: false }));
      }
      
      const result = isRunningAsPWA();
      
      expect(result).toBe(false);
    });
  });

  describe('OfflineNotification', () => {
    it('is hidden when online', async () => {
      // Mock NetInfo to return connected
      NetInfo.addEventListener.mockImplementation((callback) => {
        callback({ isConnected: true });
        return jest.fn();
      });
      
      // Render component
      const { queryByText } = render(<OfflineNotification />);
      
      // Check that notification is not shown, wait for potential state changes
      await waitFor(() => expect(queryByText(/You are currently offline/)).toBeNull());
    });
    
    it('is shown when offline', async () => {
      // Mock NetInfo to return disconnected
      NetInfo.addEventListener.mockImplementation((callback) => {
        callback({ isConnected: false });
        return jest.fn();
      });
      
      // Render component
      const { getByText } = render(<OfflineNotification />);
      
      // Check that notification is shown, wait for potential state changes
      await waitFor(() => expect(getByText(/You are currently offline/)).toBeDefined());
    });
  });

  describe('ResponsiveLayout', () => {
    it('ResponsiveContainer renders with correct styles', () => {
      const { getByTestId } = render(
        <ResponsiveContainer data-testid="container">
          <div>Test content</div>
        </ResponsiveContainer>
      );
      
      const container = getByTestId('container');
      expect(container).toBeTruthy();
    });
    
    it('ResponsiveGrid renders items in a grid layout', () => {
      const { getAllByTestId } = render(
        <ResponsiveGrid 
          columns={{ small: 1, medium: 2, large: 3 }}
          spacing={8}
        >
          <div data-testid="item">Item 1</div>
          <div data-testid="item">Item 2</div>
          <div data-testid="item">Item 3</div>
        </ResponsiveGrid>
      );
      
      const items = getAllByTestId('item');
      expect(items.length).toBe(3);
    });
    
    it('ResponsiveSidebarLayout renders sidebar and content', () => {
      const { getByTestId } = render(
        <ResponsiveSidebarLayout
          sidebar={<div data-testid="sidebar">Sidebar</div>}
          content={<div data-testid="content">Content</div>}
        />
      );
      
      expect(getByTestId('sidebar')).toBeTruthy();
      expect(getByTestId('content')).toBeTruthy();
    });
  });
});
