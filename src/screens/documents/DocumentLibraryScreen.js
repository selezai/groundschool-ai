import React, { useState, useEffect, useContext } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { supabase } from '../../lib/supabaseClient';
import { AuthContext } from '../../contexts/AuthContext';
import { useTheme, spacing, typography } from '../../theme/theme';
import ThemedButton from '../../components/ThemedButton';

const DocumentLibraryScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [documents, setDocuments] = useState([]);
  const [selected, setSelected] = useState([]);
  const colors = useTheme();

  useEffect(() => {
    const fetchDocs = async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false });
      if (!error) setDocuments(data);
    };
    fetchDocs();
  }, [user]);

  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  };

  const renderItem = ({ item }) => {
    const isSelected = selected.includes(item.id);
    return (
      <TouchableOpacity
        style={[styles.item, isSelected && styles.selectedItem]}
        onPress={() => toggleSelect(item.id)}
      >
        <Text style={[styles.itemText, typography.body, { color: colors.text }]}>{item.name}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={documents}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={[typography.body, { color: colors.text } ]}>No documents uploaded.</Text>}
      />
      <ThemedButton
        title="Create Quiz from Selected"
        onPress={() => navigation.navigate('QuizCreation', { documentIds: selected })}
        disabled={selected.length === 0}
        style={{ marginTop: spacing.sm }}
        accessibilityLabel="Create Quiz button"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  item: { padding: 12, borderWidth: 1, borderColor: '#ccc', borderRadius: 4, marginBottom: 8 },
  selectedItem: { backgroundColor: '#4A90E2' },
  itemText: { color: '#000' },
});

export default DocumentLibraryScreen;
