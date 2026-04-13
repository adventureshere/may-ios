import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';
import { api, CATEGORIES } from '../../src/utils/api';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MayAvatar from '../../src/components/MayAvatar';

export default function ChatsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    (async () => {
      try { const data = await api('/goals'); setGoals(data.filter((g: any) => g.status === 'active' || g.status === 'completed')); }
      catch (e) {} finally { setLoading(false); }
    })();
  }, []));

  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text_primary }]}>May</Text>
        <Text style={[styles.subtitle, { color: colors.text_secondary }]}>Your AI Coach</Text>
      </View>

      {/* Main Chat with May */}
      <TouchableOpacity testID="general-chat-btn" onPress={() => router.push('/chat/general')} activeOpacity={0.8}>
        <LinearGradient colors={['#8C65F7', '#6200EA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.mainChat}>
          <View style={styles.mainChatLeft}>
            <View style={styles.mainAvatar}>
              <MayAvatar size={52} showStatus />
            </View>
            <View style={styles.mainInfo}>
              <Text style={styles.mainName}>Talk to May</Text>
              <Text style={styles.mainDesc}>Ask anything — goals, motivation, life advice</Text>
            </View>
          </View>
          <View style={styles.mainArrow}>
            <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Goal Chats */}
      {goals.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.text_secondary }]}>GOAL COACHING</Text>
          {goals.map(goal => {
            const cat = CATEGORIES[goal.category] || CATEGORIES.other;
            return (
              <TouchableOpacity testID={`chat-goal-${goal.id}`} key={goal.id} style={[styles.chatRow, { backgroundColor: colors.surface }]} onPress={() => router.push(`/chat/${goal.id}`)} activeOpacity={0.7}>
                <View style={[styles.chatIcon, { backgroundColor: cat.color + '18' }]}>
                  <Ionicons name={cat.icon as any} size={20} color={cat.color} />
                </View>
                <View style={styles.chatInfo}>
                  <Text style={[styles.chatTitle, { color: colors.text_primary }]} numberOfLines={1}>{goal.title}</Text>
                  <Text style={[styles.chatSub, { color: colors.text_secondary }]}>
                    {goal.status === 'active' ? `Day ${goal.current_day || 0}/${goal.duration_days} · Tap to chat` : 'Completed'}
                  </Text>
                </View>
                <View style={[styles.chatArrow, { backgroundColor: colors.primary + '10' }]}>
                  <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {goals.length === 0 && (
        <View style={[styles.empty, { backgroundColor: colors.surface }]}>
          <Ionicons name="chatbubbles-outline" size={40} color={colors.text_secondary} />
          <Text style={[styles.emptyTitle, { color: colors.text_primary }]}>No goal chats yet</Text>
          <Text style={[styles.emptyText, { color: colors.text_secondary }]}>Create a goal and May will coach you through it!</Text>
          <TouchableOpacity style={[styles.createBtn, { backgroundColor: colors.primary + '12' }]} onPress={() => router.push('/goal/create')}>
            <Ionicons name="add" size={18} color={colors.primary} />
            <Text style={[styles.createBtnText, { color: colors.primary }]}>Create Goal</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 8 },
  title: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  subtitle: { fontSize: 14, fontWeight: '500', marginTop: 2 },
  mainChat: {
    marginHorizontal: 24, marginTop: 16, borderRadius: 24, padding: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#6200EA', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 8,
  },
  mainChatLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  mainAvatar: {},
  mainInfo: { flex: 1 },
  mainName: { fontSize: 18, fontWeight: '800', color: '#fff' },
  mainDesc: { fontSize: 13, color: '#ffffffBB', marginTop: 3, lineHeight: 18 },
  mainArrow: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ffffff25', justifyContent: 'center', alignItems: 'center' },
  section: { paddingHorizontal: 24, marginTop: 24 },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, marginBottom: 12 },
  chatRow: {
    borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  chatIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  chatInfo: { flex: 1 }, chatTitle: { fontSize: 15, fontWeight: '600' }, chatSub: { fontSize: 13, marginTop: 2 },
  chatArrow: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  empty: { margin: 24, borderRadius: 24, padding: 32, alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, marginTop: 8 },
  createBtnText: { fontSize: 14, fontWeight: '700' },
});
