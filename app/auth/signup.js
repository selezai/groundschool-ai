import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Alert
} from 'react-native';
import COLORS from '../../src/constants/colors';
import { useRouter } from 'expo-router';
import { Ionicons as _Ionicons } from '@expo/vector-icons'; // Kept for future use
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/theme/theme';
import ThemedInput from '../../src/components/ThemedInput';
import ThemedButton from '../../src/components/ThemedButton';
import * as logger from '../../src/services/loggerService';

/**
 * Sign up screen for new user registration
 */
export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  const router = useRouter();
  const { signUp } = useAuth();
  const { colors: _colors, spacing: _spacing } = useTheme(); // Kept for future use

  const validateForm = () => {
    const newErrors = {};
    
    if (!email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email is invalid';
    
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    
    if (!confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    
    if (!displayName) newErrors.displayName = 'Name is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    try {
      await signUp(email, password, displayName);
      logger.info('User signed up successfully', { email });
      router.replace('/');
    } catch (error) {
      logger.error('Sign up error', { error: error.message });
      
      // Show appropriate error message
      const errorMessage = error.message || 'Failed to sign up. Please try again.';
      if (Platform.OS === 'web') {
        alert(errorMessage);
      } else {
        Alert.alert('Sign Up Failed', errorMessage);
      }
      
      // Clear password fields on error
      setPassword('');
      setConfirmPassword('');
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToLogin = () => {
    router.replace('/auth/login');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up to start using GroundSchool AI</Text>
        </View>
        
        <View style={styles.form}>
          <ThemedInput
            label="Full Name"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Enter your full name"
            autoCapitalize="words"
            error={errors.displayName}
            iconName="person-outline"
            testID="signup-name-input"
          />
          
          <ThemedInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
            iconName="mail-outline"
            testID="signup-email-input"
          />
          
          <ThemedInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Create a password"
            secureTextEntry
            error={errors.password}
            iconName="lock-closed-outline"
            testID="signup-password-input"
          />
          
          <ThemedInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm your password"
            secureTextEntry
            error={errors.confirmPassword}
            iconName="lock-closed-outline"
            testID="signup-confirm-password-input"
          />
          
          <ThemedButton
            title="Sign Up"
            onPress={handleSignUp}
            loading={isLoading}
            disabled={isLoading}
            variant="primary"
            accessibilityLabel="Sign up button"
            testID="signup-button"
            style={styles.signupButton}
          />
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity onPress={navigateToLogin}>
            <Text style={styles.loginLink}>Log In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
  },
  form: {
    marginBottom: 24,
  },
  signupButton: {
    marginTop: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  footerText: {
    fontSize: 14,
    color: COLORS.gray,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary, // Using theme color instead of literal
    marginLeft: 4,
  },
});
