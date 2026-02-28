import React, { useState, useCallback, useRef } from 'react';
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
  ScanSearch,
  Upload,
  Image as ImageIcon,
  AlertTriangle,
  ExternalLink,
  Copy,
  ShieldAlert,
  CheckCircle,
  ChevronRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import Colors from '@/constants/colors';

type DiagnosisStep = 'upload' | 'analyzing' | 'result';

export default function DiagnosisScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<DiagnosisStep>('upload');
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const resultAnim = useRef(new Animated.Value(0)).current;

  const handleUpload = useCallback(() => {
    fadeAnim.setValue(1);
    setStep('analyzing');
    setTimeout(() => {
      setStep('result');
      Animated.timing(resultAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    }, 2500);
  }, []);

  const handleReset = useCallback(() => {
    setStep('upload');
    resultAnim.setValue(0);
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <ScanSearch size={20} color={Colors.primary} strokeWidth={2.5} />
        <Text style={styles.headerTitle}>스미싱 진단</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {step === 'upload' && (
          <View style={styles.uploadSection}>
            <View style={styles.uploadCard}>
              <View style={styles.uploadIconArea}>
                <Upload size={40} color={Colors.textTertiary} strokeWidth={1.5} />
              </View>
              <Text style={styles.uploadTitle}>의심스러운 문자를 분석하세요</Text>
              <Text style={styles.uploadTip}>링크가 보이도록 캡처해 주세요.</Text>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleUpload}
              activeOpacity={0.85}
              testID="upload-button"
            >
              <ImageIcon size={20} color={Colors.white} strokeWidth={2} />
              <Text style={styles.primaryButtonText}>사진 선택</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleUpload}
              activeOpacity={0.75}
            >
              <Text style={styles.secondaryButtonText}>최근 캡처 보기</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'analyzing' && (
          <View style={styles.analyzingSection}>
            <View style={styles.skeletonCard}>
              <View style={styles.skeletonLine} />
              <View style={[styles.skeletonLine, { width: '70%' }]} />
              <View style={[styles.skeletonLine, { width: '85%' }]} />
            </View>
            <Text style={styles.analyzingText}>AI가 링크와 문구를 분석 중입니다…</Text>
            <View style={styles.loadingDots}>
              <LoadingDot delay={0} />
              <LoadingDot delay={200} />
              <LoadingDot delay={400} />
            </View>
          </View>
        )}

        {step === 'result' && (
          <Animated.View style={[styles.resultSection, { opacity: resultAnim }]}>
            <View style={styles.resultHeader}>
              <View style={styles.dangerBadge}>
                <AlertTriangle size={18} color={Colors.dangerText} strokeWidth={2.5} />
                <Text style={styles.dangerBadgeText}>위험도 87%</Text>
              </View>
              <Text style={styles.resultTitle}>스미싱 의심</Text>
            </View>

            <View style={styles.screenshotMock}>
              <View style={styles.mockMessageBubble}>
                <Text style={styles.mockSender}>[국외발신]</Text>
                <Text style={styles.mockMessage}>
                  {"택배 배송 실패. 주소 확인 바랍니다.\n"}
                  <Text style={styles.mockHighlight}>http://del1very-kr.xyz/track</Text>
                </Text>
              </View>
              <View style={styles.highlightBox}>
                <ShieldAlert size={14} color={Colors.danger} strokeWidth={2} />
                <Text style={styles.highlightText}>위험 URL 감지</Text>
              </View>
            </View>

            <View style={styles.reportCards}>
              <View style={styles.reportCard}>
                <Text style={styles.reportCardTitle}>의심 포인트</Text>
                <View style={styles.reportItem}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.reportItemText}>국외발신 표시 + 택배사 사칭</Text>
                </View>
                <View style={styles.reportItem}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.reportItemText}>URL 도메인이 공식 택배사와 불일치</Text>
                </View>
              </View>

              <View style={styles.reportCard}>
                <Text style={styles.reportCardTitle}>안전한 대처</Text>
                <View style={styles.reportItem}>
                  <View style={[styles.bulletDot, { backgroundColor: Colors.safe }]} />
                  <Text style={styles.reportItemText}>링크 클릭하지 않기</Text>
                </View>
                <View style={styles.reportItem}>
                  <View style={[styles.bulletDot, { backgroundColor: Colors.safe }]} />
                  <Text style={styles.reportItemText}>공식 택배 앱에서 직접 확인</Text>
                </View>
              </View>

              <View style={styles.urlCard}>
                <Text style={styles.urlLabel}>탐지된 URL</Text>
                <View style={styles.urlRow}>
                  <Text style={styles.urlText}>http://del1very-kr.xyz/track</Text>
                  <TouchableOpacity style={styles.copyButton}>
                    <Copy size={16} color={Colors.primary} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.85}
            >
              <ExternalLink size={18} color={Colors.white} strokeWidth={2} />
              <Text style={styles.primaryButtonText}>차단/신고 안내 보기</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.outlineButton}
              onPress={() => router.push('/reporting-chatbot')}
              activeOpacity={0.75}
            >
              <Text style={styles.outlineButtonText}>신고 도우미로 연결</Text>
              <ChevronRight size={18} color={Colors.primary} strokeWidth={2} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resetLink}
              onPress={handleReset}
              activeOpacity={0.75}
            >
              <Text style={styles.resetLinkText}>다른 문자 분석하기</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

function LoadingDot({ delay }: { delay: number }) {
  const anim = useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 400, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return <Animated.View style={[dotStyles.dot, { opacity: anim }]} />;
}

const dotStyles = StyleSheet.create({
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    height: 56,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  uploadSection: {
    gap: 16,
    marginTop: 16,
  },
  uploadCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.borderLight,
    borderStyle: 'dashed',
  },
  uploadIconArea: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 6,
  },
  uploadTip: {
    fontSize: 14,
    color: Colors.textTertiary,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '700' as const,
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  secondaryButtonText: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  analyzingSection: {
    alignItems: 'center',
    marginTop: 60,
    gap: 24,
  },
  skeletonCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    gap: 12,
  },
  skeletonLine: {
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.borderLight,
    width: '100%',
  },
  analyzingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
  },
  resultSection: {
    gap: 16,
    marginTop: 8,
  },
  resultHeader: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  dangerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.dangerBg,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  dangerBadgeText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.dangerText,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  screenshotMock: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 18,
    borderLeftWidth: 4,
    borderLeftColor: Colors.danger,
  },
  mockMessageBubble: {
    marginBottom: 12,
  },
  mockSender: {
    fontSize: 13,
    color: Colors.textTertiary,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  mockMessage: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24,
  },
  mockHighlight: {
    color: Colors.danger,
    fontWeight: '600' as const,
    textDecorationLine: 'underline',
  },
  highlightBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.dangerBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  highlightText: {
    fontSize: 13,
    color: Colors.danger,
    fontWeight: '600' as const,
  },
  reportCards: {
    gap: 12,
  },
  reportCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  reportCardTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  reportItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.danger,
    marginTop: 7,
  },
  reportItemText: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    flex: 1,
  },
  urlCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 18,
  },
  urlLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
    marginBottom: 8,
  },
  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  urlText: {
    fontSize: 14,
    color: Colors.danger,
    fontWeight: '500' as const,
    flex: 1,
  },
  copyButton: {
    padding: 8,
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  outlineButtonText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  resetLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  resetLinkText: {
    fontSize: 14,
    color: Colors.textTertiary,
    fontWeight: '500' as const,
  },
});