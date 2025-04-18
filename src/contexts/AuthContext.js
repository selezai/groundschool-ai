import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabaseClient';

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

  useEffect(() => {
    const session = supabase.auth.session();
    setUser(session?.user || null);

    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null);
    });
    return () => {
      listener.unsubscribe();
    };
  }, []);

  const register = (email, password) => supabase.auth.signUp({ email, password });
  const login = async (email, password) => {
    const key = 'failedLoginAttempts';
    const now = Date.now();
    const windowMs = 15 * 60 * 1000;
    const data = await AsyncStorage.getItem(key);
    const attempts = data ? JSON.parse(data) : [];
    const recent = attempts.filter(ts => now - ts < windowMs);
    if (recent.length >= 5) {
      return { error: { message: 'Too many login attempts, please try again later.' } };
    }
    const { user: u, error } = await supabase.auth.signIn({ email, password });
    if (error) {
      recent.push(now);
      await AsyncStorage.setItem(key, JSON.stringify(recent));
      return { error };
    }
    await AsyncStorage.removeItem(key);
    setUser(u);
    return { user: u };
  };
  const loginAsGuest = () => {
    setUser({ isGuest: true });
  };
  const logout = () => supabase.auth.signOut();
  const resetPassword = (email) => supabase.auth.api.resetPasswordForEmail(email);

  return (
    <AuthContext.Provider value={{ user, register, login, logout, resetPassword, loginAsGuest }}>
      {children}
    </AuthContext.Provider>
  );
};
