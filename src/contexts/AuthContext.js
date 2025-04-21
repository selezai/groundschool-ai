import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabaseClient';

export const AuthContext = createContext({
  user: null,
  session: null,
  signUp: async () => {},
  signIn: async () => {},
  signOut: async () => {},
  resetPassword: async () => {},
  loginAsGuest: () => {},
  loading: false,
  error: null
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    const session = supabase.auth.session();
    setSession(session);
    setUser(session?.user ?? null);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });
    setLoading(false);
    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email, password) => {
    setLoading(true);
    setError(null);
    const { user, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) setError(error.message);
    return { user, error };
  };

  const signIn = async (email, password) => {
    setLoading(true);
    setError(null);
    const { user, error } = await supabase.auth.signIn({ email, password });
    setLoading(false);
    if (error) setError(error.message);
    return { user, error };
  };

  const signOut = async () => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signOut();
    setLoading(false);
    if (error) setError(error.message);
    return { error };
  };

  const resetPassword = async (email) => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.api.resetPasswordForEmail(email);
    setLoading(false);
    if (error) setError(error.message);
    return { data, error };
  };

  // Allow anonymous guest login for quick demo / offline flows
  const loginAsGuest = () => {
    setUser({ id: 'guest', isGuest: true });
  };

  return (
    <AuthContext.Provider value={{ user, session, signUp, signIn, signOut, resetPassword, loginAsGuest, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
