import React, { useState, useEffect, useContext, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabaseClient';
import { AuthContext } from '../contexts/AuthContext';
import NetInfo from '@react-native-community/netinfo';
import { getCachedQuizzes, deleteCachedQuiz, syncQuizzes } from '../services/offlineService';
import { useTheme, spacing, typography } from '../theme/theme';
import ThemedButton from '../components/ThemedButton';

const QuizHistoryScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [pendingQuizzes, setPendingQuizzes] = useState([]);
  const [error, setError] = useState(null);
  const colors = useTheme();

  // Check network status
  const checkConnectivity = useCallback(async () => {
    const networkState = await NetInfo.fetch();
    setIsOffline(!networkState.isConnected);
    return networkState.isConnected;
  }, []);

  // Fetch quiz history combining online and offline data
  const fetchHistory = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      
      // Check connectivity
      const isConnected = await checkConnectivity();
      
      // Get cached quizzes
      const cachedData = await getCachedQuizzes();
      
      // Filter pending quizzes
      const pending = cachedData.filter(quiz => quiz.pending);
      setPendingQuizzes(pending);
      
      if (isConnected) {
        // If online, fetch from Supabase
        const { data, error } = await supabase
          .from('quizzes')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        // Combine remote quizzes with cached non-pending quizzes
        // Use a Map to avoid duplicates, preferring remote data
        const quizMap = new Map();
        
        // Add remote quizzes to map
        data.forEach(quiz => quizMap.set(quiz.id, quiz));
        
        // Add cached quizzes that aren't pending and aren't already in the map
        cachedData
          .filter(quiz => !quiz.pending && !quizMap.has(quiz.id))
          .forEach(quiz => quizMap.set(quiz.id, quiz));
        
        // Convert map back to array and sort by created_at
        const combined = Array.from(quizMap.values())
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          
        setQuizzes(combined);
      } else {
        // If offline, use cached quizzes
        const cached = cachedData.filter(quiz => !quiz.pending);
        setQuizzes(cached);
      }
    } catch (err) {
      console.error('Error fetching quiz history:', err);
      setError('Failed to load quiz history. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, checkConnectivity]);

  // Initial fetch
  useEffect(() => {
    fetchHistory();
    
    // Set up network state listener
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
      if (state.isConnected) {
        // Refresh data when coming back online
        fetchHistory();
      }
    });
    
    return () => unsubscribe();
  }, [fetchHistory]);

  // Handle pull-to-refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchHistory();
  };
  
  // Sync pending quizzes
  const handleSync = async () => {
    try {
      setLoading(true);
      await syncQuizzes(user.id);
      await fetchHistory();
      Alert.alert('Success', 'Quizzes synchronized successfully.');
    } catch (err) {
      console.error('Error syncing quizzes:', err);
      Alert.alert('Error', 'Failed to synchronize quizzes. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Delete quiz
  const handleDelete = async (id, isPending = false) => {
    Alert.alert(
      'Delete Quiz',
      'Are you sure you want to delete this quiz?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              // Check if we're online and the quiz is not pending
              if (!isOffline && !isPending) {
                // Delete from Supabase
                const { error } = await supabase
                  .from('quizzes')
                  .delete()
                  .eq('id', id);
                  
                if (error) throw error;
              }
              
              // Always delete from local cache
              await deleteCachedQuiz(id);
              
              // Update state
              if (isPending) {
                setPendingQuizzes(prev => prev.filter(q => q.id !== id));
              } else {
                setQuizzes(prev => prev.filter(q => q.id !== id));
              }
            } catch (err) {
              console.error('Error deleting quiz:', err);
              Alert.alert('Error', 'Failed to delete quiz. Please try again.');
            } finally {
              setLoading(false);
            }
          } 
        }
      ]
    );
  };

  // Render a quiz item
  const renderQuizItem = ({ item }) => {
    const isPending = item.pending === true;
    const date = new Date(item.created_at);
    const formattedDate = date.toLocaleDateString();
    const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    return (
      <TouchableOpacity 
        style={[styles.quizCard, { borderColor: colors.border }]}
        onPress={() => {
          if (isPending) {
            Alert.alert(
              'Pending Quiz',
              'This quiz is waiting to be generated when you reconnect to the internet.',
              [{ text: 'OK' }]
            );
          } else {
            navigation.navigate('QuizResults', { 
              quizId: item.id,
              quizTitle: item.title,
              offline: isOffline
            });
          }
        }}
        disabled={loading}
      >  
        <View style={styles.quizHeader}>
          <View style={styles.quizTitleContainer}>
            <Text 
              style={[typography.subtitle, { 
                color: colors.text,
                marginBottom: spacing.xs 
              }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.title}
            </Text>
            
            <View style={styles.quizMeta}>
              <Ionicons name="calendar-outline" size={14} color={colors.info} />
              <Text style={[typography.label, { color: colors.info, marginLeft: spacing.xs }]}>
                {formattedDate} at {formattedTime}
              </Text>
            </View>
          </View>
          
          {isPending && (
            <View style={[styles.pendingBadge, { backgroundColor: colors.info }]}>
              <Text style={[typography.label, { color: colors.secondary, fontSize: 10 }]}>PENDING</Text>
            </View>
          )}
        </View>
        
        <View style={styles.quizDetails}>
          <View style={styles.quizDetail}>
            <Ionicons name="help-circle-outline" size={16} color={colors.primary} />
            <Text style={[typography.body, { color: colors.text, marginLeft: spacing.xs }]}>
              {item.question_count} Questions
            </Text>
          </View>
          
          <View style={styles.quizDetail}>
            <Ionicons 
              name={item.difficulty === 'easy' ? 'sunny-outline' : 
                    item.difficulty === 'medium' ? 'partly-sunny-outline' : 
                    item.difficulty === 'hard' ? 'thunderstorm-outline' : 'sparkles-outline'} 
              size={16} 
              color={colors.primary} 
            />
            <Text style={[typography.body, { color: colors.text, marginLeft: spacing.xs }]}>
              {item.difficulty.charAt(0).toUpperCase() + item.difficulty.slice(1)}
            </Text>
          </View>
        </View>
        
        <View style={styles.quizActions}>
          <ThemedButton 
            title="View Results" 
            onPress={() => {
              if (isPending) {
                Alert.alert(
                  'Pending Quiz',
                  'This quiz is waiting to be generated when you reconnect to the internet.',
                  [{ text: 'OK' }]
                );
              } else {
                navigation.navigate('QuizResults', { 
                  quizId: item.id,
                  quizTitle: item.title,
                  offline: isOffline
                });
              }
            }} 
            style={{ flex: 1, marginRight: spacing.sm }} 
            accessibilityLabel="View Results button" 
            disabled={isPending}
            icon="eye-outline"
          />
          <ThemedButton 
            title="Delete" 
            onPress={() => handleDelete(item.id, isPending)} 
            style={{ flex: 0.5 }} 
            accessibilityLabel="Delete Quiz button" 
            type="secondary"
            icon="trash-outline"
          />
        </View>
      </TouchableOpacity>
    );
  };
  
  // Render pending quiz section
  const renderPendingSection = () => {
    if (pendingQuizzes.length === 0) return null;
    
    return (
      <View style={styles.pendingSection}>
        <View style={styles.pendingHeader}>
          <View style={styles.pendingTitleContainer}>
            <Ionicons name="time-outline" size={20} color={colors.info} />
            <Text style={[typography.subtitle, { color: colors.text, marginLeft: spacing.xs }]}>
              Pending Quizzes ({pendingQuizzes.length})
            </Text>
          </View>
          
          <ThemedButton 
            title="Sync Now" 
            onPress={handleSync} 
            disabled={isOffline || loading}
            accessibilityLabel="Sync Quizzes button"
            icon="sync-outline"
            size="small"
          />
        </View>
        
        {pendingQuizzes.map(quiz => renderQuizItem({ item: quiz }))}
      </View>
    );
  };

  // Render loading state
  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[typography.body, { color: colors.text, marginTop: spacing.md }]}>Loading quiz history...</Text>
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
            Offline Mode - Some features may be limited
          </Text>
        </View>
      )}
      
      {/* Error message */}
      {error && (
        <View style={[styles.errorContainer, { borderColor: colors.error }]}>
          <Ionicons name="alert-circle" size={20} color={colors.error} />
          <Text style={[typography.body, { color: colors.error, marginLeft: spacing.xs, flex: 1 }]}>
            {error}
          </Text>
        </View>
      )}
      
      {/* Pending quizzes section */}
      {renderPendingSection()}
      
      {/* Quiz list */}
      <FlatList
        data={quizzes}
        keyExtractor={(item) => item.id}
        renderItem={renderQuizItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={48} color={colors.info} />
            <Text style={[typography.subtitle, { color: colors.text, marginTop: spacing.md, textAlign: 'center' }]}>
              No quiz history available
            </Text>
            <Text style={[typography.body, { color: colors.info, marginTop: spacing.sm, textAlign: 'center' }]}>
              Create a quiz from your documents to see it here
            </Text>
            <ThemedButton 
              title="Create New Quiz" 
              onPress={() => navigation.navigate('DocumentLibrary')} 
              style={{ marginTop: spacing.lg }}
              accessibilityLabel="Create New Quiz button"
              icon="add-circle-outline"
            />
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md
  },
  offlineBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
    marginBottom: spacing.sm
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    margin: spacing.md,
    borderWidth: 1,
    borderRadius: spacing.sm,
    marginBottom: spacing.md
  },
  listContent: {
    padding: spacing.md,
    paddingTop: spacing.xs
  },
  pendingSection: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md
  },
  pendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm
  },
  pendingTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  quizCard: { 
    borderWidth: 1,
    borderRadius: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  quizHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  quizTitleContainer: {
    flex: 1,
    marginRight: spacing.sm
  },
  quizMeta: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  pendingBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: spacing.xs
  },
  quizDetails: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    marginBottom: spacing.md
  },
  quizDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md
  },
  quizActions: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    marginTop: spacing.xl
  }
});

export default QuizHistoryScreen;
