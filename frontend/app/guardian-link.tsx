import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Copy, QrCode, RefreshCw, CheckCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import Colors from '@/constants/colors';

export default function GuardianLinkScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [code] = useState<string>('481 205');
  const [timer, setTimer] = useState<number>(600);
  const [expired, setExpired] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (timer <= 0) {
      setExpired(true);
      return;
    }
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
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleRefresh = useCallback(() => {
    setTimer(600);
    setExpired(false);
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Link guardian',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '700' as const, fontSize: 18 },
        }}
      />

      <Animated.View style={[styles.content, { opacity: fadeAnim, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.instructionCard}>
          <Text style={styles.instructionTitle}>Share the code below with your guardian.</Text>
          <Text style={styles.instructionSub}>They have 10 minutes to enter it to complete linking.</Text>
        </View>

        {!expired ? (
          <View style={styles.codeSection}>
            <Text style={styles.codeText}>{code}</Text>
            <Text style={styles.timerText}>{formatTime(timer)} left</Text>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={handleCopy}
              activeOpacity={0.85}
            >
              {copied ? (
                <>
                  <CheckCircle size={18} color={Colors.white} strokeWidth={2} />
                  <Text style={styles.copyButtonText}>Copied</Text>
                </>
              ) : (
                <>
                  <Copy size={18} color={Colors.white} strokeWidth={2} />
                  <Text style={styles.copyButtonText}>Copy code</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.expiredSection}>
            <Text style={styles.expiredText}>Code has expired</Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={handleRefresh}
              activeOpacity={0.85}
            >
              <RefreshCw size={18} color={Colors.white} strokeWidth={2} />
              <Text style={styles.refreshButtonText}>Get new code</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.qrCard}>
          <Text style={styles.qrTitle}>You can also link via QR code</Text>
          <View style={styles.qrPlaceholder}>
            <QrCode size={80} color={Colors.textTertiary} strokeWidth={1} />
          </View>
        </View>

        <TouchableOpacity
          style={styles.confirmButton}
          onPress={() => router.back()}
          activeOpacity={0.85}
        >
          <Text style={styles.confirmButtonText}>Confirm link complete</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  instructionCard: {
    backgroundColor: Colors.primaryFaint,
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
  },
  instructionTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
    lineHeight: 24,
  },
  instructionSub: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  codeSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  codeText: {
    fontSize: 52,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: 8,
    marginBottom: 8,
  },
  timerText: {
    fontSize: 15,
    color: Colors.textTertiary,
    fontWeight: '500' as const,
    marginBottom: 16,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  copyButtonText: {
    fontSize: 16,
    color: Colors.white,
    fontWeight: '700' as const,
  },
  expiredSection: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  expiredText: {
    fontSize: 17,
    color: Colors.textTertiary,
    fontWeight: '600' as const,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  refreshButtonText: {
    fontSize: 16,
    color: Colors.white,
    fontWeight: '700' as const,
  },
  qrCard: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  qrTitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
    marginBottom: 16,
  },
  qrPlaceholder: {
    width: 160,
    height: 160,
    borderRadius: 16,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButton: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontSize: 17,
    color: Colors.primary,
    fontWeight: '700' as const,
  },
});
