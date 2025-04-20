import { useColorScheme } from 'react-native';

export const lightColors = {
  primary: '#4F46E5',
  secondary: '#FFFFFF',
  background: '#F9FAFB',
  text: '#1F2937',
  error: '#DC2626',
  success: '#16A34A',
  info: '#3B82F6',
  border: '#E5E7EB',
};

export const darkColors = {
  primary: '#8B5CF6',
  secondary: '#000000',
  background: '#1F2937',
  text: '#F9FAFB',
  error: '#F87171',
  success: '#4ADE80',
  info: '#60A5FA',
  border: '#374151',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const typography = {
  title: { fontSize: 24, fontWeight: 'bold', color: lightColors.text },
  subtitle: { fontSize: 18, fontWeight: '600', color: lightColors.text },
  body: { fontSize: 16, color: lightColors.text },
  label: { fontSize: 14, color: lightColors.text },
};

// Hook to get current theme colors
export function useTheme() {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkColors : lightColors;
}

export const colors = lightColors;
