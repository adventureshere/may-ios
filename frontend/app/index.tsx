import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { useTheme } from '../src/context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import MayAvatar from '../src/components/MayAvatar';

export default function WelcomeScreen() {
  const { user, loading, guestLogin } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [guestLoading, setGuestLoading] = useState(false);

  useEffect(() => { if (!loading && user) router.replace('/(tabs)'); }, [loading, user]);

  const handleGuest = async () => {
    setGuestLoading(true);
    try { await guestLogin(); router.replace('/(tabs)'); }
    catch (e) { console.error(e); } finally { setGuestLoading(false); }
  };

  if (loading) return <View style={[styles.container, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Decorative blobs */}
      <View style={[styles.blob1, { backgroundColor: colors.primary + '12' }]} />
      <View style={[styles.blob2, { backgroundColor: colors.secondary + '10' }]} />

      <View style={styles.content}>
        <MayAvatar size={80} showRing showStatus />

        <View style={styles.speechBubble}>
          <View style={[styles.speechCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.speechText, { color: colors.text_primary }]}>
              Hi there! I'm <Text style={{ color: colors.primary, fontWeight: '800' }}>May</Text> ✨{'\n'}
              Your personal AI habit coach.{'\n'}
              Tell me what you want to achieve, and I'll create a plan just for you!
            </Text>
          </View>
          <View style={[styles.speechArrow, { borderTopColor: colors.surface }]} />
        </View>

        <Text style={[styles.title, { color: colors.text_primary }]}>May</Text>
        <Text style={[styles.subtitle, { color: colors.primary }]}>AI Habit Coach & Life Companion</Text>

        <View style={styles.pillRow}>
          {['🎯 Goals', '💬 Chat', '🔥 Streaks', '🧠 AI Plans'].map((t, i) => (
            <View key={i} style={[styles.pill, { backgroundColor: colors.primary + '12' }]}>
              <Text style={[styles.pillText, { color: colors.primary }]}>{t}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.bottom}>
        <TouchableOpacity testID="get-started-btn" onPress={() => router.push('/(auth)/register')} activeOpacity={0.8}>
          <LinearGradient colors={['#8C65F7', '#6200EA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Get Started Free</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity testID="guest-btn" style={[styles.guestBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleGuest} disabled={guestLoading} activeOpacity={0.7}>
          {guestLoading ? <ActivityIndicator size="small" color={colors.text_secondary} /> : <>
            <Ionicons name="flash" size={16} color={colors.accent} />
            <Text style={[styles.guestBtnText, { color: colors.text_primary }]}>Try as Guest — no sign-up</Text>
          </>}
        </TouchableOpacity>

        <TouchableOpacity testID="sign-in-btn" onPress={() => router.push('/(auth)/login')} style={styles.signInBtn}>
          <Text style={[styles.signInText, { color: colors.text_secondary }]}>Already have an account? <Text style={{ color: colors.primary, fontWeight: '700' }}>Sign In</Text></Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  blob1: { position: 'absolute', top: -80, right: -60, width: 250, height: 250, borderRadius: 125 },
  blob2: { position: 'absolute', bottom: 100, left: -80, width: 200, height: 200, borderRadius: 100 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
  speechBubble: { alignItems: 'center', marginTop: 20, marginBottom: 20, width: '100%' },
  speechCard: {
    borderRadius: 20, padding: 20, width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 3,
  },
  speechText: { fontSize: 16, lineHeight: 24, textAlign: 'center' },
  speechArrow: { width: 0, height: 0, borderLeftWidth: 10, borderRightWidth: 10, borderTopWidth: 10, borderLeftColor: 'transparent', borderRightColor: 'transparent', marginTop: -1 },
  title: { fontSize: 44, fontWeight: '900', letterSpacing: -2 },
  subtitle: { fontSize: 15, fontWeight: '600', marginTop: 4, letterSpacing: 0.5 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 20 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  pillText: { fontSize: 13, fontWeight: '700' },
  bottom: { paddingBottom: 48, gap: 12 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderRadius: 9999, gap: 10, shadowColor: '#6200EA', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 },
  primaryBtnText: { fontSize: 17, fontWeight: '800', color: '#fff' },
  guestBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 9999, gap: 8, borderWidth: 1.5 },
  guestBtnText: { fontSize: 15, fontWeight: '600' },
  signInBtn: { alignItems: 'center', paddingVertical: 8 },
  signInText: { fontSize: 14 },
});
