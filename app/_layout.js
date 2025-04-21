import React, { useEffect } from 'react';
import { Drawer } from 'expo-router/drawer';
import { Platform, View, StyleSheet } from 'react-native';
import COLORS from '../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/contexts/AuthContext';
import { useTheme } from '../src/theme/theme';
import DrawerContent from './_drawer';
import * as logger from '../src/services/loggerService';

/**
 * Root layout component for the app
 * Sets up the drawer navigation and authentication flow
 */
export default function AppLayout() {
  const { user, isLoading } = useAuth();
  const { colors } = useTheme();

  useEffect(() => {
    // Log layout initialization
    logger.info('App layout initialized', { 
      platform: Platform.OS,
      authenticated: !!user
    });
  }, [user]);

  // Custom drawer content
  const renderDrawerContent = (props) => {
    return <DrawerContent {...props} />;
  };

  if (isLoading) {
    // Show loading state while auth state is being determined
    return (
      <View style={styles.loadingContainer}>
        {/* Loading indicator would be shown here */}
      </View>
    );
  }

  return (
    <Drawer
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background || COLORS.white,
        },
        headerTintColor: colors.text || COLORS.black,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        drawerStyle: {
          backgroundColor: colors.background || COLORS.white,
          width: Platform.OS === 'web' ? 300 : '80%',
        },
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.text,
      }}
      drawerContent={renderDrawerContent}
    >
      <Drawer.Screen
        name="index"
        options={{
          title: 'Home',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="documents/index"
        options={{
          title: 'Documents',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="quizzes/index"
        options={{
          title: 'Quizzes',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="help-circle-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="analytics/index"
        options={{
          title: 'Analytics',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="settings/index"
        options={{
          title: 'Settings',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="auth/login"
        options={{
          title: 'Login',
          drawerItemStyle: { display: 'none' },
        }}
      />
      <Drawer.Screen
        name="auth/signup"
        options={{
          title: 'Sign Up',
          drawerItemStyle: { display: 'none' },
        }}
      />
      <Drawer.Screen
        name="debug"
        options={{
          title: 'Debug',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="code-working-outline" size={size} color={color} />
          ),
          // Only show in development
          drawerItemStyle: { display: __DEV__ ? 'flex' : 'none' },
        }}
      />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
