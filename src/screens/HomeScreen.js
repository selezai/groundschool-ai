import React, { useContext } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AuthContext } from '../contexts/AuthContext';
import ThemedButton from '../components/ThemedButton';
import { useTheme, spacing, typography } from '../theme/theme';

const HomeScreen = () => {
  const { user, logout } = useContext(AuthContext);
  const colors = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <Text style={[typography.title, { color: colors.text, marginBottom: spacing.md }]}>Welcome, {user?.email ?? 'Guest'}!</Text>
      <ThemedButton title="Logout" onPress={logout} accessibilityLabel="Logout button" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }
});

export default HomeScreen;
