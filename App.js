import React, { useEffect } from 'react';
import { AuthProvider } from './src/contexts/AuthContext';
import Navigation from './src/navigation';
import NetInfo from '@react-native-community/netinfo';
import { processQueue } from './src/services/offlineService';

export default function App() {
  useEffect(() => {
    processQueue();
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) processQueue();
    });
    return () => unsubscribe();
  }, []);
  return (
    <AuthProvider>
      <Navigation />
    </AuthProvider>
  );
}
