import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme, spacing, typography } from '../theme/theme';

const ThemedButton = ({ title, onPress, style, disabled }) => {
  const colors = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.button,
        style,
        { backgroundColor: disabled ? colors.border : colors.primary },
      ]}
      disabled={disabled}
    >
      <Text style={[typography.body, { color: colors.secondary }]}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.xs,
    alignItems: 'center',
  },
});

export default ThemedButton;
