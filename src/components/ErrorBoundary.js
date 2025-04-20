import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { logError } from '../services/sentryService';
import { useTheme, spacing, typography } from '../theme/theme';

/**
 * Error fallback UI component
 */
const ErrorFallback = ({ error, resetError }) => {
  const colors = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Ionicons name="alert-circle" size={64} color={colors.error} />
      <Text style={[typography.title, { color: colors.text, marginTop: spacing.md }]}>
        Something went wrong
      </Text>
      <Text style={[typography.body, { color: colors.text, marginTop: spacing.sm, textAlign: 'center' }]}>
        We're sorry, but something unexpected happened. The error has been reported to our team.
      </Text>
      {__DEV__ && (
        <View style={[styles.errorDetails, { borderColor: colors.border }]}>
          <Text style={[typography.label, { color: colors.error }]}>Error Details (Development Only):</Text>
          <Text style={[typography.body, { color: colors.error, marginTop: spacing.xs }]}>
            {error.toString()}
          </Text>
        </View>
      )}
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: colors.primary }]} 
        onPress={resetError}
      >
        <Text style={[typography.button, { color: colors.secondary }]}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
};

/**
 * Error boundary class component to catch errors in the component tree
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to Sentry
    logError(error, {
      componentStack: errorInfo.componentStack,
      ...this.props.errorContext
    });
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Render fallback UI
      return (
        <ErrorFallback 
          error={this.state.error} 
          resetError={this.resetError} 
        />
      );
    }

    // If no error, render children normally
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  errorDetails: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: spacing.sm,
    width: '100%',
  },
  button: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.sm,
  },
});

export default ErrorBoundary;
