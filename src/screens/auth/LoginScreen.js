import React, { useState, useContext } from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import COLORS from '../../constants/colors';
import { useTheme, spacing, typography } from '../../theme/theme';
import ThemedButton from '../../components/ThemedButton';
import { AuthContext } from '../../contexts/AuthContext';

const LoginScreen = ({ navigation }) => {
  const { login, loginAsGuest } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const colors = useTheme();

  const handleLogin = async () => {
    const { error } = await login(email, password);
    if (error) setError(error.message);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[typography.title, { color: colors.text, marginBottom: spacing.md }]}>Login</Text>
      {error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}
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
      <ThemedButton title="Login" onPress={handleLogin} style={{ marginBottom: spacing.sm }} accessibilityLabel="Login button" />
      <ThemedButton title="Continue as Guest" onPress={() => loginAsGuest()} accessibilityLabel="Continue as Guest button" />
      <View style={styles.links}>
        <Text onPress={() => navigation.navigate('Signup')} style={styles.link}>Sign Up</Text>
        <Text onPress={() => navigation.navigate('ForgotPassword')} style={styles.link}>Forgot Password?</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md, justifyContent: 'center' },
  input: { borderWidth: 1, borderColor: COLORS.gray, padding: spacing.sm, marginBottom: spacing.sm, borderRadius: spacing.xs },
  error: { marginBottom: spacing.sm },
  links: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  link: { color: COLORS.blue }
});

export default LoginScreen;
