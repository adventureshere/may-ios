import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/context/ThemeContext';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/utils/api';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MayAvatar from '../src/components/MayAvatar';

const FEATURES = [
  { icon: 'infinite', text: 'Unlimited goals' },
  { icon: 'chatbubbles', text: 'Unlimited AI coaching' },
  { icon: 'refresh', text: 'Smart rescheduling' },
  { icon: 'flame', text: 'Advanced streak tracking' },
  { icon: 'grid', text: 'All goal categories' },
  { icon: 'notifications', text: 'Daily motivation messages' },
];

export default function SubscriptionScreen() {
  const { colors } = useTheme();
  const { refreshUser } = useAuth();
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => { loadSub(); }, []);

  const loadSub = async () => { try { const s = await api('/subscription/me'); setSubscription(s); } catch (e) {} };

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      // In production, this calls Apple StoreKit / Google Play Billing
      // For development, we use a mock activation endpoint
      const result = await api('/subscription/activate', {
        method: 'POST',
        body: JSON.stringify({ plan_id: selectedPlan }),
      });
      if (result.status === 'active') {
        await refreshUser();
        loadSub();
        Alert.alert('Welcome to Premium!', 'You now have unlimited access to all May features. Let\'s crush your goals! 🎉', [
          { text: "Let's Go!", onPress: () => router.replace('/(tabs)') }
        ]);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Purchase failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    // In production, this would restore purchases from App Store / Play Store
    Alert.alert('Restore Purchases', 'In the production app, this will restore your purchases from the App Store or Google Play Store.');
  };

  const handleBack = () => {
    try { if (router.canGoBack()) router.back(); else router.replace('/(tabs)/profile'); }
    catch (e) { router.replace('/(tabs)/profile'); }
  };

  const payIcon = Platform.OS === 'ios' ? 'logo-apple' : Platform.OS === 'android' ? 'logo-google' : 'card';
  const storeName = Platform.OS === 'ios' ? 'App Store' : Platform.OS === 'android' ? 'Google Play' : 'Store';

  if (subscription?.active) {
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color={colors.text_primary} /></TouchableOpacity>
        </View>
        <View style={[styles.activeCard]}>
          <LinearGradient colors={['#8C65F7', '#6200EA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.activeGradient}>
            <MayAvatar size={56} />
            <Text style={styles.activeTitle}>May Premium Active</Text>
            <Text style={styles.activeDesc}>{subscription.plan === 'yearly' ? 'Annual' : 'Monthly'} subscription</Text>
          </LinearGradient>
        </View>
        <View style={styles.featureList}>{FEATURES.map((f, i) => (
          <View key={i} style={[styles.featureRow, { backgroundColor: colors.surface }]}>
            <Ionicons name={f.icon as any} size={20} color={colors.success} />
            <Text style={[styles.featureText, { color: colors.text_primary }]}>{f.text}</Text>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          </View>
        ))}</View>
        <Text style={[styles.manageText, { color: colors.text_secondary }]}>Manage your subscription in {storeName} settings</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.topBar}>
        <TouchableOpacity testID="sub-back-btn" onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text_primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.headerSection}>
        <MayAvatar size={64} showRing />
        <Text style={[styles.headerTitle, { color: colors.text_primary }]}>May Premium</Text>
        <Text style={[styles.headerDesc, { color: colors.text_secondary }]}>Unlock unlimited AI coaching and all features</Text>
      </View>

      {/* Plans */}
      <View style={styles.planRow}>
        <TouchableOpacity testID="plan-monthly" style={[styles.planCard, { backgroundColor: colors.surface, borderColor: selectedPlan === 'monthly' ? colors.primary : colors.border, borderWidth: selectedPlan === 'monthly' ? 2 : 1 }]} onPress={() => setSelectedPlan('monthly')}>
          <Text style={[styles.planName, { color: colors.text_primary }]}>Monthly</Text>
          <Text style={[styles.planPrice, { color: colors.primary }]}>$6.99</Text>
          <Text style={[styles.planPeriod, { color: colors.text_secondary }]}>per month</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="plan-yearly" style={[styles.planCard, { backgroundColor: colors.surface, borderColor: selectedPlan === 'yearly' ? colors.primary : colors.border, borderWidth: selectedPlan === 'yearly' ? 2 : 1 }]} onPress={() => setSelectedPlan('yearly')}>
          <View style={[styles.saveBadge, { backgroundColor: colors.success }]}><Text style={styles.saveText}>SAVE 40%</Text></View>
          <Text style={[styles.planName, { color: colors.text_primary }]}>Yearly</Text>
          <Text style={[styles.planPrice, { color: colors.primary }]}>$49.99</Text>
          <Text style={[styles.planPeriod, { color: colors.text_secondary }]}>per year</Text>
        </TouchableOpacity>
      </View>

      {/* Features */}
      <View style={styles.featureList}>{FEATURES.map((f, i) => (
        <View key={i} style={[styles.featureRow, { backgroundColor: colors.surface }]}>
          <Ionicons name={f.icon as any} size={20} color={colors.primary} />
          <Text style={[styles.featureText, { color: colors.text_primary }]}>{f.text}</Text>
        </View>
      ))}</View>

      {/* Subscribe Button */}
      <TouchableOpacity testID="subscribe-btn" onPress={handleSubscribe} disabled={loading} activeOpacity={0.8}>
        <LinearGradient colors={['#8C65F7', '#6200EA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.subscribeBtn}>
          {loading ? <ActivityIndicator color="#fff" /> : <>
            <Ionicons name={payIcon as any} size={20} color="#fff" />
            <Text style={styles.subscribeBtnText}>Subscribe via {storeName}</Text>
          </>}
        </LinearGradient>
      </TouchableOpacity>

      {/* Restore */}
      <TouchableOpacity testID="restore-btn" style={[styles.restoreBtn, { borderColor: colors.border }]} onPress={handleRestore}>
        <Text style={[styles.restoreText, { color: colors.primary }]}>Restore Purchases</Text>
      </TouchableOpacity>

      <Text style={[styles.terms, { color: colors.text_secondary }]}>
        Payment will be charged to your {storeName} account. Subscription auto-renews unless cancelled at least 24 hours before the end of the current period. Cancel anytime in {storeName} settings.
      </Text>
      <View style={{ height: 48 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { paddingTop: 56, paddingHorizontal: 24 },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerSection: { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 28, paddingTop: 8 },
  headerTitle: { fontSize: 32, fontWeight: '900', letterSpacing: -1, marginTop: 16, marginBottom: 8 },
  headerDesc: { fontSize: 16, textAlign: 'center', lineHeight: 22 },
  planRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 12, marginBottom: 24 },
  planCard: { flex: 1, borderRadius: 20, padding: 20, alignItems: 'center' },
  planName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  planPrice: { fontSize: 32, fontWeight: '900' },
  planPeriod: { fontSize: 13, marginTop: 2 },
  saveBadge: { position: 'absolute', top: -10, right: -4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  saveText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  featureList: { paddingHorizontal: 24, gap: 6, marginBottom: 24 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14 },
  featureText: { flex: 1, fontSize: 15, fontWeight: '500' },
  subscribeBtn: {
    marginHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 18, borderRadius: 9999,
    shadowColor: '#6200EA', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
  },
  subscribeBtnText: { fontSize: 17, fontWeight: '800', color: '#fff' },
  restoreBtn: { marginHorizontal: 24, marginTop: 12, paddingVertical: 14, borderRadius: 9999, alignItems: 'center', borderWidth: 1.5 },
  restoreText: { fontSize: 15, fontWeight: '600' },
  terms: { textAlign: 'center', fontSize: 12, lineHeight: 18, marginTop: 16, paddingHorizontal: 32 },
  activeCard: { marginHorizontal: 24, marginTop: 16, marginBottom: 24, borderRadius: 24, overflow: 'hidden' },
  activeGradient: { padding: 32, alignItems: 'center', gap: 10 },
  activeTitle: { fontSize: 24, fontWeight: '900', color: '#fff' },
  activeDesc: { fontSize: 15, color: '#ffffffCC' },
  manageText: { textAlign: 'center', fontSize: 14, paddingHorizontal: 24, marginTop: 8 },
});
