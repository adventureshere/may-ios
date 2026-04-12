import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';
import { api, CATEGORIES } from '../../src/utils/api';
import { Ionicons } from '@expo/vector-icons';

export default function ChatsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    (async () => {
      try { const data = await api('/goals'); setGoals(data.filter((g: any) => g.status === 'active' || g.status === 'completed')); }
      catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []));

  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text_primary }]}>Chat with May</Text>
      </View>
      <View style={[styles.mayBanner, { backgroundColor: colors.ai_bubble }]}>
        <Ionicons name="sparkles" size={24} color={colors.primary} />
        <View style={styles.mayInfo}>
          <Text style={[styles.mayName, { color: colors.text_primary }]}>May - Your AI Coach</Text>
          <Text style={[styles.mayDesc, { color: colors.text_secondary }]}>Select a goal to start chatting</Text>
        </View>
      </View>
      {goals.length > 0 ? goals.map(goal => {
        const cat = CATEGORIES[goal.category] || CATEGORIES.other;
        return (
          <TouchableOpacity testID={`chat-goal-${goal.id}`} key={goal.id} style={[styles.chatRow, { backgroundColor: colors.surface }]} onPress={() => router.push(`/chat/${goal.id}`)} activeOpacity={0.7}>
            <View style={[styles.chatIcon, { backgroundColor: cat.color + '20' }]}><Ionicons name={cat.icon as any} size={20} color={cat.color} /></View>
            <View style={styles.chatInfo}>
              <Text style={[styles.chatTitle, { color: colors.text_primary }]}>{goal.title}</Text>
              <Text style={[styles.chatSub, { color: colors.text_secondary }]}>
                {goal.status === 'active' ? `Day ${goal.current_day || 0}/${goal.duration_days}` : 'Completed'} · Tap to chat
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text_secondary} />
          </TouchableOpacity>
        );
      }) : (
        <View style={[styles.empty, { backgroundColor: colors.surface }]}>
          <Ionicons name="chatbubbles-outline" size={48} color={colors.text_secondary} />
          <Text style={[styles.emptyText, { color: colors.text_secondary }]}>Create a goal to start chatting with May</Text>
        </View>
      )}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 16 },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.8 },
  mayBanner: { marginHorizontal: 24, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  mayInfo: { flex: 1 }, mayName: { fontSize: 16, fontWeight: '700' }, mayDesc: { fontSize: 13, marginTop: 2 },
  chatRow: { marginHorizontal: 24, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  chatIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  chatInfo: { flex: 1 }, chatTitle: { fontSize: 15, fontWeight: '600' }, chatSub: { fontSize: 13, marginTop: 2 },
  empty: { margin: 24, borderRadius: 24, padding: 48, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 15, textAlign: 'center' },
});
