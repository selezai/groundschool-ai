import React, { useContext, useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabaseClient';
import { AuthContext } from '../contexts/AuthContext';
import NetInfo from '@react-native-community/netinfo';
import { getCachedQuiz, saveQuizResults, getOfflineStatus } from '../services/offlineService';
import { useTheme, spacing, typography } from '../theme/theme';
import ThemedButton from '../components/ThemedButton';

const QuizTakingScreen = ({ route, navigation }) => {
  const { quizId, offline = false } = route.params;
  const { user } = useContext(AuthContext);
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(offline);
  const [quiz, setQuiz] = useState(null);
  const [error, setError] = useState(null);

  // Check network status
  const checkConnectivity = useCallback(async () => {
    const networkState = await NetInfo.fetch();
    setIsOffline(!networkState.isConnected);
    return networkState.isConnected;
  }, []);

  // Fetch quiz and questions
  useEffect(() => {
    const fetchQuizData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Check connectivity
        const isConnected = await checkConnectivity();
        
        if (!isConnected) {
          // Try to get cached quiz
          const cachedData = await getCachedQuiz(quizId);
          
          if (cachedData && cachedData.quiz && cachedData.questions && cachedData.questions.length > 0) {
            setQuiz(cachedData.quiz);
            setQuestions(cachedData.questions);
          } else {
            setError('This quiz is not available offline. Please connect to the internet and try again.');
          }
          
          setLoading(false);
          return;
        }
        
        // If online, fetch from Supabase
        // 1. Fetch the quiz details
        const { data: quizData, error: quizError } = await supabase
          .from('quizzes')
          .select('*')
          .eq('id', quizId)
          .single();
          
        if (quizError) throw quizError;
        setQuiz(quizData);
        
        // 2. Fetch the questions
        const { data: questionData, error: questionError } = await supabase
          .from('questions')
          .select('id, text, options, correct_answer_index, explanation, image_url, topic')
          .eq('quiz_id', quizId)
          .order('id', { ascending: true });
          
        if (questionError) throw questionError;
        
        if (questionData && questionData.length > 0) {
          setQuestions(questionData);
          
          // Cache the quiz and questions for offline use
          await getCachedQuiz(quizId, true, quizData, questionData);
        } else {
          setError('No questions found for this quiz.');
        }
      } catch (err) {
        console.error('Error fetching quiz:', err);
        setError(`Failed to load quiz: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchQuizData();
    
    // Set up network state listener
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });
    
    return () => unsubscribe();
  }, [quizId, checkConnectivity]);

  // Handle answer selection
  const handleSelect = (index) => {
    const q = questions[current];
    const isCorrect = index === q.correct_answer_index;
    
    setSelectedIndex(index);
    setFeedback({ 
      correct: isCorrect, 
      explanation: q.explanation || (isCorrect ? 'Correct!' : 'Incorrect.') 
    });
    
    // Save answer with more details
    setAnswers([...answers, { 
      questionId: q.id,
      questionText: q.text,
      selectedOption: q.options[index],
      correctOption: q.options[q.correct_answer_index],
      correct: isCorrect,
      topic: q.topic || 'general'
    }]);
  };

  // Handle next question or finish quiz
  const handleNext = async () => {
    if (current < questions.length - 1) {
      // Move to next question
      setCurrent(current + 1);
      setSelectedIndex(null);
      setFeedback(null);
    } else {
      // Quiz completed
      try {
        // Calculate score
        const correctCount = answers.filter(a => a.correct).length;
        const score = Math.round((correctCount / questions.length) * 100);
        
        // Create results object
        const results = {
          quizId: quizId,
          userId: user.id,
          score: score,
          totalQuestions: questions.length,
          correctAnswers: correctCount,
          completedAt: new Date().toISOString(),
          answers: answers
        };
        
        // Save results (works both online and offline)
        await saveQuizResults(results);
        
        // Navigate to results screen
        navigation.navigate('QuizResults', { 
          answers, 
          score,
          quizId,
          quizTitle: quiz?.title || 'Quiz',
          offline: isOffline
        });
      } catch (err) {
        console.error('Error saving quiz results:', err);
        Alert.alert(
          'Error',
          'There was a problem saving your quiz results. Your results may not be saved.',
          [{ text: 'OK', onPress: () => navigation.navigate('QuizResults', { answers }) }]
        );
      }
    }
  };

  const colors = useTheme();

  // Render loading state
  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[typography.body, { color: colors.text, marginTop: spacing.md }]}>Loading quiz...</Text>
      </View>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={[typography.subtitle, { color: colors.error, marginTop: spacing.md, textAlign: 'center' }]}>
          {error}
        </Text>
        <ThemedButton 
          title="Go Back" 
          onPress={() => navigation.goBack()} 
          style={{ marginTop: spacing.lg }}
          accessibilityLabel="Go Back button"
        />
      </View>
    );
  }
  
  // No questions available
  if (!questions || questions.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="help-circle-outline" size={48} color={colors.info} />
        <Text style={[typography.subtitle, { color: colors.text, marginTop: spacing.md, textAlign: 'center' }]}>
          No questions available for this quiz.
        </Text>
        <ThemedButton 
          title="Go Back" 
          onPress={() => navigation.goBack()} 
          style={{ marginTop: spacing.lg }}
          accessibilityLabel="Go Back button"
        />
      </View>
    );
  }

  const q = questions[current];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Offline indicator */}
      {isOffline && (
        <View style={[styles.offlineBar, { backgroundColor: colors.info }]}>
          <Ionicons name="cloud-offline-outline" size={16} color={colors.secondary} />
          <Text style={[typography.label, { color: colors.secondary, marginLeft: spacing.xs }]}>
            Offline Mode
          </Text>
        </View>
      )}
      
      {/* Quiz header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => {
            Alert.alert(
              'Exit Quiz',
              'Are you sure you want to exit? Your progress will be lost.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Exit', onPress: () => navigation.goBack() }
              ]
            );
          }}
          accessibilityLabel="Back button"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.progressInfo}>
          <Text style={[typography.subtitle, { color: colors.text }]}>
            Question {current + 1} of {questions.length}
          </Text>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${((current + 1) / questions.length) * 100}%`, 
                  backgroundColor: colors.primary 
                }
              ]} 
            />
          </View>
        </View>
      </View>
      
      {/* Question */}
      <ScrollView style={styles.questionContainer}>
        <Text style={[typography.body, { color: colors.text, marginBottom: spacing.md, fontSize: 18 }]}>
          {q.text}
        </Text>
        
        {/* Answer options */}
        {q.options.map((opt, idx) => {
          const isSelected = selectedIndex === idx;
          const isCorrect = idx === q.correct_answer_index;
          const showCorrect = selectedIndex !== null && isCorrect;
          const showIncorrect = isSelected && !isCorrect;
          
          return (
            <TouchableOpacity
              key={idx}
              style={[
                styles.option,
                { borderColor: colors.border },
                showCorrect && { backgroundColor: colors.success, borderColor: colors.success },
                showIncorrect && { backgroundColor: colors.error, borderColor: colors.error },
                isSelected && !showCorrect && !showIncorrect && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}
              onPress={() => handleSelect(idx)}
              disabled={selectedIndex !== null}
              accessibilityLabel={`Option ${idx + 1}: ${opt}`}
            >
              <View style={styles.optionContent}>
                <View style={[styles.optionBullet, { borderColor: colors.text }]}>
                  <Text style={[typography.label, { 
                    color: (showCorrect || showIncorrect || isSelected) ? colors.secondary : colors.text 
                  }]}>
                    {String.fromCharCode(65 + idx)}
                  </Text>
                </View>
                <Text style={[typography.body, { 
                  color: (showCorrect || showIncorrect || isSelected) ? colors.secondary : colors.text,
                  flex: 1
                }]}>
                  {opt}
                </Text>
                {showCorrect && <Ionicons name="checkmark-circle" size={24} color={colors.secondary} />}
                {showIncorrect && <Ionicons name="close-circle" size={24} color={colors.secondary} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      
      {/* Feedback */}
      {feedback && (
        <View style={[styles.feedbackContainer, { 
          backgroundColor: feedback.correct ? colors.success : colors.error,
          borderColor: feedback.correct ? colors.success : colors.error
        }]}>
          <View style={styles.feedbackHeader}>
            <Ionicons 
              name={feedback.correct ? "checkmark-circle" : "close-circle"} 
              size={24} 
              color={colors.secondary} 
            />
            <Text style={[typography.subtitle, { color: colors.secondary, marginLeft: spacing.xs }]}>
              {feedback.correct ? 'Correct!' : 'Incorrect'}
            </Text>
          </View>
          {feedback.explanation && (
            <Text style={[typography.body, { color: colors.secondary, marginTop: spacing.xs }]}>
              {feedback.explanation}
            </Text>
          )}
        </View>
      )}
      
      {/* Navigation buttons */}
      {selectedIndex !== null && (
        <View style={styles.buttonContainer}>
          <ThemedButton 
            title={current < questions.length - 1 ? 'Next Question' : 'Finish Quiz'} 
            onPress={handleNext} 
            accessibilityLabel={current < questions.length - 1 ? "Next Question button" : "Finish Quiz button"} 
            icon={current < questions.length - 1 ? "arrow-forward" : "checkmark-done"}
          />
        </View>
      )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    paddingBottom: spacing.sm
  },
  backButton: {
    marginRight: spacing.md
  },
  progressInfo: {
    flex: 1
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginTop: spacing.xs,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%'
  },
  questionContainer: {
    flex: 1,
    padding: spacing.md,
    paddingTop: 0
  },
  option: { 
    padding: spacing.md, 
    borderWidth: 1, 
    borderRadius: spacing.sm, 
    marginBottom: spacing.sm 
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  optionBullet: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm
  },
  feedbackContainer: { 
    margin: spacing.md,
    padding: spacing.md, 
    borderRadius: spacing.sm,
    borderWidth: 1
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  buttonContainer: {
    padding: spacing.md
  }
});

export default QuizTakingScreen;
