import React, { useRef, useState, useCallback, useEffect } from 'react'; // 🌟 useEffect 추가
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Shield, Phone, ScanLine, Ban, CheckCircle, ArrowRight } from 'lucide-react-native';
import Colors from '../constants/colors'; // 🌟 상대 경로로 안전하게 변경

// 🌟 탐색기 기준 실제 경로로 수정
import { useApp } from '../components/providers/AppProvider';

const { width } = Dimensions.get('window');

interface Slide {
  title: string;
  subtitle: string;
  icon: 'shield' | 'features' | 'action';
}

const slides: Slide[] = [
  {
    title: '지금 이 순간에도\n피싱은 진화합니다.',
    subtitle: 'SilverGuard가 실시간으로 감지합니다.',
    icon: 'shield',
  },
  {
    title: '통화·문자·송금\n모두 보호',
    subtitle: '3가지 핵심 보호 기능을 제공합니다.',
    icon: 'features',
  },
  {
    title: '의심되면,\n바로 대응하세요.',
    subtitle: 'AI 기반 실시간 분석으로 즉각 대응합니다.',
    icon: 'action',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useApp();
  const scrollRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const fadeAnims = useRef(slides.map(() => new Animated.Value(0))).current;

  // 🌟 첫 번째 슬라이드 애니메이션 실행
  useEffect(() => {
    Animated.timing(fadeAnims[0], {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnims]);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / width);
    if (page !== currentPage) {
      setCurrentPage(page);
      Animated.timing(fadeAnims[page], {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [currentPage, fadeAnims]);

  const handleNext = useCallback(async () => {
    if (currentPage < slides.length - 1) {
      scrollRef.current?.scrollTo({ x: (currentPage + 1) * width, animated: true });
    } else {
      await completeOnboarding();
      router.replace('/verification');
    }
  }, [currentPage, completeOnboarding, router]);

  const handleSkip = useCallback(async () => {
    await completeOnboarding();
    router.replace('/verification');
  }, [completeOnboarding, router]);

  const renderSlideContent = (slide: Slide, index: number) => {
    if (slide.icon === 'shield') {
      return (
        <View style={styles.illustrationContainer}>
          <View style={styles.shieldCircle}>
            <Shield size={64} color={Colors.primary} strokeWidth={1.8} />
          </View>
        </View>
      );
    }
    if (slide.icon === 'features') {
      return (
        <View style={styles.featureCards}>
          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: Colors.primaryFaint }]}>
              <Phone size={24} color={Colors.primary} strokeWidth={2} />
            </View>
            <Text style={styles.featureLabel}>실시간 통화{'\n'}위험 감지</Text>
          </View>
          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: '#FFF3E0' }]}>
              <ScanLine size={24} color={Colors.caution} strokeWidth={2} />
            </View>
            <Text style={styles.featureLabel}>스미싱 캡처{'\n'}AI 분석</Text>
          </View>
          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: Colors.dangerBg }]}>
              <Ban size={24} color={Colors.danger} strokeWidth={2} />
            </View>
            <Text style={styles.featureLabel}>위험 송금{'\n'}자동 차단</Text>
          </View>
        </View>
      );
    }
    return (
      <View style={styles.illustrationContainer}>
        <View style={[styles.shieldCircle, { backgroundColor: Colors.primaryLight }]}>
          <CheckCircle size={64} color={Colors.primary} strokeWidth={1.8} />
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        {currentPage < slides.length - 1 && (
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>건너뛰기</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
      >
        {slides.map((slide, index) => (
          <Animated.View key={index} style={[styles.slide, { width, opacity: fadeAnims[index] }]}>
            {renderSlideContent(slide, index)}
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.subtitle}>{slide.subtitle}</Text>
          </Animated.View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentPage ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          {currentPage === slides.length - 1 ? (
            <Text style={styles.primaryButtonText}>시작하기</Text>
          ) : (
            <ArrowRight size={24} color={Colors.white} strokeWidth={2.5} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { height: 56, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: 20 },
  skipButton: { paddingVertical: 8, paddingHorizontal: 16 },
  skipText: { fontSize: 16, color: Colors.textTertiary, fontWeight: '500' as const },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  illustrationContainer: { marginBottom: 48 },
  shieldCircle: { width: 140, height: 140, borderRadius: 70, backgroundColor: Colors.primaryFaint, alignItems: 'center', justifyContent: 'center' },
  featureCards: { flexDirection: 'row', marginBottom: 48, gap: 12 },
  featureCard: { backgroundColor: Colors.card, borderRadius: 16, padding: 16, alignItems: 'center', width: (width - 96) / 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  featureIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  featureLabel: { fontSize: 13, color: Colors.text, fontWeight: '600' as const, textAlign: 'center', lineHeight: 18 },
  title: { fontSize: 28, fontWeight: '700' as const, color: Colors.text, textAlign: 'center', lineHeight: 38, letterSpacing: -0.5 },
  subtitle: { fontSize: 17, color: Colors.textSecondary, textAlign: 'center', marginTop: 12, lineHeight: 24 },
  footer: { paddingHorizontal: 24, paddingBottom: 20, alignItems: 'center', gap: 24 },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { height: 8, borderRadius: 4 },
  dotActive: { width: 24, backgroundColor: Colors.primary },
  dotInactive: { width: 8, backgroundColor: Colors.border },
  primaryButton: { backgroundColor: Colors.primary, borderRadius: 16, height: 56, width: '100%', alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: Colors.white, fontSize: 18, fontWeight: '700' as const },
});