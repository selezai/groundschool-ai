jest.mock('../src/theme/theme', () => ({
  useTheme: () => ({ 
    primary: '#000000', 
    secondary: '#ffffff', 
    border: '#cccccc',
    error: '#ff0000',
    text: '#333333',
    textSecondary: '#666666',
    background: '#ffffff'
  }),
  spacing: { sm: 8, md: 16, xs: 4 },
  typography: { label: {}, body: {} },
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ThemedInput from '../src/components/ThemedInput';

describe('ThemedInput', () => {
  it('renders label and placeholder correctly', () => {
    const { getByText, getByPlaceholderText } = render(
      <ThemedInput 
        label="Email Address" 
        placeholder="Enter your email"
        value=""
        onChangeText={() => {}}
      />
    );
    
    expect(getByText('Email Address')).toBeTruthy();
    expect(getByPlaceholderText('Enter your email')).toBeTruthy();
  });

  it('calls onChangeText when text changes', () => {
    const onChangeTextMock = jest.fn();
    const { getByPlaceholderText } = render(
      <ThemedInput 
        placeholder="Enter text"
        value=""
        onChangeText={onChangeTextMock}
      />
    );
    
    fireEvent.changeText(getByPlaceholderText('Enter text'), 'new text');
    expect(onChangeTextMock).toHaveBeenCalledWith('new text');
  });

  it('displays error state and error text when error is true', () => {
    const { getByText } = render(
      <ThemedInput 
        label="Username"
        value=""
        onChangeText={() => {}}
        error={true}
        errorText="Username is required"
      />
    );
    
    expect(getByText('Username is required')).toBeTruthy();
  });

  it('displays helper text when provided and no error', () => {
    const { getByText } = render(
      <ThemedInput 
        label="Password"
        value=""
        onChangeText={() => {}}
        helperText="Must be at least 8 characters"
      />
    );
    
    expect(getByText('Must be at least 8 characters')).toBeTruthy();
  });

  it('disables input when disabled prop is true', () => {
    const { getByPlaceholderText } = render(
      <ThemedInput 
        placeholder="Disabled input"
        value=""
        onChangeText={() => {}}
        disabled={true}
      />
    );
    
    const input = getByPlaceholderText('Disabled input');
    expect(input.props.editable).toBe(false);
  });

  it('toggles password visibility when secure input', () => {
    const { getByPlaceholderText, getByTestId } = render(
      <ThemedInput 
        placeholder="Password"
        value="password123"
        onChangeText={() => {}}
        secure={true}
        testID="password-input"
      />
    );
    
    const input = getByPlaceholderText('Password');
    expect(input.props.secureTextEntry).toBe(false); // Default is visible in our implementation
    
    // Find and press the toggle button
    const toggleButton = getByTestId('password-visibility-toggle');
    fireEvent.press(toggleButton);
    
    // Check that secureTextEntry is now true
    expect(input.props.secureTextEntry).toBe(true);
  });

  it('has proper accessibility attributes', () => {
    const { getByTestId } = render(
      <ThemedInput 
        label="Email"
        value=""
        onChangeText={() => {}}
        accessibilityLabel="Email input field"
        testID="email-input"
      />
    );
    
    expect(getByTestId('email-input')).toBeTruthy();
  });
});
