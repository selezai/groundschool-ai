import React, { useState, useContext, useEffect, useCallback } from 'react';
import { View, Text, ActivityIndicator, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../../lib/supabaseClient';
import { AuthContext } from '../../contexts/AuthContext';
import NetInfo from '@react-native-community/netinfo';
import { queueOperation, getOfflineStatus, cacheDocument } from '../../services/offlineService';
import { useTheme, spacing, typography } from '../../theme/theme';
import ThemedButton from '../../components/ThemedButton';

const DocumentUploadScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [filePreview, setFilePreview] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const colors = useTheme();
  
  // Check network status
  const checkConnectivity = useCallback(async () => {
    const networkState = await NetInfo.fetch();
    setIsOffline(!networkState.isConnected);
  }, []);
  
  // Initial connectivity check
  useEffect(() => {
    checkConnectivity();
    
    // Set up network state listener
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });
    
    return () => unsubscribe();
  }, [checkConnectivity]);

  const pickDocument = async () => {
    try {
      setError('');
      setMessage('');
      setUploadProgress(0);
      
      const res = await DocumentPicker.getDocumentAsync({ 
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true
      });
      
      if (res.canceled || !res.assets || res.assets.length === 0) return;
      
      const selectedFile = res.assets[0];
      const fileUri = selectedFile.uri;
      const fileName = selectedFile.name;
      const fileSize = selectedFile.size;
      const fileMimeType = selectedFile.mimeType;
      
      // Validate file type
      const isPdf = fileMimeType === 'application/pdf' || fileName.endsWith('.pdf');
      const isImage = fileMimeType && fileMimeType.startsWith('image/');
      
      if (!isPdf && !isImage) {
        setError('Only PDF and image files are supported');
        return;
      }
      
      // Validate file size
      if (isPdf && fileSize > 10 * 1024 * 1024) {
        setError('PDF files must be 10MB or smaller');
        return;
      }
      
      if (isImage && fileSize > 5 * 1024 * 1024) {
        setError('Image files must be 5MB or smaller');
        return;
      }
      
      // Set file info
      const fileInfo = {
        uri: fileUri,
        name: fileName,
        size: fileSize,
        mimeType: fileMimeType
      };
      
      setFile(fileInfo);
      setFileName(fileName);
      
      // Generate preview for images
      if (isImage) {
        setFilePreview(fileUri);
      } else if (isPdf) {
        // For PDFs, just show an icon in the UI
        setFilePreview(null);
      }
    } catch (err) {
      console.error('Error picking document:', err);
      setError('Failed to select document. Please try again.');
    }
  };

  // Handle document upload
  const uploadDocument = async () => {
    if (!file) {
      setError('Please select a document first');
      return;
    }
    
    setError('');
    setMessage('');
    setUploading(true);
    setUploadProgress(0);
    
    try {
      // Check network status
      const netState = await NetInfo.fetch();
      
      // If offline, queue the upload and cache the document
      if (!netState.isConnected) {
        // Create a unique ID for the document
        const docId = `offline-${Date.now()}`;
        
        // Cache the document locally
        const cachedDoc = {
          id: docId,
          name: file.name,
          file_size: file.size,
          file_type: file.mimeType,
          user_id: user.id,
          timestamp: Date.now(),
          uri: file.uri
        };
        
        // Save to local cache
        await cacheDocument(cachedDoc);
        
        // Queue the upload operation for when we're back online
        await queueOperation({ 
          type: 'uploadDocument', 
          payload: { userId: user.id, file },
          priority: 8 // High priority
        });
        
        setMessage('Document saved offline. It will be uploaded when you reconnect.');
        
        // Reset state
        setFile(null);
        setFileName('');
        setFilePreview(null);
        setUploading(false);
        
        // Navigate back to library after short delay
        setTimeout(() => {
          navigation.goBack();
        }, 1500);
        
        return;
      }
      
      // If online, proceed with upload
      try {
        // Simulate upload progress
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            const newProgress = prev + (0.1 * (1 - prev));
            return newProgress > 0.95 ? 0.95 : newProgress;
          });
        }, 300);
        
        // Get file data
        const response = await fetch(file.uri);
        const blob = await response.blob();
        
        // Create a unique path with timestamp to avoid collisions
        const path = `${user.id}/${Date.now()}-${file.name}`;
        
        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(path, blob);
          
        clearInterval(progressInterval);
        
        if (uploadError) {
          setError(`Upload failed: ${uploadError.message}`);
          setUploading(false);
          return;
        }
        
        setUploadProgress(0.98);
        
        // Insert record in database
        const { error: dbError } = await supabase
          .from('documents')
          .insert({
            user_id: user.id,
            name: file.name,
            file_path: path,
            file_size: file.size,
            file_type: file.mimeType,
            uploaded_at: new Date().toISOString(),
            processed: false,
          });
          
        if (dbError) {
          setError(`Database error: ${dbError.message}`);
        } else {
          setUploadProgress(1);
          setMessage('Document uploaded successfully!');
          
          // Reset state
          setFile(null);
          setFileName('');
          setFilePreview(null);
          
          // Navigate back to library after short delay
          setTimeout(() => {
            navigation.goBack();
          }, 1500);
        }
      } catch (err) {
        console.error('Upload error:', err);
        setError(`Upload failed: ${err.message}`);
      }
    } catch (err) {
      console.error('General error:', err);
      setError(`An error occurred: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };
  
  // Cancel upload and reset state
  const cancelUpload = () => {
    setFile(null);
    setFileName('');
    setFilePreview(null);
    setError('');
    setMessage('');
    setUploadProgress(0);
  };

  // Render progress bar
  const renderProgressBar = () => {
    if (uploadProgress === 0) return null;
    
    return (
      <View style={styles.progressContainer}>
        <View 
          style={[
            styles.progressBar, 
            { 
              width: `${uploadProgress * 100}%`,
              backgroundColor: uploadProgress === 1 ? colors.success : colors.primary 
            }
          ]}
        />
        <Text style={[typography.label, { color: colors.text }]}>
          {uploadProgress === 1 ? 'Complete' : `${Math.round(uploadProgress * 100)}%`}
        </Text>
      </View>
    );
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >  
      {/* Offline indicator */}
      {isOffline && (
        <View style={[styles.offlineBar, { backgroundColor: colors.info }]}>
          <Ionicons name="cloud-offline-outline" size={16} color={colors.secondary} />
          <Text style={[typography.label, { color: colors.secondary, marginLeft: spacing.xs }]}>
            Offline Mode - Documents will be saved locally
          </Text>
        </View>
      )}
      
      {/* Main content */}
      <View style={styles.mainContent}>
        {/* Document selection area */}
        {!file ? (
          <TouchableOpacity 
            style={[styles.dropZone, { borderColor: colors.border }]} 
            onPress={pickDocument}
            activeOpacity={0.7}
          >
            <Ionicons name="cloud-upload-outline" size={48} color={colors.primary} />
            <Text style={[typography.body, { color: colors.text, marginTop: spacing.md }]}>
              Tap to select a document
            </Text>
            <Text style={[typography.label, { color: colors.info, marginTop: spacing.xs }]}>
              PDF (max 10MB) or Images (max 5MB)
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.filePreviewContainer}>
            {/* File preview */}
            <View style={[styles.filePreview, { borderColor: colors.border }]}>
              {filePreview ? (
                <Image source={{ uri: filePreview }} style={styles.imagePreview} resizeMode="contain" />
              ) : (
                <View style={styles.pdfPreview}>
                  <Ionicons name="document-text" size={48} color={colors.primary} />
                  <Text style={[typography.label, { color: colors.text, marginTop: spacing.xs }]}>PDF Document</Text>
                </View>
              )}
            </View>
            
            {/* File name */}
            <Text 
              style={[typography.body, { color: colors.text, marginTop: spacing.sm }]}
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {fileName}
            </Text>
            
            {/* File size */}
            {file.size && (
              <Text style={[typography.label, { color: colors.info }]}>
                {(file.size / 1024).toFixed(1)} KB
              </Text>
            )}
            
            {/* Cancel button */}
            {!uploading && (
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={cancelUpload}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={24} color={colors.error} />
              </TouchableOpacity>
            )}
          </View>
        )}
        
        {/* Error and success messages */}
        {error && (
          <View style={styles.messageContainer}>
            <Ionicons name="alert-circle" size={20} color={colors.error} />
            <Text style={[styles.error, { color: colors.error, marginLeft: spacing.xs }]}>{error}</Text>
          </View>
        )}
        
        {message && (
          <View style={styles.messageContainer}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={[styles.message, { color: colors.success, marginLeft: spacing.xs }]}>{message}</Text>
          </View>
        )}
        
        {/* Progress bar */}
        {renderProgressBar()}
        
        {/* Upload button */}
        {file && !uploading && (
          <ThemedButton 
            title={isOffline ? "Save Document Offline" : "Upload Document"} 
            onPress={uploadDocument} 
            style={{ marginTop: spacing.md }}
            accessibilityLabel="Upload Document button" 
          />
        )}
        
        {/* Loading indicator */}
        {uploading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[typography.body, { color: colors.text, marginTop: spacing.md }]}>
              {isOffline ? 'Saving document offline...' : 'Uploading document...'}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1
  },
  contentContainer: {
    padding: spacing.md,
    flexGrow: 1
  },
  offlineBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
    marginBottom: spacing.md,
    borderRadius: spacing.xs
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  dropZone: {
    width: '100%',
    aspectRatio: 1.5,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md
  },
  filePreviewContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.md,
    position: 'relative'
  },
  filePreview: {
    width: '100%',
    aspectRatio: 1.5,
    borderWidth: 1,
    borderRadius: spacing.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center'
  },
  imagePreview: {
    width: '100%',
    height: '100%'
  },
  pdfPreview: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: 'white',
    borderRadius: 20
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    alignSelf: 'flex-start'
  },
  error: { 
    marginTop: spacing.xs 
  },
  message: { 
    marginTop: spacing.xs 
  },
  progressContainer: {
    width: '100%',
    height: 24,
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    marginTop: spacing.md,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center'
  },
  progressBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    borderRadius: 12
  },
  loadingContainer: {
    marginTop: spacing.xl,
    alignItems: 'center'
  }
});

export default DocumentUploadScreen;
