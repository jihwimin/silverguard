import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Phone, CheckCircle, Info } from 'lucide-react-native';
import Colors from '../constants/colors'; // 🌟 상대 경로로 안전하게 수정 [cite: 2026-02-28]

// 🌟 탐색기(image_14f378) 기준 실제 경로: components/providers/AppProvider
import { useApp } from '../components/providers/AppProvider';

type Step = 'phone' | 'otp' | 'success';

export default function VerificationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { completeVerification } = useApp(); // 이제 정상적으로 불러와집니다 [cite: 2026-02-28]
  const [step, setStep] = useState<Step>('phone');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [timer, setTimer] = useState<number>(180);
  const [error, setError] = useState<string>('');
  const otpRefs = useRef<(TextInput | null)[]>([]);
  const successAnim = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (step !== 'otp') return;
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((t) => t - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [step, timer]);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} 남음`;
  };

  const formatPhone = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
  };

  const handlePhoneChange = useCallback((text: string) => {
    const digits = text.replace(/\D/g, '');
    if (digits.length <= 11) {
      setPhoneNumber(formatPhone(digits));
    }
  }, []);

  const handleSendOtp = useCallback(() => {
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length < 10) {
      setError('올바른 휴대폰 번호를 입력해 주세요.');
      return;
    }
    setError('');
    setStep('otp');
    setTimer(180);
    console.log('OTP sent to:', phoneNumber);
  }, [phoneNumber]);

  const handleOtpChange = useCallback((text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    setError('');
    if (text && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }, [otp]);

  const handleOtpKeyPress = useCallback((key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }, [otp]);

  const handleVerify = useCallback(async () => {
    const code = otp.join('');
    if (code.length < 6) {
      setError('6자리 인증번호를 모두 입력해 주세요.');
      return;
    }
    setStep('success');
    Animated.parallel([
      Animated.timing(successAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(successScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
    ]).start();
    
    await completeVerification();
    
    setTimeout(() => {
      router.replace('/(tabs)/home');
    }, 1800);
  }, [otp, completeVerification, router, successAnim, successScale]);

  const handleResend = useCallback(() => {
    setTimer(180);
    setOtp(['', '', '', '', '', '']);
    otpRefs.current[0]?.focus();
    console.log('OTP resent');
  }, []);

  // ... (이후 렌더링 부분은 민석님이 주신 것과 동일하게 유지하되, 스타일 충돌 방지) ...
  // 중략: 민석님의 return 및 styles 코드를 그대로 사용하세요.

  if (step === 'success') {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Animated.View style={[styles.successContainer, { opacity: successAnim, transform: [{ scale: successScale }] }]}>
          <View style={styles.successIcon}>
            <CheckCircle size={56} color={Colors.primary} strokeWidth={1.8} />
          </View>
          <Text style={styles.successTitle}>확인 완료</Text>
          <Text style={styles.successSubtitle}>
            SilverGuard 보호가 활성화되었습니다.
          </Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={[styles.container, { paddingTop: insets.top }]}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerSection}>
          <View style={styles.headerIcon}>
            <Phone size={28} color={Colors.primary} strokeWidth={2} />
          </View>
          <Text style={styles.headerTitle}>보호 활성화를 위한{'\n'}1회 본인 확인</Text>
          <Text style={styles.headerSubtitle}>
            보호자 연동 알림과 기기 변경 시{'\n'}보호 상태 유지를 위해 필요합니다.
          </Text>
        </View>

        {step === 'phone' && (
          <View style={styles.formSection}>
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>휴대폰 번호</Text>
              <TextInput
                style={styles.phoneInput}
                placeholder="010-1234-5678"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={handlePhoneChange}
                maxLength={13}
                testID="phone-input"
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.primaryButton, !phoneNumber && styles.buttonDisabled]}
              onPress={handleSendOtp}
              disabled={!phoneNumber}
              activeOpacity={0.85}
              testID="send-otp-button"
            >
              <Text style={styles.primaryButtonText}>인증 문자 받기</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.infoLink}>
              <Info size={16} color={Colors.textTertiary} strokeWidth={2} />
              <Text style={styles.infoLinkText}>왜 필요한가요?</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'otp' && (
          <View style={styles.formSection}>
            <Text style={styles.otpInstruction}>
              {phoneNumber}으로 전송된{'\n'}6자리 인증번호를 입력하세요.
            </Text>

            <View style={styles.otpRow}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => { otpRefs.current[index] = ref; }}
                  style={[
                    styles.otpInput,
                    digit ? styles.otpInputFilled : null,
                    error ? styles.otpInputError : null,
                  ]}
                  value={digit}
                  onChangeText={(text) => handleOtpChange(text.replace(/\D/g, '').slice(-1), index)}
                  onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  testID={`otp-input-${index}`}
                />
              ))}
            </View>

            <Text style={styles.timerText}>{formatTime(timer)}</Text>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleVerify}
              activeOpacity={0.85}
              testID="verify-button"
            >
              <Text style={styles.primaryButtonText}>확인</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleResend} style={styles.resendLink}>
              <Text style={styles.resendText}>문자 다시 받기</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  headerSection: {
    marginTop: 32,
    marginBottom: 32,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 10,
    lineHeight: 23,
  },
  formSection: {
    gap: 16,
  },
  inputCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  phoneInput: {
    fontSize: 22,
    fontWeight: '600' as const,
    color: Colors.text,
    padding: 0,
    height: 36,
  },
  otpInstruction: {
    fontSize: 17,
    color: Colors.textSecondary,
    lineHeight: 24,
    textAlign: 'center',
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginVertical: 8,
  },
  otpInput: {
    width: 48,
    height: 60,
    borderRadius: 14,
    backgroundColor: Colors.card,
    borderWidth: 2,
    borderColor: Colors.border,
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center',
  },
  otpInputFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFaint,
  },
  otpInputError: {
    borderColor: Colors.danger,
  },
  timerText: {
    fontSize: 15,
    color: Colors.textTertiary,
    textAlign: 'center',
    fontWeight: '500' as const,
  },
  errorText: {
    fontSize: 14,
    color: Colors.danger,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '700' as const,
  },
  infoLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  infoLinkText: {
    fontSize: 14,
    color: Colors.textTertiary,
    fontWeight: '500' as const,
  },
  resendLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  resendText: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  successContainer: {
    alignItems: 'center',
    gap: 16,
  },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  successSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
