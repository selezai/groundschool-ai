import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useTheme, spacing, typography } from '../theme/theme';
import { logError } from '../services/sentryService';
import * as logger from '../services/loggerService';

/**
 * Network error fallback UI component
 */
const NetworkErrorFallback = ({ error, retry, isOffline }) => {
  const colors = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Ionicons 
        name={isOffline ? "cloud-offline" : "wifi-slash"} 
        size={64} 
        color={colors.error} 
      />
      <Text style={[typography.title, { color: colors.text, marginTop: spacing.md }]}>
        {isOffline ? 'No Internet Connection' : 'Network Error'}
      </Text>
      <Text style={[typography.body, { color: colors.text, marginTop: spacing.sm, textAlign: 'center' }]}>
        {isOffline 
          ? 'Please check your internet connection and try again.' 
          : 'We\'re having trouble connecting to our servers. Please try again.'}
      </Text>
      {__DEV__ && error && (
        <View style={[styles.errorDetails, { borderColor: colors.border }]}>
          <Text style={[typography.label, { color: colors.error }]}>Error Details (Development Only):</Text>
          <Text style={[typography.body, { color: colors.error, marginTop: spacing.xs }]}>
            {error.toString()}
          </Text>
        </View>
      )}
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: colors.primary }]} 
        onPress={retry}
      >
        <Text style={[typography.button, { color: colors.secondary }]}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
};

/**
 * Network error boundary component
 * Handles network-specific errors and provides appropriate UI
 */
const NetworkErrorBoundary = ({ children, onError, fallback }) => {
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  
  // Check network status
  useEffect(() => {
    const checkConnectivity = async () => {
      const state = await NetInfo.fetch();
      setIsOffline(!state.isConnected);
    };
    
    checkConnectivity();
    
    // Subscribe to network status changes
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
      
      // If we're back online and had an error, retry
      if (state.isConnected && error) {
        handleRetry();
      }
    });
    
    return () => unsubscribe();
  }, [error]);
  
  // Handle network errors
  const handleError = (err) => {
    // Log the error
    logError(err, { type: 'networkError', isOffline });
    logger.error('Network error occurred', { error: err.message, isOffline });
    
    // Set the error state
    setError(err);
    
    // Call the onError callback if provided
    if (onError) {
      onError(err);
    }
  };
  
  // Handle retry
  const handleRetry = () => {
    setError(null);
  };
  
  // If there's an error or we're offline, show the fallback UI
  if (error || isOffline) {
    // If a custom fallback is provided, use it
    if (fallback) {
      return fallback({ error, retry: handleRetry, isOffline });
    }
    
    // Otherwise, use the default fallback
    return (
      <NetworkErrorFallback 
        error={error} 
        retry={handleRetry} 
        isOffline={isOffline} 
      />
    );
  }
  
  // Wrap children with error handling
  return (
    <React.Fragment>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            onError: handleError,
          });
        }
        return child;
      })}
    </React.Fragment>
  );
};

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

export default NetworkErrorBoundary;
