jest.mock('../src/theme/theme', () => ({
  useTheme: () => ({ primary: '#000000', secondary: '#ffffff', border: '#cccccc' }),
  spacing: { sm: 8, md: 16, xs: 4 },
  typography: { body: {} },
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ThemedButton from '../src/components/ThemedButton';

describe('ThemedButton', () => {
  it('renders title correctly', () => {
    const { getByText } = render(<ThemedButton title="Click me" onPress={() => {}} />);
    expect(getByText('Click me')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPressMock = jest.fn();
    const { getByText } = render(<ThemedButton title="Press" onPress={onPressMock} />);
    fireEvent.press(getByText('Press'));
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it('disables button when disabled prop is true', () => {
    const onPressMock = jest.fn();
    const { getByText } = render(<ThemedButton title="Disabled" onPress={onPressMock} disabled />);
    fireEvent.press(getByText('Disabled'));
    expect(onPressMock).not.toHaveBeenCalled();
  });
});
