import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../theme/theme';

const ThemedButton = ({ title, onPress, style, disabled }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.button, style, disabled && styles.disabled]}
    disabled={disabled}
  >
    <Text style={styles.text}>{title}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.xs,
    alignItems: 'center',
  },
  text: {
    color: colors.secondary,
    ...typography.body,
  },
  disabled: {
    backgroundColor: colors.border,
  },
});

export default ThemedButton;
