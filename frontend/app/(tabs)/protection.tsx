import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mic, MicOff, Activity } from 'lucide-react-native';
import { Audio } from 'expo-av';
import Colors from '../../constants/colors';
import RiskGauge from '../../components/RiskGuage';
import { sttChunk, streamUpdate } from '../../lib/api';

const { width } = Dimensions.get('window');
const CHUNK_INTERVAL_MS = 2000;
const INTER_RECORDING_MS = 400;

function makeSessionId() {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function ProtectionScreen() {
  const insets = useSafeAreaInsets();
  const [isListening, setIsListening] = useState(false);
  const [riskLevel, setRiskLevel] = useState(0);
  const [transcript, setTranscript] = useState('');

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.6)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);
  const isListeningRef = useRef(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const accumulatedTextRef = useRef('');
  const sessionIdRef = useRef<string | null>(null);
  const transcriptScrollRef = useRef<ScrollView>(null);
  const loopDoneRef = useRef<{ resolve: () => void } | null>(null);
  const loopDonePromiseRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (transcript) {
      setTimeout(() => transcriptScrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [transcript]);

  const startPulse = useCallback(() => {
    pulseLoop.current = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.35, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(pulseOpacity, { toValue: 0, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0.6, duration: 900, useNativeDriver: true }),
        ]),
      ])
    );
    pulseLoop.current.start();
  }, [pulseAnim, pulseOpacity]);

  const stopPulse = useCallback(() => {
    pulseLoop.current?.stop();
    pulseAnim.setValue(1);
    pulseOpacity.setValue(0.6);
  }, [pulseAnim, pulseOpacity]);

  const recordingLoop = useCallback(async () => {
    if (!isListeningRef.current || !sessionIdRef.current) return;

    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      while (isListeningRef.current && sessionIdRef.current) {
        try {
          recordingRef.current = null;
          let recording: Audio.Recording;
          try {
            await Audio.setAudioModeAsync({
              allowsRecordingIOS: true,
              playsInSilentModeIOS: true,
              staysActiveInBackground: false,
              shouldDuckAndroid: true,
            });
            const result = await Audio.Recording.createAsync(
              Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            recording = result.recording;
          } catch (e) {
            console.warn('Recording create error:', e);
            continue;
          }
          recordingRef.current = recording;

          await new Promise<void>((resolve) => {
            const t = setTimeout(resolve, CHUNK_INTERVAL_MS);
            const id = setInterval(() => {
              if (!isListeningRef.current) {
                clearInterval(id);
                clearTimeout(t);
                resolve();
              }
            }, 100);
            setTimeout(() => {
              clearInterval(id);
              resolve();
            }, CHUNK_INTERVAL_MS);
          });

          if (!isListeningRef.current) {
            await recordingRef.current?.stopAndUnloadAsync();
            break;
          }

          await recordingRef.current?.stopAndUnloadAsync();
          const uri = recordingRef.current?.getURI();
          recordingRef.current = null;

          if (uri) {
            try {
              const sttResult = await sttChunk(uri);
              const chunkText = (sttResult.text || '').trim();
              if (chunkText) {
                const newText = accumulatedTextRef.current
                  ? `${accumulatedTextRef.current} ${chunkText}`
                  : chunkText;
                accumulatedTextRef.current = newText;
                setTranscript(newText);

                const sid = sessionIdRef.current;
                if (sid && newText.trim()) {
                  streamUpdate({
                    session_id: sid,
                    text: newText.trim(),
                    is_final: false,
                  })
                    .then((result) => setRiskLevel(Math.round(result.percent)))
                    .catch((e) => console.warn('Stream update error:', e));
                }
              }
            } catch (e) {
              console.warn('STT error:', e instanceof Error ? e.message : String(e));
            }
          }
        } catch (e) {
          console.warn('Chunk error:', e);
        }

        if (!isListeningRef.current || !sessionIdRef.current) break;
        await new Promise((r) => setTimeout(r, INTER_RECORDING_MS));
      }
    } catch (e) {
      console.warn('Recording loop error:', e);
      setIsListening(false);
    } finally {
      recordingRef.current = null;
      loopDoneRef.current?.resolve();
      loopDoneRef.current = null;
    }
  }, []);

  const handleMicPress = useCallback(async () => {
    if (isListening) {
      const sid = sessionIdRef.current;
      const finalText = accumulatedTextRef.current?.trim();
      isListeningRef.current = false;
      sessionIdRef.current = null;
      setIsListening(false);
      stopPulse();

      if (finalText && sid) {
        try {
          const result = await streamUpdate({
            session_id: sid,
            text: finalText,
            is_final: true,
          });
          setRiskLevel(Math.round(result.percent));
        } catch (e) {
          console.warn('Final stream update error:', e);
        }
      }
      accumulatedTextRef.current = '';
    } else {
      accumulatedTextRef.current = '';
      sessionIdRef.current = makeSessionId();
      isListeningRef.current = true;
      setIsListening(true);
      setRiskLevel(0);
      setTranscript('');
      startPulse();
      (async () => {
        await loopDonePromiseRef.current;
        await new Promise((r) => setTimeout(r, 500));
        if (!isListeningRef.current || !sessionIdRef.current) return;
        let resolve: () => void;
        loopDonePromiseRef.current = new Promise<void>((r) => { resolve = r; });
        loopDoneRef.current = { resolve: resolve! };
        recordingLoop();
      })();
    }
  }, [isListening, startPulse, stopPulse, recordingLoop]);

  const getStatusInfo = () => {
    if (riskLevel >= 80) return { title: 'Risk detected', color: Colors.danger };
    if (riskLevel >= 50) return { title: 'Caution', color: Colors.caution };
    return { title: 'Safe', color: Colors.primary };
  };

  const status = getStatusInfo();

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        }}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Live protection</Text>
          <View style={styles.liveBadge}>
            <Activity size={14} color={Colors.primary} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        <View style={styles.gaugeContainer}>
          <RiskGauge value={riskLevel} size={width * 0.7} />
        </View>

        <View style={styles.micWrapper}>
          {isListening && (
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  transform: [{ scale: pulseAnim }],
                  opacity: pulseOpacity,
                },
              ]}
            />
          )}

          <TouchableOpacity
            style={[styles.micButton, isListening && styles.micButtonActive]}
            onPress={handleMicPress}
            activeOpacity={0.85}
          >
            {isListening ? (
              <MicOff size={44} color={Colors.white} strokeWidth={1.8} />
            ) : (
              <Mic size={44} color={Colors.white} strokeWidth={1.8} />
            )}
          </TouchableOpacity>

          <Text style={styles.micLabel}>
            {isListening ? 'Listening... tap to stop' : 'Tap to start listening'}
          </Text>
        </View>

        {/* Transcript box - always visible when listening, shows what was heard */}
        {isListening && (
          <View style={styles.transcriptBox}>
            <Text style={styles.transcriptLabel}>What I heard</Text>
            <ScrollView
              ref={transcriptScrollRef}
              style={styles.transcriptScroll}
              contentContainerStyle={styles.transcriptScrollContent}
              showsVerticalScrollIndicator={true}
            >
              <Text style={styles.transcriptText}>
                {transcript || 'No text yet'}
              </Text>
            </ScrollView>
          </View>
        )}

        {/* Show last transcript when stopped and we had content */}
        {!isListening && transcript ? (
          <View style={[styles.transcriptBox, styles.transcriptBoxFaded]}>
            <Text style={styles.transcriptLabel}>Last heard</Text>
            <ScrollView
              ref={transcriptScrollRef}
              style={styles.transcriptScroll}
              contentContainerStyle={styles.transcriptScrollContent}
              showsVerticalScrollIndicator={true}
            >
              <Text style={styles.transcriptText}>{transcript}</Text>
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.statusContainer}>
          {isListening && (
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: status.color }]} />
              <Text style={[styles.statusText, { color: status.color }]}>{status.title}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    zIndex: 10,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: Colors.text },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: Colors.primaryFaint,
    borderRadius: 8,
  },
  liveText: { fontSize: 12, fontWeight: '700', color: Colors.primary },

  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },

  micWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 48,
    marginBottom: 24,
  },
  pulseRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.danger,
  },
  micButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  micButtonActive: {
    backgroundColor: Colors.danger,
    shadowColor: Colors.danger,
  },
  micLabel: {
    marginTop: 20,
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
  },

  transcriptBox: {
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 16,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  transcriptBoxFaded: {
    opacity: 0.85,
  },
  transcriptLabel: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginBottom: 8,
    fontWeight: '600',
  },
  transcriptScroll: {
    maxHeight: 140,
  },
  transcriptScrollContent: {
    flexGrow: 1,
  },
  transcriptText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },

  statusContainer: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 16, fontWeight: '700' },
});
