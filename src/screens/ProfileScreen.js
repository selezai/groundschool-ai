import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import ThemedButton from '../components/ThemedButton';
import { useTheme, spacing, typography } from '../theme/theme';

const ProfileScreen = () => {
  const { user, resetPassword, signOut } = useAuth();
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const colors = useTheme();

  const handleResetPassword = async () => {
    setError(null);
    setMessage(null);
    try {
      const { error: err } = await resetPassword(user.email);
      if (err) setError(err.message);
      else setMessage('Password reset email sent');
    } catch (e) {
      setError(e.message);
    }
  };

  const handleSignOut = async () => {
    setError(null);
    setMessage(null);
    const { error: err } = await signOut();
    if (err) setError(err.message);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>  
      <Text style={[typography.title, { color: colors.text, marginBottom: spacing.sm }]}>Profile</Text>
      <Text style={[typography.body, { color: colors.text }]}>Email: {user.email}</Text>
      {error && <Text style={[typography.body, { color: colors.error, marginTop: spacing.sm }]}>{error}</Text>}
      {message && <Text style={[typography.body, { color: colors.success, marginTop: spacing.sm }]}>{message}</Text>}
      <ThemedButton title="Change Password" onPress={handleResetPassword} style={{ marginTop: spacing.md }} accessibilityLabel="Change Password button" />
      <ThemedButton title="Sign Out" onPress={handleSignOut} style={{ marginTop: spacing.md }} accessibilityLabel="Sign Out button" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 }
});

export default ProfileScreen;
