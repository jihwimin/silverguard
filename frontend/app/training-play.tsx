import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Shield, ChevronDown, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import Colors from '@/constants/colors';
import { BASE_URL } from '@/constants/config';

import * as Speech from 'expo-speech';

interface Question {
  id: number;
  content: string;
  type: 'sms' | 'email' | 'call_transcript';
}

interface QuizState {
  session_id: number;
  question: Question;
  serve_token: string;
}

interface AnswerResult {
  correct: boolean;
  explanation: string;
}

type Phase = 'loading' | 'question' | 'result' | 'error';


export default function TrainingPlayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session_id, user_id } = useLocalSearchParams<{ session_id: string; user_id: string }>();

  const [phase, setPhase] = useState<Phase>('loading');
  const [quizState, setQuizState] = useState<QuizState | null>(null);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [score, setScore] = useState(0);
  const resultAnim = useRef(new Animated.Value(0)).current;
  
  const renderQuestion = (q: Question) => {
    switch (q.type) {
      case 'sms':
        return <SmsMock content={q.content} />;
      case 'email':
        return <EmailMock content={q.content} />;
      case 'call_transcript':
        return <CallMock content={q.content} ttsEnabled />;
      default:
        return <Text style={styles.questionText}>{q.content}</Text>;
    }
  };

  const fetchNextQuestion = async () => {
    setPhase('loading');
    setShowExplanation(false);
    resultAnim.setValue(0);
    try {
      const res = await fetch(
        `${BASE_URL}/quiz/next?user_id=${user_id}&session_id=${session_id}`
      );
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      setQuizState(data);
      setQuestionCount((c) => c + 1);
      setPhase('question');
    } catch (e) {
      setPhase('error');
    }
  };

  useEffect(() => {
    fetchNextQuestion();
  }, []);

  const handleAnswer = async (answeredPhishing: boolean) => {
    if (!quizState || phase !== 'question') return;
    setPhase('loading');
    try {
      const res = await fetch(`${BASE_URL}/quiz/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: quizState.session_id,
          question_id: quizState.question.id,
          user_answered_phishing: answeredPhishing,
          serve_token: quizState.serve_token,
        }),
      });
      if (!res.ok) throw new Error('failed');
      const data: AnswerResult = await res.json();
      setAnswerResult(data);
      setPhase('result');

      if (data.correct) {
        setScore((s) => s + 20);
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      Animated.spring(resultAnim, {
        toValue: 1, tension: 60, friction: 8, useNativeDriver: true,
      }).start();
    } catch (e) {
      setPhase('question');
      Alert.alert('오류', '답변 제출에 실패했습니다. 다시 눌러주세요.');
    }
  };

  const handleNext = () => {
    if (questionCount >= 10) {
      handleFinish();
      return;
    }
    setAnswerResult(null);
    fetchNextQuestion();
  };

  const handleFinish = async () => {
    try {
      await fetch(`${BASE_URL}/session/${session_id}/end`, { method: 'POST' });
    } catch (_) {}
    router.replace(`/training-result?score=${score}&total=${questionCount}`);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: `Question ${questionCount}`,
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '700' as const, fontSize: 16 },
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
      >
        {phase === 'loading' && (
          <View style={styles.centered}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        )}

        {phase === 'error' && (
          <View style={styles.centered}>
            <Text style={styles.errorText}>Failed to load question.</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchNextQuestion}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {(phase === 'question' || phase === 'result') && quizState && (
          <>
            <View style={styles.questionArea}>
              <View style={styles.characterRow}>
                <View style={styles.characterAvatar}>
                  <Shield size={24} color={Colors.primary} strokeWidth={2} />
                </View>
              </View>
              <View style={styles.speechBubble}>
                <View style={styles.speechTail} />
                {renderQuestion(quizState.question)}
              </View>
            </View>

            <View style={styles.choiceRow}>
              <TouchableOpacity
                style={[styles.choiceButton, styles.choicePhishing, phase === 'result' && styles.choiceDisabled]}
                onPress={() => handleAnswer(true)}
                activeOpacity={0.75}
                disabled={phase !== 'question'}
              >
                <Text style={styles.choicePhishingText}> Phishing</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.choiceButton, styles.choiceSafe, phase === 'result' && styles.choiceDisabled]}
                onPress={() => handleAnswer(false)}
                activeOpacity={0.75}
                disabled={phase !== 'question'}
              >
                <Text style={styles.choiceSafeText}> Safe</Text>
              </TouchableOpacity>
            </View>

            {phase === 'result' && answerResult && (
              <Animated.View
                style={[
                  styles.resultPopup,
                  {
                    opacity: resultAnim,
                    transform: [{ scale: resultAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
                  },
                ]}
              >
                <View style={styles.resultBubble}>
                  <View style={[styles.verdictChip, answerResult.correct ? styles.verdictCorrect : styles.verdictWrong]}>
                    <Text style={[styles.verdictText, answerResult.correct ? styles.verdictTextCorrect : styles.verdictTextWrong]}>
                      {answerResult.correct ? '✓ Correct' : '✗ Phishing!'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.expandButton}
                    onPress={() => setShowExplanation(!showExplanation)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.expandText}>Explanation</Text>
                    <ChevronDown
                      size={16}
                      color={Colors.primary}
                      strokeWidth={2}
                      style={showExplanation ? { transform: [{ rotate: '180deg' }] } : undefined}
                    />
                  </TouchableOpacity>

                  {showExplanation && (
                    <Text style={styles.explanationText}>{answerResult.explanation}</Text>
                  )}
                </View>

                <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.85}>
                  <Text style={styles.nextButtonText}>
                    {questionCount >= 10 ? 'See results' : 'Next question'}
                  </Text>
                  <ChevronRight size={20} color={Colors.white} strokeWidth={2.5} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.finishLink} onPress={handleFinish} activeOpacity={0.75}>
                  <Text style={styles.finishLinkText}>End & see results</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function SmsMock({ content }: { content: string }) {
  return (
    <View style={smsStyles.phoneFrame}>
      <View style={smsStyles.statusBar}>
        <Text style={smsStyles.statusText}>9:41</Text>
        <View style={smsStyles.statusDots} />
      </View>

      <View style={smsStyles.smsHeader}>
        <Text style={smsStyles.contactName}>Unknown Sender</Text>
        <Text style={smsStyles.contactSub}>+1 (•••) •••-••••</Text>
      </View>

      <View style={smsStyles.thread}>
        <View style={smsStyles.bubbleIncoming}>
          <Text style={smsStyles.bubbleText}>{content}</Text>
        </View>
      </View>

      <View style={smsStyles.composer}>
        <Text style={smsStyles.composerPlaceholder}>iMessage</Text>
      </View>
    </View>
  );
}

function EmailMock({ content }: { content: string }) {
  return (
    <View style={emailStyles.card}>
      <Text style={emailStyles.subject}>Important Notice</Text>

      <View style={emailStyles.metaRow}>
        <Text style={emailStyles.metaLabel}>From</Text>
        <Text style={emailStyles.metaValue}>Support &lt;support@service.com&gt;</Text>
      </View>
      <View style={emailStyles.metaRow}>
        <Text style={emailStyles.metaLabel}>To</Text>
        <Text style={emailStyles.metaValue}>You</Text>
      </View>

      <View style={emailStyles.divider} />

      <Text style={emailStyles.body}>{content}</Text>
    </View>
  );
}

function CallMock({ content, ttsEnabled }: { content: string; ttsEnabled?: boolean }) {
  const [playing, setPlaying] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const TTS_RATE = 0.82;

  const [chunks, setChunks] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(0);

  const makeChunks = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return [];

    const byNewline = trimmed.split('\n').map((s) => s.trim()).filter(Boolean);
    if (byNewline.length >= 2) return byNewline;

    const bySentence = trimmed
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim().replace(/^"+|"+$/g, ''))
      .filter(Boolean);

    // De-dupe consecutive duplicates
    const deduped: string[] = [];
    for (const s of bySentence) {
      if (deduped.length === 0 || deduped[deduped.length - 1] !== s) deduped.push(s);
    }
    return deduped;
  };

  // ✅ Live transcript synced (approx) to TTS rate — single timer chain (no flicker)
  useEffect(() => {
    const c = makeChunks(content);
    setChunks(c);
    setVisibleCount(0);

    let alive = true;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    // Rough timing model based on speech rate
    const baseWpm = 175;
    const wpm = Math.max(90, baseWpm * TTS_RATE);
    const msPerWord = 60000 / wpm;

    const delayForChunk = (text: string) => {
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      const punctuationPauses = (text.match(/[,.!?]/g)?.length ?? 0) * 140;
      return Math.max(500, words * msPerWord + punctuationPauses);
    };

    const step = (i: number) => {
      if (!alive) return;
      setVisibleCount(i + 1);
      if (i + 1 >= c.length) return;

      timeout = setTimeout(() => step(i + 1), delayForChunk(c[i]));
    };

    // Start quickly (so first chunk appears immediately)
    timeout = setTimeout(() => {
      if (c.length > 0) step(0);
    }, 150);

    return () => {
      alive = false;
      if (timeout) clearTimeout(timeout);
    };
  }, [content, TTS_RATE]);

  // ✅ TTS
  useEffect(() => {
    if (!ttsEnabled) return;
    if (Platform.OS === 'web') return;

    setPlaying(true);
    Speech.stop(); // stop any previous utterance
    Speech.speak(content, {
      rate: TTS_RATE,
      onDone: () => setPlaying(false),
      onStopped: () => setPlaying(false),
      onError: () => setPlaying(false),
    });

    return () => {
      Speech.stop();
    };
  }, [content, ttsEnabled, TTS_RATE]);

  return (
    <View style={callStyles.wrapper}>
      <View style={callStyles.callHeader}>
        <View style={callStyles.avatarCircle}>
          <Text style={callStyles.avatarText}>SC</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={callStyles.caller}>Unknown Caller</Text>
          <Text style={callStyles.status}>{playing ? 'Speaking…' : 'Call transcript'}</Text>
        </View>
        <View style={callStyles.callBadge}>
          <Text style={callStyles.callBadgeText}>LIVE</Text>
        </View>
      </View>

      <View style={callStyles.transcriptBox}>
        <ScrollView
          ref={scrollRef}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        >
          {chunks.length === 0 ? (
            <Text style={callStyles.transcriptMuted}>Listening…</Text>
          ) : (
            chunks.slice(0, visibleCount).map((l, idx) => (
              <Text key={idx} style={callStyles.transcriptLine}>
                {l}
              </Text>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const smsStyles = StyleSheet.create({
  phoneFrame: {
    borderRadius: 26,
    borderWidth: 2,
    borderColor: Colors.textTertiary,
    backgroundColor: '#000',
    padding: 14,
  },
  statusBar: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  statusText: { color: '#fff', fontWeight: '700' as const },
  statusDots: { width: 44, height: 10, borderRadius: 5, backgroundColor: '#222' },

  smsHeader: { alignItems: 'center', marginBottom: 14 },
  contactName: { color: '#fff', fontWeight: '700' as const, fontSize: 16 },
  contactSub: { color: '#aaa', fontSize: 12, marginTop: 2 },

  thread: { minHeight: 120, justifyContent: 'flex-end', gap: 10 },
  bubbleIncoming: {
    alignSelf: 'flex-start',
    backgroundColor: '#2c2c2e',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
    maxWidth: '88%',
  },
  bubbleText: { color: '#fff', fontSize: 15, lineHeight: 20 },

  composer: {
    marginTop: 14,
    backgroundColor: '#1c1c1e',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  composerPlaceholder: { color: '#777' },
});

const emailStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.primaryFaint,
  },
  subject: { fontSize: 18, fontWeight: '800' as const, color: Colors.text, marginBottom: 10 },
  metaRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  metaLabel: { width: 44, color: Colors.textTertiary, fontSize: 13, fontWeight: '700' as const },
  metaValue: { flex: 1, color: Colors.textSecondary, fontSize: 13 },
  divider: { height: 1, backgroundColor: Colors.background, marginVertical: 12 },
  body: { color: Colors.text, fontSize: 15, lineHeight: 22 },
});

const callStyles = StyleSheet.create({
  wrapper: { gap: 12 },

  callHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 14,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.primaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontWeight: '800' as const, color: Colors.primary },
  caller: { fontSize: 16, fontWeight: '800' as const, color: Colors.text },
  status: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  callBadge: { backgroundColor: Colors.dangerBg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  callBadgeText: { color: Colors.danger, fontWeight: '800' as const, fontSize: 12 },

  transcriptBox: {
    backgroundColor: Colors.background,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.primaryFaint,
    padding: 14,
    height: 220, // ✅ fixed window so old text scrolls away
  },
  transcriptMuted: { color: Colors.textTertiary, fontSize: 14 },
  transcriptLine: { color: Colors.text, fontSize: 15, lineHeight: 22, marginBottom: 8 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 120 },
  loadingText: { fontSize: 16, color: Colors.textSecondary },
  errorText: { fontSize: 16, color: Colors.danger, marginBottom: 16 },
  retryButton: { backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  retryText: { color: Colors.white, fontWeight: '700' as const, fontSize: 15 },
  questionArea: { marginBottom: 24 },
  characterRow: { marginBottom: 8 },
  characterAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  speechBubble: { backgroundColor: Colors.card, borderRadius: 20, borderTopLeftRadius: 6, padding: 20, marginLeft: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  speechTail: { position: 'absolute', top: -6, left: 16, width: 12, height: 12, backgroundColor: Colors.card, transform: [{ rotate: '45deg' }] },
  questionText: { fontSize: 17, fontWeight: '600' as const, color: Colors.text, lineHeight: 26 },
  choiceRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  choiceButton: { flex: 1, borderRadius: 16, padding: 18, alignItems: 'center', justifyContent: 'center', minHeight: 60, borderWidth: 2 },
  choicePhishing: { borderColor: Colors.danger, backgroundColor: Colors.dangerBg },
  choiceSafe: { borderColor: Colors.primary, backgroundColor: Colors.primaryFaint },
  choiceDisabled: { opacity: 0.4 },
  choicePhishingText: { fontSize: 16, fontWeight: '700' as const, color: Colors.danger },
  choiceSafeText: { fontSize: 16, fontWeight: '700' as const, color: Colors.primary },
  resultPopup: { gap: 12 },
  resultBubble: { backgroundColor: Colors.card, borderRadius: 20, padding: 20, gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  verdictChip: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
  verdictCorrect: { backgroundColor: Colors.primaryLight },
  verdictWrong: { backgroundColor: Colors.dangerBg },
  verdictText: { fontSize: 16, fontWeight: '700' as const },
  verdictTextCorrect: { color: Colors.primary },
  verdictTextWrong: { color: Colors.danger },
  expandButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  expandText: { fontSize: 14, color: Colors.primary, fontWeight: '600' as const },
  explanationText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22, backgroundColor: Colors.background, padding: 14, borderRadius: 12 },
  nextButton: { backgroundColor: Colors.primary, borderRadius: 16, height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  nextButtonText: { color: Colors.white, fontSize: 17, fontWeight: '700' as const },
  finishLink: { alignItems: 'center', paddingVertical: 8 },
  finishLinkText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' as const },
});