import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Image as _Image } from 'react-native'; // Kept for future use
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/contexts/AuthContext';
import { useTheme } from '../src/theme/theme';
import COLORS from '../src/constants/colors';
import * as logger from '../src/services/loggerService';

/**
 * Drawer navigation component for the app
 * Provides navigation links to different sections of the app
 */
export default function DrawerContent() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { colors, spacing } = useTheme();

  const handleNavigation = (path) => {
    try {
      logger.info('Navigation from drawer', { destination: path });
      router.push(path);
    } catch (error) {
      logger.error('Navigation error', { path, error: error.message });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      logger.info('User signed out from drawer');
      router.replace('/auth/login');
    } catch (error) {
      logger.error('Sign out error', { error: error.message });
    }
  };

  const navItems = [
    { 
      label: 'Home', 
      icon: 'home-outline', 
      path: '/',
      requiresAuth: true 
    },
    { 
      label: 'Documents', 
      icon: 'document-text-outline', 
      path: '/documents',
      requiresAuth: true 
    },
    { 
      label: 'Quizzes', 
      icon: 'help-circle-outline', 
      path: '/quizzes',
      requiresAuth: true 
    },
    { 
      label: 'Analytics', 
      icon: 'bar-chart-outline', 
      path: '/analytics',
      requiresAuth: true 
    },
    { 
      label: 'Settings', 
      icon: 'settings-outline', 
      path: '/settings',
      requiresAuth: false 
    },
  ];

  // Add debug screen in development mode
  if (__DEV__) {
    navItems.push({ 
      label: 'Debug', 
      icon: 'code-working-outline', 
      path: '/debug',
      requiresAuth: false 
    });
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.white,
      paddingTop: Platform.OS === 'ios' ? 60 : 40,
      padding: spacing.large,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
      marginBottom: spacing.medium,
    },
    header: {
      padding: spacing.large,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
      marginBottom: spacing.medium,
    },
    profileSection: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.medium,
    },
    avatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: COLORS.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.medium,
    },
    avatarText: {
      color: COLORS.white,
      fontSize: 20,
      fontWeight: 'bold',
    },
    userInfo: {
      flex: 1,
    },
    userName: {
      fontSize: 16,
      fontWeight: 'bold',
      color: COLORS.text,
    },
    userEmail: {
      fontSize: 14,
      color: COLORS.textSecondary,
      marginTop: 4,
    },
    navSection: {
      flex: 1,
    },
    navItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.medium,
      paddingHorizontal: spacing.large,
      borderRadius: 8,
      marginHorizontal: spacing.small,
      marginBottom: spacing.small,
    },
    // Kept for future implementation of active state styling
    // activeNavItem: {
    //   backgroundColor: COLORS.primaryLight,
    // },
    navIcon: {
      marginRight: spacing.medium,
      width: 24,
      alignItems: 'center',
    },
    navLabel: {
      fontSize: 16,
      color: COLORS.text,
    },
    // Kept for future implementation of active state styling
    // activeNavLabel: {
    //   color: COLORS.black,
    //   fontWeight: 'bold',
    //   fontSize: 20,
    // },
    footer: {
      padding: spacing.large,
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
    },
    signOutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.medium,
    },
    signOutLabel: {
      marginLeft: spacing.medium,
      fontSize: 16,
      color: colors.danger,
    },
    versionText: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: spacing.medium,
    },
  });

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          {user ? (
            <View style={styles.profileSection}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>
                  {user.displayName || 'User'}
                </Text>
                <Text style={styles.userEmail}>
                  {user.email}
                </Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.signInButton}
              onPress={() => handleNavigation('/auth/login')}
            >
              <Text style={styles.signInText}>Sign In</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.navSection}>
          {navItems.map((item) => {
            // Skip auth-required items if user is not logged in
            if (item.requiresAuth && !user) return null;
            
            return (
              <TouchableOpacity
                key={item.path}
                style={styles.navItem}
                onPress={() => handleNavigation(item.path)}
              >
                <View style={styles.navIcon}>
                  <Ionicons 
                    name={item.icon} 
                    size={24} 
                    color={colors.primary} 
                  />
                </View>
                <Text style={styles.navLabel}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        {user && (
          <TouchableOpacity 
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
            <Ionicons 
              name="log-out-outline" 
              size={24} 
              color={colors.danger} 
            />
            <Text style={styles.signOutLabel}>Sign Out</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.versionText}>
          GroundSchool AI v1.1.0
        </Text>
      </View>
    </View>
  );
}
