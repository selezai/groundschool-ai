import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, spacing, typography } from '../theme/theme';
import ThemedButton from '../components/ThemedButton';
import NetInfo from '@react-native-community/netinfo';

// Simple bar chart component
const BarChart = ({ data, maxValue, barColor, backgroundColor, height = 20 }) => {
  const _colors = useTheme(); // Kept for potential future use
  return (
    <View style={[styles.barContainer, { backgroundColor, height }]}>
      <View 
        style={[styles.barFill, {
          backgroundColor: barColor,
          width: `${Math.min((data / maxValue) * 100, 100)}%`
        }]} 
      />
    </View>
  );
};

const AnalyticsScreen = () => {
  const { user } = useAuth();
  const colors = useTheme();
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [topicStats, setTopicStats] = useState([]);
  const [_quizHistory, setQuizHistory] = useState([]); // Kept for potential future use
  const [overallStats, setOverallStats] = useState({
    totalQuizzes: 0,
    totalQuestions: 0,
    averageScore: 0,
    bestTopic: null,
    worstTopic: null,
    recentTrend: 'stable' // 'improving', 'declining', 'stable'
  });
  const [timeFilter, setTimeFilter] = useState('all'); // 'week', 'month', 'all'

  // Check network status
  const checkConnectivity = useCallback(async () => {
    const networkState = await NetInfo.fetch();
    setIsOffline(!networkState.isConnected);
    return networkState.isConnected;
  }, []);

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      
      // Check connectivity
      await checkConnectivity();
      
      // Fetch quiz history
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('id, title, created_at, question_count')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (!quizError && quizData) {
        setQuizHistory(quizData);
        
        // Calculate total quizzes
        setOverallStats(prev => ({
          ...prev,
          totalQuizzes: quizData.length
        }));
      }
      
      // Fetch question responses
      const { data: responseData, error: responseError } = await supabase
        .from('question_responses')
        .select('correct, created_at, question:questions(topic)')
        .eq('user_id', user.id);
        
      if (!responseError && responseData) {
        // Calculate overall stats
        const totalQuestions = responseData.length;
        const correctAnswers = responseData.filter(r => r.correct).length;
        const averageScore = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
        
        // Calculate topic stats
        const topicMap = {};
        responseData.forEach(r => {
          const topic = r.question?.topic || 'Unknown';
          if (!topicMap[topic]) topicMap[topic] = { correct: 0, total: 0 };
          topicMap[topic].total += 1;
          if (r.correct) topicMap[topic].correct += 1;
        });
        
        // Convert to array and calculate mastery
        const topicArray = Object.entries(topicMap).map(([topic, data]) => ({
          topic,
          correct: data.correct,
          total: data.total,
          mastery: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0
        }));
        
        // Sort by mastery (highest first)
        topicArray.sort((a, b) => b.mastery - a.mastery);
        
        setTopicStats(topicArray);
        
        // Find best and worst topics (with at least 5 questions)
        const significantTopics = topicArray.filter(t => t.total >= 5);
        const bestTopic = significantTopics.length > 0 ? significantTopics[0] : null;
        const worstTopic = significantTopics.length > 0 ? significantTopics[significantTopics.length - 1] : null;
        
        // Calculate trend (simplified version)
        // In a real app, we would do more sophisticated trend analysis
        let trend = 'stable';
        if (responseData.length >= 10) {
          // Sort by date
          const sortedResponses = [...responseData].sort((a, b) => 
            new Date(a.created_at) - new Date(b.created_at)
          );
          
          // Compare first half to second half
          const midpoint = Math.floor(sortedResponses.length / 2);
          const firstHalf = sortedResponses.slice(0, midpoint);
          const secondHalf = sortedResponses.slice(midpoint);
          
          const firstHalfCorrect = firstHalf.filter(r => r.correct).length / firstHalf.length;
          const secondHalfCorrect = secondHalf.filter(r => r.correct).length / secondHalf.length;
          
          if (secondHalfCorrect - firstHalfCorrect > 0.1) {
            trend = 'improving';
          } else if (firstHalfCorrect - secondHalfCorrect > 0.1) {
            trend = 'declining';
          }
        }
        
        setOverallStats(prev => ({
          ...prev,
          totalQuestions,
          averageScore,
          bestTopic,
          worstTopic,
          recentTrend: trend
        }));
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [user, checkConnectivity]);

  // Initial load
  useEffect(() => {
    fetchAnalytics();
    
    // Set up network state listener
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });
    
    return () => unsubscribe();
  }, [fetchAnalytics]);

  // Export analytics as CSV
  const handleExport = async () => {
    if (topicStats.length === 0) {
      Alert.alert('No data', 'There is no analytics data to export.');
      return;
    }
    
    const header = 'Topic,Correct,Total,Mastery\n';
    const rows = topicStats.map(r => `${r.topic},${r.correct},${r.total},${r.mastery}`).join('\n');
    const csv = header + rows;
    const path = FileSystem.cacheDirectory + 'analytics.csv';
    
    try {
      await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, { mimeType: 'text/csv' });
      } else {
        Alert.alert('Export failed', 'Sharing is not available on this device.');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  // Filter data by time period
  const handleFilterChange = (filter) => {
    setTimeFilter(filter);
    // In a real app, we would filter the data based on the selected time period
    // For this implementation, we'll just change the state
  };

  // Render loading state
  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[typography.body, { color: colors.text, marginTop: spacing.md }]}>Loading analytics...</Text>
      </View>
    );
  }

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
            Offline Mode - Data may not be up to date
          </Text>
        </View>
      )}
      
      {/* Time filter */}
      <View style={styles.filterContainer}>
        <TouchableOpacity 
          style={[styles.filterButton, timeFilter === 'week' && { backgroundColor: colors.primary }]}
          onPress={() => handleFilterChange('week')}
        >
          <Text style={[typography.label, { color: timeFilter === 'week' ? colors.buttonText : colors.text }]}>Week</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.filterButton, timeFilter === 'month' && { backgroundColor: colors.primary }]}
          onPress={() => handleFilterChange('month')}
        >
          <Text style={[typography.label, { color: timeFilter === 'month' ? colors.buttonText : colors.text }]}>Month</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.filterButton, timeFilter === 'all' && { backgroundColor: colors.primary }]}
          onPress={() => handleFilterChange('all')}
        >
          <Text style={[typography.label, { color: timeFilter === 'all' ? colors.buttonText : colors.text }]}>All Time</Text>
        </TouchableOpacity>
      </View>
      
      {/* Overall stats */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[typography.subtitle, { color: colors.text, marginBottom: spacing.sm }]}>Performance Overview</Text>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[typography.largeNumber, { color: colors.primary }]}>{overallStats.totalQuizzes}</Text>
            <Text style={[typography.label, { color: colors.textSecondary }]}>Quizzes</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={[typography.largeNumber, { color: colors.primary }]}>{overallStats.totalQuestions}</Text>
            <Text style={[typography.label, { color: colors.textSecondary }]}>Questions</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={[typography.largeNumber, { color: colors.primary }]}>{overallStats.averageScore}%</Text>
            <Text style={[typography.label, { color: colors.textSecondary }]}>Avg. Score</Text>
          </View>
        </View>
        
        {/* Trend indicator */}
        <View style={styles.trendContainer}>
          <Text style={[typography.body, { color: colors.text }]}>Recent Trend: </Text>
          {overallStats.recentTrend === 'improving' && (
            <View style={styles.trendRow}>
              <Ionicons name="trending-up" size={20} color={colors.success} />
              <Text style={[typography.body, { color: colors.success, marginLeft: spacing.xs }]}>Improving</Text>
            </View>
          )}
          {overallStats.recentTrend === 'declining' && (
            <View style={styles.trendRow}>
              <Ionicons name="trending-down" size={20} color={colors.error} />
              <Text style={[typography.body, { color: colors.error, marginLeft: spacing.xs }]}>Declining</Text>
            </View>
          )}
          {overallStats.recentTrend === 'stable' && (
            <View style={styles.trendRow}>
              <Ionicons name="remove" size={20} color={colors.textSecondary} />
              <Text style={[typography.body, { color: colors.textSecondary, marginLeft: spacing.xs }]}>Stable</Text>
            </View>
          )}
        </View>
      </View>
      
      {/* Topic mastery */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[typography.subtitle, { color: colors.text, marginBottom: spacing.sm }]}>Topic Mastery</Text>
        
        {topicStats.length > 0 ? (
          <View>
            {topicStats.map(topic => {
              // Determine color based on mastery level
              const barColor = topic.mastery >= 80 ? colors.success : 
                            topic.mastery >= 60 ? colors.primary : colors.error;
                            
              return (
                <View key={topic.topic} style={styles.topicItem}>
                  <View style={styles.topicHeader}>
                    <Text style={[typography.body, styles.flexItem, { color: colors.text }]}>{topic.topic}</Text>
                    <Text style={[typography.label, { color: barColor }]}>{topic.mastery}%</Text>
                  </View>
                  
                  <BarChart 
                    data={topic.mastery} 
                    maxValue={100} 
                    barColor={barColor} 
                    backgroundColor={colors.border} 
                  />
                  
                  <Text style={[typography.label, styles.smallMarginTop, { color: colors.textSecondary }]}>
                    {topic.correct} correct of {topic.total} questions
                  </Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={[typography.body, { color: colors.textSecondary }]}>No topic data available yet. Take some quizzes to see your mastery levels.</Text>
        )}
      </View>
      
      {/* Improvement suggestions */}
      {overallStats.worstTopic && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[typography.subtitle, { color: colors.text, marginBottom: spacing.sm }]}>Improvement Suggestions</Text>
          
          <View style={styles.suggestionItem}>
            <Ionicons name="bulb-outline" size={24} color={colors.primary} style={styles.suggestionIcon} />
            <View style={styles.suggestionContent}>
              <Text style={[typography.body, { color: colors.text }]}>
                Focus on <Text style={styles.boldText}>{overallStats.worstTopic.topic}</Text> to improve your overall score.
              </Text>
              <Text style={[typography.label, styles.smallMarginTop, { color: colors.textSecondary }]}>
                Current mastery: {overallStats.worstTopic.mastery}%
              </Text>
            </View>
          </View>
          
          <View style={styles.suggestionItem}>
            <Ionicons name="repeat-outline" size={24} color={colors.primary} style={styles.suggestionIcon} />
            <View style={styles.suggestionContent}>
              <Text style={[typography.body, { color: colors.text }]}>
                Review questions you&apos;ve answered incorrectly to reinforce your learning.
              </Text>
            </View>
          </View>
          
          <View style={styles.suggestionItem}>
            <Ionicons name="calendar-outline" size={24} color={colors.primary} style={styles.suggestionIcon} />
            <View style={styles.suggestionContent}>
              <Text style={[typography.body, { color: colors.text }]}>
                Create a regular study schedule to maintain consistent progress.
              </Text>
            </View>
          </View>
        </View>
      )}
      
      {/* Export button */}
      <ThemedButton 
        title="Export Analytics as CSV" 
        onPress={handleExport} 
        style={{ marginTop: spacing.md, marginBottom: spacing.lg }} 
        accessibilityLabel="Export CSV button" 
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  contentContainer: {
    padding: 16,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 4,
    marginBottom: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginRight: 8,
  },
  card: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
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
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topicItem: {
    marginBottom: 16,
  },
  topicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  barContainer: {
    borderRadius: 4,
    overflow: 'hidden',
    width: '100%',
  },
  barFill: {
    height: '100%',
    borderRadius: 4
  },
  flexItem: {
    flex: 1
  },
  smallMarginTop: {
    marginTop: 4
  },
  boldText: {
    fontWeight: 'bold'
  },
  suggestionItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  suggestionIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  suggestionContent: {
    flex: 1,
    marginLeft: spacing.sm
  },
});

export default AnalyticsScreen;
