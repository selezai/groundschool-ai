import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as logger from './loggerService';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://example.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example';

// Create a custom storage implementation for AsyncStorage
const AsyncStorageAdapter = {
  getItem: async (key) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      logger.error('Error getting item from AsyncStorage', { key, error: error.message });
      return null;
    }
  },
  setItem: async (key, value) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      logger.error('Error setting item in AsyncStorage', { key, error: error.message });
    }
  },
  removeItem: async (key) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      logger.error('Error removing item from AsyncStorage', { key, error: error.message });
    }
  },
};

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Log initialization
logger.info('Supabase client initialized', { url: supabaseUrl });

/**
 * Initialize the Supabase client and set up listeners
 * @returns {Promise<void>}
 */
export async function initializeSupabase() {
  try {
    // Set up auth state change listener
    supabase.auth.onAuthStateChange((event, session) => {
      logger.info('Auth state changed', { event });
      
      if (event === 'SIGNED_IN') {
        logger.info('User signed in', { userId: session.user.id });
      } else if (event === 'SIGNED_OUT') {
        logger.info('User signed out');
      } else if (event === 'TOKEN_REFRESHED') {
        logger.info('Auth token refreshed');
      }
    });
    
    // Check if we have an existing session
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      logger.error('Error getting session', { error: error.message });
    } else if (data.session) {
      logger.info('Existing session found', { userId: data.session.user.id });
    } else {
      logger.info('No existing session found');
    }
  } catch (error) {
    logger.error('Error initializing Supabase', { error: error.message });
  }
}

/**
 * Get the current user from Supabase
 * @returns {Promise<Object|null>} - User data or null if not signed in
 */
export async function getCurrentUser() {
  try {
    const { data, error } = await supabase.auth.getUser();
    
    if (error) {
      logger.error('Error getting current user', { error: error.message });
      return null;
    }
    
    return data.user;
  } catch (error) {
    logger.error('Exception getting current user', { error: error.message });
    return null;
  }
}
