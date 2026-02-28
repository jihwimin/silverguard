import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Shield, ChevronDown, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import Colors from '@/constants/colors';
import { trainingQuestions, TrainingQuestion } from '@/constants/mockData';

export default function TrainingPlayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { difficulty } = useLocalSearchParams<{ difficulty: string }>();
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [balance, setBalance] = useState<number>(200000);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState<boolean>(false);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const resultAnim = useRef(new Animated.Value(0)).current;

  const filteredQuestions = trainingQuestions.filter((q) => {
    if (difficulty === 'easy') return q.difficulty === 'easy';
    if (difficulty === 'medium') return q.difficulty === 'easy' || q.difficulty === 'medium';
    return true;
  });

  const currentQuestion: TrainingQuestion | undefined = filteredQuestions[currentIndex];

  const handleAnswer = useCallback((choiceIndex: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(choiceIndex);
    setShowResult(true);

    const isCorrect = currentQuestion?.choices[choiceIndex]?.isCorrect ?? false;
    if (isCorrect) {
      setScore((s) => s + 20);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } else {
      setBalance((b) => Math.max(0, b - 50000));
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
    setAnswers((prev) => [...prev, isCorrect]);

    Animated.spring(resultAnim, {
      toValue: 1,
      tension: 60,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [selectedAnswer, currentQuestion]);

  const handleNext = useCallback(() => {
    if (currentIndex >= filteredQuestions.length - 1) {
      router.replace(
        `/training-result?score=${score}&total=${filteredQuestions.length}&answers=${answers.join(',')}`
      );
      return;
    }
    setCurrentIndex((i) => i + 1);
    setSelectedAnswer(null);
    setShowResult(false);
    setShowExplanation(false);
    resultAnim.setValue(0);
  }, [currentIndex, filteredQuestions.length, score, answers]);

  if (!currentQuestion) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.emptyText}>Unable to load questions.</Text>
      </View>
    );
  }

  const isCorrect = selectedAnswer !== null && currentQuestion.choices[selectedAnswer]?.isCorrect;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: `Question ${currentIndex + 1}/${filteredQuestions.length}`,
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
        <View style={styles.statusBar}>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Score</Text>
            <Text style={styles.statusValue}>{score}</Text>
          </View>
          <View style={styles.statusDivider} />
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Virtual balance</Text>
            <Text style={styles.statusValue}>${balance.toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.questionArea}>
          <View style={styles.characterRow}>
            <View style={styles.characterAvatar}>
              <Shield size={24} color={Colors.primary} strokeWidth={2} />
            </View>
          </View>

          <View style={styles.speechBubble}>
            <View style={styles.speechTail} />
            <Text style={styles.questionText}>{currentQuestion.scenario}</Text>
          </View>
        </View>

        <View style={styles.choicesContainer}>
          {currentQuestion.choices.map((choice, index) => {
            let choiceStyle = styles.choiceButton;
            let textStyle = styles.choiceText;
            if (showResult && selectedAnswer === index) {
              choiceStyle = choice.isCorrect
                ? { ...styles.choiceButton, ...styles.choiceCorrect }
                : { ...styles.choiceButton, ...styles.choiceWrong };
              textStyle = choice.isCorrect
                ? { ...styles.choiceText, ...styles.choiceTextCorrect }
                : { ...styles.choiceText, ...styles.choiceTextWrong };
            } else if (showResult && choice.isCorrect) {
              choiceStyle = { ...styles.choiceButton, ...styles.choiceCorrectHint };
            }

            return (
              <TouchableOpacity
                key={index}
                style={choiceStyle}
                onPress={() => handleAnswer(index)}
                activeOpacity={0.75}
                disabled={showResult}
                testID={`choice-${index}`}
              >
                <Text style={textStyle}>{choice.text}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {showResult && (
          <Animated.View
            style={[
              styles.resultPopup,
              {
                opacity: resultAnim,
                transform: [{ scale: resultAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
              },
            ]}
          >
            <View style={styles.resultCharacterRow}>
              <View style={styles.characterAvatar}>
                <Shield size={20} color={Colors.primary} strokeWidth={2} />
              </View>
            </View>

            <View style={styles.resultBubble}>
              <View style={[styles.verdictChip, isCorrect ? styles.verdictCorrect : styles.verdictWrong]}>
                <Text style={[styles.verdictText, isCorrect ? styles.verdictTextCorrect : styles.verdictTextWrong]}>
                  {isCorrect ? 'Correct' : 'Caution'}
                </Text>
              </View>

              <Text style={styles.resultReason}>
                {isCorrect
                  ? 'Correct response!'
                  : currentQuestion.explanation.split('.')[0] + '.'}
              </Text>

              <TouchableOpacity
                style={styles.expandButton}
                onPress={() => setShowExplanation(!showExplanation)}
                activeOpacity={0.75}
              >
                <Text style={styles.expandText}>Show explanation</Text>
                <ChevronDown
                  size={16}
                  color={Colors.primary}
                  strokeWidth={2}
                  style={showExplanation ? { transform: [{ rotate: '180deg' }] } : undefined}
                />
              </TouchableOpacity>

              {showExplanation && (
                <Text style={styles.explanationText}>{currentQuestion.explanation}</Text>
              )}
            </View>

            <View style={styles.summaryTip}>
              <Text style={styles.summaryTipLabel}>Summary</Text>
              <Text style={styles.summaryTipText}>{currentQuestion.summary}</Text>
            </View>

            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNext}
              activeOpacity={0.85}
            >
              <Text style={styles.nextButtonText}>
                {currentIndex >= filteredQuestions.length - 1 ? 'See results' : 'Next question'}
              </Text>
              <ChevronRight size={20} color={Colors.white} strokeWidth={2.5} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.chatbotLink}
              onPress={() => router.push('/reporting-chatbot')}
              activeOpacity={0.75}
            >
              <Text style={styles.chatbotLinkText}>Practice report assistant</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  emptyText: {
    flex: 1,
    textAlign: 'center',
    marginTop: 100,
    fontSize: 16,
    color: Colors.textTertiary,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  statusBar: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontWeight: '500' as const,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 2,
  },
  statusDivider: {
    width: 1,
    backgroundColor: Colors.borderLight,
  },
  questionArea: {
    marginBottom: 20,
  },
  characterRow: {
    marginBottom: 8,
  },
  characterAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speechBubble: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderTopLeftRadius: 6,
    padding: 20,
    marginLeft: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  speechTail: {
    position: 'absolute',
    top: -6,
    left: 16,
    width: 12,
    height: 12,
    backgroundColor: Colors.card,
    transform: [{ rotate: '45deg' }],
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    lineHeight: 28,
  },
  choicesContainer: {
    gap: 10,
    marginBottom: 16,
  },
  choiceButton: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: Colors.border,
    minHeight: 60,
    justifyContent: 'center',
  },
  choiceCorrect: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFaint,
  },
  choiceWrong: {
    borderColor: Colors.danger,
    backgroundColor: Colors.dangerBg,
  },
  choiceCorrectHint: {
    borderColor: Colors.safe,
    backgroundColor: Colors.safeBg,
  },
  choiceText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    lineHeight: 24,
  },
  choiceTextCorrect: {
    color: Colors.primaryDark,
  },
  choiceTextWrong: {
    color: Colors.dangerText,
  },
  resultPopup: {
    gap: 12,
    marginTop: 8,
  },
  resultCharacterRow: {
    marginBottom: 4,
  },
  resultBubble: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderTopLeftRadius: 6,
    padding: 20,
    marginLeft: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  verdictChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  verdictCorrect: {
    backgroundColor: Colors.primaryLight,
  },
  verdictWrong: {
    backgroundColor: Colors.dangerBg,
  },
  verdictText: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  verdictTextCorrect: {
    color: Colors.primary,
  },
  verdictTextWrong: {
    color: Colors.danger,
  },
  resultReason: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24,
    fontWeight: '500' as const,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  expandText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  explanationText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
    backgroundColor: Colors.background,
    padding: 14,
    borderRadius: 12,
  },
  summaryTip: {
    backgroundColor: Colors.primaryFaint,
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  summaryTipLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.primary,
    marginBottom: 4,
  },
  summaryTipText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
    fontWeight: '500' as const,
  },
  nextButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  nextButtonText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '700' as const,
  },
  chatbotLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  chatbotLinkText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600' as const,
  },
});
