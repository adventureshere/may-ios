import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { useTheme } from '../src/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function WelcomeScreen() {
  const { user, loading, guestLogin } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const [guestLoading, setGuestLoading] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/(tabs)');
  }, [loading, user]);

  const handleGuest = async () => {
    setGuestLoading(true);
    try { await guestLogin(); router.replace('/(tabs)'); }
    catch (e) { console.error(e); }
    finally { setGuestLoading(false); }
  };

  if (loading) return <View style={[styles.container, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name="sparkles" size={48} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text_primary }]}>May</Text>
        <Text style={[styles.subtitle, { color: colors.primary }]}>Your AI Habit Coach</Text>
        <Text style={[styles.description, { color: colors.text_secondary }]}>
          Set a goal, get a personalized plan, and let May guide you to success with daily motivation and smart rescheduling.
        </Text>
        <View style={styles.features}>
          {[{ icon: 'flag', text: 'AI-Powered Plans' }, { icon: 'chatbubbles', text: 'Daily Motivation' }, { icon: 'flame', text: 'Streak Tracking' }, { icon: 'refresh', text: 'Smart Rescheduling' }].map((f, i) => (
            <View key={i} style={[styles.featureRow, { backgroundColor: colors.surface }]}>
              <Ionicons name={f.icon as any} size={20} color={colors.primary} />
              <Text style={[styles.featureText, { color: colors.text_primary }]}>{f.text}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.bottom}>
        <TouchableOpacity testID="get-started-btn" style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={() => router.push('/(auth)/register')} activeOpacity={0.7}>
          <Text style={[styles.primaryBtnText, { color: colors.primary_foreground }]}>Get Started</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.primary_foreground} />
        </TouchableOpacity>
        <TouchableOpacity testID="guest-btn" style={[styles.guestBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleGuest} disabled={guestLoading} activeOpacity={0.7}>
          {guestLoading ? <ActivityIndicator size="small" color={colors.text_secondary} /> : <>
            <Ionicons name="person-outline" size={18} color={colors.text_secondary} />
            <Text style={[styles.guestBtnText, { color: colors.text_secondary }]}>Try as Guest</Text>
          </>}
        </TouchableOpacity>
        <TouchableOpacity testID="sign-in-btn" onPress={() => router.push('/(auth)/login')} activeOpacity={0.7} style={styles.signInBtn}>
          <Text style={[styles.signInText, { color: colors.text_secondary }]}>Already have an account? <Text style={{ color: colors.primary, fontWeight: '600' }}>Sign In</Text></Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  iconCircle: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 48, fontWeight: '800', letterSpacing: -1.5 },
  subtitle: { fontSize: 18, fontWeight: '600', marginTop: 4, marginBottom: 16 },
  description: { fontSize: 16, lineHeight: 24, textAlign: 'center', paddingHorizontal: 16, marginBottom: 32 },
  features: { width: '100%', gap: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16 },
  featureText: { fontSize: 15, fontWeight: '500' },
  bottom: { paddingBottom: 48, gap: 12 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 9999, gap: 8 },
  primaryBtnText: { fontSize: 17, fontWeight: '700' },
  guestBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 9999, gap: 8, borderWidth: 1 },
  guestBtnText: { fontSize: 15, fontWeight: '600' },
  signInBtn: { alignItems: 'center', paddingVertical: 8 },
  signInText: { fontSize: 15 },
});
