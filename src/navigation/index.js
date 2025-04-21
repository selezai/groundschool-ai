import React, { useContext, useRef, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
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
import _DocumentPreviewScreen2 from '../screens/documents/DocumentPreviewScreen'; // Used in routes
import QuizCreationScreen from '../screens/QuizCreationScreen';
import _QuizTakingScreen from '../screens/QuizTakingScreen'; // Used dynamically
import _QuizResultsScreen from '../screens/QuizResultsScreen'; // Used dynamically
import _DocumentPreviewScreen from '../screens/documents/DocumentPreviewScreen'; // Used dynamically
import QuizHistoryScreen from '../screens/QuizHistoryScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

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
  const { user, loading, _error } = useContext(AuthContext); // Error kept for future error handling
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
  const onNavigationStateChange = (_state) => {
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
        // set initial route name ref once navigation is ready
        routeNameRef.current = navigationRef.current?.getCurrentRoute()?.name;
      }}
    >
      {user ? (
        <Drawer.Navigator initialRouteName="Home" screenOptions={{ headerShown: true }}>
          <Drawer.Screen name="Home" component={withErrorBoundaries(HomeScreen, 'Home')} />
          <Drawer.Screen name="Document Upload" component={withErrorBoundaries(DocumentUploadScreen, 'DocumentUpload')} />
          <Drawer.Screen name="Document Library" component={withErrorBoundaries(DocumentLibraryScreen, 'DocumentLibrary')} />
          <Drawer.Screen name="Quiz Creation" component={withErrorBoundaries(QuizCreationScreen, 'QuizCreation')} />
          <Drawer.Screen name="Quiz History" component={withErrorBoundaries(QuizHistoryScreen, 'QuizHistory')} />
          <Drawer.Screen name="Analytics" component={withErrorBoundaries(AnalyticsScreen, 'Analytics')} />
          <Drawer.Screen name="Profile" component={withErrorBoundaries(ProfileScreen, 'Profile')} />
        </Drawer.Navigator>
      ) : (
        <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={withErrorBoundaries(LoginScreen, 'Login')} />
          <Stack.Screen name="Signup" component={withErrorBoundaries(SignupScreen, 'Signup')} />
          <Stack.Screen name="ForgotPassword" component={withErrorBoundaries(ForgotPasswordScreen, 'ForgotPassword')} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}
