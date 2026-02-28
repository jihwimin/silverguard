import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Shield, Gamepad2, ChevronRight } from 'lucide-react-native';
import Colors from '@/constants/colors';

type Difficulty = 'easy' | 'medium' | 'hard';

const difficultyLabels: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

export default function TrainingGameScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');

  const handleStart = useCallback(() => {
    router.push(`/training-play?difficulty=${difficulty}`);
  }, [difficulty]);

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

        <View style={styles.difficultySection}>
          <Text style={styles.sectionLabel}>Select difficulty</Text>
          <View style={styles.segmentControl}>
            {(Object.keys(difficultyLabels) as Difficulty[]).map((d) => (
              <TouchableOpacity
                key={d}
                style={[
                  styles.segment,
                  difficulty === d && styles.segmentActive,
                ]}
                onPress={() => setDifficulty(d)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.segmentText,
                    difficulty === d && styles.segmentTextActive,
                  ]}
                >
                  {difficultyLabels[d]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
          style={styles.startButton}
          onPress={handleStart}
          activeOpacity={0.85}
          testID="start-training"
        >
          <Text style={styles.startButtonText}>Start training</Text>
          <ChevronRight size={22} color={Colors.white} strokeWidth={2.5} />
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
  difficultySection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  segmentControl: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  segment: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: Colors.primary,
  },
  segmentText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
  },
  segmentTextActive: {
    color: Colors.white,
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
