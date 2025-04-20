import React, { useState, useEffect, useContext, useCallback } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabaseClient';
import { AuthContext } from '../../contexts/AuthContext';
import { useTheme, spacing, typography } from '../../theme/theme';
import ThemedButton from '../../components/ThemedButton';
import { getCachedDocuments, processQueue, getOfflineStatus } from '../../services/offlineService';
import NetInfo from '@react-native-community/netinfo';

const DocumentLibraryScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [documents, setDocuments] = useState([]);
  const [cachedDocuments, setCachedDocuments] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [pendingUploads, setPendingUploads] = useState(0);
  const colors = useTheme();

  // Check network status and get offline status
  const checkConnectivity = useCallback(async () => {
    const networkState = await NetInfo.fetch();
    const offlineStatus = await getOfflineStatus();
    setIsOffline(!networkState.isConnected);
    setPendingUploads(offlineStatus.pendingOperations);
  }, []);

  // Fetch both remote and cached documents
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      // Check connectivity first
      await checkConnectivity();
      
      // Get cached documents
      const cached = await getCachedDocuments();
      setCachedDocuments(cached);
      
      // Try to get remote documents if online
      const networkState = await NetInfo.fetch();
      if (networkState.isConnected) {
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('user_id', user.id)
          .order('uploaded_at', { ascending: false });
          
        if (!error) {
          setDocuments(data);
          
          // Process any pending operations
          if (pendingUploads > 0) {
            const result = await processQueue();
            if (result.success > 0) {
              // Refresh the document list if operations were processed
              fetchDocuments();
            }
          }
        } else {
          console.error('Error fetching documents:', error);
        }
      }
    } catch (error) {
      console.error('Error in fetchDocuments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, pendingUploads, checkConnectivity]);

  // Initial load
  useEffect(() => {
    fetchDocuments();
    
    // Set up network state listener
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
      if (state.isConnected) {
        // When coming back online, refresh documents
        fetchDocuments();
      }
    });
    
    return () => unsubscribe();
  }, [fetchDocuments]);

  // Combine remote and cached documents, removing duplicates
  const combinedDocuments = useCallback(() => {
    // Create a map of all documents by ID
    const documentsMap = new Map();
    
    // Add remote documents to the map
    documents.forEach(doc => {
      documentsMap.set(doc.id, { ...doc, source: 'remote' });
    });
    
    // Add cached documents to the map (will overwrite remote if same ID)
    cachedDocuments.forEach(doc => {
      if (!documentsMap.has(doc.id)) {
        documentsMap.set(doc.id, { ...doc, source: 'cached' });
      }
    });
    
    // Convert map back to array
    return Array.from(documentsMap.values());
  }, [documents, cachedDocuments]);
  
  // Filter combined documents based on search term
  const filteredDocuments = combinedDocuments().filter(d => 
    d.name && d.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  };

  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDocuments();
  }, [fetchDocuments]);
  
  // Handle sync button press
  const handleSync = useCallback(async () => {
    if (isOffline) {
      Alert.alert('Offline', 'You are currently offline. Documents will sync automatically when you reconnect.');
      return;
    }
    
    setLoading(true);
    try {
      const result = await processQueue(true); // Force processing
      if (result.success > 0) {
        Alert.alert('Sync Complete', `Successfully synced ${result.success} item(s).`);
        fetchDocuments(); // Refresh the list
      } else if (result.failed > 0) {
        Alert.alert('Sync Issues', `Failed to sync ${result.failed} item(s). Please try again later.`);
      } else {
        Alert.alert('Nothing to Sync', 'All documents are already synced.');
      }
    } catch (error) {
      Alert.alert('Sync Error', error.message);
    } finally {
      setLoading(false);
    }
  }, [isOffline, fetchDocuments]);

  const renderItem = ({ item }) => {
    const isSelected = selected.includes(item.id);
    const isCached = item.source === 'cached';
    
    return (
      <TouchableOpacity
        style={[
          styles.item, 
          isSelected && styles.selectedItem,
          { borderColor: colors.border }
        ]}
        onPress={() => toggleSelect(item.id)}
        onLongPress={() => {
          if (item.file_path) {
            navigation.navigate('DocumentPreview', { filePath: item.file_path, isCached });
          } else {
            Alert.alert('Preview Unavailable', 'This document is only available offline and cannot be previewed.');
          }
        }}
      >
        <View style={styles.itemContent}>
          <View style={styles.itemHeader}>
            <Text 
              style={[
                styles.itemText, 
                typography.body, 
                { color: isSelected ? colors.secondary : colors.text }
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.name}
            </Text>
            {isCached && (
              <Ionicons name="cloud-offline-outline" size={18} color={colors.info} />
            )}
          </View>
          
          <Text 
            style={[
              typography.label, 
              { color: isSelected ? colors.secondary : colors.text, opacity: 0.7 }
            ]}
          >
            {item.file_size ? `${(item.file_size / 1024).toFixed(1)} KB` : 'Size unknown'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>  
      {/* Status bar for offline mode */}
      {isOffline && (
        <View style={[styles.offlineBar, { backgroundColor: colors.info }]}>
          <Ionicons name="cloud-offline-outline" size={16} color={colors.secondary} />
          <Text style={[typography.label, { color: colors.secondary, marginLeft: spacing.xs }]}>
            Offline Mode
          </Text>
        </View>
      )}
      
      {/* Pending uploads indicator */}
      {pendingUploads > 0 && (
        <TouchableOpacity 
          style={[styles.pendingBar, { backgroundColor: colors.primary }]}
          onPress={handleSync}
        >
          <Ionicons name="cloud-upload-outline" size={16} color={colors.secondary} />
          <Text style={[typography.label, { color: colors.secondary, marginLeft: spacing.xs }]}>
            {pendingUploads} pending upload{pendingUploads > 1 ? 's' : ''} - Tap to sync
          </Text>
        </TouchableOpacity>
      )}
      
      {/* Search input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color={colors.info} style={styles.searchIcon} />
        <TextInput
          placeholder="Search documents"
          value={search}
          onChangeText={setSearch}
          style={[
            styles.searchInput, 
            { 
              borderColor: colors.border, 
              color: colors.text, 
              backgroundColor: colors.background === '#F9FAFB' ? '#FFFFFF' : '#2D3748'
            }
          ]}
          placeholderTextColor={colors.info}
        />
      </View>
      
      {/* Document list */}
      {loading && documents.length === 0 ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[typography.body, { color: colors.text, marginTop: spacing.md }]}>
            Loading documents...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredDocuments}
          keyExtractor={(item) => item.id || `${item.name}-${item.timestamp || Date.now()}`}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-outline" size={48} color={colors.border} />
              <Text style={[typography.body, { color: colors.text, marginTop: spacing.md }]}>
                No documents found.
              </Text>
              <ThemedButton
                title="Upload Document"
                onPress={() => navigation.navigate('DocumentUpload')}
                style={{ marginTop: spacing.md }}
              />
            </View>
          }
          contentContainerStyle={filteredDocuments.length === 0 ? styles.emptyList : null}
        />
      )}
      
      {/* Bottom action buttons */}
      <View style={styles.buttonContainer}>
        <ThemedButton
          title="Upload Document"
          onPress={() => navigation.navigate('DocumentUpload')}
          style={{ flex: 1, marginRight: spacing.xs }}
        />
        <ThemedButton
          title="Create Quiz"
          onPress={() => navigation.navigate('QuizCreation', { documentIds: selected })}
          disabled={selected.length === 0}
          style={{ flex: 1, marginLeft: spacing.xs }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 16 
  },
  offlineBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
    marginBottom: spacing.sm,
    borderRadius: spacing.xs
  },
  pendingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
    marginBottom: spacing.sm,
    borderRadius: spacing.xs
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderRadius: spacing.xs,
    overflow: 'hidden'
  },
  searchIcon: {
    position: 'absolute',
    left: spacing.sm,
    zIndex: 1
  },
  searchInput: { 
    flex: 1,
    borderWidth: 1, 
    borderRadius: spacing.xs, 
    padding: spacing.sm,
    paddingLeft: spacing.xl
  },
  item: { 
    padding: spacing.md, 
    borderWidth: 1, 
    borderRadius: spacing.xs, 
    marginBottom: spacing.sm 
  },
  itemContent: {
    flex: 1
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs
  },
  selectedItem: { 
    backgroundColor: '#4F46E5' 
  },
  itemText: { 
    flex: 1,
    marginRight: spacing.xs
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: spacing.sm
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  }
});

export default DocumentLibraryScreen;
