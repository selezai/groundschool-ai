import React, { useState, useEffect, useContext } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { AuthContext } from '../contexts/AuthContext';
import { useTheme, spacing, typography } from '../theme/theme';

const QuizHistoryScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [quizzes, setQuizzes] = useState([]);
  const colors = useTheme();

  useEffect(() => {
    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (!error) setQuizzes(data);
    };
    fetchHistory();
  }, [user]);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.item, { borderBottomColor: colors.border }]}
      onPress={() => navigation.navigate('QuizResults', { answers: [] })}
    >
      <Text style={[typography.body, { color: colors.text }]}>{item.title}</Text>
      <Text style={[typography.label, { color: colors.text }]}>{new Date(item.created_at).toLocaleString()}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={quizzes}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={[typography.body, { color: colors.text, marginTop: spacing.sm }]}>No quiz history available.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  item: { padding: 12, borderBottomWidth: 1 },
  title: { fontSize: 16 },
  date: { fontSize: 12, color: '#666' }
});

export default QuizHistoryScreen;
