import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen() {
  const { register } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) { setError('Please fill in all fields'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setError('');
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password);
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity testID="register-back-btn" onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text_primary} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text_primary }]}>Create account</Text>
          <Text style={[styles.subtitle, { color: colors.text_secondary }]}>Start your journey with May</Text>
        </View>

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: colors.error + '15' }]}>
            <Ionicons name="alert-circle" size={18} color={colors.error} />
            <Text testID="register-error" style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <View>
            <Text style={[styles.label, { color: colors.text_secondary }]}>NAME</Text>
            <TextInput
              testID="register-name-input"
              style={[styles.input, { backgroundColor: colors.surface_alt, borderColor: colors.border, color: colors.text_primary }]}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={colors.text_secondary}
              autoCapitalize="words"
            />
          </View>

          <View>
            <Text style={[styles.label, { color: colors.text_secondary }]}>EMAIL</Text>
            <TextInput
              testID="register-email-input"
              style={[styles.input, { backgroundColor: colors.surface_alt, borderColor: colors.border, color: colors.text_primary }]}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.text_secondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View>
            <Text style={[styles.label, { color: colors.text_secondary }]}>PASSWORD</Text>
            <View style={[styles.passwordWrap, { backgroundColor: colors.surface_alt, borderColor: colors.border }]}>
              <TextInput
                testID="register-password-input"
                style={[styles.passwordInput, { color: colors.text_primary }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Min 6 characters"
                placeholderTextColor={colors.text_secondary}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={colors.text_secondary} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            testID="register-submit-btn"
            style={[styles.submitBtn, { backgroundColor: colors.primary }]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator color={colors.primary_foreground} />
            ) : (
              <Text style={[styles.submitText, { color: colors.primary_foreground }]}>Create Account</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity testID="register-to-login" onPress={() => router.replace('/(auth)/login')} style={styles.switchBtn}>
          <Text style={[styles.switchText, { color: colors.text_secondary }]}>
            Already have an account? <Text style={{ color: colors.primary, fontWeight: '600' }}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60 },
  backBtn: { marginBottom: 24, width: 44, height: 44, justifyContent: 'center' },
  header: { marginBottom: 32 },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { fontSize: 16, marginTop: 8, lineHeight: 22 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, marginBottom: 16 },
  errorText: { fontSize: 14, flex: 1 },
  form: { gap: 20, marginBottom: 32 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, marginBottom: 8 },
  input: {
    borderWidth: 1, borderRadius: 16, paddingHorizontal: 16,
    paddingVertical: 14, fontSize: 16,
  },
  passwordWrap: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1,
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, gap: 8,
  },
  passwordInput: { flex: 1, fontSize: 16 },
  submitBtn: { paddingVertical: 16, borderRadius: 9999, alignItems: 'center', marginTop: 8 },
  submitText: { fontSize: 17, fontWeight: '700' },
  switchBtn: { alignItems: 'center', paddingVertical: 16 },
  switchText: { fontSize: 15 },
});
