import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AuthProvider, AuthContext } from '../src/contexts/AuthContext';
import { Text, Button } from 'react-native';

// Mock AsyncStorage and Supabase
import _AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase as _supabase } from '../src/services/supabaseClient';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));
jest.mock('../src/services/supabaseClient', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
      api: { resetPasswordForEmail: jest.fn() },
      session: jest.fn(() => null),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    }
  }
}));

describe('AuthContext', () => {
  function TestComponent() {
    const { user, loginAsGuest } = React.useContext(AuthContext);
    return (
      <>
        <Text testID="user">{user?.isGuest ? 'guest' : 'no-user'}</Text>
        <Button testID="login-guest" title="Login Guest" onPress={loginAsGuest} />
      </>
    );
  }

  it('loginAsGuest updates user to guest', () => {
    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    expect(getByTestId('user').props.children).toBe('no-user');
    fireEvent.press(getByTestId('login-guest'));
    expect(getByTestId('user').props.children).toBe('guest');
  });
});
