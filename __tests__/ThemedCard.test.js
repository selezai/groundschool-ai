import React from 'react';
import { Text, View as _View } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import ThemedCard from '../src/components/ThemedCard';

// Mock the theme hook
jest.mock('../src/theme/theme', () => ({
  useTheme: () => ({ 
    primary: '#000000', 
    secondary: '#ffffff', 
    border: '#cccccc',
    card: '#f5f5f5',
    text: '#333333',
    background: '#ffffff'
  }),
  spacing: { sm: 8, md: 16, xs: 4 },
  typography: { subtitle: {}, body: {} },
}));

describe('ThemedCard', () => {
  it('renders children correctly', () => {
    const { getByText } = render(
      <ThemedCard>
        <Text>Card Content</Text>
      </ThemedCard>
    );
    expect(getByText('Card Content')).toBeTruthy();
  });

  it('renders title when provided', () => {
    const { getByText } = render(
      <ThemedCard title="Card Title">
        <Text>Card Content</Text>
      </ThemedCard>
    );
    expect(getByText('Card Title')).toBeTruthy();
    expect(getByText('Card Content')).toBeTruthy();
  });

  it('calls onPress when pressed if interactive', () => {
    const onPressMock = jest.fn();
    const { getByText } = render(
      <ThemedCard onPress={onPressMock} title="Interactive Card">
        <Text>Card Content</Text>
      </ThemedCard>
    );
    
    fireEvent.press(getByText('Card Content'));
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it('applies different styles based on variant', () => {
    const { rerender, getByTestId } = render(
      <ThemedCard testID="card" variant="elevated">
        <Text>Card Content</Text>
      </ThemedCard>
    );
    
    let card = getByTestId('card');
    expect(card.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          shadowOpacity: 0.1,
        })
      ])
    );
    
    rerender(
      <ThemedCard testID="card" variant="outlined">
        <Text>Card Content</Text>
      </ThemedCard>
    );
    
    card = getByTestId('card');
    expect(card.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          borderWidth: 1,
        })
      ])
    );
    
    rerender(
      <ThemedCard testID="card" variant="filled">
        <Text>Card Content</Text>
      </ThemedCard>
    );
    
    card = getByTestId('card');
    expect(card.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          backgroundColor: '#ffffff',
        })
      ])
    );
  });

  it('has proper accessibility attributes', () => {
    const { getByTestId } = render(
      <ThemedCard accessibilityLabel="Test Card" testID="card">
        <Text>Card Content</Text>
      </ThemedCard>
    );
    
    expect(getByTestId('card')).toBeTruthy();
  });
});
