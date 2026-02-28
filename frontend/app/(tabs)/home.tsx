import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Shield,
  Phone,
  ScanLine,
  CreditCard,
  Gamepad2,
  Mic,
  Users,
  ShieldCheck,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react-native';
import Colors from '@/constants/colors';

interface FeatureCardData {
  title: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  route: string;
}

const features: FeatureCardData[] = [
  {
    title: '통화 실시간\n탐지',
    icon: <Phone size={26} color={Colors.primary} strokeWidth={2} />,
    color: Colors.primary,
    bgColor: Colors.primaryFaint,
    route: '/(tabs)/protection',
  },
  {
    title: '스미싱 캡처\n진단',
    icon: <ScanLine size={26} color={Colors.caution} strokeWidth={2} />,
    color: Colors.caution,
    bgColor: '#FFF8E1',
    route: '/(tabs)/diagnosis',
  },
  {
    title: '송금\n보호',
    icon: <CreditCard size={26} color="#5B8DEF" strokeWidth={2} />,
    color: '#5B8DEF',
    bgColor: '#EEF3FF',
    route: '/transfer-protection',
  },
  {
    title: '대응 훈련\n게임',
    icon: <Gamepad2 size={26} color="#A78BFA" strokeWidth={2} />,
    color: '#A78BFA',
    bgColor: '#F3F0FF',
    route: '/training-game',
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoMini}>
            <Shield size={20} color={Colors.primary} strokeWidth={2.5} />
          </View>
          <Text style={styles.headerTitle}>SilverGuard</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <Text style={styles.statusLabel}>오늘의 보호 상태</Text>
              <View style={styles.cautionChip}>
                <AlertTriangle size={14} color={Colors.cautionText} strokeWidth={2.5} />
                <Text style={styles.cautionChipText}>주의</Text>
              </View>
            </View>
            <View style={styles.statusMetric}>
              <Text style={styles.metricValue}>42%</Text>
              <Text style={styles.metricLabel}>위험 감지</Text>
            </View>
            <View style={styles.statusDivider} />
            <Text style={styles.statusSubtext}>최근 24시간 탐지 2건</Text>
          </View>

          <View style={styles.gridContainer}>
            {features.map((feature, index) => (
              <TouchableOpacity
                key={index}
                style={styles.featureCard}
                activeOpacity={0.75}
                onPress={() => router.push(feature.route as any)}
                testID={`feature-card-${index}`}
              >
                <View style={[styles.featureIconBg, { backgroundColor: feature.bgColor }]}>
                  {feature.icon}
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.reportCard}
            activeOpacity={0.8}
            onPress={() => router.push('/reporting-chatbot')}
            testID="reporting-helper"
          >
            <View style={styles.reportLeft}>
              <View style={styles.reportIconBg}>
                <Mic size={22} color={Colors.primary} strokeWidth={2} />
              </View>
              <View style={styles.reportTextContainer}>
                <Text style={styles.reportTitle}>신고 도우미</Text>
                <Text style={styles.reportSubtitle}>피싱 의심 시 즉시 신고를 도와드립니다</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.reportButton}
              activeOpacity={0.85}
              onPress={() => router.push('/reporting-chatbot')}
            >
              <Text style={styles.reportButtonText}>지금 신고 준비</Text>
            </TouchableOpacity>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.guardianRow}
            activeOpacity={0.75}
            onPress={() => router.push('/guardian-hub')}
            testID="guardian-status"
          >
            <View style={styles.guardianLeft}>
              <Users size={18} color={Colors.textTertiary} strokeWidth={2} />
              <Text style={styles.guardianText}>보호자 미연동</Text>
            </View>
            <View style={styles.guardianAction}>
              <Text style={styles.guardianActionText}>연동하기</Text>
              <ChevronRight size={16} color={Colors.primary} strokeWidth={2.5} />
            </View>
          </TouchableOpacity>

          <View style={styles.trustBadge}>
            <ShieldCheck size={16} color={Colors.textTertiary} strokeWidth={2} />
            <Text style={styles.trustText}>AI 분석 기반 · 금융 API 연동 보호</Text>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 56,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoMini: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  statusCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  cautionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.cautionBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  cautionChipText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.cautionText,
  },
  statusMetric: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  metricValue: {
    fontSize: 42,
    fontWeight: '700' as const,
    color: Colors.caution,
    letterSpacing: -1,
  },
  metricLabel: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  statusDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 16,
  },
  statusSubtext: {
    fontSize: 14,
    color: Colors.textTertiary,
    fontWeight: '500' as const,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  featureCard: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 18,
    width: '48%' as any,
    flexGrow: 1,
    flexBasis: '45%' as any,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  featureIconBg: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    lineHeight: 22,
  },
  reportCard: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  reportLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  reportIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportTextContainer: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  reportSubtitle: {
    fontSize: 13,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  reportButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  guardianRow: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  guardianLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  guardianText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  guardianAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  guardianActionText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  trustText: {
    fontSize: 13,
    color: Colors.textTertiary,
    fontWeight: '500' as const,
  },
});
