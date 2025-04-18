import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthContext } from '../contexts/AuthContext';
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import HomeScreen from '../screens/HomeScreen';
import DocumentUploadScreen from '../screens/documents/DocumentUploadScreen';
import DocumentLibraryScreen from '../screens/documents/DocumentLibraryScreen';
import QuizCreationScreen from '../screens/QuizCreationScreen';
import QuizTakingScreen from '../screens/QuizTakingScreen';
import QuizResultsScreen from '../screens/QuizResultsScreen';
import QuizHistoryScreen from '../screens/QuizHistoryScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';

const Stack = createStackNavigator();

export default function Navigation() {
  const { user } = useContext(AuthContext);

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {user ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="DocumentUpload" component={DocumentUploadScreen} />
            <Stack.Screen name="DocumentLibrary" component={DocumentLibraryScreen} />
            <Stack.Screen name="QuizCreation" component={QuizCreationScreen} />
            <Stack.Screen name="QuizTaking" component={QuizTakingScreen} />
            <Stack.Screen name="QuizResults" component={QuizResultsScreen} />
            <Stack.Screen name="QuizHistory" component={QuizHistoryScreen} />
            <Stack.Screen name="Analytics" component={AnalyticsScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
