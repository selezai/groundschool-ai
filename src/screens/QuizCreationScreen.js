import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Alert, Slider } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabaseClient';
import { AuthContext } from '../contexts/AuthContext';
import { generateQuestions } from '../services/deepSeekService';
import NetInfo from '@react-native-community/netinfo';
import { queueOperation, _getOfflineStatus, cacheQuiz } from '../services/offlineService'; 
import { useTheme, spacing, typography } from '../theme/theme';
import ThemedButton from '../components/ThemedButton';

const QuizCreationScreen = ({ route, navigation }) => {
  const { user } = useContext(AuthContext);
  const { documentIds } = route.params;
  const [questionCount, setQuestionCount] = useState(10);
  const [quizTitle, setQuizTitle] = useState('');
  const [difficulty, setDifficulty] = useState('auto'); // 'easy', 'medium', 'hard', 'auto'
  const [estTime, setEstTime] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const [documentNames, setDocumentNames] = useState([]);
  const abortRef = useRef(false);
  const [progress, setProgress] = useState(0);
  const startTimeRef = useRef(null);
  const timerRef = useRef(null);
  const colors = useTheme();

  // Check network status
  const checkConnectivity = useCallback(async () => {
    const networkState = await NetInfo.fetch();
    setIsOffline(!networkState.isConnected);
    return networkState.isConnected;
  }, []);
  
  // Fetch document information
  useEffect(() => {
    const fetchDocumentInfo = async () => {
      try {
        // Check connectivity
        await checkConnectivity();
        
        // Get document details
        const { data, error } = await supabase
          .from('documents')
          .select('id, name, file_size')
          .in('id', documentIds);
          
        if (!error && data) {
          // Calculate estimated time
          const total = data.reduce((sum, d) => sum + (d.file_size || 0), 0);
          const secs = Math.ceil(total / (1024 * 1024));
          setEstTime(secs);
          
          // Auto-suggest question count: MB *10, clamp between 5 and 100
          const mb = total / (1024 * 1024);
          const suggested = Math.min(Math.max(Math.round(mb * 10), 5), 100);
          setQuestionCount(suggested);
          
          // Set document names for display
          setDocumentNames(data.map(doc => doc.name));
          
          // Generate a default title based on document names
          if (data.length === 1) {
            setQuizTitle(`Quiz on ${data[0].name.split('.')[0]}`);
          } else {
            setQuizTitle(`Quiz on ${data.length} documents`);
          }
        }
      } catch (err) {
        console.error('Error fetching document info:', err);
      }
    };
    
    fetchDocumentInfo();
    
    // Set up network state listener
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });
    
    return () => unsubscribe();
  }, [documentIds, checkConnectivity]);

  // Handle quiz generation
  const handleGenerate = async () => {
    // Validate inputs
    if (!quizTitle.trim()) {
      setError('Please enter a title for your quiz');
      return;
    }
    
    if (questionCount < 1) {
      setError('Please enter a valid number of questions');
      return;
    }
    
    // Reset state
    abortRef.current = false;
    setError(null);
    setMessage(null);
    setIsGenerating(true);
    
    // Start progress timer
    startTimeRef.current = Date.now();
    setProgress(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const pct = estTime ? Math.min((elapsed / estTime) * 100, 99) : 0;
      setProgress(Math.floor(pct));
    }, 500);

    try {
      // Check network status
      const netState = await NetInfo.fetch();
      
      // If offline, save quiz for later generation
      if (!netState.isConnected) {
        // Create a unique ID for the quiz
        const offlineQuizId = `offline-quiz-${Date.now()}`;
        
        // Queue the operation for when we're back online
        await queueOperation({ 
          type: 'createQuiz', 
          payload: { 
            userId: user.id, 
            documentIds, 
            questionCount: questionCount,
            title: quizTitle,
            difficulty
          },
          priority: 7 // High priority
        });
        
        // Create a placeholder quiz for offline use
        const placeholderQuiz = {
          id: offlineQuizId,
          user_id: user.id,
          title: quizTitle,
          document_ids: documentIds,
          question_count: questionCount,
          difficulty: difficulty,
          created_at: new Date().toISOString(),
          pending: true
        };
        
        // Cache the quiz locally
        await cacheQuiz(placeholderQuiz, []);
        
        setMessage('Quiz creation queued. It will be generated when you reconnect.');
        setIsGenerating(false);
        
        // Navigate back after a short delay
        setTimeout(() => {
          navigation.goBack();
        }, 1500);
        
        return;
      }
      
      // If online, generate the quiz
      try {
        // Generate questions using DeepSeek AI
        const questions = await generateQuestions(documentIds, questionCount);
        
        if (!questions || questions.length === 0) {
          throw new Error('Failed to generate questions. Please try again.');
        }
        
        // Create quiz record in database
        const { data: quizData, error: quizError } = await supabase
          .from('quizzes')
          .insert([{
            user_id: user.id,
            title: quizTitle,
            document_ids: documentIds,
            question_count: questionCount,
            difficulty: difficulty,
            created_at: new Date().toISOString()
          }], { returning: 'representation' });
          
        if (quizError || !quizData.length) {
          throw quizError || new Error('Failed to create quiz');
        }
        
        const quizId = quizData[0].id;
        
        // Insert questions
        for (const q of questions) {
          await supabase.from('questions').insert({
            quiz_id: quizId,
            text: q.text,
            options: q.options,
            correct_answer_index: q.correct_answer_index,
            explanation: q.explanation || '',
            image_url: q.image_url || null,
            topic: q.topic || 'general'
          });
        }
        
        // Cache the quiz and questions for offline use
        await cacheQuiz(quizData[0], questions);
        
        if (!abortRef.current) {
          // Navigate to quiz taking screen
          navigation.navigate('QuizTaking', { quizId, offline: false });
        }
      } catch (err) {
        console.error('Error generating quiz:', err);
        setError(`Failed to generate quiz: ${err.message}`);
      }
    } catch (err) {
      console.error('General error:', err);
      setError(`An error occurred: ${err.message}`);
    } finally {
      setIsGenerating(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setProgress(100);
    }
  };

  // Handle cancellation
  const handleCancel = () => {
    abortRef.current = true;
    setIsGenerating(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setProgress(0);
    Alert.alert('Cancelled', 'Quiz generation has been cancelled.');
  };
  
  // Render difficulty selector
  const renderDifficultySelector = () => {
    const options = [
      { value: 'easy', label: 'Easy', icon: 'sunny-outline' },
      { value: 'medium', label: 'Medium', icon: 'partly-sunny-outline' },
      { value: 'hard', label: 'Hard', icon: 'thunderstorm-outline' },
      { value: 'auto', label: 'Auto', icon: 'sparkles-outline' },
    ];
    
    return (
      <View style={styles.difficultyContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.difficultyOption,
              difficulty === option.value && { 
                backgroundColor: colors.primary,
                borderColor: colors.primary 
              },
              { borderColor: colors.border }
            ]}
            onPress={() => setDifficulty(option.value)}
          >
            <Ionicons 
              name={option.icon} 
              size={24} 
              color={difficulty === option.value ? colors.secondary : colors.text} 
            />
            <Text 
              style={[
                typography.label, 
                { 
                  color: difficulty === option.value ? colors.secondary : colors.text,
                  marginTop: spacing.xs 
                }
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
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
            Offline Mode - Quiz will be generated when you reconnect
          </Text>
        </View>
      )}
      
      {/* Selected documents */}
      <View style={styles.sectionContainer}>
        <Text style={[typography.subtitle, { color: colors.text }]}>Selected Documents</Text>
        <View style={[styles.documentsContainer, { borderColor: colors.border }]}>
          {documentNames.length > 0 ? (
            documentNames.map((name, index) => (
              <View key={index} style={[styles.documentItem, { borderColor: colors.border }]}>
                <Ionicons name="document-text-outline" size={16} color={colors.primary} />
                <Text 
                  style={[typography.body, { color: colors.text, marginLeft: spacing.xs }]}
                  numberOfLines={1}
                  ellipsizeMode="middle"
                >
                  {name}
                </Text>
              </View>
            ))
          ) : (
            <Text style={[typography.body, styles.italicText, { color: colors.info }]}>
              No documents selected
            </Text>
          )}
        </View>
      </View>
      
      {/* Quiz title */}
      <View style={styles.sectionContainer}>
        <Text style={[typography.subtitle, { color: colors.text }]}>Quiz Title</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text }]}
          placeholder="Enter quiz title"
          placeholderTextColor={colors.info}
          value={quizTitle}
          onChangeText={setQuizTitle}
        />
      </View>
      
      {/* Number of questions */}
      <View style={styles.sectionContainer}>
        <View style={styles.labelRow}>
          <Text style={[typography.subtitle, { color: colors.text }]}>Number of Questions</Text>
          <Text style={[typography.body, { color: colors.text }]}>{questionCount}</Text>
        </View>
        <Slider
          style={styles.slider}
          minimumValue={5}
          maximumValue={100}
          step={1}
          value={questionCount}
          onValueChange={setQuestionCount}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.primary}
        />
        <View style={styles.sliderLabels}>
          <Text style={[typography.label, { color: colors.text }]}>5</Text>
          <Text style={[typography.label, { color: colors.text }]}>100</Text>
        </View>
      </View>
      
      {/* Difficulty */}
      <View style={styles.sectionContainer}>
        <Text style={[typography.subtitle, { color: colors.text }]}>Difficulty</Text>
        {renderDifficultySelector()}
      </View>
      
      {/* Estimated time */}
      {estTime !== null && (
        <View style={styles.sectionContainer}>
          <Text style={[typography.subtitle, { color: colors.text }]}>Estimated Generation Time</Text>
          <View style={styles.estimatedTimeContainer}>
            <Ionicons name="time-outline" size={24} color={colors.primary} />
            <Text style={[typography.body, { color: colors.text, marginLeft: spacing.sm }]}>
              Approximately {estTime < 60 ? `${estTime} seconds` : `${Math.ceil(estTime / 60)} minutes`}
            </Text>
          </View>
        </View>
      )}
      
      {/* Error and message */}
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
      
      {/* Generation progress */}
      {isGenerating && (
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${progress}%`, 
                  backgroundColor: colors.primary 
                }
              ]} 
            />
          </View>
          <Text style={[typography.body, { color: colors.text, marginTop: spacing.xs }]}>
            {progress}% complete
          </Text>
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.md }} />
          <ThemedButton 
            title="Cancel" 
            onPress={handleCancel} 
            style={{ marginTop: spacing.md }} 
            accessibilityLabel="Cancel button" 
          />
        </View>
      )}
      
      {/* Generate button */}
      {!isGenerating && (
        <ThemedButton 
          title="Generate Quiz" 
          onPress={handleGenerate} 
          style={{ marginTop: spacing.md }} 
          accessibilityLabel="Generate Quiz button" 
        />
      )}
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
  sectionContainer: {
    marginBottom: spacing.lg
  },
  documentsContainer: {
    borderWidth: 1,
    borderRadius: spacing.xs,
    padding: spacing.sm,
    marginTop: spacing.xs
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xs,
    marginBottom: spacing.xs,
    borderBottomWidth: 1
  },
  input: { 
    borderWidth: 1, 
    padding: spacing.sm, 
    marginTop: spacing.xs, 
    borderRadius: spacing.xs,
    fontSize: 16
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  slider: {
    marginTop: spacing.sm,
    height: 40
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -spacing.xs
  },
  difficultyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs
  },
  difficultyOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    borderWidth: 1,
    borderRadius: spacing.xs,
    marginHorizontal: spacing.xs
  },
  estimatedTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md
  },
  error: { 
    flex: 1
  },
  message: { 
    flex: 1
  },
  progressContainer: {
    alignItems: 'center',
    marginVertical: spacing.md
  },
  progressBar: {
    width: '100%',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%'
  }
});

export default QuizCreationScreen;
