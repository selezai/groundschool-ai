import React, { useState, useEffect, useRef, useContext } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { AuthContext } from '../contexts/AuthContext';
import { generateQuestions } from '../services/deepSeekService';
import NetInfo from '@react-native-community/netinfo';
import { queueOperation } from '../services/offlineService';
import { useTheme, spacing, typography } from '../theme/theme';
import ThemedButton from '../components/ThemedButton';

const QuizCreationScreen = ({ route, navigation }) => {
  const { user } = useContext(AuthContext);
  const { documentIds } = route.params;
  const [questionCount, setQuestionCount] = useState('10');
  const [estTime, setEstTime] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const abortRef = useRef(false);
  const colors = useTheme();

  useEffect(() => {
    const calcEst = async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('file_size')
        .in('id', documentIds);
      if (!error && data) {
        const total = data.reduce((sum, d) => sum + d.file_size, 0);
        const secs = Math.ceil(total / (1024 * 1024));
        setEstTime(secs);
        // Auto-suggest question count: MB *10, clamp between 5 and 100
        const mb = total / (1024 * 1024);
        const suggested = Math.min(Math.max(Math.round(mb * 10), 5), 100);
        setQuestionCount(String(suggested));
      }
    };
    calcEst();
  }, [documentIds]);

  const handleGenerate = async () => {
    abortRef.current = false;
    setError(null);
    setMessage(null);
    setIsGenerating(true);
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      await queueOperation({ type: 'createQuiz', payload: { userId: user.id, documentIds, questionCount: parseInt(questionCount) } });
      setMessage('Offline: quiz creation queued. It will sync when back online.');
      setIsGenerating(false);
      return;
    }
    try {
      const questions = await generateQuestions(documentIds, parseInt(questionCount));
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .insert([{
          user_id: user.id,
          title: `Quiz on ${new Date().toLocaleString()}`,
          document_ids: documentIds,
          question_count: parseInt(questionCount),
          difficulty: 'auto'
        }], { returning: 'representation' });
      if (quizError || !quizData.length) throw quizError || new Error('Failed to create quiz');
      const quizId = quizData[0].id;
      for (const q of questions) {
        await supabase.from('questions').insert({
          quiz_id: quizId,
          text: q.text,
          options: q.options,
          correct_answer_index: q.correct_answer_index,
          explanation: q.explanation,
          image_url: q.image_url,
          topic: q.topic
        });
      }
      if (!abortRef.current) {
        navigation.navigate('QuizTaking', { quizId });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCancel = () => {
    abortRef.current = true;
    setIsGenerating(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[typography.label, { color: colors.text, marginBottom: spacing.sm }]}>Number of Questions:</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={questionCount}
        onChangeText={setQuestionCount}
      />
      {estTime !== null && <Text style={[typography.body, { color: colors.text, marginBottom: spacing.sm }]}>Estimated time: {estTime} seconds</Text>}
      {isGenerating ? (
        <>
          <ActivityIndicator size="large" style={{ marginVertical: spacing.sm }} color={colors.primary} />
          <ThemedButton title="Cancel" onPress={handleCancel} style={{ marginBottom: spacing.sm }} accessibilityLabel="Cancel button" />
        </>
      ) : (
        <ThemedButton title="Generate Quiz" onPress={handleGenerate} accessibilityLabel="Generate Quiz button" />
      )}
      {error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}
      {message && <Text style={[styles.message, { color: colors.success }]}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 12, borderRadius: 4 },
  error: { marginTop: 8 },
  message: { marginTop: 8 }
});

export default QuizCreationScreen;
