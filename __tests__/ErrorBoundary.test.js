import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import ErrorBoundary from '../src/components/ErrorBoundary';
import * as Sentry from 'sentry-expo';

// Mock theme
jest.mock('../src/theme/theme', () => ({
  useTheme: () => ({
    primary: '#4F46E5',
    secondary: '#FFFFFF',
    background: '#F9FAFB',
    text: '#1F2937',
    error: '#DC2626',
    success: '#16A34A',
    info: '#3B82F6',
    border: '#E5E7EB',
  }),
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  typography: {
    title: { fontSize: 24, fontWeight: 'bold' },
    subtitle: { fontSize: 18, fontWeight: '600' },
    body: { fontSize: 16 },
    label: { fontSize: 14 },
    button: { fontSize: 16, fontWeight: '600' },
  },
}));

// Mock Sentry
jest.mock('sentry-expo', () => ({
  Native: {
    captureException: jest.fn(),
  },
}));

// Component that throws an error
const ErrorComponent = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <Text>No error</Text>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error for expected errors
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when there is no error', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <Text>Test content</Text>
      </ErrorBoundary>
    );
    
    expect(getByText('Test content')).toBeTruthy();
  });

  it('renders fallback UI when an error occurs', () => {
    // We need to mock the console.error to avoid test failures due to React's error logging
    const { getByText, queryByText, rerender } = render(
      <ErrorBoundary errorContext={{ location: 'test' }}>
        <ErrorComponent shouldThrow={false} />
      </ErrorBoundary>
    );
    
    expect(getByText('No error')).toBeTruthy();
    
    // Trigger an error
    rerender(
      <ErrorBoundary errorContext={{ location: 'test' }}>
        <ErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    
    // Check that the fallback UI is rendered
    expect(queryByText('No error')).toBeNull();
    expect(getByText(/Something went wrong/)).toBeTruthy();
    expect(getByText(/Try Again/)).toBeTruthy();
    
    // Verify Sentry was called
    expect(Sentry.Native.captureException).toHaveBeenCalled();
  });

  it('allows retry after an error occurs', () => {
    const { getByText, queryByText, rerender } = render(
      <ErrorBoundary errorContext={{ location: 'test' }}>
        <ErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    
    // Check that the fallback UI is rendered
    expect(queryByText('No error')).toBeNull();
    expect(getByText(/Something went wrong/)).toBeTruthy();
    
    // Fix the error
    rerender(
      <ErrorBoundary errorContext={{ location: 'test' }}>
        <ErrorComponent shouldThrow={false} />
      </ErrorBoundary>
    );
    
    // Click retry
    fireEvent.press(getByText(/Try Again/));
    
    // Component should now render without error
    expect(getByText('No error')).toBeTruthy();
  });

  it('includes error context in the captured exception', () => {
    render(
      <ErrorBoundary errorContext={{ location: 'test', userId: '123' }}>
        <ErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    
    // Verify Sentry was called with the error and context
    expect(Sentry.Native.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: expect.objectContaining({
          location: 'test',
          userId: '123',
        }),
      })
    );
  });
});
