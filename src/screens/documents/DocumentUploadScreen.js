import React, { useState, useContext } from 'react';
import { View, Text, ActivityIndicator, TextInput, StyleSheet } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '../../lib/supabaseClient';
import { AuthContext } from '../../contexts/AuthContext';
import NetInfo from '@react-native-community/netinfo';
import { queueOperation } from '../../services/offlineService';
import { useTheme, spacing, typography } from '../../theme/theme';
import ThemedButton from '../../components/ThemedButton';

const DocumentUploadScreen = () => {
  const { user } = useContext(AuthContext);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const colors = useTheme();

  const pickDocument = async () => {
    setError('');
    setMessage('');
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'] });
    if (res.type === 'cancel') return;
    const isPdf = res.mimeType === 'application/pdf' || res.name.endsWith('.pdf');
    if (isPdf && res.size > 10 * 1024 * 1024) {
      setError('PDF must be <=10MB');
      return;
    }
    if (!isPdf && res.size > 5 * 1024 * 1024) {
      setError('Image must be <=5MB');
      return;
    }
    setFile(res);
  };

  const uploadDocument = async () => {
    if (!file) return;
    setUploading(true);
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      await queueOperation({ type: 'uploadDocument', payload: { userId: user.id, file } });
      setMessage('Offline: upload queued. It will sync when back online.');
      setFile(null);
      setUploading(false);
      return;
    }
    try {
      const response = await fetch(file.uri);
      const blob = await response.blob();
      const path = `${user.id}/${file.name}`;
      const { error: uploadError } = await supabase.storage.from('documents').upload(path, blob);
      if (uploadError) {
        setError(uploadError.message);
        setUploading(false);
        return;
      }
      const { error: dbError } = await supabase.from('documents').insert({
        user_id: user.id,
        name: file.name,
        file_path: path,
        file_size: file.size,
        file_type: file.mimeType,
      });
      if (dbError) {
        setError(dbError.message);
      } else {
        setMessage('Uploaded successfully!');
        setFile(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>  
      <ThemedButton title="Select Document" onPress={pickDocument} style={{ marginBottom: spacing.sm }} accessibilityLabel="Select Document button" />
      {file && <Text style={[typography.body, { color: colors.text, marginBottom: spacing.sm }]}>{file.name}</Text>}
      {error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}
      {message && <Text style={[styles.message, { color: colors.success }]}>{message}</Text>}
      {uploading ? (
        <ActivityIndicator size="large" style={{ marginVertical: spacing.sm }} />
      ) : (
        file && <ThemedButton title="Upload Document" onPress={uploadDocument} accessibilityLabel="Upload Document button" />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  fileName: { marginTop: 8, fontSize: 16 },
  error: { color: 'red', marginTop: 8 },
  message: { color: 'green', marginTop: 8 },
});

export default DocumentUploadScreen;
