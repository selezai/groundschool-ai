import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { AuthContext } from '../contexts/AuthContext';
import { useTheme, spacing, typography } from '../theme/theme';
import ThemedButton from '../components/ThemedButton';

const QuizTakingScreen = ({ route, navigation }) => {
  const { quizId } = route.params;
  const { user } = useContext(AuthContext);
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuestions = async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('id, text, options, correct_answer_index, explanation')
        .eq('quiz_id', quizId)
        .order('id', { ascending: true });
      if (!error) setQuestions(data);
      setLoading(false);
    };
    fetchQuestions();
  }, []);

  const handleSelect = (index) => {
    const q = questions[current];
    const isCorrect = index === q.correct_answer_index;
    setSelectedIndex(index);
    setFeedback({ correct: isCorrect, explanation: q.explanation });
    setAnswers([...answers, { correct: isCorrect }]);
  };

  const handleNext = () => {
    if (current < questions.length - 1) {
      setCurrent(current + 1);
      setSelectedIndex(null);
      setFeedback(null);
    } else {
      navigation.navigate('QuizResults', { answers });
    }
  };

  const colors = useTheme();

  if (loading) return <ActivityIndicator style={styles.loader} size="large" color={colors.primary} />;

  const q = questions[current];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[typography.subtitle, { color: colors.text, marginBottom: spacing.sm }]}>Question {current + 1} of {questions.length}</Text>
      <Text style={[typography.body, { color: colors.text, marginBottom: spacing.sm }]}>{q.text}</Text>
      {q.options.map((opt, idx) => (
        <TouchableOpacity
          key={idx}
          style={[
            styles.option,
            { borderColor: colors.border },
            selectedIndex === idx && (idx === q.correct_answer_index
              ? { backgroundColor: colors.success, borderColor: colors.success }
              : { backgroundColor: colors.error, borderColor: colors.error }
            )
          ]}
          onPress={() => handleSelect(idx)}
          disabled={selectedIndex !== null}
        >
          <Text style={[typography.body, { color: colors.text }]}>{opt}</Text>
        </TouchableOpacity>
      ))}
      {feedback && (
        <Text style={[styles.explanation, { color: colors.text }]}>{feedback.correct ? 'Correct!' : 'Incorrect.'} {feedback.explanation}</Text>
      )}
      {selectedIndex !== null && (
        <ThemedButton title={current < questions.length - 1 ? 'Next' : 'Finish'} onPress={handleNext} style={{ marginTop: spacing.md }} accessibilityLabel="Next button" />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  option: { padding: spacing.sm, borderWidth: 1, borderRadius: spacing.xs, marginBottom: spacing.sm },
  explanation: { marginTop: spacing.sm, fontStyle: 'italic' }
});

export default QuizTakingScreen;
