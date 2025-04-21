import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme, spacing, typography } from '../theme/theme';

/**
 * A themed card component with support for different variants and interactive states
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Card content
 * @param {Object} props.style - Additional styles to apply
 * @param {string} props.variant - Card variant: 'elevated', 'outlined', 'filled'
 * @param {string} props.title - Optional card title
 * @param {Function} props.onPress - Optional onPress handler to make card interactive
 * @param {string} props.accessibilityLabel - Accessibility label for screen readers
 * @param {string} props.testID - Test ID for automated testing
 */
const ThemedCard = ({ 
  children, 
  style, 
  variant = 'elevated',
  title,
  onPress,
  accessibilityLabel,
  testID,
}) => {
  const colors = useTheme();
  
  // Determine card styles based on variant
  const getCardStyles = () => {
    const baseStyles = {
      backgroundColor: colors.card,
      borderRadius: spacing.sm,
    };
    
    switch (variant) {
      case 'elevated':
        return {
          ...baseStyles,
          shadowColor: colors.text,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        };
      case 'outlined':
        return {
          ...baseStyles,
          borderWidth: 1,
          borderColor: colors.border,
        };
      case 'filled':
        return {
          ...baseStyles,
          backgroundColor: colors.background,
        };
      default:
        return baseStyles;
    }
  };
  
  // Render card content
  const renderContent = () => (
    <>
      {title && (
        <View style={styles.titleContainer}>
          <Text style={[typography.subtitle, { color: colors.text }]}>
            {title}
          </Text>
        </View>
      )}
      <View style={styles.contentContainer}>
        {children}
      </View>
    </>
  );
  
  // If card is interactive (has onPress), wrap in TouchableOpacity
  if (onPress) {
    return (
      <TouchableOpacity
        testID={testID}
        style={[styles.card, getCardStyles(), style]}
        onPress={onPress}
        activeOpacity={0.7}
        accessible={true}
        accessibilityLabel={accessibilityLabel || title}
        accessibilityRole="button"
      >
        {renderContent()}
      </TouchableOpacity>
    );
  }
  
  // Otherwise render as a simple View
  return (
    <View 
      testID={testID}
      style={[styles.card, getCardStyles(), style]}
      accessible={true}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityRole="none"
    >
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    marginVertical: spacing.sm,
  },
  titleContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  contentContainer: {
    padding: spacing.md,
  },
});

export default ThemedCard;
