import React, { useState, useEffect, useContext } from 'react';
import { View, Text, FlatList, StyleSheet, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { supabase } from '../lib/supabaseClient';
import { AuthContext } from '../contexts/AuthContext';
import { useTheme, spacing, typography } from '../theme/theme';
import ThemedButton from '../components/ThemedButton';

const AnalyticsScreen = () => {
  const { user } = useContext(AuthContext);
  const colors = useTheme();
  const [stats, setStats] = useState([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      // Fetch responses with question topics
      const { data, error } = await supabase
        .from('question_responses')
        .select('correct, question:questions(topic)')
        .eq('user_id', user.id);
      if (error || !data) return;
      // Aggregate per topic
      const map = {};
      data.forEach(r => {
        const topic = r.question.topic || 'Unknown';
        if (!map[topic]) map[topic] = { correct: 0, total: 0 };
        map[topic].total += 1;
        if (r.correct) map[topic].correct += 1;
      });
      const arr = Object.entries(map).map(([topic, v]) => ({
        topic,
        mastery: Math.round((v.correct / v.total) * 100)
      }));
      setStats(arr);
    };
    fetchAnalytics();
  }, [user]);

  // Export analytics as CSV
  const handleExport = async () => {
    if (stats.length === 0) {
      Alert.alert('No data', 'There is no analytics data to export.');
      return;
    }
    const header = 'Topic,Mastery\n';
    const rows = stats.map(r => `${r.topic},${r.mastery}`).join('\n');
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

  const renderItem = ({ item }) => (
    <View style={[styles.item, { borderBottomColor: colors.border }]}>
      <Text style={[typography.body, { color: colors.text }]}>{item.topic}</Text>
      <Text style={[typography.label, { color: colors.text }]}>{item.mastery}% mastery</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={stats}
        keyExtractor={(item) => item.topic}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={[typography.body, { color: colors.text, marginTop: spacing.sm }]}>No analytics data available.</Text>}
      />
      <ThemedButton title="Export CSV" onPress={handleExport} style={{ marginTop: spacing.md }} accessibilityLabel="Export CSV button" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md },
  item: { padding: spacing.sm, borderBottomWidth: 1 },
});

export default AnalyticsScreen;
