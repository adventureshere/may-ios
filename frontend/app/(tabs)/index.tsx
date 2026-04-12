import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';
import { useAuth } from '../../src/context/AuthContext';
import { api, CATEGORIES } from '../../src/utils/api';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = async () => {
    try { const data = await api('/dashboard'); setDashboard(data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { loadDashboard(); }, []));

  const toggleTask = async (goalId: string, taskIndex: number) => {
    if (!dashboard) return;
    const updated = { ...dashboard, today_tasks: dashboard.today_tasks.map((t: any, i: number) =>
      t.goal_id === goalId && t.task_index === taskIndex ? { ...t, completed: !t.completed } : t
    )};
    setDashboard(updated);
    try { await api(`/goals/${goalId}/tasks/${taskIndex}/toggle`, { method: 'POST' }); loadDashboard(); }
    catch (e) { loadDashboard(); }
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  };

  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;

  const completedToday = dashboard?.today_tasks?.filter((t: any) => t.completed).length || 0;
  const totalToday = dashboard?.today_tasks?.length || 0;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDashboard(); }} tintColor={colors.primary} />}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.text_secondary }]}>{getGreeting()}</Text>
          <Text style={[styles.name, { color: colors.text_primary }]}>{user?.name || 'there'} 👋</Text>
        </View>
        {user?.role === 'guest' && (
          <TouchableOpacity testID="upgrade-banner-btn" style={[styles.upgradeBadge, { backgroundColor: colors.accent + '30' }]} onPress={() => router.push('/(auth)/register')}>
            <Text style={[styles.upgradeBadgeText, { color: colors.text_primary }]}>Create Account</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name="flame" size={28} color={colors.primary} />
          <Text style={[styles.statNum, { color: colors.primary }]}>{dashboard?.total_streak || 0}</Text>
          <Text style={[styles.statLabel, { color: colors.text_secondary }]}>Streak</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.secondary + '15' }]}>
          <Ionicons name="flag" size={28} color={colors.secondary} />
          <Text style={[styles.statNum, { color: colors.secondary }]}>{dashboard?.active_goals || 0}</Text>
          <Text style={[styles.statLabel, { color: colors.text_secondary }]}>Active Goals</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.accent + '25' }]}>
          <Ionicons name="checkmark-circle" size={28} color="#E8A317" />
          <Text style={[styles.statNum, { color: '#E8A317' }]}>{completedToday}/{totalToday}</Text>
          <Text style={[styles.statLabel, { color: colors.text_secondary }]}>Today</Text>
        </View>
      </View>

      {totalToday > 0 && (
        <View style={[styles.section]}>
          <Text style={[styles.sectionTitle, { color: colors.text_primary }]}>Today's Tasks</Text>
          {dashboard.today_tasks.map((task: any, i: number) => (
            <TouchableOpacity testID={`task-toggle-${i}`} key={`${task.goal_id}-${task.task_index}`} style={[styles.taskRow, { backgroundColor: colors.surface }]} onPress={() => toggleTask(task.goal_id, task.task_index)} activeOpacity={0.7}>
              <Ionicons name={task.completed ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={task.completed ? colors.success : colors.text_secondary} />
              <View style={styles.taskInfo}>
                <Text style={[styles.taskTitle, { color: colors.text_primary, textDecorationLine: task.completed ? 'line-through' : 'none', opacity: task.completed ? 0.6 : 1 }]}>{task.title}</Text>
                <Text style={[styles.taskGoal, { color: (CATEGORIES[task.goal_category] || CATEGORIES.other).color }]}>{task.goal_title}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {dashboard?.goals?.filter((g: any) => g.status === 'active').length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text_primary }]}>Active Goals</Text>
          {dashboard.goals.filter((g: any) => g.status === 'active').map((goal: any) => {
            const cat = CATEGORIES[goal.category] || CATEGORIES.other;
            const progress = goal.duration_days > 0 ? ((goal.current_day || 0) / goal.duration_days) : 0;
            return (
              <TouchableOpacity testID={`goal-card-${goal.id}`} key={goal.id} style={[styles.goalCard, { backgroundColor: colors.surface }]} onPress={() => router.push(`/goal/${goal.id}`)} activeOpacity={0.7}>
                <View style={styles.goalHeader}>
                  <View style={[styles.catBadge, { backgroundColor: cat.color + '20' }]}><Ionicons name={cat.icon as any} size={16} color={cat.color} /></View>
                  <View style={styles.goalInfo}>
                    <Text style={[styles.goalTitle, { color: colors.text_primary }]}>{goal.title}</Text>
                    <Text style={[styles.goalDay, { color: colors.text_secondary }]}>Day {goal.current_day || 0} of {goal.duration_days}</Text>
                  </View>
                  <View style={styles.streakBadge}><Ionicons name="flame" size={14} color={colors.primary} /><Text style={[styles.streakText, { color: colors.primary }]}>{goal.streak || 0}</Text></View>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: colors.surface_alt }]}>
                  <View style={[styles.progressFill, { backgroundColor: cat.color, width: `${Math.min(progress * 100, 100)}%` }]} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {(!dashboard?.goals || dashboard.goals.length === 0) && (
        <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
          <Ionicons name="sparkles" size={48} color={colors.primary} />
          <Text style={[styles.emptyTitle, { color: colors.text_primary }]}>Ready to start?</Text>
          <Text style={[styles.emptySubtitle, { color: colors.text_secondary }]}>Create your first goal and let May build your personalized plan!</Text>
          <TouchableOpacity testID="create-first-goal-btn" style={[styles.createBtn, { backgroundColor: colors.primary }]} onPress={() => router.push('/goal/create')}>
            <Ionicons name="add" size={20} color={colors.primary_foreground} />
            <Text style={[styles.createBtnText, { color: colors.primary_foreground }]}>Create Goal</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 14, fontWeight: '500' }, name: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  upgradeBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  upgradeBadgeText: { fontSize: 12, fontWeight: '700' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 12, marginBottom: 24 },
  statCard: { flex: 1, borderRadius: 20, padding: 16, alignItems: 'center', gap: 4 },
  statNum: { fontSize: 24, fontWeight: '800' }, statLabel: { fontSize: 11, fontWeight: '600' },
  section: { paddingHorizontal: 24, marginBottom: 24 },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12, letterSpacing: -0.3 },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16, marginBottom: 8 },
  taskInfo: { flex: 1 }, taskTitle: { fontSize: 15, fontWeight: '500' }, taskGoal: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  goalCard: { borderRadius: 20, padding: 16, marginBottom: 10 },
  goalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  catBadge: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  goalInfo: { flex: 1 }, goalTitle: { fontSize: 16, fontWeight: '600' }, goalDay: { fontSize: 13, marginTop: 2 },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 }, streakText: { fontSize: 14, fontWeight: '700' },
  progressTrack: { height: 6, borderRadius: 3 }, progressFill: { height: 6, borderRadius: 3 },
  emptyState: { marginHorizontal: 24, borderRadius: 24, padding: 32, alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 22, fontWeight: '700' }, emptySubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 9999, marginTop: 8 },
  createBtnText: { fontSize: 15, fontWeight: '700' },
});
