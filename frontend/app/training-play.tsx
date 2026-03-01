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
                <Text style={styles.questionText}>{quizState.question.content}</Text>
              </View>
            </View>

            <View style={styles.choiceRow}>
              <TouchableOpacity
                style={[styles.choiceButton, styles.choicePhishing, phase === 'result' && styles.choiceDisabled]}
                onPress={() => handleAnswer(true)}
                activeOpacity={0.75}
                disabled={phase !== 'question'}
              >
                <Text style={styles.choicePhishingText}>🚨 Phishing</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.choiceButton, styles.choiceSafe, phase === 'result' && styles.choiceDisabled]}
                onPress={() => handleAnswer(false)}
                activeOpacity={0.75}
                disabled={phase !== 'question'}
              >
                <Text style={styles.choiceSafeText}>✅ Safe</Text>
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