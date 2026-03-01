import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
  ChevronRight,
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
    title: 'Real-time call\ndetection',
    icon: <Phone size={36} color={Colors.primary} strokeWidth={2} />,
    color: Colors.primary,
    bgColor: Colors.primaryFaint,
    route: '/(tabs)/protection',
  },
  {
    title: 'Smishing capture\n& diagnosis',
    icon: <ScanLine size={36} color={Colors.caution} strokeWidth={2} />,
    color: Colors.caution,
    bgColor: '#FFF8E1',
    route: '/(tabs)/diagnosis',
  },
  {
    title: 'Transfer\nprotection',
    icon: <CreditCard size={36} color="#5B8DEF" strokeWidth={2} />,
    color: '#5B8DEF',
    bgColor: '#EEF3FF',
    route: '/transfer-protection',
  },
  {
    title: 'Response\ntraining',
    icon: <Gamepad2 size={36} color="#A78BFA" strokeWidth={2} />,
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
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoMini}>
            <Shield size={20} color={Colors.primary} strokeWidth={2.5} />
          </View>
          <Text style={styles.headerTitle}>SilverGuard</Text>
        </View>
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

        {/* 4개 카드 그리드 */}
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

        {/* Voicebot 카드 */}
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
            <Text style={styles.reportTitle}>Voicebot</Text>
          </View>
          <TouchableOpacity
            style={styles.reportButton}
            activeOpacity={0.85}
            onPress={() => router.push('/reporting-chatbot')}
          >
            <Text style={styles.reportButtonText}>Start voicebot</Text>
          </TouchableOpacity>
        </TouchableOpacity>

        {/* 가디언 */}
        <TouchableOpacity
          style={styles.guardianRow}
          activeOpacity={0.75}
          onPress={() => router.push('/guardian-hub')}
          testID="guardian-status"
        >
          <View style={styles.guardianLeft}>
            <Users size={18} color={Colors.textTertiary} strokeWidth={2} />
            <Text style={styles.guardianText}>No guardian linked</Text>
          </View>
          <View style={styles.guardianAction}>
            <Text style={styles.guardianActionText}>Link</Text>
            <ChevronRight size={16} color={Colors.primary} strokeWidth={2.5} />
          </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
    marginTop: 8,
  },
  featureCard: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 20,
    width: '48%' as any,
    flexGrow: 1,
    flexBasis: '45%' as any,
    aspectRatio: 0.80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  featureIconBg: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    lineHeight: 22,
    textAlign: 'center',
  },
  reportCard: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  },
  reportIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  reportButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700' as const,
  },
  guardianRow: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
});