import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  TextInput,
  Dimensions,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Copy, RefreshCw, CheckCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useApp } from '@/components/providers/AppProvider';
import { linkCreateCode, linkConfirm } from '@/lib/authApi';
import Colors from '@/constants/colors';

const { width } = Dimensions.get('window');
const OTP_INPUT_SIZE = (width - 48 - 40) / 6;

export default function GuardianLinkScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { authToken, isLoading: authLoading } = useApp();
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timer, setTimer] = useState<number>(600);
  const [expired, setExpired] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const otpRefs = useRef<(TextInput | null)[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fetchCode = useCallback(async () => {
    if (!authToken) return;
    setRefreshing(true);
    setError(null);
    try {
      const res = await linkCreateCode(authToken);
      setCode(res.code);
      setExpiresAt(new Date(res.expiresAt));
      setTimer(600);
      setExpired(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create code');
    } finally {
      setRefreshing(false);
    }
  }, [authToken]);

  useEffect(() => {
    if (authLoading) return;
    if (!authToken) {
      setLoading(false);
      router.replace('/verification');
      return;
    }
    fetchCode().finally(() => setLoading(false));
  }, [authToken, authLoading, router, fetchCode]);

  useEffect(() => {
    if (!expiresAt || expired) return;
    const tick = () => {
      const sec = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      setTimer(sec);
      if (sec <= 0) setExpired(true);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, expired]);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const formatTime = (s: number): string => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const handleCopy = useCallback(async () => {
    if (!code) return;
    await Clipboard.setStringAsync(code);
    setCopied(true);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const handleRefresh = useCallback(() => {
    fetchCode();
  }, [fetchCode]);

  const handleOtpChange = useCallback((text: string, index: number) => {
    const cleanText = text.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = cleanText;
    setOtp(newOtp);
    setError(null);
    if (cleanText && index < 5) {
      otpRefs.current[index + 1]?.focus();
    } else if (cleanText && index === 5) {
      Keyboard.dismiss();
    }
  }, [otp]);

  const handleOtpKeyPress = useCallback((key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }, [otp]);

  const handleLink = useCallback(async () => {
    const codeStr = otp.join('');
    if (codeStr.length !== 6 || !authToken) return;
    setLinking(true);
    setError(null);
    try {
      await linkConfirm(authToken, codeStr);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to link');
    } finally {
      setLinking(false);
    }
  }, [otp, authToken, router]);

  if (!authLoading && !authToken && !loading) return null;

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Link guardian',
            headerStyle: { backgroundColor: Colors.background },
            headerTintColor: Colors.text,
            headerShadowVisible: false,
            headerTitleStyle: { fontWeight: '700', fontSize: 18 },
          }}
        />

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={[styles.inner, { opacity: fadeAnim }]}>
            <View style={styles.instructionCard}>
              <Text style={styles.instructionTitle}>Share the code with your guardian.</Text>
            </View>

            <View style={styles.mainSection}>
              {!expired && code ? (
                <View style={styles.codeContainer}>
                  <Text style={styles.codeText}>{code}</Text>
                  <Text style={styles.timerText}>{formatTime(timer)} left</Text>
                  <TouchableOpacity
                    style={[styles.copyButton, refreshing && styles.buttonDisabled]}
                    onPress={handleCopy}
                    disabled={refreshing}
                    activeOpacity={0.8}
                  >
                    {copied ? (
                      <>
                        <CheckCircle size={18} color={Colors.white} />
                        <Text style={styles.copyButtonText}>Copied</Text>
                      </>
                    ) : (
                      <>
                        <Copy size={18} color={Colors.white} />
                        <Text style={styles.copyButtonText}>Copy code</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.expiredContainer}>
                  <Text style={styles.expiredText}>Code has expired</Text>
                  <TouchableOpacity
                    style={[styles.refreshButton, refreshing && styles.buttonDisabled]}
                    onPress={handleRefresh}
                    disabled={refreshing}
                  >
                    {refreshing ? (
                      <ActivityIndicator size="small" color={Colors.white} />
                    ) : (
                      <>
                        <RefreshCw size={18} color={Colors.white} />
                        <Text style={styles.refreshButtonText}>Get new code</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.divider} />

            <View style={styles.otpSection}>
              <Text style={styles.otpLabel}>Enter guardian's code</Text>
              <View style={styles.otpRow}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => {
                      otpRefs.current[index] = ref;
                    }}
                    style={[
                      styles.otpInput,
                      { width: OTP_INPUT_SIZE, height: OTP_INPUT_SIZE * 1.2 },
                      digit ? styles.otpInputFilled : null,
                      error ? styles.otpInputError : null,
                    ]}
                    value={digit}
                    onChangeText={(text) => handleOtpChange(text, index)}
                    onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, index)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                    editable={!linking}
                  />
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.confirmButton, (linking || otp.join('').length !== 6) && styles.buttonDisabled]}
              onPress={handleLink}
              disabled={linking || otp.join('').length !== 6}
              activeOpacity={0.85}
            >
              {linking ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.confirmButtonText}>Link</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centerContent: { alignItems: 'center', justifyContent: 'center' },
  scrollContent: { flexGrow: 1 },
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 12 },

  instructionCard: {
    backgroundColor: Colors.primaryFaint,
    borderRadius: 16,
    padding: 16,
    marginBottom: 32,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },

  mainSection: { alignItems: 'center', marginBottom: 40 },
  codeContainer: { alignItems: 'center' },
  codeText: {
    fontSize: 52,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: 6,
    marginBottom: 4,
  },
  timerText: {
    fontSize: 14,
    color: Colors.textTertiary,
    fontWeight: '500',
    marginBottom: 20,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  copyButtonText: { fontSize: 15, color: Colors.white, fontWeight: '700' },

  expiredContainer: { alignItems: 'center', gap: 12 },
  expiredText: { fontSize: 16, color: Colors.textTertiary, fontWeight: '600' },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.textSecondary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  refreshButtonText: { fontSize: 15, color: Colors.white, fontWeight: '700' },

  buttonDisabled: { opacity: 0.6 },

  errorText: {
    fontSize: 14,
    color: Colors.danger,
    textAlign: 'center',
    marginBottom: 12,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.border,
    width: '100%',
    marginBottom: 40,
    opacity: 0.5,
  },

  otpSection: { width: '100%', marginBottom: 40 },
  otpLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  otpInput: {
    borderRadius: 12,
    backgroundColor: Colors.card,
    borderWidth: 2,
    borderColor: Colors.border,
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  otpInputFilled: { borderColor: Colors.primary, backgroundColor: Colors.primaryFaint },
  otpInputError: { borderColor: Colors.danger },

  confirmButton: {
    height: 58,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonText: { fontSize: 18, color: Colors.white, fontWeight: '700' },
});
