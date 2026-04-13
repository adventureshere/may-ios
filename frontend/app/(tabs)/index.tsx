import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';
import { useAuth } from '../../src/context/AuthContext';
import { api, CATEGORIES } from '../../src/utils/api';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MayAvatar, { MayBubble } from '../../src/components/MayAvatar';

export default function HomeScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dailyMsg, setDailyMsg] = useState('');

  const loadDashboard = async () => {
    try {
      const data = await api('/dashboard');
      setDashboard(data);
      // Load daily message from first active goal
      const activeGoal = data.goals?.find((g: any) => g.status === 'active');
      if (activeGoal) {
        try {
          const msg = await api(`/goals/${activeGoal.id}/daily-message`);
          setDailyMsg(msg.message);
        } catch (e) {}
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { loadDashboard(); }, []));

  const toggleTask = async (goalId: string, taskIndex: number) => {
    if (!dashboard) return;
    const updated = { ...dashboard, today_tasks: dashboard.today_tasks.map((t: any) =>
      t.goal_id === goalId && t.task_index === taskIndex ? { ...t, completed: !t.completed } : t
    )};
    setDashboard(updated);
    try { await api(`/goals/${goalId}/tasks/${taskIndex}/toggle`, { method: 'POST' }); }
    catch (e) { loadDashboard(); }
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  };

  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;

  const completedToday = dashboard?.today_tasks?.filter((t: any) => t.completed).length || 0;
  const totalToday = dashboard?.today_tasks?.length || 0;
  const activeGoals = dashboard?.goals?.filter((g: any) => g.status === 'active') || [];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDashboard(); }} tintColor={colors.primary} />}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.text_secondary }]}>{getGreeting()}</Text>
          <Text style={[styles.name, { color: colors.text_primary }]}>{user?.name || 'there'} 👋</Text>
        </View>
        <TouchableOpacity testID="home-chat-may" onPress={() => router.push('/chat/general')} style={styles.mayChatBtn}>
          <MayAvatar size={40} showStatus />
        </TouchableOpacity>
      </View>

      {/* May's Daily Message */}
      {dailyMsg ? (
        <MayBubble message={dailyMsg} colors={colors} />
      ) : (
        <MayBubble message={activeGoals.length > 0 ? "You're doing great! Keep up the momentum today! 💪" : "Ready to start your journey? Create your first goal and I'll build a plan just for you! ✨"} colors={colors} />
      )}

      {/* Stats */}
      <View style={styles.statsRow}>
        <LinearGradient colors={['#8C65F7', '#6200EA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.statCard}>
          <Ionicons name="flame" size={24} color="#fff" />
          <Text style={styles.statNumWhite}>{dashboard?.total_streak || 0}</Text>
          <Text style={styles.statLabelWhite}>Streak</Text>
        </LinearGradient>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Ionicons name="flag" size={24} color={colors.secondary} />
          <Text style={[styles.statNum, { color: colors.text_primary }]}>{dashboard?.active_goals || 0}</Text>
          <Text style={[styles.statLabel, { color: colors.text_secondary }]}>Goals</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Ionicons name="checkmark-done" size={24} color={colors.success} />
          <Text style={[styles.statNum, { color: colors.text_primary }]}>{completedToday}/{totalToday}</Text>
          <Text style={[styles.statLabel, { color: colors.text_secondary }]}>Today</Text>
        </View>
      </View>

      {/* Guest Banner */}
      {user?.role === 'guest' && (
        <TouchableOpacity testID="upgrade-banner" onPress={() => router.push('/(auth)/register')} activeOpacity={0.8}>
          <LinearGradient colors={['#FFD37D', '#FF9500']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.guestBanner}>
            <Ionicons name="person-add" size={20} color="#fff" />
            <Text style={styles.guestBannerText}>Create an account to save your progress!</Text>
            <Ionicons name="chevron-forward" size={18} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Today's Tasks */}
      {totalToday > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text_primary }]}>Today's Tasks</Text>
          {dashboard.today_tasks.map((task: any, i: number) => {
            const cat = CATEGORIES[task.goal_category] || CATEGORIES.other;
            return (
              <TouchableOpacity testID={`task-toggle-${i}`} key={`${task.goal_id}-${task.task_index}`} style={[styles.taskRow, { backgroundColor: colors.surface }]} onPress={() => toggleTask(task.goal_id, task.task_index)} activeOpacity={0.7}>
                <View style={[styles.taskCheck, task.completed && { backgroundColor: colors.success, borderColor: colors.success }]}>
                  {task.completed && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <View style={styles.taskInfo}>
                  <Text style={[styles.taskTitle, { color: colors.text_primary, textDecorationLine: task.completed ? 'line-through' : 'none', opacity: task.completed ? 0.5 : 1 }]}>{task.title}</Text>
                  <View style={styles.taskMeta}>
                    <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                    <Text style={[styles.taskGoal, { color: colors.text_secondary }]}>{task.goal_title}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text_primary }]}>Active Goals</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/goals')}><Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text></TouchableOpacity>
          </View>
          {activeGoals.slice(0, 3).map((goal: any) => {
            const cat = CATEGORIES[goal.category] || CATEGORIES.other;
            const progress = goal.duration_days > 0 ? ((goal.current_day || 0) / goal.duration_days) : 0;
            return (
              <TouchableOpacity testID={`goal-card-${goal.id}`} key={goal.id} style={[styles.goalCard, { backgroundColor: colors.surface }]} onPress={() => router.push(`/goal/${goal.id}`)} activeOpacity={0.7}>
                <View style={styles.goalHeader}>
                  <View style={[styles.catBadge, { backgroundColor: cat.color + '18' }]}>
                    <Ionicons name={cat.icon as any} size={18} color={cat.color} />
                  </View>
                  <View style={styles.goalInfo}>
                    <Text style={[styles.goalTitle, { color: colors.text_primary }]} numberOfLines={1}>{goal.title}</Text>
                    <Text style={[styles.goalDay, { color: colors.text_secondary }]}>Day {goal.current_day || 0} of {goal.duration_days}</Text>
                  </View>
                  <View style={[styles.streakBadge, { backgroundColor: colors.primary + '12' }]}>
                    <Ionicons name="flame" size={14} color={colors.primary} />
                    <Text style={[styles.streakText, { color: colors.primary }]}>{goal.streak || 0}</Text>
                  </View>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: colors.surface_alt }]}>
                  <LinearGradient colors={[cat.color, cat.color + 'AA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.progressFill, { width: `${Math.min(progress * 100, 100)}%` }]} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Empty State */}
      {(!dashboard?.goals || dashboard.goals.length === 0) && (
        <TouchableOpacity testID="create-first-goal-btn" style={[styles.emptyCard, { backgroundColor: colors.surface }]} onPress={() => router.push('/goal/create')} activeOpacity={0.8}>
          <LinearGradient colors={['#8C65F7', '#6200EA']} style={styles.emptyIcon}>
            <Ionicons name="add" size={28} color="#fff" />
          </LinearGradient>
          <Text style={[styles.emptyTitle, { color: colors.text_primary }]}>Create Your First Goal</Text>
          <Text style={[styles.emptySub, { color: colors.text_secondary }]}>Tell May what you want to achieve and she'll create a personalized plan!</Text>
        </TouchableOpacity>
      )}

      {/* Quick Chat CTA */}
      <TouchableOpacity testID="quick-chat-btn" onPress={() => router.push('/chat/general')} activeOpacity={0.8}>
        <LinearGradient colors={[colors.ai_bubble, colors.primary + '15']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.chatCTA}>
          <MayAvatar size={36} />
          <View style={styles.chatCTAInfo}>
            <Text style={[styles.chatCTATitle, { color: colors.text_primary }]}>Chat with May</Text>
            <Text style={[styles.chatCTASub, { color: colors.text_secondary }]}>Ask anything about your goals</Text>
          </View>
          <Ionicons name="chatbubble-ellipses" size={20} color={colors.primary} />
        </LinearGradient>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 14, fontWeight: '500' }, name: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  mayChatBtn: { padding: 4 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 10, marginBottom: 20 },
  statCard: { flex: 1, borderRadius: 20, padding: 14, alignItems: 'center', gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statNum: { fontSize: 22, fontWeight: '800' }, statLabel: { fontSize: 11, fontWeight: '600' },
  statNumWhite: { fontSize: 22, fontWeight: '800', color: '#fff' }, statLabelWhite: { fontSize: 11, fontWeight: '600', color: '#ffffffCC' },
  guestBanner: { marginHorizontal: 24, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  guestBannerText: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '700' },
  section: { paddingHorizontal: 24, marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3, marginBottom: 12 },
  seeAll: { fontSize: 14, fontWeight: '600' },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 16, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  taskCheck: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#C7C7CC', justifyContent: 'center', alignItems: 'center' },
  taskInfo: { flex: 1 }, taskTitle: { fontSize: 15, fontWeight: '500', lineHeight: 20 },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  catDot: { width: 6, height: 6, borderRadius: 3 }, taskGoal: { fontSize: 12, fontWeight: '500' },
  goalCard: { borderRadius: 20, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  goalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  catBadge: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  goalInfo: { flex: 1 }, goalTitle: { fontSize: 16, fontWeight: '700' }, goalDay: { fontSize: 13, marginTop: 2 },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  streakText: { fontSize: 13, fontWeight: '800' },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' }, progressFill: { height: 6, borderRadius: 3 },
  emptyCard: { marginHorizontal: 24, borderRadius: 24, padding: 32, alignItems: 'center', gap: 12, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 3 },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '800' }, emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 21 },
  chatCTA: { marginHorizontal: 24, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  chatCTAInfo: { flex: 1 }, chatCTATitle: { fontSize: 15, fontWeight: '700' }, chatCTASub: { fontSize: 12, marginTop: 2 },
});
