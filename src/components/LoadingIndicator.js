import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme, spacing, typography } from '../theme/theme';

/**
 * A consistent loading indicator component with support for different sizes and text
 * 
 * @param {Object} props - Component props
 * @param {string} props.size - Size of the indicator: 'small', 'medium', 'large'
 * @param {string} props.text - Optional text to display below the indicator
 * @param {boolean} props.fullscreen - Whether to display as a fullscreen overlay
 * @param {Object} props.style - Additional styles to apply
 * @param {string} props.accessibilityLabel - Accessibility label for screen readers
 * @param {string} props.testID - Test ID for testing purposes
 */
const LoadingIndicator = ({
  size = 'medium',
  text,
  fullscreen = false,
  style,
  accessibilityLabel = 'Loading content',
  testID
}) => {
  const colors = useTheme();
  
  // Determine indicator size
  const getIndicatorSize = () => {
    switch (size) {
      case 'small': return 'small';
      case 'large': return 'large';
      default: return 'small';
    }
  };
  
  // Determine container styles based on fullscreen prop
  const containerStyles = [
    styles.container,
    fullscreen && styles.fullscreen,
    { backgroundColor: fullscreen ? colors.background + 'E6' : 'transparent' },
    style
  ];
  
  return (
    <View 
      style={containerStyles}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      accessible={true}
      testID={testID}
    >
      <ActivityIndicator
        size={getIndicatorSize()}
        color={colors.primary}
        style={styles.indicator}
      />
      
      {text && (
        <Text style={[typography.body, styles.text, { color: colors.text }]}>
          {text}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  fullscreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  indicator: {
    marginBottom: spacing.sm,
  },
  text: {
    textAlign: 'center',
  },
});

export default LoadingIndicator;
