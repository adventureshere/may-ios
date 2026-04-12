import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../src/context/ThemeContext';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/utils/api';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';

const FEATURES = [
  { icon: 'infinite', text: 'Unlimited goals' },
  { icon: 'chatbubbles', text: 'Unlimited AI coaching' },
  { icon: 'refresh', text: 'Smart rescheduling' },
  { icon: 'flame', text: 'Advanced streak tracking' },
  { icon: 'grid', text: 'All goal categories' },
  { icon: 'notifications', text: 'Daily motivation' },
];

export default function SubscriptionScreen() {
  const params = useLocalSearchParams();
  const sessionId = params.session_id as string | undefined;
  const { colors } = useTheme();
  const { refreshUser } = useAuth();
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>('');

  useEffect(() => {
    loadSub();
    if (sessionId) pollStatus(sessionId, 0);
  }, [sessionId]);

  const loadSub = async () => { try { const s = await api('/subscription/me'); setSubscription(s); } catch (e) {} };

  const pollStatus = async (sid: string, attempts: number) => {
    if (attempts >= 6) { setPaymentStatus('timeout'); return; }
    try {
      const result = await api(`/subscription/status/${sid}`);
      if (result.payment_status === 'paid') { setPaymentStatus('success'); refreshUser(); loadSub(); return; }
      if (result.status === 'expired') { setPaymentStatus('expired'); return; }
      setPaymentStatus('processing');
      setTimeout(() => pollStatus(sid, attempts + 1), 2500);
    } catch (e) { if (attempts < 3) setTimeout(() => pollStatus(sid, attempts + 1), 2000); else setPaymentStatus('error'); }
  };

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const origin = Platform.OS === 'web' ? window.location.origin : process.env.EXPO_PUBLIC_BACKEND_URL;
      const result = await api('/subscription/checkout', { method: 'POST', body: JSON.stringify({ plan_id: selectedPlan, origin_url: origin }) });
      if (result.url) {
        if (Platform.OS === 'web') { window.location.href = result.url; }
        else { await WebBrowser.openBrowserAsync(result.url); pollStatus(result.session_id, 0); }
      }
    } catch (e: any) { alert(e.message || 'Payment failed'); }
    finally { setLoading(false); }
  };

  const payIcon = Platform.OS === 'ios' ? 'logo-apple' : Platform.OS === 'android' ? 'logo-google' : 'card';
  const payLabel = Platform.OS === 'ios' ? 'Apple Pay' : Platform.OS === 'android' ? 'Google Pay' : 'Card';

  if (paymentStatus === 'success') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.successWrap}>
          <View style={[styles.successIcon, { backgroundColor: colors.success + '20' }]}><Ionicons name="checkmark-circle" size={64} color={colors.success} /></View>
          <Text style={[styles.successTitle, { color: colors.text_primary }]}>Welcome to Premium!</Text>
          <Text style={[styles.successDesc, { color: colors.text_secondary }]}>You now have unlimited access to all May features. Let's crush your goals!</Text>
          <TouchableOpacity testID="success-continue-btn" style={[styles.continueBtn, { backgroundColor: colors.primary }]} onPress={() => router.replace('/(tabs)')}>
            <Text style={[styles.continueBtnText, { color: colors.primary_foreground }]}>Let's Go!</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (paymentStatus === 'processing') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.successWrap}><ActivityIndicator size="large" color={colors.primary} /><Text style={[styles.successTitle, { color: colors.text_primary }]}>Processing payment...</Text></View>
      </View>
    );
  }

  if (subscription?.active) {
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.topBar}><TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color={colors.text_primary} /></TouchableOpacity></View>
        <View style={[styles.activeCard, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name="diamond" size={40} color={colors.primary} />
          <Text style={[styles.activeTitle, { color: colors.primary }]}>May Premium Active</Text>
          <Text style={[styles.activeDesc, { color: colors.text_secondary }]}>{subscription.plan === 'yearly' ? 'Annual' : 'Monthly'} subscription</Text>
        </View>
        <View style={styles.featureList}>{FEATURES.map((f, i) => (
          <View key={i} style={[styles.featureRow, { backgroundColor: colors.surface }]}><Ionicons name={f.icon as any} size={20} color={colors.success} /><Text style={[styles.featureText, { color: colors.text_primary }]}>{f.text}</Text><Ionicons name="checkmark" size={18} color={colors.success} /></View>
        ))}</View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.topBar}><TouchableOpacity testID="sub-back-btn" onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color={colors.text_primary} /></TouchableOpacity></View>

      <View style={styles.headerSection}>
        <View style={[styles.premiumBadge, { backgroundColor: colors.primary + '20' }]}><Ionicons name="diamond" size={28} color={colors.primary} /></View>
        <Text style={[styles.headerTitle, { color: colors.text_primary }]}>May Premium</Text>
        <Text style={[styles.headerDesc, { color: colors.text_secondary }]}>Unlock your full potential with unlimited AI coaching</Text>
      </View>

      <View style={styles.planRow}>
        <TouchableOpacity testID="plan-monthly" style={[styles.planCard, { backgroundColor: colors.surface, borderColor: selectedPlan === 'monthly' ? colors.primary : colors.border, borderWidth: selectedPlan === 'monthly' ? 2 : 1 }]} onPress={() => setSelectedPlan('monthly')}>
          <Text style={[styles.planName, { color: colors.text_primary }]}>Monthly</Text>
          <Text style={[styles.planPrice, { color: colors.primary }]}>$6.99</Text>
          <Text style={[styles.planPeriod, { color: colors.text_secondary }]}>/month</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="plan-yearly" style={[styles.planCard, { backgroundColor: colors.surface, borderColor: selectedPlan === 'yearly' ? colors.primary : colors.border, borderWidth: selectedPlan === 'yearly' ? 2 : 1 }]} onPress={() => setSelectedPlan('yearly')}>
          <View style={[styles.saveBadge, { backgroundColor: colors.success }]}><Text style={styles.saveText}>SAVE 40%</Text></View>
          <Text style={[styles.planName, { color: colors.text_primary }]}>Yearly</Text>
          <Text style={[styles.planPrice, { color: colors.primary }]}>$49.99</Text>
          <Text style={[styles.planPeriod, { color: colors.text_secondary }]}>/year</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.featureList}>{FEATURES.map((f, i) => (
        <View key={i} style={[styles.featureRow, { backgroundColor: colors.surface }]}><Ionicons name={f.icon as any} size={20} color={colors.primary} /><Text style={[styles.featureText, { color: colors.text_primary }]}>{f.text}</Text></View>
      ))}</View>

      <TouchableOpacity testID="subscribe-btn" style={[styles.subscribeBtn, { backgroundColor: colors.primary }]} onPress={handleSubscribe} disabled={loading} activeOpacity={0.7}>
        {loading ? <ActivityIndicator color={colors.primary_foreground} /> : <>
          <Ionicons name={payIcon as any} size={20} color={colors.primary_foreground} />
          <Text style={[styles.subscribeBtnText, { color: colors.primary_foreground }]}>Subscribe with {payLabel}</Text>
        </>}
      </TouchableOpacity>
      <Text style={[styles.terms, { color: colors.text_secondary }]}>Cancel anytime. Secure payment via Stripe.</Text>
      <View style={{ height: 48 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { paddingTop: 56, paddingHorizontal: 24 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  headerSection: { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 24 },
  premiumBadge: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 32, fontWeight: '800', letterSpacing: -0.8, marginBottom: 8 },
  headerDesc: { fontSize: 16, textAlign: 'center', lineHeight: 22 },
  planRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 12, marginBottom: 24 },
  planCard: { flex: 1, borderRadius: 20, padding: 20, alignItems: 'center' },
  planName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  planPrice: { fontSize: 32, fontWeight: '800' },
  planPeriod: { fontSize: 14 },
  saveBadge: { position: 'absolute', top: -10, right: -4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  saveText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  featureList: { paddingHorizontal: 24, gap: 6, marginBottom: 24 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12 },
  featureText: { flex: 1, fontSize: 15, fontWeight: '500' },
  subscribeBtn: { marginHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 9999 },
  subscribeBtnText: { fontSize: 17, fontWeight: '700' },
  terms: { textAlign: 'center', fontSize: 13, marginTop: 12, paddingHorizontal: 24 },
  successWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, paddingTop: 200 },
  successIcon: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  successTitle: { fontSize: 28, fontWeight: '800', marginBottom: 12 },
  successDesc: { fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  continueBtn: { paddingVertical: 16, paddingHorizontal: 48, borderRadius: 9999 },
  continueBtnText: { fontSize: 17, fontWeight: '700' },
  activeCard: { marginHorizontal: 24, borderRadius: 24, padding: 32, alignItems: 'center', gap: 8, marginTop: 16, marginBottom: 24 },
  activeTitle: { fontSize: 24, fontWeight: '800' },
  activeDesc: { fontSize: 15 },
});
