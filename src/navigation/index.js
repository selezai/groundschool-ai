import React, { useContext, useRef, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as Sentry from 'sentry-expo';
import { AuthContext } from '../contexts/AuthContext';
import ErrorBoundary from '../components/ErrorBoundary';
import NetworkErrorBoundary from '../components/NetworkErrorBoundary';
import * as logger from '../services/loggerService';
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import HomeScreen from '../screens/HomeScreen';
import DocumentUploadScreen from '../screens/documents/DocumentUploadScreen';
import DocumentLibraryScreen from '../screens/documents/DocumentLibraryScreen';
import DocumentPreviewScreen from '../screens/documents/DocumentPreviewScreen';
import QuizCreationScreen from '../screens/QuizCreationScreen';
import QuizTakingScreen from '../screens/QuizTakingScreen';
import QuizResultsScreen from '../screens/QuizResultsScreen';
import QuizHistoryScreen from '../screens/QuizHistoryScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createStackNavigator();

// Wrap component with error boundaries
const withErrorBoundaries = (Component, screenName) => (props) => {
  return (
    <ErrorBoundary errorContext={{ screen: screenName }}>
      <NetworkErrorBoundary>
        <Component {...props} />
      </NetworkErrorBoundary>
    </ErrorBoundary>
  );
};

export default function Navigation() {
  const { user, loading, error } = useContext(AuthContext);
  const navigationRef = useRef(null);
  const routeNameRef = useRef(null);
  
  // Set up navigation tracking for Sentry and logging
  useEffect(() => {
    if (navigationRef.current) {
      // Set up the React Navigation instrumentation
      const routingInstrumentation = new Sentry.Native.ReactNavigationInstrumentation();
      routingInstrumentation.registerNavigationContainer(navigationRef.current);
    }
  }, []);
  
  // Handle navigation state changes for logging
  const onNavigationStateChange = (state) => {
    const previousRouteName = routeNameRef.current;
    const currentRouteName = navigationRef.current.getCurrentRoute()?.name;
    
    if (previousRouteName !== currentRouteName) {
      // Log screen navigation
      logger.info('Screen navigation', { 
        from: previousRouteName || 'Unknown', 
        to: currentRouteName || 'Unknown' 
      });
    }
    
    // Save the current route name for later comparison
    routeNameRef.current = currentRouteName;
  };
  
  // Show loading state if auth is still initializing
  if (loading) {
    return null; // Or a loading spinner
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onStateChange={onNavigationStateChange}
      onReady={() => {
        routeNameRef.current = navigationRef.current.getCurrentRoute()?.name;
      }}
    >
      <Stack.Navigator 
        screenOptions={{
          headerStyle: {
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0,
          },
        }}
      >
        {user ? (
          <>
            <Stack.Screen name="Home" component={withErrorBoundaries(HomeScreen, 'Home')} />
            <Stack.Screen name="DocumentUpload" component={withErrorBoundaries(DocumentUploadScreen, 'DocumentUpload')} />
            <Stack.Screen name="DocumentLibrary" component={withErrorBoundaries(DocumentLibraryScreen, 'DocumentLibrary')} />
            <Stack.Screen name="DocumentPreview" component={withErrorBoundaries(DocumentPreviewScreen, 'DocumentPreview')} />
            <Stack.Screen name="QuizCreation" component={withErrorBoundaries(QuizCreationScreen, 'QuizCreation')} />
            <Stack.Screen name="QuizTaking" component={withErrorBoundaries(QuizTakingScreen, 'QuizTaking')} />
            <Stack.Screen name="QuizResults" component={withErrorBoundaries(QuizResultsScreen, 'QuizResults')} />
            <Stack.Screen name="QuizHistory" component={withErrorBoundaries(QuizHistoryScreen, 'QuizHistory')} />
            <Stack.Screen name="Analytics" component={withErrorBoundaries(AnalyticsScreen, 'Analytics')} />
            <Stack.Screen name="Profile" component={withErrorBoundaries(ProfileScreen, 'Profile')} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={withErrorBoundaries(LoginScreen, 'Login')} />
            <Stack.Screen name="Signup" component={withErrorBoundaries(SignupScreen, 'Signup')} />
            <Stack.Screen name="ForgotPassword" component={withErrorBoundaries(ForgotPasswordScreen, 'ForgotPassword')} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
