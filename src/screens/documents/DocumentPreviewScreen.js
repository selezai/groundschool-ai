import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Dimensions, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabaseClient';
import { useTheme, spacing, typography } from '../../theme/theme';
import { WebView } from 'react-native-webview';
import NetInfo from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system';

const DocumentPreviewScreen = ({ route, navigation }) => {
  const { filePath, isCached } = route.params;
  const [url, setUrl] = useState(null);
  const [localUri, setLocalUri] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const colors = useTheme();

  // Check network status
  const checkConnectivity = useCallback(async () => {
    const networkState = await NetInfo.fetch();
    setIsOffline(!networkState.isConnected);
    return networkState.isConnected;
  }, []);
  
  // Load document from either remote or local cache
  useEffect(() => {
    const loadDocument = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Check if we're online
        const isConnected = await checkConnectivity();
        
        // If this is a cached document or we're offline, try to load from cache
        if (isCached || !isConnected) {
          // For cached documents, the filePath might be the local URI
          if (filePath.startsWith('file://') || filePath.startsWith('/')) {
            setLocalUri(filePath);
            setLoading(false);
            return;
          }
        }
        
        // If we're online, try to get from Supabase
        if (isConnected) {
          const { publicURL } = supabase.storage
            .from('documents')
            .getPublicUrl(filePath);
            
          if (publicURL) {
            setUrl(publicURL);
            
            // Try to download and cache the file for offline use
            try {
              const fileExt = filePath.split('.').pop().toLowerCase();
              const localFilePath = `${FileSystem.cacheDirectory}document-${Date.now()}.${fileExt}`;
              
              await FileSystem.downloadAsync(publicURL, localFilePath);
              setLocalUri(localFilePath);
            } catch (downloadErr) {
              console.warn('Failed to cache document:', downloadErr);
              // Continue with online viewing even if caching fails
            }
          } else {
            throw new Error('Failed to get public URL for document');
          }
        } else {
          throw new Error('You are offline and this document is not available in your cache');
        }
      } catch (err) {
        console.error('Error loading document:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    loadDocument();
    
    // Set up network state listener
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });
    
    return () => unsubscribe();
  }, [filePath, isCached, checkConnectivity]);

  // Determine file type
  const getFileExtension = () => {
    if (localUri) {
      return localUri.split('.').pop().toLowerCase();
    }
    if (filePath) {
      return filePath.split('.').pop().toLowerCase();
    }
    return '';
  };
  
  const extension = getFileExtension();
  const isPdf = extension === 'pdf';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension);
  
  // Handle back button press
  const handleBack = () => {
    navigation.goBack();
  };
  
  // Show loading indicator while document is being loaded
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        <Text style={[typography.body, { color: colors.text, marginTop: spacing.md }]}>
          Loading document...
        </Text>
      </View>
    );
  }
  
  // Show error message if document failed to load
  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={[typography.body, { color: colors.error, marginTop: spacing.md, textAlign: 'center' }]}>
            {error}
          </Text>
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: colors.primary, marginTop: spacing.xl }]}
            onPress={handleBack}
          >
            <Text style={[typography.body, { color: colors.secondary }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  // If we don't have a URL or local URI, show error
  if (!url && !localUri) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="document-outline" size={48} color={colors.error} />
          <Text style={[typography.body, { color: colors.error, marginTop: spacing.md, textAlign: 'center' }]}>
            Document not available
          </Text>
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: colors.primary, marginTop: spacing.xl }]}
            onPress={handleBack}
          >
            <Text style={[typography.body, { color: colors.secondary }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>      
      {/* Offline indicator */}
      {isOffline && (
        <View style={[styles.offlineBar, { backgroundColor: colors.info }]}>
          <Ionicons name="cloud-offline-outline" size={16} color={colors.secondary} />
          <Text style={[typography.label, { color: colors.secondary, marginLeft: spacing.xs }]}>
            Offline Mode - Viewing cached document
          </Text>
        </View>
      )}
      
      {/* Back button */}
      <TouchableOpacity 
        style={[styles.backButton, { backgroundColor: colors.primary }]}
        onPress={handleBack}
      >
        <Ionicons name="arrow-back" size={24} color={colors.secondary} />
      </TouchableOpacity>
      
      {/* Document viewer */}
      {isPdf ? (
        <WebView
          source={{ uri: localUri || url }}
          style={styles.webview}
          startInLoadingState={true}
          renderLoading={() => (
            <ActivityIndicator size="large" color={colors.primary} style={styles.webviewLoader} />
          )}
        />
      ) : isImage ? (
        <Image
          source={{ uri: localUri || url }}
          style={styles.image}
          resizeMode="contain"
        />
      ) : (
        <View style={styles.unsupportedContainer}>
          <Ionicons name="document-outline" size={48} color={colors.primary} />
          <Text style={[typography.body, { color: colors.text, marginTop: spacing.md, textAlign: 'center' }]}>
            This file type cannot be previewed
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  offlineBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10
  },
  backButton: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  loader: { 
    flex: 1,
    alignSelf: 'center'
  },
  webviewLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center'
  },
  webview: { 
    flex: 1,
    marginTop: spacing.xl // Space for the offline indicator
  },
  image: { 
    flex: 1, 
    width: Dimensions.get('window').width,
    marginTop: spacing.xl // Space for the offline indicator
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl
  },
  unsupportedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    marginTop: spacing.xl // Space for the offline indicator
  }
});

export default DocumentPreviewScreen;
