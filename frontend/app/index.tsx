import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router'; // 🌟 router를 위해 필요
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Shield } from 'lucide-react-native';
import Colors from '../constants/colors';
import { useApp } from '../components/providers/AppProvider'; // 🌟 상태 확인을 위해 필요 [cite: 2026-02-28]

export default function SplashScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // 🌟 AppProvider에서 현재 상태 가져오기 [cite: 2026-02-28]
  const { isLoading, hasSeenOnboarding, isVerified } = useApp();

  // 애니메이션 값 선언
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const taglineFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 🌟 로고 애니메이션 실행
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(taglineFade, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    // 🌟 로딩이 끝나면 상태에 따라 페이지 이동 [cite: 2026-02-28]
    if (isLoading) return;

    const timer = setTimeout(() => {
      if (!hasSeenOnboarding) {
        router.replace('/onboarding');
      } else if (!isVerified) {
        router.replace('/verification');
      } else {
        router.replace('/(tabs)/home');
      }
    }, 2200);

    return () => clearTimeout(timer);
  }, [isLoading, hasSeenOnboarding, isVerified, router]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Animated.View
        style={[
          styles.logoContainer,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={styles.iconWrapper}>
          <Shield size={56} color={Colors.primary} strokeWidth={2} />
        </View>
        <Text style={styles.appName}>SilverGuard</Text>
      </Animated.View>
      <Animated.Text style={[styles.tagline, { opacity: taglineFade }]}>
        실시간 보이스피싱 방어 솔루션
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  iconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  tagline: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
});