import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';
import * as logger from './loggerService';

/**
 * Sign in a user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} - User data
 */
export async function signIn(email, password) {
  try {
    logger.info('Attempting to sign in user', { email });
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      logger.error('Sign in error', { error: error.message });
      throw new Error(error.message);
    }
    
    logger.info('User signed in successfully', { userId: data.user.id });
    
    // Store auth data in AsyncStorage
    await AsyncStorage.setItem('auth_user', JSON.stringify(data.user));
    await AsyncStorage.setItem('auth_session', JSON.stringify(data.session));
    
    return data;
  } catch (error) {
    logger.error('Sign in exception', { error: error.message });
    throw error;
  }
}

/**
 * Sign up a new user
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} displayName - User display name
 * @returns {Promise<Object>} - User data
 */
export async function signUp(email, password, displayName) {
  try {
    logger.info('Attempting to sign up user', { email });
    
    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      },
    });
    
    if (error) {
      logger.error('Sign up error', { error: error.message });
      throw new Error(error.message);
    }
    
    logger.info('User signed up successfully', { userId: data.user.id });
    
    // Create user profile in database
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([
        {
          id: data.user.id,
          email,
          display_name: displayName,
          created_at: new Date().toISOString(),
        },
      ]);
    
    if (profileError) {
      logger.error('Error creating user profile', { error: profileError.message });
      // We don't throw here as the auth was successful
    }
    
    // Store auth data in AsyncStorage
    await AsyncStorage.setItem('auth_user', JSON.stringify(data.user));
    await AsyncStorage.setItem('auth_session', JSON.stringify(data.session));
    
    return data;
  } catch (error) {
    logger.error('Sign up exception', { error: error.message });
    throw error;
  }
}

/**
 * Sign out the current user
 * @returns {Promise<void>}
 */
export async function signOut() {
  try {
    logger.info('Signing out user');
    
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      logger.error('Sign out error', { error: error.message });
      throw new Error(error.message);
    }
    
    // Clear auth data from AsyncStorage
    await AsyncStorage.removeItem('auth_user');
    await AsyncStorage.removeItem('auth_session');
    
    logger.info('User signed out successfully');
  } catch (error) {
    logger.error('Sign out exception', { error: error.message });
    throw error;
  }
}

/**
 * Get the current user from AsyncStorage
 * @returns {Promise<Object|null>} - User data or null if not signed in
 */
export async function getCurrentUser() {
  try {
    const userString = await AsyncStorage.getItem('auth_user');
    if (!userString) return null;
    
    return JSON.parse(userString);
  } catch (error) {
    logger.error('Error getting current user', { error: error.message });
    return null;
  }
}

/**
 * Get the current session from AsyncStorage
 * @returns {Promise<Object|null>} - Session data or null if not signed in
 */
export async function getCurrentSession() {
  try {
    const sessionString = await AsyncStorage.getItem('auth_session');
    if (!sessionString) return null;
    
    return JSON.parse(sessionString);
  } catch (error) {
    logger.error('Error getting current session', { error: error.message });
    return null;
  }
}

/**
 * Reset password for a user
 * @param {string} email - User email
 * @returns {Promise<void>}
 */
export async function resetPassword(email) {
  try {
    logger.info('Requesting password reset', { email });
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'groundschoolai://reset-password',
    });
    
    if (error) {
      logger.error('Password reset error', { error: error.message });
      throw new Error(error.message);
    }
    
    logger.info('Password reset email sent', { email });
  } catch (error) {
    logger.error('Password reset exception', { error: error.message });
    throw error;
  }
}

/**
 * Update user profile
 * @param {string} userId - User ID
 * @param {Object} updates - Profile updates
 * @returns {Promise<Object>} - Updated profile data
 */
export async function updateProfile(userId, updates) {
  try {
    logger.info('Updating user profile', { userId });
    
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      logger.error('Profile update error', { error: error.message });
      throw new Error(error.message);
    }
    
    logger.info('Profile updated successfully', { userId });
    return data;
  } catch (error) {
    logger.error('Profile update exception', { error: error.message });
    throw error;
  }
}
