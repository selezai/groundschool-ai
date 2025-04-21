import React, { useState, useContext } from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import COLORS from '../../constants/colors';
import { AuthContext } from '../../contexts/AuthContext';
import { useTheme, spacing, typography } from '../../theme/theme';
import ThemedButton from '../../components/ThemedButton';

const ForgotPasswordScreen = ({ navigation }) => {
  const { resetPassword } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const colors = useTheme();

  const handleReset = async () => {
    setError(null);
    setMessage(null);
    const { error } = await resetPassword(email);
    if (error) {
      setError(error.message);
    } else {
      setMessage('If an account exists, a reset link has been sent.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[typography.title, { color: colors.text, marginBottom: spacing.md }]}>Reset Password</Text>
      {error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}
      {message && <Text style={[styles.message, { color: colors.success }]}>{message}</Text>}
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <ThemedButton title="Send Reset Link" onPress={handleReset} style={{ marginBottom: spacing.sm }} accessibilityLabel="Send Reset Link button" />
      <ThemedButton title="Back to Login" onPress={() => navigation.navigate('Login')} accessibilityLabel="Back to Login button" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md, justifyContent: 'center' },
  input: { borderWidth: 1, borderColor: COLORS.gray, padding: spacing.sm, marginBottom: spacing.sm, borderRadius: spacing.xs },
  error: { marginBottom: spacing.sm, textAlign: 'center' },
  message: { marginBottom: spacing.sm, textAlign: 'center' }
});

export default ForgotPasswordScreen;
