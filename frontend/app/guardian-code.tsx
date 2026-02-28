import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Animated,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { QrCode, CheckCircle, Info } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';

type Step = 'input' | 'success';

export default function GuardianCodeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('input');
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const [consent, setConsent] = useState<boolean>(false);
  const codeRefs = useRef<(TextInput | null)[]>([]);
  const successAnim = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0.5)).current;

  const handleCodeChange = useCallback((text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);
    if (text && index < 5) {
      codeRefs.current[index + 1]?.focus();
    }
  }, [code]);

  const handleCodeKeyPress = useCallback((key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  }, [code]);

  const handleLink = useCallback(() => {
    setStep('success');
    Animated.parallel([
      Animated.timing(successAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(successScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
    ]).start();
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, []);

  if (step === 'success') {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Family link',
            headerStyle: { backgroundColor: Colors.background },
            headerTintColor: Colors.text,
            headerShadowVisible: false,
            headerTitleStyle: { fontWeight: '700' as const, fontSize: 18 },
          }}
        />
        <View style={styles.successContainer}>
          <Animated.View style={[styles.successContent, { opacity: successAnim, transform: [{ scale: successScale }] }]}>
            <View style={styles.successIcon}>
              <CheckCircle size={56} color={Colors.primary} strokeWidth={1.8} />
            </View>
            <Text style={styles.successTitle}>Link complete</Text>
            <Text style={styles.successSubtitle}>
              You will now receive alerts{'\n'}when risks are detected.
            </Text>
          </Animated.View>
          <View style={[styles.successActions, { paddingBottom: insets.bottom + 24 }]}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push('/guardian-hub')}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>Alert settings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.outlineButton}
              onPress={() => router.replace('/(tabs)/home')}
              activeOpacity={0.75}
            >
              <Text style={styles.outlineButtonText}>Go to home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Family link',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '700' as const, fontSize: 18 },
        }}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.subtitle}>
            Enter the 6-digit code shown{'\n'}on the senior's device.
          </Text>

          <View style={styles.codeRow}>
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => { codeRefs.current[index] = ref; }}
                style={[styles.codeInput, digit ? styles.codeInputFilled : null]}
                value={digit}
                onChangeText={(text) => handleCodeChange(text.replace(/\D/g, '').slice(-1), index)}
                onKeyPress={({ nativeEvent }) => handleCodeKeyPress(nativeEvent.key, index)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
              />
            ))}
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, (!consent || code.join('').length < 6) && styles.buttonDisabled]}
            onPress={handleLink}
            disabled={!consent || code.join('').length < 6}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>Link</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.qrLink} activeOpacity={0.75}>
            <QrCode size={18} color={Colors.primary} strokeWidth={2} />
            <Text style={styles.qrLinkText}>Scan QR code</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.consentRow}
            onPress={() => setConsent(!consent)}
            activeOpacity={0.75}
          >
            <View style={[styles.checkbox, consent && styles.checkboxChecked]}>
              {consent && <CheckCircle size={16} color={Colors.white} strokeWidth={2.5} />}
            </View>
            <Text style={styles.consentText}>I agree to receive risk alerts.</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.infoLink} activeOpacity={0.75}>
            <Info size={14} color={Colors.textTertiary} strokeWidth={2} />
            <Text style={styles.infoLinkText}>View shared information</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  subtitle: {
    fontSize: 18,
    color: Colors.textSecondary,
    lineHeight: 26,
    marginBottom: 32,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 24,
  },
  codeInput: {
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
  codeInputFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFaint,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '700' as const,
  },
  outlineButton: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButtonText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  qrLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginBottom: 24,
  },
  qrLinkText: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  consentText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  infoLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    marginLeft: 36,
  },
  infoLinkText: {
    fontSize: 13,
    color: Colors.textTertiary,
    fontWeight: '500' as const,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  successContent: {
    alignItems: 'center',
    gap: 14,
    marginBottom: 40,
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
    lineHeight: 24,
  },
  successActions: {
    gap: 12,
  },
});
