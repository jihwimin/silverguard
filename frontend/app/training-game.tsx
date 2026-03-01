import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import { Shield, Gamepad2, ChevronRight } from 'lucide-react-native';
import Colors from '@/constants/colors';

import { BASE_URL } from '@/constants/config';
const USER_ID = "user_001"; // TODO: 실제 유저 ID로 교체

export default function TrainingGameScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleStart = useCallback(async () => {
    setLoading(true);
    try {
      // 기존 활성 세션이 있으면 무시하고 새 세션 시작
      const res = await fetch(`${BASE_URL}/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: USER_ID }),
      });
      if (!res.ok) throw new Error('세션 시작 실패');
      const data = await res.json();
      router.push(`/training-play?session_id=${data.session_id}&user_id=${USER_ID}`);
    } catch (e) {
      Alert.alert('Connection failed', 'Please check your internet and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Phishing response training',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '700' as const, fontSize: 18 },
        }}
      />

      <View style={styles.content}>
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Gamepad2 size={48} color={Colors.primary} strokeWidth={1.5} />
          </View>
          <Text style={styles.heroTitle}>Phishing response training</Text>
          <Text style={styles.heroSubtitle}>
            Build your response skills{'\n'}with realistic phishing scenarios.
          </Text>
        </View>

        <View style={styles.infoCards}>
          <View style={styles.infoCard}>
            <Shield size={20} color={Colors.primary} strokeWidth={2} />
            <View style={styles.infoCardText}>
              <Text style={styles.infoTitle}>AI scenario-based</Text>
              <Text style={styles.infoSub}>Recreates real phishing tactics</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.startButton, loading && { opacity: 0.7 }]}
          onPress={handleStart}
          activeOpacity={0.85}
          disabled={loading}
          testID="start-training"
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Text style={styles.startButtonText}>Start training</Text>
              <ChevronRight size={22} color={Colors.white} strokeWidth={2.5} />
            </>
          )}
        </TouchableOpacity>
      </View>
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
    justifyContent: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  heroIcon: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: Colors.primaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 24,
  },
  infoCards: {
    gap: 10,
    marginBottom: 32,
  },
  infoCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  infoCardText: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  infoSub: {
    fontSize: 13,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  startButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  startButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '700' as const,
  },
});