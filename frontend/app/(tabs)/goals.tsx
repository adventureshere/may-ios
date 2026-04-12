import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';
import { api, CATEGORIES } from '../../src/utils/api';
import { Ionicons } from '@expo/vector-icons';

export default function GoalsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadGoals = async () => {
    try { const data = await api('/goals'); setGoals(data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { loadGoals(); }, []));

  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;

  const active = goals.filter(g => g.status === 'active');
  const planning = goals.filter(g => g.status === 'planning');
  const completed = goals.filter(g => g.status === 'completed');

  const renderGoal = (goal: any) => {
    const cat = CATEGORIES[goal.category] || CATEGORIES.other;
    const progress = goal.duration_days > 0 ? ((goal.current_day || 0) / goal.duration_days) : 0;
    return (
      <TouchableOpacity testID={`goal-item-${goal.id}`} key={goal.id} style={[styles.goalCard, { backgroundColor: colors.surface }]} onPress={() => router.push(`/goal/${goal.id}`)} activeOpacity={0.7}>
        <View style={styles.goalRow}>
          <View style={[styles.catDot, { backgroundColor: cat.color }]} />
          <View style={styles.goalInfo}>
            <Text style={[styles.goalTitle, { color: colors.text_primary }]}>{goal.title}</Text>
            <Text style={[styles.goalMeta, { color: colors.text_secondary }]}>
              {goal.status === 'active' ? `Day ${goal.current_day || 0}/${goal.duration_days}` : goal.status === 'planning' ? 'Review plan' : 'Completed'} · {cat.label}
            </Text>
          </View>
          {goal.status === 'active' && <View style={styles.streakWrap}><Ionicons name="flame" size={14} color={colors.primary} /><Text style={[styles.streak, { color: colors.primary }]}>{goal.streak || 0}</Text></View>}
          {goal.status === 'planning' && <View style={[styles.planBadge, { backgroundColor: colors.accent + '30' }]}><Text style={[styles.planBadgeText, { color: '#E8A317' }]}>Plan</Text></View>}
          {goal.status === 'completed' && <Ionicons name="checkmark-circle" size={24} color={colors.success} />}
        </View>
        {goal.status === 'active' && (
          <View style={[styles.progressTrack, { backgroundColor: colors.surface_alt }]}>
            <View style={[styles.progressFill, { backgroundColor: cat.color, width: `${Math.min(progress * 100, 100)}%` }]} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadGoals(); }} tintColor={colors.primary} />}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text_primary }]}>Goals</Text>
        <TouchableOpacity testID="create-goal-btn" style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={() => router.push('/goal/create')}>
          <Ionicons name="add" size={22} color={colors.primary_foreground} />
        </TouchableOpacity>
      </View>

      {planning.length > 0 && <><Text style={[styles.sectionLabel, { color: colors.accent }]}>REVIEW PLAN</Text>{planning.map(renderGoal)}</>}
      {active.length > 0 && <><Text style={[styles.sectionLabel, { color: colors.primary }]}>ACTIVE</Text>{active.map(renderGoal)}</>}
      {completed.length > 0 && <><Text style={[styles.sectionLabel, { color: colors.success }]}>COMPLETED</Text>{completed.map(renderGoal)}</>}
      {goals.length === 0 && (
        <View style={[styles.empty, { backgroundColor: colors.surface }]}>
          <Ionicons name="flag-outline" size={48} color={colors.text_secondary} />
          <Text style={[styles.emptyText, { color: colors.text_secondary }]}>No goals yet. Create your first one!</Text>
        </View>
      )}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.8 },
  addBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, paddingHorizontal: 24, marginTop: 20, marginBottom: 10 },
  goalCard: { marginHorizontal: 24, borderRadius: 16, padding: 16, marginBottom: 8 },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  goalInfo: { flex: 1 }, goalTitle: { fontSize: 16, fontWeight: '600' }, goalMeta: { fontSize: 13, marginTop: 2 },
  streakWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 }, streak: { fontSize: 14, fontWeight: '700' },
  planBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }, planBadgeText: { fontSize: 12, fontWeight: '700' },
  progressTrack: { height: 4, borderRadius: 2, marginTop: 12 }, progressFill: { height: 4, borderRadius: 2 },
  empty: { margin: 24, borderRadius: 24, padding: 48, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 15, textAlign: 'center' },
});
