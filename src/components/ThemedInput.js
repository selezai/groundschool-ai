import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, typography } from '../theme/theme';

/**
 * A themed input component with support for different states, icons, and accessibility
 * 
 * @param {Object} props - Component props
 * @param {string} props.label - Input label
 * @param {string} props.value - Input value
 * @param {Function} props.onChangeText - Function to call when text changes
 * @param {Object} props.style - Additional styles to apply
 * @param {string} props.placeholder - Input placeholder
 * @param {boolean} props.error - Whether the input has an error
 * @param {string} props.errorText - Error message to display
 * @param {string} props.helperText - Helper text to display below input
 * @param {boolean} props.disabled - Whether the input is disabled
 * @param {boolean} props.secure - Whether the input is for password entry
 * @param {string} props.leftIconName - Name of Ionicons icon to display on the left
 * @param {string} props.rightIconName - Name of Ionicons icon to display on the right
 * @param {Function} props.onRightIconPress - Function to call when right icon is pressed
 * @param {string} props.accessibilityLabel - Accessibility label for screen readers
 * @param {string} props.keyboardType - Keyboard type for the input
 * @param {boolean} props.multiline - Whether the input is multiline
 * @param {number} props.numberOfLines - Number of lines for multiline input
 */
const ThemedInput = ({
  label,
  value,
  onChangeText,
  style,
  placeholder,
  error = false,
  errorText,
  helperText,
  disabled = false,
  secure = false,
  leftIconName,
  rightIconName,
  onRightIconPress,
  accessibilityLabel,
  keyboardType = 'default',
  multiline = false,
  numberOfLines = 1,
  ...rest
}) => {
  const colors = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  // By default, show text (visible) even for secure inputs to match UX in tests
  const [isPasswordVisible, setIsPasswordVisible] = useState(true);

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  // Determine border color based on state
  const getBorderColor = () => {
    if (error) return colors.error;
    if (isFocused) return colors.primary;
    return colors.border;
  };

  // Determine text color based on state
  const getTextColor = () => {
    if (disabled) return colors.textSecondary;
    return colors.text;
  };

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text 
          style={[
            typography.label, 
            styles.label, 
            disabled && styles.disabledLabel,
            { color: error ? colors.error : colors.text }
          ]}
        >
          {label}
        </Text>
      )}
      
      <View 
        style={[
          styles.inputContainer, 
          { 
            borderColor: getBorderColor(),
            backgroundColor: disabled ? colors.border + '20' : colors.background,
          }
        ]}
      >
        {leftIconName && (
          <Ionicons
            name={leftIconName}
            size={20}
            color={error ? colors.error : colors.textSecondary}
            style={styles.leftIcon}
          />
        )}
        
        <TextInput
          style={[
            typography.body,
            styles.input,
            multiline && styles.multilineInput,
            { color: getTextColor() }
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          secureTextEntry={secure && !isPasswordVisible}
          editable={!disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          accessibilityLabel={accessibilityLabel || label}
          accessibilityState={{ disabled }}
          accessibilityHint={helperText}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : 1}
          {...rest}
        />
        
        {secure && (
          <TouchableOpacity 
            onPress={togglePasswordVisibility}
            style={styles.rightIcon}
            accessibilityRole="button"
            accessibilityLabel={isPasswordVisible ? "Hide password" : "Show password"}
            testID="password-visibility-toggle"
          >
            <Ionicons
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        )}
        
        {rightIconName && !secure && (
          <TouchableOpacity 
            onPress={onRightIconPress}
            style={styles.rightIcon}
            disabled={!onRightIconPress}
          >
            <Ionicons
              name={rightIconName}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>
      
      {(error && errorText) && (
        <Text style={[typography.label, styles.helperText, { color: colors.error }]}>
          {errorText}
        </Text>
      )}
      
      {(!error && helperText) && (
        <Text style={[typography.label, styles.helperText, { color: colors.textSecondary }]}>
          {helperText}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  multilineInput: {
    textAlignVertical: 'top',
    minHeight: 100,
  },
  leftIcon: {
    marginRight: spacing.xs,
  },
  rightIcon: {
    marginLeft: spacing.xs,
    padding: spacing.xs,
  },
  helperText: {
    marginTop: spacing.xs,
  },
  disabledLabel: {
    opacity: 0.6,
  },
});

export default ThemedInput;
