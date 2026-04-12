import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/utils/api';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const { colors, mode, setMode, isDark } = useTheme();
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();
  const [sub, setSub] = useState<any>(null);

  useFocusEffect(useCallback(() => {
    refreshUser();
    (async () => { try { const s = await api('/subscription/me'); setSub(s); } catch (e) {} })();
  }, []));

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { await logout(); router.replace('/'); } },
    ]);
  };

  const themes: Array<{ key: 'auto' | 'light' | 'dark'; icon: string; label: string }> = [
    { key: 'auto', icon: 'phone-portrait-outline', label: 'Auto' },
    { key: 'light', icon: 'sunny-outline', label: 'Light' },
    { key: 'dark', icon: 'moon-outline', label: 'Dark' },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text_primary }]}>Profile</Text>
      </View>

      <View style={[styles.userCard, { backgroundColor: colors.surface }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>{(user?.name || 'G')[0].toUpperCase()}</Text>
        </View>
        <Text style={[styles.userName, { color: colors.text_primary }]}>{user?.name || 'Guest'}</Text>
        <Text style={[styles.userEmail, { color: colors.text_secondary }]}>{user?.email}</Text>
        {user?.role === 'guest' && (
          <TouchableOpacity testID="profile-upgrade-btn" style={[styles.upgradeBtn, { backgroundColor: colors.primary }]} onPress={() => router.push('/(auth)/register')}>
            <Text style={[styles.upgradeBtnText, { color: colors.primary_foreground }]}>Create Account</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.subCard, { backgroundColor: colors.surface }]}>
        <View style={styles.subRow}>
          <Ionicons name={sub?.active ? 'diamond' : 'diamond-outline'} size={24} color={sub?.active ? colors.primary : colors.text_secondary} />
          <View style={styles.subInfo}>
            <Text style={[styles.subTitle, { color: colors.text_primary }]}>{sub?.active ? 'May Premium' : 'Free Plan'}</Text>
            <Text style={[styles.subDesc, { color: colors.text_secondary }]}>{sub?.active ? `${sub.plan === 'yearly' ? 'Annual' : 'Monthly'} subscription` : 'Limited features'}</Text>
          </View>
        </View>
        {!sub?.active && (
          <TouchableOpacity testID="profile-premium-btn" style={[styles.premiumBtn, { backgroundColor: colors.primary + '15' }]} onPress={() => router.push('/subscription')}>
            <Ionicons name="sparkles" size={16} color={colors.primary} />
            <Text style={[styles.premiumBtnText, { color: colors.primary }]}>Upgrade to Premium</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.themeCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.themeLabel, { color: colors.text_primary }]}>Theme</Text>
        <View style={styles.themeRow}>
          {themes.map(t => (
            <TouchableOpacity testID={`theme-${t.key}`} key={t.key} style={[styles.themeOption, mode === t.key && { backgroundColor: colors.primary + '20', borderColor: colors.primary, borderWidth: 1.5 }]} onPress={() => setMode(t.key)} activeOpacity={0.7}>
              <Ionicons name={t.icon as any} size={20} color={mode === t.key ? colors.primary : colors.text_secondary} />
              <Text style={[styles.themeText, { color: mode === t.key ? colors.primary : colors.text_secondary }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity testID="logout-btn" style={[styles.logoutBtn, { backgroundColor: colors.error + '10' }]} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={colors.error} />
        <Text style={[styles.logoutText, { color: colors.error }]}>Logout</Text>
      </TouchableOpacity>
      <View style={{ height: 48 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 16 },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.8 },
  userCard: { marginHorizontal: 24, borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 16 },
  avatar: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 28, fontWeight: '800' },
  userName: { fontSize: 20, fontWeight: '700' }, userEmail: { fontSize: 14, marginTop: 4 },
  upgradeBtn: { marginTop: 16, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 9999 },
  upgradeBtnText: { fontSize: 14, fontWeight: '700' },
  subCard: { marginHorizontal: 24, borderRadius: 20, padding: 20, marginBottom: 16 },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  subInfo: { flex: 1 }, subTitle: { fontSize: 16, fontWeight: '700' }, subDesc: { fontSize: 13, marginTop: 2 },
  premiumBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, paddingVertical: 12, borderRadius: 12 },
  premiumBtnText: { fontSize: 14, fontWeight: '700' },
  themeCard: { marginHorizontal: 24, borderRadius: 20, padding: 20, marginBottom: 16 },
  themeLabel: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  themeRow: { flexDirection: 'row', gap: 10 },
  themeOption: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: 'transparent' },
  themeText: { fontSize: 12, fontWeight: '600' },
  logoutBtn: { marginHorizontal: 24, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  logoutText: { fontSize: 15, fontWeight: '600' },
});
