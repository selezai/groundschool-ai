import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AuthContext } from '../contexts/AuthContext';
import ThemedButton from '../components/ThemedButton';
import { useTheme, spacing, typography } from '../theme/theme';

const ProfileScreen = () => {
  const { user, resetPassword } = useContext(AuthContext);
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>  
      <Text style={[typography.title, { color: colors.text, marginBottom: spacing.sm }]}>Profile</Text>
      <Text style={[typography.body, { color: colors.text }]}>Email: {user.email}</Text>
      {error && <Text style={[typography.body, { color: colors.error, marginTop: spacing.sm }]}>{error}</Text>}
      {message && <Text style={[typography.body, { color: colors.success, marginTop: spacing.sm }]}>{message}</Text>}
      <ThemedButton title="Change Password" onPress={handleResetPassword} style={{ marginTop: spacing.md }} accessibilityLabel="Change Password button" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 }
});

export default ProfileScreen;
