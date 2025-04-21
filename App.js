import React, { useEffect, useState } from 'react';
import { StatusBar, LogBox, Platform } from 'react-native';
import { AuthProvider } from './src/contexts/AuthContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import Navigation from './src/navigation';
import NetInfo from '@react-native-community/netinfo';
import { processQueue } from './src/services/offlineService';
import { initSentry } from './src/services/sentryService';
import { setupGlobalErrorHandlers } from './src/services/errorHandlingService';
import ErrorBoundary from './src/components/ErrorBoundary';
import * as logger from './src/services/loggerService';

// Import web-specific components and services for web platform only
import { initializeWebFeatures, OfflineNotification } from './src/web';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Require cycle:', // Ignore require cycle warnings
  'VirtualizedLists should never be nested', // Common warning with nested ScrollViews
]);

// Initialize Sentry
initSentry();

// Set up global error handlers
setupGlobalErrorHandlers();

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);

  // Handle app initialization
  useEffect(() => {
    // Log app startup
    logger.info('Application started', { version: '1.1.0', platform: Platform.OS });
    
    // Initialize web-specific features if on web platform
    if (Platform.OS === 'web') {
      initializeWebFeatures()
        .then(success => {
          if (success) {
            logger.info('Web features initialized successfully');
          } else {
            logger.warn('Some web features failed to initialize');
          }
          setIsInitialized(true);
        })
        .catch(error => {
          logger.error('Failed to initialize web features', { error: error.message });
          setIsInitialized(true); // Still mark as initialized even on error
        });
    } else {
      setIsInitialized(true);
    }
  }, []);
  
  // Handle network connectivity
  useEffect(() => {
    // Only set up listeners if app is initialized
    if (!isInitialized) return;
    
    // Process offline queue on startup
    const processInitialQueue = async () => {
      try {
        await processQueue();
      } catch (error) {
        logger.error('Failed to process offline queue on startup', { error: error.message });
      }
    };
    processInitialQueue();
    
    // Set up network listener
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        logger.info('Network connection restored', { type: state.type });
        processQueue().catch(error => {
          logger.error('Failed to process offline queue after reconnect', { error: error.message });
        });
      } else {
        logger.info('Network connection lost');
      }
    });
    
    return () => {
      unsubscribe();
      logger.info('Network listener cleanup');
    };
  }, [isInitialized]);
  
  return (
    <ErrorBoundary errorContext={{ location: 'App root' }}>
      {Platform.OS !== 'web' && (
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      )}
      <ThemeProvider>
        <AuthProvider>
          {Platform.OS === 'web' && <OfflineNotification />}
          <Navigation />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
