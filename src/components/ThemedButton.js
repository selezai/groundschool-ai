import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { useTheme, spacing, typography } from '../theme/theme';
import { Ionicons } from '@expo/vector-icons';

/**
 * A themed button component with support for variants, loading states, and accessibility
 * 
 * @param {string} title - The button text
 * @param {Function} onPress - Function to call when button is pressed
 * @param {Object} style - Additional styles to apply
 * @param {boolean} disabled - Whether the button is disabled
 * @param {string} variant - Button variant: 'primary', 'secondary', 'danger', 'outline', 'text'
 * @param {boolean} loading - Whether to show a loading indicator
 * @param {string} accessibilityLabel - Accessibility label for screen readers
 * @param {string} iconName - Name of Ionicons icon to display (optional)
 * @param {string} iconPosition - Position of icon: 'left' or 'right'
 * @param {string} size - Button size: 'small', 'medium', 'large'
 */
const ThemedButton = ({ 
  title, 
  onPress, 
  style, 
  disabled = false,
  variant = 'primary',
  loading = false,
  accessibilityLabel,
  iconName,
  iconPosition = 'left',
  size = 'medium'
}) => {
  const colors = useTheme();
  
  // Determine background color based on variant and disabled state
  const getBackgroundColor = () => {
    if (disabled) return colors.border;
    
    switch (variant) {
      case 'primary': return colors.primary;
      case 'secondary': return colors.secondary;
      case 'danger': return colors.error;
      case 'outline': return 'transparent';
      case 'text': return 'transparent';
      default: return colors.primary;
    }
  };
  
  // Determine text color based on variant and disabled state
  const getTextColor = () => {
    if (disabled) return colors.textSecondary;
    
    switch (variant) {
      case 'primary': return '#FFFFFF';
      case 'secondary': return colors.text;
      case 'danger': return '#FFFFFF';
      case 'outline': return colors.primary;
      case 'text': return colors.primary;
      default: return '#FFFFFF';
    }
  };
  
  // Determine border style based on variant
  const getBorderStyle = () => {
    if (variant === 'outline') {
      return { 
        borderWidth: 1, 
        borderColor: disabled ? colors.border : colors.primary 
      };
    }
    return {};
  };
  
  // Determine size-based styles
  const getSizeStyles = () => {
    switch (size) {
      case 'small': return {
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        minHeight: 32,
      };
      case 'large': return {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        minHeight: 48,
      };
      default: return {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        minHeight: 40,
      };
    }
  };
  
  // Get icon size based on button size
  const getIconSize = () => {
    switch (size) {
      case 'small': return 16;
      case 'large': return 24;
      default: return 20;
    }
  };
  
  // Render icon if provided
  const renderIcon = () => {
    if (!iconName) return null;
    
    return (
      <Ionicons 
        name={iconName} 
        size={getIconSize()} 
        color={getTextColor()} 
        style={iconPosition === 'left' ? styles.iconLeft : styles.iconRight} 
      />
    );
  };
  
  return (
    <TouchableOpacity
      onPress={loading ? null : onPress}
      style={[
        styles.button,
        getSizeStyles(),
        getBorderStyle(),
        { backgroundColor: getBackgroundColor() },
        style,
      ]}
      disabled={disabled || loading}
      accessible={true}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityRole="button"
      accessibilityState={{ 
        disabled: disabled || loading,
        busy: loading 
      }}
    >
      <View style={styles.contentContainer}>
        {loading ? (
          <ActivityIndicator 
            size="small" 
            color={getTextColor()} 
            style={styles.loader} 
          />
        ) : (
          <>
            {iconPosition === 'left' && renderIcon()}
            <Text 
              style={[
                typography.body, 
                styles.buttonText,
                size === 'small' && styles.smallText,
                size === 'large' && styles.largeText,
                { color: getTextColor() }
              ]}
            >
              {title}
            </Text>
            {iconPosition === 'right' && renderIcon()}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontWeight: '500',
  },
  smallText: {
    fontSize: 14,
  },
  largeText: {
    fontSize: 18,
  },
  iconLeft: {
    marginRight: spacing.xs,
  },
  iconRight: {
    marginLeft: spacing.xs,
  },
  loader: {
    marginHorizontal: spacing.xs,
  }
});

export default ThemedButton;
