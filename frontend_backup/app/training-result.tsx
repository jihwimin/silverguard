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
    if (ratio >= 0.8) return { label: '보안 전문가', color: Colors.primary };
    if (ratio >= 0.5) return { label: '보안 수습생', color: Colors.caution };
    return { label: '훈련 필요', color: Colors.danger };
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
          title: '훈련 결과',
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
            {correctCount}/{totalNum} 정답 · {scoreNum}점
          </Text>
        </Animated.View>

        <Animated.View style={[styles.feedbackSection, { opacity: fadeAnim }]}>
          <View style={styles.feedbackCard}>
            <View style={styles.feedbackHeader}>
              <CheckCircle size={18} color={Colors.primary} strokeWidth={2} />
              <Text style={styles.feedbackTitle}>잘한 점</Text>
            </View>
            <Text style={styles.feedbackItem}>• 기관 사칭에 대한 올바른 대처 인식</Text>
            <Text style={styles.feedbackItem}>• 대표번호 확인의 중요성 이해</Text>
          </View>

          <View style={styles.feedbackCard}>
            <View style={styles.feedbackHeader}>
              <AlertTriangle size={18} color={Colors.caution} strokeWidth={2} />
              <Text style={styles.feedbackTitle}>위험했던 순간</Text>
            </View>
            <Text style={styles.feedbackItem}>• 긴급 상황 연출에 대한 판단력 강화 필요</Text>
            <Text style={styles.feedbackItem}>• 문자 링크 클릭 위험성 재인식 필요</Text>
          </View>

          <View style={styles.feedbackCard}>
            <View style={styles.feedbackHeader}>
              <CheckCircle size={18} color={Colors.safe} strokeWidth={2} />
              <Text style={styles.feedbackTitle}>다음 대처 방법</Text>
            </View>
            <Text style={styles.feedbackItem}>• 의심 전화 시 반드시 끊고 대표번호 확인</Text>
            <Text style={styles.feedbackItem}>• 문자 링크는 절대 클릭하지 않기</Text>
          </View>
        </Animated.View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.replace('/training-game')}
          activeOpacity={0.85}
        >
          <RefreshCw size={20} color={Colors.white} strokeWidth={2} />
          <Text style={styles.primaryButtonText}>다시 훈련하기</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.75}>
          <Share2 size={18} color={Colors.primary} strokeWidth={2} />
          <Text style={styles.secondaryButtonText}>가족에게 공유</Text>
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