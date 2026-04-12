import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';
import { api, CATEGORIES } from '../../src/utils/api';
import { Ionicons } from '@expo/vector-icons';

const DURATIONS = [7, 14, 21, 30, 60, 90];

export default function CreateGoalScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('learning');
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) { Alert.alert('Error', 'Please enter a goal title'); return; }
    setLoading(true);
    try {
      const goal = await api('/goals', { method: 'POST', body: JSON.stringify({ title: title.trim(), description: description.trim(), category, duration_days: duration }) });
      router.replace(`/goal/${goal.id}`);
    } catch (e: any) { Alert.alert('Error', e.message || 'Failed to create goal'); }
    finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity testID="create-back-btn" onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color={colors.text_primary} /></TouchableOpacity>
          <Text style={[styles.title, { color: colors.text_primary }]}>New Goal</Text>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text_primary }]}>May is crafting your plan...</Text>
            <Text style={[styles.loadingSubtext, { color: colors.text_secondary }]}>This may take a moment</Text>
          </View>
        ) : (
          <>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.text_secondary }]}>WHAT DO YOU WANT TO ACHIEVE?</Text>
              <TextInput testID="goal-title-input" style={[styles.input, { backgroundColor: colors.surface_alt, borderColor: colors.border, color: colors.text_primary }]} value={title} onChangeText={setTitle} placeholder="e.g. Learn to code, Lose 10 pounds" placeholderTextColor={colors.text_secondary} />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.text_secondary }]}>DETAILS (OPTIONAL)</Text>
              <TextInput testID="goal-desc-input" style={[styles.input, styles.textArea, { backgroundColor: colors.surface_alt, borderColor: colors.border, color: colors.text_primary }]} value={description} onChangeText={setDescription} placeholder="Any specific details or preferences..." placeholderTextColor={colors.text_secondary} multiline numberOfLines={3} textAlignVertical="top" />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.text_secondary }]}>CATEGORY</Text>
              <View style={styles.catGrid}>
                {Object.entries(CATEGORIES).map(([key, val]) => (
                  <TouchableOpacity testID={`cat-${key}`} key={key} style={[styles.catChip, { backgroundColor: category === key ? val.color + '25' : colors.surface, borderColor: category === key ? val.color : colors.border }]} onPress={() => setCategory(key)} activeOpacity={0.7}>
                    <Ionicons name={val.icon as any} size={16} color={category === key ? val.color : colors.text_secondary} />
                    <Text style={[styles.catText, { color: category === key ? val.color : colors.text_secondary }]}>{val.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.text_secondary }]}>DURATION</Text>
              <View style={styles.durRow}>
                {DURATIONS.map(d => (
                  <TouchableOpacity testID={`dur-${d}`} key={d} style={[styles.durChip, { backgroundColor: duration === d ? colors.primary : colors.surface, borderColor: duration === d ? colors.primary : colors.border }]} onPress={() => setDuration(d)} activeOpacity={0.7}>
                    <Text style={[styles.durText, { color: duration === d ? colors.primary_foreground : colors.text_secondary }]}>{d}d</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity testID="create-goal-submit" style={[styles.createBtn, { backgroundColor: colors.primary }]} onPress={handleCreate} activeOpacity={0.7}>
              <Ionicons name="sparkles" size={20} color={colors.primary_foreground} />
              <Text style={[styles.createBtnText, { color: colors.primary_foreground }]}>Generate Plan with May</Text>
            </TouchableOpacity>
          </>
        )}
        <View style={{ height: 48 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 16 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  field: { paddingHorizontal: 24, marginBottom: 24 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, marginBottom: 10 },
  input: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  textArea: { minHeight: 80, paddingTop: 14 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5 },
  catText: { fontSize: 13, fontWeight: '600' },
  durRow: { flexDirection: 'row', gap: 8 },
  durChip: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1.5 },
  durText: { fontSize: 14, fontWeight: '700' },
  createBtn: { marginHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 9999 },
  createBtnText: { fontSize: 17, fontWeight: '700' },
  loadingWrap: { paddingTop: 100, alignItems: 'center', gap: 16 },
  loadingText: { fontSize: 20, fontWeight: '700' },
  loadingSubtext: { fontSize: 14 },
});
