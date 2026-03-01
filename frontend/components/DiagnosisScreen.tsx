import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ScanSearch,
  Upload,
  Image as ImageIcon,
  Mic,
  Type,
  AlertTriangle,
  ShieldAlert,
  ChevronRight,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

import Colors from "@/constants/colors";
import RiskGauge from "@/components/RiskGuage";
import { ocrImage, predictText, transcribeAudio } from "@/lib/api";

type DiagnosisStep = "upload" | "analyzing" | "result";

function extractFirstUrl(text: string) {
  const m = text.match(/https?:\/\/[^\s)]+/i);
  return m ? m[0] : "";
}

function badgeColors(severity: "low" | "medium" | "high") {
  if (severity === "high") {
    return { bg: Colors.dangerBg, text: Colors.dangerText, icon: Colors.dangerText };
  }
  if (severity === "medium") {
    return { bg: Colors.cautionBg, text: Colors.cautionText, icon: Colors.cautionText };
  }
  return { bg: Colors.safeBg, text: Colors.safeText, icon: Colors.safeText };
}

export default function DiagnosisScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<DiagnosisStep>("upload");
  const resultAnim = useRef(new Animated.Value(0)).current;

  const [riskPercent, setRiskPercent] = useState<number>(0);
  const [severity, setSeverity] = useState<"low" | "medium" | "high">("low");
  const [label, setLabel] = useState<"phishing" | "safe">("safe");
  const [extractedText, setExtractedText] = useState<string>("");
  const [detectedUrl, setDetectedUrl] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [inputText, setInputText] = useState<string>("");

  const startResultAnim = useCallback(() => {
    resultAnim.setValue(0);
    Animated.timing(resultAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const analyzeImageFlow = useCallback(
    async (uri: string) => {
      setErrorMsg("");
      setStep("analyzing");

      // 1) OCR
      const ocr = await ocrImage(uri);
      const text = (ocr.text || "").trim();
      setExtractedText(text);
      setDetectedUrl(extractFirstUrl(text));

      // 2) Predict (if OCR empty, still send empty -> likely low risk)
      const pred = await predictText(text.length ? text : " ");
      setRiskPercent(pred.percent);
      setSeverity(pred.severity);
      setLabel(pred.label);

      setStep("result");
      startResultAnim();

      if (Platform.OS !== "web") {
        const kind =
          pred.severity === "high"
            ? Haptics.NotificationFeedbackType.Warning
            : Haptics.NotificationFeedbackType.Success;
        Haptics.notificationAsync(kind);
      }
    },
    [startResultAnim]
  );

  const pickImageAndAnalyze = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setErrorMsg("Please allow photo library access to analyze screenshots.");
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.9,
        aspect: undefined, // Free-form crop: user can resize to any ratio (3:4, 4:3, etc.)
      });

      if (res.canceled) return;

      const uri = res.assets?.[0]?.uri;
      if (!uri) {
        setErrorMsg("No image selected.");
        return;
      }

      await analyzeImageFlow(uri);
    } catch (e: any) {
      setStep("upload");
      setErrorMsg(e?.message || "Failed to analyze image.");
    }
  }, [analyzeImageFlow]);

  const analyzeTextDirectly = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) {
        setErrorMsg("Please enter some text to analyze.");
        return;
      }
      setErrorMsg("");
      setStep("analyzing");
      try {
        setExtractedText(trimmed);
        setDetectedUrl(extractFirstUrl(trimmed));
        const pred = await predictText(trimmed);
        setRiskPercent(pred.percent);
        setSeverity(pred.severity);
        setLabel(pred.label);
        setStep("result");
        startResultAnim();
        if (Platform.OS !== "web") {
          const kind =
            pred.severity === "high"
              ? Haptics.NotificationFeedbackType.Warning
              : Haptics.NotificationFeedbackType.Success;
          Haptics.notificationAsync(kind);
        }
      } catch (e: any) {
        setStep("upload");
        setErrorMsg(e?.message || "Failed to analyze text.");
      }
    },
    [startResultAnim]
  );

  const pickAudioAndAnalyze = useCallback(async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ["audio/*", "audio/mpeg", "audio/wav", "audio/mp4", "audio/x-m4a"],
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const uri = res.assets[0].uri;
      if (!uri) {
        setErrorMsg("No audio selected.");
        return;
      }
      setErrorMsg("");
      setStep("analyzing");
      const stt = await transcribeAudio(uri);
      const text = (stt.text || "").trim();
      setExtractedText(text);
      setDetectedUrl(extractFirstUrl(text));
      const pred = await predictText(text.length ? text : " ");
      setRiskPercent(pred.percent);
      setSeverity(pred.severity);
      setLabel(pred.label);
      setStep("result");
      startResultAnim();
      if (Platform.OS !== "web") {
        const kind =
          pred.severity === "high"
            ? Haptics.NotificationFeedbackType.Warning
            : Haptics.NotificationFeedbackType.Success;
        Haptics.notificationAsync(kind);
      }
    } catch (e: any) {
      setStep("upload");
      setErrorMsg(e?.message || "Failed to transcribe or analyze audio.");
    }
  }, [startResultAnim]);

  const handleReset = useCallback(() => {
    setStep("upload");
    resultAnim.setValue(0);
    setRiskPercent(0);
    setSeverity("low");
    setLabel("safe");
    setExtractedText("");
    setDetectedUrl("");
    setErrorMsg("");
    setInputText("");
  }, []);

  const badge = badgeColors(severity);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <ScanSearch size={20} color={Colors.primary} strokeWidth={2.5} />
        <Text style={styles.headerTitle}>Smishing diagnosis</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {step === "upload" && (
          <View style={styles.uploadSection}>
            <View style={styles.uploadCard}>
              <View style={styles.uploadIconArea}>
                <Upload size={40} color={Colors.textTertiary} strokeWidth={1.5} />
              </View>
              <Text style={styles.uploadTitle}>Analyze a suspicious message</Text>
              <Text style={styles.uploadTip}>Choose a photo, audio, or paste text below.</Text>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={pickImageAndAnalyze}
              activeOpacity={0.85}
              testID="upload-button"
            >
              <ImageIcon size={20} color={Colors.white} strokeWidth={2} />
              <Text style={styles.primaryButtonText}>Choose photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={pickAudioAndAnalyze}
              activeOpacity={0.85}
            >
              <Mic size={20} color={Colors.white} strokeWidth={2} />
              <Text style={styles.primaryButtonText}>Choose audio</Text>
            </TouchableOpacity>

            <View style={styles.textInputCard}>
              <TextInput
                style={styles.textInput}
                placeholder="Or paste or type the message here..."
                placeholderTextColor={Colors.textTertiary}
                value={inputText}
                onChangeText={setInputText}
                multiline
                numberOfLines={4}
              />
              <TouchableOpacity
                style={[styles.primaryButton, !inputText.trim() && styles.buttonDisabled]}
                onPress={() => analyzeTextDirectly(inputText)}
                disabled={!inputText.trim()}
                activeOpacity={0.85}
              >
                <Type size={20} color={Colors.white} strokeWidth={2} />
                <Text style={styles.primaryButtonText}>Analyze text</Text>
              </TouchableOpacity>
            </View>

            {errorMsg ? (
              <Text style={styles.errorText}>{errorMsg}</Text>
            ) : null}
          </View>
        )}

        {step === "analyzing" && (
          <View style={styles.analyzingSection}>
            <View style={styles.skeletonCard}>
              <View style={styles.skeletonLine} />
              <View style={[styles.skeletonLine, { width: "70%" }]} />
              <View style={[styles.skeletonLine, { width: "85%" }]} />
            </View>
            <Text style={styles.analyzingText}>AI is analyzing the link and message…</Text>
            <View style={styles.loadingDots}>
              <LoadingDot delay={0} />
              <LoadingDot delay={200} />
              <LoadingDot delay={400} />
            </View>
          </View>
        )}

        {step === "result" && (
          <Animated.View style={[styles.resultSection, { opacity: resultAnim }]}>
            <View style={styles.resultHeader}>
              <View style={[styles.dangerBadge, { backgroundColor: badge.bg }]}>
                <AlertTriangle size={18} color={badge.icon} strokeWidth={2.5} />
                <Text style={[styles.dangerBadgeText, { color: badge.text }]}>
                  Risk {riskPercent.toFixed(0)}%
                </Text>
              </View>

              <Text style={styles.resultTitle}>
                {severity === "high"
                  ? "Smishing suspected"
                  : severity === "medium"
                  ? "Be cautious"
                  : "Looks safe"}
              </Text>
            </View>

            <View style={{ alignItems: "center", marginBottom: 8 }}>
              <RiskGauge value={Math.round(riskPercent)} size={180} animated />
            </View>

            <View style={styles.screenshotMock}>
              <View style={styles.mockMessageBubble}>
                <Text style={styles.mockSender}>[Extracted text]</Text>
                <Text style={styles.mockMessage}>
                  {extractedText
                    ? extractedText
                    : "No text extracted. Try cropping tighter around the message bubble."}
                </Text>
              </View>

              <View style={[styles.highlightBox, { backgroundColor: badge.bg }]}>
                <ShieldAlert size={14} color={badge.text} strokeWidth={2} />
                <Text style={[styles.highlightText, { color: badge.text }]}>
                  {label === "phishing" ? "Suspicious content detected" : "No strong phishing signals"}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.outlineButton}
              onPress={() => router.push("/reporting-chatbot")}
              activeOpacity={0.75}
            >
              <Text style={styles.outlineButtonText}>Connect to report assistant</Text>
              <ChevronRight size={18} color={Colors.primary} strokeWidth={2} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resetLink}
              onPress={handleReset}
              activeOpacity={0.75}
            >
              <Text style={styles.resetLinkText}>Analyze another message</Text>
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
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    height: 56,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
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
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.borderLight,
    borderStyle: "dashed",
  },
  uploadIconArea: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: "700" as const,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  textInputCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.borderLight,
    gap: 12,
  },
  textInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: Colors.text,
    minHeight: 100,
    textAlignVertical: "top",
  },
  secondaryButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  secondaryButtonText: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: "600" as const,
  },
  errorText: {
    color: Colors.danger,
    fontWeight: "600" as const,
    marginTop: 6,
    textAlign: "center",
  },
  analyzingSection: {
    alignItems: "center",
    marginTop: 60,
    gap: 24,
  },
  skeletonCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    gap: 12,
  },
  skeletonLine: {
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.borderLight,
    width: "100%",
  },
  analyzingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
  },
  loadingDots: {
    flexDirection: "row",
    gap: 8,
  },
  resultSection: {
    gap: 16,
    marginTop: 8,
  },
  resultHeader: {
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  dangerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  dangerBadgeText: {
    fontSize: 15,
    fontWeight: "700" as const,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: "700" as const,
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
    fontWeight: "600" as const,
    marginBottom: 4,
  },
  mockMessage: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24,
  },
  highlightBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  highlightText: {
    fontSize: 13,
    fontWeight: "600" as const,
  },
  reportCards: {
    gap: 12,
  },
  reportCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  reportCardTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 12,
  },
  reportItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 8,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
    fontWeight: "600" as const,
    color: Colors.textTertiary,
    marginBottom: 8,
  },
  urlRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  urlText: {
    fontSize: 14,
    color: Colors.danger,
    fontWeight: "500" as const,
    flex: 1,
  },
  copyButton: {
    padding: 8,
  },
  outlineButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  outlineButtonText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: "600" as const,
  },
  resetLink: {
    alignItems: "center",
    paddingVertical: 8,
  },
  resetLinkText: {
    fontSize: 14,
    color: Colors.textTertiary,
    fontWeight: "500" as const,
  },
});
