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
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Copy, RefreshCw, CheckCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';

const { width } = Dimensions.get('window');
// 전체 패딩 48(24*2)을 제외한 영역에서 6개의 칸과 그 사이 간격(각 8px씩 5개 = 40px)을 계산
const OTP_INPUT_SIZE = (width - 48 - 40) / 6;

export default function GuardianLinkScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [code] = useState<string>('481 205');
  const [timer, setTimer] = useState<number>(600);
  const [expired, setExpired] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const otpRefs = useRef<(TextInput | null)[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (timer <= 0) { setExpired(true); return; }
    const interval = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const formatTime = (s: number): string => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const handleCopy = useCallback(() => {
    setCopied(true);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleRefresh = useCallback(() => {
    setTimer(600);
    setExpired(false);
  }, []);

  // ▽ 6번째 칸 입력 시 자동 닫기 로직 적용
  const handleOtpChange = useCallback((text: string, index: number) => {
    const cleanText = text.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = cleanText;
    setOtp(newOtp);

    if (cleanText && index < 5) {
      otpRefs.current[index + 1]?.focus();
    } else if (cleanText && index === 5) {
      // 마지막 칸 입력 시 키보드 자동 종료
      Keyboard.dismiss();
    }
  }, [otp]);

  const handleOtpKeyPress = useCallback((key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }, [otp]);

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
            
            {/* 안내 카드 */}
            <View style={styles.instructionCard}>
              <Text style={styles.instructionTitle}>Share the code with your guardian.</Text>
            </View>

            {/* 메인 코드 섹션 */}
            <View style={styles.mainSection}>
              {!expired ? (
                <View style={styles.codeContainer}>
                  <Text style={styles.codeText}>{code}</Text>
                  <Text style={styles.timerText}>{formatTime(timer)} left</Text>
                  <TouchableOpacity style={styles.copyButton} onPress={handleCopy} activeOpacity={0.8}>
                    {copied ? (
                      <><CheckCircle size={18} color={Colors.white} /><Text style={styles.copyButtonText}>Copied</Text></>
                    ) : (
                      <><Copy size={18} color={Colors.white} /><Text style={styles.copyButtonText}>Copy code</Text></>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.expiredContainer}>
                  <Text style={styles.expiredText}>Code has expired</Text>
                  <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
                    <RefreshCw size={18} color={Colors.white} /><Text style={styles.refreshButtonText}>Get new code</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* 분구선 (Visual Divider) */}
            <View style={styles.divider} />

            {/* 가디언 코드 입력 섹션 */}
            <View style={styles.otpSection}>
              <Text style={styles.otpLabel}>Enter guardian's code</Text>
              <View style={styles.otpRow}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => { otpRefs.current[index] = ref; }}
                    style={[
                      styles.otpInput,
                      { width: OTP_INPUT_SIZE, height: OTP_INPUT_SIZE * 1.2 },
                      digit ? styles.otpInputFilled : null
                    ]}
                    value={digit}
                    onChangeText={(text) => handleOtpChange(text, index)}
                    onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, index)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                  />
                ))}
              </View>
            </View>

            {/* 하단 버튼 (중앙 밸런스를 위해 여백 조정) */}
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => router.back()}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmButtonText}>Link</Text>
            </TouchableOpacity>

          </Animated.View>
        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { flexGrow: 1 },
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 12 },
  
  instructionCard: {
    backgroundColor: Colors.primaryFaint,
    borderRadius: 16, padding: 16, marginBottom: 32,
  },
  instructionTitle: {
    fontSize: 16, fontWeight: '600', color: Colors.text, textAlign: 'center',
  },

  mainSection: { alignItems: 'center', marginBottom: 40 },
  codeContainer: { alignItems: 'center' },
  codeText: {
    fontSize: 52, fontWeight: '800', 
    color: Colors.text, letterSpacing: 6, marginBottom: 4,
  },
  timerText: {
    fontSize: 14, color: Colors.textTertiary,
    fontWeight: '500', marginBottom: 20,
  },
  copyButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primary, paddingHorizontal: 20,
    paddingVertical: 12, borderRadius: 12,
  },
  copyButtonText: { fontSize: 15, color: Colors.white, fontWeight: '700' },

  expiredContainer: { alignItems: 'center', gap: 12 },
  expiredText: { fontSize: 16, color: Colors.textTertiary, fontWeight: '600' },
  refreshButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.textSecondary, paddingHorizontal: 20,
    paddingVertical: 12, borderRadius: 12,
  },
  refreshButtonText: { fontSize: 15, color: Colors.white, fontWeight: '700' },

  divider: {
    height: 1, backgroundColor: Colors.border,
    width: '100%', marginBottom: 40, opacity: 0.5,
  },

  otpSection: { width: '100%', marginBottom: 40 },
  otpLabel: {
    fontSize: 14, color: Colors.textSecondary,
    fontWeight: '600', marginBottom: 20, textAlign: 'center',
  },
  otpRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', // 양쪽 끝 여백 문제를 해결하는 핵심 속성
  },
  otpInput: {
    borderRadius: 12,
    backgroundColor: Colors.card, borderWidth: 2,
    borderColor: Colors.border, fontSize: 24,
    fontWeight: '700', color: Colors.text, textAlign: 'center',
  },
  otpInputFilled: { borderColor: Colors.primary, backgroundColor: Colors.primaryFaint },

  confirmButton: {
    height: 58, borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 'auto', // 유동적으로 하단에 배치
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  confirmButtonText: { fontSize: 18, color: Colors.white, fontWeight: '700' },
});