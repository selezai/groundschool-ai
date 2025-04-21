import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';

const OfflineNotification = () => {
  const [isOffline, setIsOffline] = useState(false);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const offline = !state.isConnected;
      setIsOffline(offline);
    });

    return () => unsubscribe();
  }, []);

  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      top: insets.top,
      left: 0,
      right: 0,
      backgroundColor: colors.error,
      padding: 10,
      zIndex: 1000,
    },
    text: {
      color: colors.white || colors.background || '#FFFFFF', // Use theme colors instead of literals
      textAlign: 'center',
      fontWeight: 'bold',
    }
  });

  if (!isOffline) return null;

  return (
    <View 
      style={styles.container}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      testID="offline-notification"
    >
      <Text style={styles.text}>
        You are currently offline. Some features may be limited.
      </Text>
    </View>
  );
};

export default OfflineNotification;
