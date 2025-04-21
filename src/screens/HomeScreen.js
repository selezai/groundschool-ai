import React, { useState, useEffect, _useContext, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabaseClient';
import { AuthContext as _AuthContext } from '../contexts/AuthContext';
import { useAuth } from '../contexts/AuthContext';
import _ThemedButton from '../components/ThemedButton';
import { useTheme, spacing, typography } from '../theme/theme';
import NetInfo from '@react-native-community/netinfo';
import { getCachedQuizzes } from '../services/offlineService';

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const colors = useTheme();
  const [recentQuizzes, setRecentQuizzes] = useState([]);
  const [performanceData, setPerformanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Check network status
  const checkConnectivity = useCallback(async () => {
    const networkState = await NetInfo.fetch();
    setIsOffline(!networkState.isConnected);
    return networkState.isConnected;
  }, []);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Check connectivity
      const isConnected = await checkConnectivity();
      
      // Get recent quizzes
      if (isConnected) {
        // Fetch recent quizzes
        const { data: quizData, error: quizError } = await supabase
          .from('quizzes')
          .select('id, title, created_at, question_count')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);
          
        if (!quizError && quizData) {
          setRecentQuizzes(quizData);
        }
        
        // Fetch performance metrics
        const { data: responseData, error: responseError } = await supabase
          .from('question_responses')
          .select('correct, question:questions(topic)')
          .eq('user_id', user.id);
          
        if (!responseError && responseData) {
          // Calculate overall performance
          const totalResponses = responseData.length;
          const correctResponses = responseData.filter(r => r.correct).length;
          const overallScore = totalResponses > 0 ? Math.round((correctResponses / totalResponses) * 100) : 0;
          
          // Calculate topic performance
          const topicMap = {};
          responseData.forEach(r => {
            const topic = r.question?.topic || 'Unknown';
            if (!topicMap[topic]) topicMap[topic] = { correct: 0, total: 0 };
            topicMap[topic].total += 1;
            if (r.correct) topicMap[topic].correct += 1;
          });
          
          // Convert to array and sort by mastery
          const topicPerformance = Object.entries(topicMap)
            .map(([topic, data]) => ({
              topic,
              mastery: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
              total: data.total
            }))
            .sort((a, b) => b.mastery - a.mastery);
          
          // Find weakest topics (mastery < 70%)
          const weakTopics = topicPerformance
            .filter(t => t.mastery < 70 && t.total >= 3)
            .slice(0, 3);
          
          setPerformanceData({
            overallScore,
            totalQuizzes: quizData?.length || 0,
            totalQuestions: totalResponses,
            topicPerformance,
            weakTopics
          });
        }
      } else {
        // If offline, try to get cached data
        const cachedQuizzes = await getCachedQuizzes();
        setRecentQuizzes(cachedQuizzes.slice(0, 5));
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, checkConnectivity]);

  // Initial load
  useEffect(() => {
    fetchDashboardData();
    
    // Set up network state listener
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });
    
    return () => unsubscribe();
  }, [fetchDashboardData]);

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  // Quick action handlers
  const handleCreateQuiz = () => {
    navigation.navigate('Document Library');
  };

  const handleViewHistory = () => {
    navigation.navigate('Quiz History');
  };

  const handleViewAnalytics = () => {
    navigation.navigate('Analytics');
  };

  // Render loading state
  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[typography.body, { color: colors.text, marginTop: spacing.md }]}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[typography.title, { color: colors.text }]}>Welcome, {user?.email?.split('@')[0] || 'User'}</Text>
          <Text style={[typography.body, { color: colors.textSecondary }]}>{new Date().toLocaleDateString()}</Text>
        </View>
      </View>

      {/* Offline indicator */}
      {isOffline && (
        <View style={[styles.offlineBar, { backgroundColor: colors.info }]}>
          <Ionicons name="cloud-offline-outline" size={16} color={colors.secondary} />
          <Text style={[typography.label, { color: colors.secondary, marginLeft: spacing.xs }]}>
            Offline Mode - Some features may be limited
          </Text>
        </View>
      )}

      {/* Performance summary */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[typography.subtitle, { color: colors.text, marginBottom: spacing.sm }]}>Performance Summary</Text>
        
        {performanceData ? (
          <View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[typography.largeNumber, { color: colors.primary }]}>{performanceData.overallScore}%</Text>
                <Text style={[typography.label, { color: colors.textSecondary }]}>Overall Score</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={[typography.largeNumber, { color: colors.primary }]}>{performanceData.totalQuizzes}</Text>
                <Text style={[typography.label, { color: colors.textSecondary }]}>Quizzes Taken</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={[typography.largeNumber, { color: colors.primary }]}>{performanceData.totalQuestions}</Text>
                <Text style={[typography.label, { color: colors.textSecondary }]}>Questions Answered</Text>
              </View>
            </View>
            
            {/* Areas for improvement */}
            {performanceData.weakTopics && performanceData.weakTopics.length > 0 && (
              <View style={styles.improvementSection}>
                <Text style={[typography.subtitle, { color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm }]}>
                  Areas for Improvement
                </Text>
                
                {performanceData.weakTopics.map(topic => (
                  <View key={topic.topic} style={styles.improvementItem}>
                    <Ionicons name="alert-circle-outline" size={20} color={colors.error} />
                    <Text style={[typography.body, styles.topicText, { color: colors.text }]}>
                      {topic.topic} ({topic.mastery}% mastery)
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          <Text style={[typography.body, { color: colors.textSecondary }]}>No performance data available yet. Take some quizzes to see your progress!</Text>
        )}
      </View>

      {/* Recent quizzes */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[typography.subtitle, { color: colors.text }]}>Recent Quizzes</Text>
          <TouchableOpacity onPress={handleViewHistory}>
            <Text style={[typography.label, { color: colors.primary }]}>View All</Text>
          </TouchableOpacity>
        </View>
        
        {recentQuizzes.length > 0 ? (
          recentQuizzes.map(quiz => (
            <TouchableOpacity 
              key={quiz.id} 
              style={[styles.quizItem, { borderBottomColor: colors.border }]}
              onPress={() => navigation.navigate('Quiz History')}
            >
              <View>
                <Text style={[typography.body, { color: colors.text }]}>{quiz.title}</Text>
                <Text style={[typography.label, { color: colors.textSecondary }]}>
                  {new Date(quiz.created_at).toLocaleDateString()} • {quiz.question_count} questions
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ))
        ) : (
          <Text style={[typography.body, { color: colors.textSecondary, padding: spacing.sm }]}>No quizzes taken yet. Create your first quiz to get started!</Text>
        )}
      </View>

      {/* Quick actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: colors.primary }]} 
          onPress={handleCreateQuiz}
        >
          <Ionicons name="add-circle-outline" size={24} color={colors.buttonText} />
          <Text style={[typography.button, { color: colors.buttonText, marginLeft: spacing.xs }]}>Create Quiz</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: colors.secondary }]} 
          onPress={handleViewAnalytics}
        >
          <Ionicons name="analytics-outline" size={24} color={colors.buttonText} />
          <Text style={[typography.button, { color: colors.buttonText, marginLeft: spacing.xs }]}>View Analytics</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  topicText: {
    marginLeft: spacing.xs,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  offlineBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 4,
    marginBottom: 16,
  },
  card: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  improvementSection: {
    marginTop: 8,
  },
  improvementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  quizItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 0.48,
  },
});

export default HomeScreen;
