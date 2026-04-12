import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';
import { api, CATEGORIES } from '../../src/utils/api';
import { Ionicons } from '@expo/vector-icons';

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams();
  const { colors } = useTheme();
  const router = useRouter();
  const [goal, setGoal] = useState<any>(null);
  const [todayTasks, setTodayTasks] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);

  const loadGoal = async () => {
    try {
      const g = await api(`/goals/${id}`);
      setGoal(g);
      if (g.status === 'active') {
        const tasks = await api(`/goals/${id}/tasks/today`);
        setTodayTasks(tasks);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { loadGoal(); }, []));

  const handleAccept = async () => {
    setAccepting(true);
    try { await api(`/goals/${id}/accept`, { method: 'PUT' }); loadGoal(); }
    catch (e: any) { Alert.alert('Error', e.message); }
    finally { setAccepting(false); }
  };

  const handleToggle = async (idx: number) => {
    if (!todayTasks) return;
    const updated = { ...todayTasks, tasks: todayTasks.tasks.map((t: any, i: number) => i === idx ? { ...t, completed: !t.completed } : t) };
    setTodayTasks(updated);
    try { await api(`/goals/${id}/tasks/${idx}/toggle`, { method: 'POST' }); loadGoal(); }
    catch (e) { loadGoal(); }
  };

  const handleReschedule = async () => {
    setRescheduling(true);
    try {
      const result = await api(`/goals/${id}/reschedule`, { method: 'POST' });
      Alert.alert(result.rescheduled ? 'Rescheduled!' : 'Info', result.message);
      if (result.rescheduled) loadGoal();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setRescheduling(false); }
  };

  const handleDelete = () => {
    Alert.alert('Delete Goal', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await api(`/goals/${id}`, { method: 'DELETE' }); router.back(); } },
    ]);
  };

  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (!goal) return <View style={[styles.center, { backgroundColor: colors.background }]}><Text style={{ color: colors.text_secondary }}>Goal not found</Text></View>;

  const cat = CATEGORIES[goal.category] || CATEGORIES.other;
  const progress = goal.duration_days > 0 ? ((goal.current_day || 0) / goal.duration_days) : 0;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.topBar}>
        <TouchableOpacity testID="goal-back-btn" onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color={colors.text_primary} /></TouchableOpacity>
        <TouchableOpacity testID="goal-delete-btn" onPress={handleDelete}><Ionicons name="trash-outline" size={22} color={colors.error} /></TouchableOpacity>
      </View>

      <View style={styles.heroSection}>
        <View style={[styles.catBadge, { backgroundColor: cat.color + '20' }]}><Ionicons name={cat.icon as any} size={24} color={cat.color} /><Text style={[styles.catLabel, { color: cat.color }]}>{cat.label}</Text></View>
        <Text style={[styles.goalTitle, { color: colors.text_primary }]}>{goal.title}</Text>
        {goal.description ? <Text style={[styles.goalDesc, { color: colors.text_secondary }]}>{goal.description}</Text> : null}
      </View>

      {goal.status === 'active' && (
        <>
          <View style={styles.statsRow}>
            <View style={[styles.stat, { backgroundColor: colors.surface }]}><Ionicons name="calendar" size={20} color={colors.primary} /><Text style={[styles.statVal, { color: colors.text_primary }]}>{goal.current_day || 0}/{goal.duration_days}</Text><Text style={[styles.statLbl, { color: colors.text_secondary }]}>Day</Text></View>
            <View style={[styles.stat, { backgroundColor: colors.surface }]}><Ionicons name="flame" size={20} color={colors.primary} /><Text style={[styles.statVal, { color: colors.text_primary }]}>{goal.streak || 0}</Text><Text style={[styles.statLbl, { color: colors.text_secondary }]}>Streak</Text></View>
            <View style={[styles.stat, { backgroundColor: colors.surface }]}><Ionicons name="checkmark-done" size={20} color={colors.success} /><Text style={[styles.statVal, { color: colors.text_primary }]}>{goal.total_completed || 0}</Text><Text style={[styles.statLbl, { color: colors.text_secondary }]}>Done</Text></View>
          </View>
          <View style={{ paddingHorizontal: 24, marginBottom: 20 }}>
            <View style={[styles.progressTrack, { backgroundColor: colors.surface_alt }]}><View style={[styles.progressFill, { backgroundColor: cat.color, width: `${Math.min(progress * 100, 100)}%` }]} /></View>
          </View>

          {todayTasks && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text_primary }]}>{todayTasks.day_title || `Day ${todayTasks.day_number}`}</Text>
              {todayTasks.tasks.map((task: any, i: number) => (
                <TouchableOpacity testID={`detail-task-${i}`} key={i} style={[styles.taskRow, { backgroundColor: colors.surface }]} onPress={() => handleToggle(i)} activeOpacity={0.7}>
                  <Ionicons name={task.completed ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={task.completed ? colors.success : colors.text_secondary} />
                  <Text style={[styles.taskText, { color: colors.text_primary, textDecorationLine: task.completed ? 'line-through' : 'none', opacity: task.completed ? 0.6 : 1 }]}>{task.title}</Text>
                </TouchableOpacity>
              ))}
              {todayTasks.all_completed && <View style={[styles.congrats, { backgroundColor: colors.success + '15' }]}><Ionicons name="trophy" size={20} color={colors.success} /><Text style={[styles.congratsText, { color: colors.success }]}>All done for today! 🎉</Text></View>}
            </View>
          )}

          <View style={styles.actionRow}>
            <TouchableOpacity testID="goal-chat-btn" style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={() => router.push(`/chat/${id}`)}>
              <Ionicons name="chatbubbles" size={18} color={colors.primary_foreground} /><Text style={[styles.actionText, { color: colors.primary_foreground }]}>Chat with May</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="goal-reschedule-btn" style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]} onPress={handleReschedule} disabled={rescheduling}>
              {rescheduling ? <ActivityIndicator size="small" color={colors.text_secondary} /> : <><Ionicons name="refresh" size={18} color={colors.text_primary} /><Text style={[styles.actionText, { color: colors.text_primary }]}>Reschedule</Text></>}
            </TouchableOpacity>
          </View>
        </>
      )}

      {goal.status === 'planning' && (
        <>
          <View style={[styles.planBanner, { backgroundColor: colors.ai_bubble }]}>
            <Ionicons name="sparkles" size={20} color={colors.primary} />
            <Text style={[styles.planBannerText, { color: colors.text_primary }]}>May created a {goal.duration_days}-day plan for you!</Text>
          </View>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text_primary }]}>Your Plan</Text>
            {goal.plan?.slice(0, 10).map((day: any) => (
              <View key={day.day} style={[styles.planDay, { backgroundColor: colors.surface }]}>
                <View style={styles.planDayHeader}><Text style={[styles.planDayNum, { color: colors.primary }]}>Day {day.day}</Text><Text style={[styles.planDayTitle, { color: colors.text_primary }]}>{day.title}</Text></View>
                {day.tasks.map((t: string, i: number) => <Text key={i} style={[styles.planTask, { color: colors.text_secondary }]}>• {t}</Text>)}
              </View>
            ))}
            {goal.plan?.length > 10 && <Text style={[styles.moreText, { color: colors.text_secondary }]}>+ {goal.plan.length - 10} more days...</Text>}
          </View>
          <TouchableOpacity testID="accept-plan-btn" style={[styles.acceptBtn, { backgroundColor: colors.primary }]} onPress={handleAccept} disabled={accepting}>
            {accepting ? <ActivityIndicator color={colors.primary_foreground} /> : <><Ionicons name="checkmark" size={22} color={colors.primary_foreground} /><Text style={[styles.acceptBtnText, { color: colors.primary_foreground }]}>Accept Plan & Start</Text></>}
          </TouchableOpacity>
        </>
      )}

      {goal.status === 'completed' && (
        <View style={[styles.completedCard, { backgroundColor: colors.success + '15' }]}>
          <Ionicons name="trophy" size={48} color={colors.success} />
          <Text style={[styles.completedTitle, { color: colors.success }]}>Goal Completed! 🎉</Text>
          <Text style={[styles.completedDesc, { color: colors.text_secondary }]}>You completed {goal.total_completed || 0} tasks with a best streak of {goal.best_streak || 0} days!</Text>
        </View>
      )}
      <View style={{ height: 48 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topBar: { paddingTop: 56, paddingHorizontal: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  heroSection: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 20 },
  catBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginBottom: 8 },
  catLabel: { fontSize: 13, fontWeight: '700' },
  goalTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginBottom: 4 },
  goalDesc: { fontSize: 15, lineHeight: 22 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 10, marginBottom: 16 },
  stat: { flex: 1, borderRadius: 16, padding: 14, alignItems: 'center', gap: 4 },
  statVal: { fontSize: 20, fontWeight: '800' }, statLbl: { fontSize: 11, fontWeight: '600' },
  progressTrack: { height: 8, borderRadius: 4 }, progressFill: { height: 8, borderRadius: 4 },
  section: { paddingHorizontal: 24, marginBottom: 20 },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16, marginBottom: 8 },
  taskText: { flex: 1, fontSize: 15, fontWeight: '500' },
  congrats: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 12, marginTop: 4 },
  congratsText: { fontSize: 15, fontWeight: '600' },
  actionRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 10, marginBottom: 24 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 16 },
  actionText: { fontSize: 14, fontWeight: '700' },
  planBanner: { marginHorizontal: 24, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  planBannerText: { fontSize: 14, fontWeight: '600', flex: 1 },
  planDay: { borderRadius: 14, padding: 14, marginBottom: 8 },
  planDayHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  planDayNum: { fontSize: 13, fontWeight: '800' }, planDayTitle: { fontSize: 15, fontWeight: '600' },
  planTask: { fontSize: 14, lineHeight: 22, paddingLeft: 4 },
  moreText: { textAlign: 'center', marginTop: 8, fontSize: 14 },
  acceptBtn: { marginHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 9999 },
  acceptBtnText: { fontSize: 17, fontWeight: '700' },
  completedCard: { marginHorizontal: 24, borderRadius: 24, padding: 32, alignItems: 'center', gap: 12 },
  completedTitle: { fontSize: 24, fontWeight: '800' },
  completedDesc: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
