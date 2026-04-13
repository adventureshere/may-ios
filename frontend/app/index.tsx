import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { useTheme } from '../src/context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { MayCharacter, useExpressionCycle } from '../src/components/MayAvatar';

const MAY_IMAGE = 'https://customer-assets.emergentagent.com/job_daily-motivation-hub-1/artifacts/u0ogf74h_Screenshot%202025-12-12%20at%2010.30.14%E2%80%AFPM.png';

export default function WelcomeScreen() {
  const { user, loading, guestLogin } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const [guestLoading, setGuestLoading] = useState(false);

  useEffect(() => { if (!loading && user) router.replace('/(tabs)'); }, [loading, user]);

  const handleGuest = async () => {
    setGuestLoading(true);
    try { await guestLogin(); router.replace('/(tabs)'); }
    catch (e) { console.error(e); } finally { setGuestLoading(false); }
  };

  const expression = useExpressionCycle(4000);

  if (loading) return <View style={[styles.container, { backgroundColor: '#0a0a1a' }]}><ActivityIndicator size="large" color="#A688FA" /></View>;

  return (
    <View style={styles.container}>
      {/* Dark starry background */}
      <View style={styles.bgLayer}>
        <LinearGradient colors={['#0a0a1a', '#0f0f2e', '#0a0a1a']} style={StyleSheet.absoluteFill} />
        {/* Stars */}
        {[...Array(30)].map((_, i) => (
          <View key={i} style={[styles.star, { top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`, width: Math.random() * 3 + 1, height: Math.random() * 3 + 1, opacity: Math.random() * 0.7 + 0.3 }]} />
        ))}
      </View>

      <View style={styles.content}>
        {/* May Character */}
        <View style={styles.characterWrap}>
          <View style={styles.glow} />
          <MayCharacter size={200} expression={expression} />
        </View>

        {/* Speech */}
        <View style={styles.speechWrap}>
          <Text style={styles.speechText}>"Hi! I'm <Text style={styles.speechHighlight}>May</Text> ✨{'\n'}Let's organize your goals."</Text>
        </View>

        <Text style={styles.title}>May</Text>
        <Text style={styles.subtitle}>AI Habit Coach & Life Companion</Text>

        <View style={styles.pillRow}>
          {['🎯 Goals', '💬 Chat', '🔥 Streaks', '🧠 AI Plans'].map((t, i) => (
            <View key={i} style={styles.pill}>
              <Text style={styles.pillText}>{t}</Text>
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

        <TouchableOpacity testID="guest-btn" style={styles.guestBtn} onPress={handleGuest} disabled={guestLoading} activeOpacity={0.7}>
          {guestLoading ? <ActivityIndicator size="small" color="#999" /> : <>
            <Ionicons name="flash" size={16} color="#FFD37D" />
            <Text style={styles.guestBtnText}>Try as Guest — no sign-up</Text>
          </>}
        </TouchableOpacity>

        <TouchableOpacity testID="sign-in-btn" onPress={() => router.push('/(auth)/login')} style={styles.signInBtn}>
          <Text style={styles.signInText}>Already have an account? <Text style={styles.signInLink}>Sign In</Text></Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  bgLayer: { ...StyleSheet.absoluteFillObject },
  star: { position: 'absolute', backgroundColor: '#fff', borderRadius: 10 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, paddingTop: 40 },
  characterWrap: { alignItems: 'center', marginBottom: 16 },
  glow: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: '#A688FA15', top: -20, left: -20,
  },
  speechWrap: { marginBottom: 16 },
  speechText: { fontSize: 18, color: '#ffffffCC', textAlign: 'center', lineHeight: 26, fontWeight: '400' },
  speechHighlight: { color: '#A688FA', fontWeight: '800' },
  title: { fontSize: 48, fontWeight: '900', letterSpacing: -2, color: '#fff' },
  subtitle: { fontSize: 14, fontWeight: '600', color: '#A688FA', marginTop: 4, letterSpacing: 0.5 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 24 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#ffffff10', borderWidth: 1, borderColor: '#ffffff15' },
  pillText: { fontSize: 13, fontWeight: '600', color: '#ffffffBB' },
  bottom: { paddingHorizontal: 24, paddingBottom: 48, gap: 12 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 18, borderRadius: 9999, gap: 10,
    shadowColor: '#6200EA', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 8,
  },
  primaryBtnText: { fontSize: 17, fontWeight: '800', color: '#fff' },
  guestBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, borderRadius: 9999, gap: 8,
    backgroundColor: '#ffffff08', borderWidth: 1, borderColor: '#ffffff20',
  },
  guestBtnText: { fontSize: 15, fontWeight: '600', color: '#ffffffCC' },
  signInBtn: { alignItems: 'center', paddingVertical: 8 },
  signInText: { fontSize: 14, color: '#ffffff66' },
  signInLink: { color: '#A688FA', fontWeight: '700' },
});
