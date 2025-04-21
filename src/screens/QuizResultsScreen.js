import React, { useState, _useEffect } from 'react'; // _useEffect kept for potential future use
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, typography } from '../theme/theme';
import ThemedButton from '../components/ThemedButton';
import { saveQuizResults as _saveQuizResults } from '../services/offlineService'; // Kept for potential future use

const QuizResultsScreen = ({ route, navigation }) => {
  const { answers, score, _quizId, quizTitle = 'Quiz', offline = false } = route.params; // _quizId kept for potential future use
  const [showDetails, setShowDetails] = useState(false);
  const colors = useTheme();
  
  // Calculate statistics
  const total = answers.length;
  const correct = answers.filter(a => a.correct).length;
  const scorePercent = score || Math.round((correct / total) * 100);
  
  // Group answers by topic for analytics
  const topicStats = answers.reduce((acc, answer) => {
    const topic = answer.topic || 'general';
    if (!acc[topic]) {
      acc[topic] = { total: 0, correct: 0 };
    }
    acc[topic].total++;
    if (answer.correct) acc[topic].correct++;
    return acc;
  }, {});

  // Render a topic performance card
  const renderTopicCard = (topic, stats) => {
    const topicPercent = Math.round((stats.correct / stats.total) * 100);
    const topicColor = topicPercent >= 80 ? colors.success : 
                      topicPercent >= 60 ? colors.primary : colors.error;
    
    // Icon based on performance
    const topicIcon = topicPercent >= 80 ? 'checkmark-circle' : 
                     topicPercent >= 60 ? 'information-circle' : 'alert-circle';
    
    return (
      <View 
        key={topic} 
        style={[styles.topicCard, { borderColor: colors.border }]}
      >
        <View style={styles.topicHeader}>
          <Ionicons name={topicIcon} size={20} color={topicColor} />
          <Text style={[typography.subtitle, styles.topicText, { color: colors.text }]}>
            {topic.charAt(0).toUpperCase() + topic.slice(1)}
          </Text>
          <Text style={[typography.body, { color: topicColor }]}>
            {stats.correct}/{stats.total} ({topicPercent}%)
          </Text>
        </View>
        
        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${topicPercent}%`, backgroundColor: topicColor }
            ]} 
          />
        </View>
      </View>
    );
  };
  
  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >  
      {/* Offline indicator */}
      {offline && (
        <View style={[styles.offlineBar, { backgroundColor: colors.info }]}>
          <Ionicons name="cloud-offline-outline" size={16} color={colors.secondary} />
          <Text style={[typography.label, { color: colors.secondary, marginLeft: spacing.xs }]}>
            Offline Mode
          </Text>
        </View>
      )}
      
      {/* Quiz title and score */}
      <View style={styles.scoreContainer}>
        <Text style={[typography.title, { color: colors.text }]}>{quizTitle}</Text>
        <Text style={[typography.subtitle, { color: colors.text, marginTop: spacing.xs }]}>Quiz Completed!</Text>
        
        <View style={[styles.scoreCircle, { borderColor: colors.primary }]}>
          <Text style={[typography.title, styles.largeScore, { color: colors.primary }]}>{scorePercent}%</Text>
          <Text style={[typography.body, { color: colors.text }]}>{correct} of {total} correct</Text>
        </View>
        
        {/* Performance indicator */}
        <View style={styles.performanceContainer}>
          <Ionicons 
            name={scorePercent >= 80 ? 'trophy' : scorePercent >= 60 ? 'ribbon' : 'school'} 
            size={28} 
            color={scorePercent >= 80 ? colors.success : scorePercent >= 60 ? colors.primary : colors.info} 
          />
          <Text 
            style={[
              typography.subtitle, 
              { 
                color: scorePercent >= 80 ? colors.success : scorePercent >= 60 ? colors.primary : colors.info,
                marginLeft: spacing.sm 
              }
            ]}
          >
            {scorePercent >= 80 ? 'Excellent!' : scorePercent >= 60 ? 'Good job!' : 'Keep practicing!'}
          </Text>
        </View>
      </View>
      
      {/* Topic performance */}
      <View style={styles.sectionContainer}>
        <Text style={[typography.subtitle, { color: colors.text }]}>Performance by Topic</Text>
        {Object.keys(topicStats).map(topic => renderTopicCard(topic, topicStats[topic]))}
      </View>
      
      {/* Answer details toggle */}
      <TouchableOpacity 
        style={[styles.detailsToggle, { borderColor: colors.border }]}
        onPress={() => setShowDetails(!showDetails)}
      >
        <Text style={[typography.subtitle, { color: colors.text }]}>
          {showDetails ? 'Hide Answer Details' : 'Show Answer Details'}
        </Text>
        <Ionicons 
          name={showDetails ? 'chevron-up' : 'chevron-down'} 
          size={24} 
          color={colors.text} 
        />
      </TouchableOpacity>
      
      {/* Answer details */}
      {showDetails && (
        <View style={styles.answersContainer}>
          {answers.map((answer, index) => (
            <View 
              key={index} 
              style={[styles.answerCard, { 
                borderColor: answer.correct ? colors.success : colors.error,
                backgroundColor: answer.correct ? colors.success + '10' : colors.error + '10'
              }]}
            >
              <View style={styles.answerHeader}>
                <Text style={[typography.subtitle, { color: colors.text }]}>Question {index + 1}</Text>
                <Ionicons 
                  name={answer.correct ? 'checkmark-circle' : 'close-circle'} 
                  size={20} 
                  color={answer.correct ? colors.success : colors.error} 
                />
              </View>
              
              <Text style={[typography.body, { color: colors.text, marginTop: spacing.xs }]}>
                {answer.questionText}
              </Text>
              
              <View style={[styles.answerDetail, { borderColor: colors.border }]}>
                <Text style={[typography.label, { color: colors.text }]}>Your answer:</Text>
                <Text style={[
                  typography.body, 
                  styles.emphasizedText, 
                  { color: answer.correct ? colors.success : colors.error }
                ]}>
                  {answer.selectedOption}
                </Text>
              </View>
              
              {!answer.correct && (
                <View style={[styles.answerDetail, { borderColor: colors.border }]}>
                  <Text style={[typography.label, { color: colors.text }]}>Correct answer:</Text>
                  <Text style={[typography.body, styles.emphasizedText, { color: colors.success }]}>
                    {answer.correctOption}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}
      
      {/* Navigation buttons */}
      <View style={styles.buttonContainer}>
        <ThemedButton 
          title="Back to Home" 
          onPress={() => navigation.popToTop()} 
          accessibilityLabel="Back to Home button" 
          icon="home"
        />
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
    paddingBottom: spacing.xl
  },
  offlineBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
    marginBottom: spacing.md,
    borderRadius: spacing.xs
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg
  },
  scoreCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: spacing.lg
  },
  performanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md
  },
  sectionContainer: {
    marginBottom: spacing.lg
  },
  topicCard: {
    borderWidth: 1,
    borderRadius: spacing.sm,
    padding: spacing.md,
    marginTop: spacing.sm
  },
  topicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%'
  },
  detailsToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: spacing.sm,
    marginBottom: spacing.md
  },
  answersContainer: {
    marginBottom: spacing.lg
  },
  answerCard: {
    borderWidth: 1,
    borderRadius: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  answerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  answerDetail: {
    borderTopWidth: 1,
    paddingTop: spacing.sm,
    marginTop: spacing.sm
  },
  buttonContainer: {
    marginTop: spacing.md
  },
  topicText: {
    marginLeft: spacing.xs,
    flex: 1
  },
  largeScore: {
    fontSize: 36
  },
  emphasizedText: {
    fontWeight: '500'
  }
});

export default QuizResultsScreen;
