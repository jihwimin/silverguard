import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Trophy, CheckCircle, AlertTriangle, RefreshCw, Share2 } from 'lucide-react-native';
import Colors from '@/constants/colors';

export default function TrainingResultScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { score, total, answers } = useLocalSearchParams<{
    score: string;
    total: string;
    answers: string;
  }>();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const scoreNum = parseInt(score || '0', 10);
  const totalNum = parseInt(total || '0', 10);
  const answerArr = (answers || '').split(',').map((a) => a === 'true');
  const correctCount = answerArr.filter(Boolean).length;

  const getBadge = () => {
    const ratio = correctCount / Math.max(totalNum, 1);
    if (ratio >= 0.8) return { label: 'Security expert', color: Colors.primary };
    if (ratio >= 0.5) return { label: 'Security apprentice', color: Colors.caution };
    return { label: 'Needs practice', color: Colors.danger };
  };

  const badge = getBadge();

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Training result',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '700' as const, fontSize: 18 },
          headerLeft: () => null,
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
      >
        <Animated.View style={[styles.badgeSection, { transform: [{ scale: scaleAnim }] }]}>
          <View style={[styles.badgeCircle, { backgroundColor: badge.color + '18' }]}>
            <Trophy size={48} color={badge.color} strokeWidth={1.8} />
          </View>
          <Text style={[styles.badgeLabel, { color: badge.color }]}>{badge.label}</Text>
          <Text style={styles.scoreText}>
            {correctCount}/{totalNum} correct · {scoreNum} pts
          </Text>
        </Animated.View>

        <Animated.View style={[styles.feedbackSection, { opacity: fadeAnim }]}>
          <View style={styles.feedbackCard}>
            <View style={styles.feedbackHeader}>
              <CheckCircle size={18} color={Colors.primary} strokeWidth={2} />
              <Text style={styles.feedbackTitle}>What you did well</Text>
            </View>
            <Text style={styles.feedbackItem}>• Correct response to agency impersonation</Text>
            <Text style={styles.feedbackItem}>• Understanding the importance of verifying official numbers</Text>
          </View>

          <View style={styles.feedbackCard}>
            <View style={styles.feedbackHeader}>
              <AlertTriangle size={18} color={Colors.caution} strokeWidth={2} />
              <Text style={styles.feedbackTitle}>Risky moments</Text>
            </View>
            <Text style={styles.feedbackItem}>• Need to strengthen judgment in urgent-sounding situations</Text>
            <Text style={styles.feedbackItem}>• Remember: clicking text links can be dangerous</Text>
          </View>

          <View style={styles.feedbackCard}>
            <View style={styles.feedbackHeader}>
              <CheckCircle size={18} color={Colors.safe} strokeWidth={2} />
              <Text style={styles.feedbackTitle}>What to do next</Text>
            </View>
            <Text style={styles.feedbackItem}>• If a call seems suspicious, hang up and verify via official number</Text>
            <Text style={styles.feedbackItem}>• Never click links in suspicious texts</Text>
          </View>
        </Animated.View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.replace('/training-game')}
          activeOpacity={0.85}
        >
          <RefreshCw size={20} color={Colors.white} strokeWidth={2} />
          <Text style={styles.primaryButtonText}>Practice again</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.75}>
          <Share2 size={18} color={Colors.primary} strokeWidth={2} />
          <Text style={styles.secondaryButtonText}>Share with family</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  badgeSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  badgeCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  badgeLabel: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  scoreText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 6,
    fontWeight: '500' as const,
  },
  feedbackSection: {
    gap: 12,
    marginBottom: 24,
  },
  feedbackCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  feedbackItem: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '700' as const,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  secondaryButtonText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600' as const,
  },
});