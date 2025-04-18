import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, spacing, typography } from '../theme/theme';
import ThemedButton from '../components/ThemedButton';

const QuizResultsScreen = ({ route, navigation }) => {
  const { answers } = route.params;
  const colors = useTheme();
  const total = answers.length;
  const correct = answers.filter(a => a.correct).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>  
      <Text style={[typography.title, { color: colors.text, marginBottom: spacing.md }]}>Quiz Completed!</Text>
      <Text style={[typography.subtitle, { color: colors.text, marginBottom: spacing.md }]}>You got {correct} out of {total} correct</Text>
      <ThemedButton title="Back to Home" onPress={() => navigation.popToTop()} accessibilityLabel="Back to Home button" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.md },
});

export default QuizResultsScreen;
