import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabaseClient';
import { setUser as setSentryUser } from '../services/sentryService';
import { logError } from '../services/sentryService';
import * as logger from '../services/loggerService';
import { withErrorHandling } from '../services/errorHandlingService';

export const AuthContext = createContext({
  user: null,
  register: async () => {},
  login: async () => {},
  logout: async () => {},
  resetPassword: async () => {},
  loginAsGuest: () => {}
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Update user state and Sentry user context
  const updateUser = (newUser) => {
    setUser(newUser);
    
    // Update Sentry user context
    if (newUser) {
      setSentryUser(newUser);
      logger.info('User authenticated', { 
        userId: newUser.id,
        isGuest: newUser.isGuest || false 
      });
    } else {
      setSentryUser(null);
      logger.info('User logged out');
    }
  };

  // Initialize auth state
  useEffect(() => {
    try {
      setLoading(true);
      
      // Get current session
      const session = supabase.auth.session();
      updateUser(session?.user || null);
      
      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        logger.info('Auth state changed', { event });
        updateUser(session?.user || null);
      });
      
      setLoading(false);
      
      // Cleanup subscription
      return () => subscription.unsubscribe();
    } catch (err) {
      logError(err, { context: 'Auth initialization' });
      logger.error('Failed to initialize auth', { error: err.message });
      setError(err.message);
      setLoading(false);
    }
  }, []);

  // Register new user
  const register = withErrorHandling(async (email, password) => {
    try {
      logger.info('Registration attempt', { email });
      
      const { user: newUser, error: regError } = await supabase.auth.signUp({ 
        email, 
        password 
      });
      
      if (regError) {
        logger.warn('Registration failed', { 
          email, 
          error: regError.message 
        });
        return { error: regError };
      }
      
      logger.info('Registration successful', { userId: newUser.id });
      updateUser(newUser);
      return { user: newUser };
    } catch (err) {
      logger.error('Registration error', { email, error: err.message });
      throw err;
    }
  }, { context: 'User registration' });
  // Login user with rate limiting
  const login = withErrorHandling(async (email, password) => {
    try {
      logger.info('Login attempt', { email });
      
      // Rate limiting for failed login attempts
      const key = 'failedLoginAttempts';
      const now = Date.now();
      const windowMs = 15 * 60 * 1000; // 15 minutes
      
      try {
        const data = await AsyncStorage.getItem(key);
        const attempts = data ? JSON.parse(data) : [];
        const recent = attempts.filter(ts => now - ts < windowMs);
        
        if (recent.length >= 5) {
          logger.warn('Login rate limited', { email, recentAttempts: recent.length });
          return { error: { message: 'Too many login attempts, please try again later.' } };
        }
      } catch (storageErr) {
        // If we can't access storage, continue with login but log the error
        logger.warn('Failed to check login rate limit', { error: storageErr.message });
      }
      
      // Attempt login
      const { user: newUser, error: loginError } = await supabase.auth.signIn({ 
        email, 
        password 
      });
      
      if (loginError) {
        // Record failed attempt
        try {
          const data = await AsyncStorage.getItem(key);
          const attempts = data ? JSON.parse(data) : [];
          attempts.push(now);
          await AsyncStorage.setItem(key, JSON.stringify(attempts));
        } catch (storageErr) {
          logger.warn('Failed to record failed login attempt', { error: storageErr.message });
        }
        
        logger.warn('Login failed', { email, error: loginError.message });
        return { error: loginError };
      }
      
      // Clear failed attempts on successful login
      try {
        await AsyncStorage.removeItem(key);
      } catch (storageErr) {
        logger.warn('Failed to clear login attempts', { error: storageErr.message });
      }
      
      logger.info('Login successful', { userId: newUser.id });
      updateUser(newUser);
      return { user: newUser };
    } catch (err) {
      logger.error('Login error', { email, error: err.message });
      throw err;
    }
  }, { context: 'User login' });
  // Login as guest
  const loginAsGuest = withErrorHandling(() => {
    try {
      logger.info('Guest login');
      const guestUser = { 
        isGuest: true, 
        id: `guest-${Date.now()}`,
        email: 'guest@example.com'
      };
      updateUser(guestUser);
      return { user: guestUser };
    } catch (err) {
      logger.error('Guest login error', { error: err.message });
      throw err;
    }
  }, { context: 'Guest login' });
  // Logout user
  const logout = withErrorHandling(async () => {
    try {
      logger.info('Logout attempt');
      const { error: logoutError } = await supabase.auth.signOut();
      
      if (logoutError) {
        logger.warn('Logout failed', { error: logoutError.message });
        return { error: logoutError };
      }
      
      logger.info('Logout successful');
      updateUser(null);
      return { success: true };
    } catch (err) {
      logger.error('Logout error', { error: err.message });
      throw err;
    }
  }, { context: 'User logout' });
  // Reset password
  const resetPassword = withErrorHandling(async (email) => {
    try {
      logger.info('Password reset attempt', { email });
      const { data, error: resetError } = await supabase.auth.api.resetPasswordForEmail(email);
      
      if (resetError) {
        logger.warn('Password reset failed', { email, error: resetError.message });
        return { error: resetError };
      }
      
      logger.info('Password reset email sent', { email });
      return { data };
    } catch (err) {
      logger.error('Password reset error', { email, error: err.message });
      throw err;
    }
  }, { context: 'Password reset' });

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        loading, 
        error,
        register, 
        login, 
        logout, 
        resetPassword, 
        loginAsGuest 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
