// Test utilities for GroundSchool AI

import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from '../src/contexts/AuthContext';
import { ThemeProvider } from '../src/contexts/ThemeContext';

// Mock navigation state
const navigationState = {
  index: 0,
  routes: [
    { name: 'Home', key: 'Home-1' },
  ],
};

// Render with providers
export function renderWithProviders(ui, options = {}) {
  const Wrapper = ({ children }) => (
    <ThemeProvider>
      <AuthProvider>
        <NavigationContainer initialState={navigationState}>
          {children}
        </NavigationContainer>
      </AuthProvider>
    </ThemeProvider>
  );

  return render(ui, { wrapper: Wrapper, ...options });
}

// Wait for promises to resolve
export const flushPromises = () => new Promise(resolve => setImmediate(resolve));

// Create a mock for the Supabase client
export const createSupabaseMock = () => ({
  auth: {
    signUp: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    session: null,
    onAuthStateChange: jest.fn(() => ({ data: {}, error: null })),
    user: null,
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
        data: [],
        error: null,
      })),
      order: jest.fn(() => ({
        data: [],
        error: null,
      })),
      data: [],
      error: null,
    })),
    insert: jest.fn(() => ({
      select: jest.fn(),
      data: [{ id: '123' }],
      error: null,
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        data: [{ id: '123' }],
        error: null,
      })),
      data: [{ id: '123' }],
      error: null,
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(() => ({
        data: null,
        error: null,
      })),
      data: null,
      error: null,
    })),
  })),
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(),
      download: jest.fn(),
      getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://example.com/file.pdf' } })),
    })),
  },
});

// Create a mock for the DeepSeek API client
export const createDeepSeekMock = () => ({
  generateQuestions: jest.fn(() => Promise.resolve({
    questions: [
      {
        id: '1',
        question: 'Test question?',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 'A',
        explanation: 'Test explanation',
      },
    ],
  })),
  summarizeText: jest.fn(() => Promise.resolve('Test summary')),
});

// Create a mock for the Sentry client
export const createSentryMock = () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  setUser: jest.fn(),
  setTag: jest.fn(),
  setExtra: jest.fn(),
  addBreadcrumb: jest.fn(),
});

// Mock AsyncStorage
export const createAsyncStorageMock = () => {
  const store = {};
  return {
    getItem: jest.fn((key) => Promise.resolve(store[key])),
    setItem: jest.fn((key, value) => {
      store[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach((key) => {
        delete store[key];
      });
      return Promise.resolve();
    }),
    getAllKeys: jest.fn(() => Promise.resolve(Object.keys(store))),
    multiGet: jest.fn((keys) => Promise.resolve(keys.map((key) => [key, store[key]]))),
    multiSet: jest.fn((keyValuePairs) => {
      keyValuePairs.forEach(([key, value]) => {
        store[key] = value;
      });
      return Promise.resolve();
    }),
    multiRemove: jest.fn((keys) => {
      keys.forEach((key) => {
        delete store[key];
      });
      return Promise.resolve();
    }),
    _store: store,
  };
};

// Mock fetch response
export const mockFetchResponse = (data, options = {}) => {
  const response = {
    ok: options.ok !== undefined ? options.ok : true,
    status: options.status || 200,
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
    blob: jest.fn().mockResolvedValue(new Blob()),
    headers: {
      get: jest.fn((header) => options.headers && options.headers[header]),
    },
  };
  
  global.fetch = jest.fn().mockResolvedValue(response);
  return { response, fetch: global.fetch };
};

// Mock timer
export const mockTimer = () => {
  jest.useFakeTimers();
  return {
    advanceTimersByTime: jest.advanceTimersByTime,
    runAllTimers: jest.runAllTimers,
    clearAllTimers: jest.clearAllTimers,
    useRealTimers: jest.useRealTimers,
  };
};
