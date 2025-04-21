import React, { useState, useContext, _useEffect } from 'react'; // _useEffect kept for potential future use
import { View, TextInput, Text, StyleSheet } from 'react-native';
import COLORS from '../../constants/colors';
import { AuthContext } from '../../contexts/AuthContext';
import { useTheme, spacing, typography } from '../../theme/theme';
import ThemedButton from '../../components/ThemedButton';

const SignupScreen = ({ navigation }) => {
  const { register } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const colors = useTheme();

  const handleSignup = async () => {
    setError(null);
    setMessage(null);
    const { error } = await register(email, password);
    if (error) {
      setError(error.message);
    } else {
      setMessage('Confirmation email sent. Please check your inbox.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[typography.title, { color: colors.text, marginBottom: spacing.md }]} >Sign Up</Text>
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
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <ThemedButton title="Sign Up" onPress={handleSignup} style={{ marginBottom: spacing.sm }} accessibilityLabel="Sign Up button" />
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

export default SignupScreen;
