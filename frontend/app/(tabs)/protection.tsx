import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  Mic,
  MicOff,
  Activity
} from 'lucide-react-native';
import Colors from '../../constants/colors';
import RiskGauge from '../../components/RiskGuage';

const { width } = Dimensions.get('window');

export default function ProtectionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isListening, setIsListening] = useState(false);
  const [riskLevel, setRiskLevel] = useState(12);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.6)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  const startPulse = () => {
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
  };

  const stopPulse = () => {
    pulseLoop.current?.stop();
    pulseAnim.setValue(1);
    pulseOpacity.setValue(0.6);
  };

  const handleMicPress = useCallback(() => {
    if (isListening) {
      setIsListening(false);
      stopPulse();
    } else {
      setIsListening(true);
      startPulse();
    }
  }, [isListening]);

  const getStatusInfo = () => {
    if (riskLevel >= 80) return { title: 'Risk detected', color: Colors.danger };
    if (riskLevel >= 50) return { title: 'Caution', color: Colors.caution };
    return { title: 'Safe', color: Colors.primary };
  };

  const status = getStatusInfo();

  return (
    <View style={styles.container}>
      {/* 중앙 밸런스를 위해 contentContainerStyle에 flexGrow: 1과 
          justifyContent: 'center'를 적용했습니다.
      */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ 
          flexGrow: 1, 
          justifyContent: 'center',
          paddingTop: insets.top, 
          paddingBottom: insets.bottom 
        }}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Live protection</Text>
          <View style={styles.liveBadge}>
            <Activity size={14} color={Colors.primary} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        {/* 위험도 게이지: 시각적 안정감을 위해 사이즈를 약간 키우고 마진을 조정했습니다. */}
        <View style={styles.gaugeContainer}>
          <RiskGauge value={riskLevel} size={width * 0.7} />
        </View>

        {/* 마이크 버튼: 게이지와의 황금 비율 거리를 위해 marginTop을 48로 설정했습니다. */}
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
            {isListening
              ? <MicOff size={44} color={Colors.white} strokeWidth={1.8} />
              : <Mic size={44} color={Colors.white} strokeWidth={1.8} />
            }
          </TouchableOpacity>

          <Text style={styles.micLabel}>
            {isListening ? 'Listening... tap to stop' : 'Tap to start listening'}
          </Text>
        </View>

        {/* 상태 표시: 레이아웃이 덜컹거리지 않도록 고정 높이의 컨테이너를 사용했습니다. */}
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
    position: 'absolute', // 중앙 정렬을 방해하지 않도록 상단에 고정
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
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    backgroundColor: Colors.primaryFaint, borderRadius: 8,
  },
  liveText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  
  gaugeContainer: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginTop: 60 // 헤더 영역 확보
  },

  micWrapper: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginTop: 48, // 게이지와 마이크 사이의 균형 잡힌 간격
    marginBottom: 24 
  },
  pulseRing: {
    position: 'absolute',
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: Colors.danger,
  },
  micButton: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
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

  statusContainer: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 16, fontWeight: '700' },
});