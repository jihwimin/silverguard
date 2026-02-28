import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Modal,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  X, 
  ChevronRight, 
  Phone, 
  MessageCircle,
  Activity
} from 'lucide-react-native';
import Colors from '../../constants/colors'; // 🌟 상대 경로 수정 [cite: 2026-02-28]
import RiskGauge from '../../components/RiskGuage'; // 🌟 파일명 오타 반영 [cite: 2026-02-28]

const { width } = Dimensions.get('window');

export default function ProtectionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isScanning, setIsScanning] = useState(false);
  const [riskLevel, setRiskLevel] = useState(12); // 실시간 위험도 예시 [cite: 2026-02-28]
  const [showWarning, setShowWarning] = useState(false);
  
  const scanAnim = useRef(new Animated.Value(0)).current;

  // 🔍 검사 애니메이션 로직 [cite: 2026-02-28]
  const startScan = useCallback(() => {
    setIsScanning(true);
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    ).start();

    // 3초 후 검사 완료 시뮬레이션 [cite: 2026-02-28]
    setTimeout(() => {
      setIsScanning(false);
      setRiskLevel(Math.floor(Math.random() * 20) + 5);
    }, 3000);
  }, [scanAnim]);

  // 🌟 94번줄 근처 에러 방지를 위한 상태 렌더링 함수 [cite: 2026-02-28]
  const getStatusInfo = () => {
    if (riskLevel >= 80) return { title: 'Risk detected', color: Colors.danger, icon: <ShieldAlert size={20} color={Colors.white} /> };
    if (riskLevel >= 50) return { title: 'Caution', color: Colors.caution, icon: <AlertTriangle size={20} color={Colors.white} /> };
    return { title: 'Safe', color: Colors.primary, icon: <ShieldCheck size={20} color={Colors.white} /> };
  };

  const status = getStatusInfo();

  return (
    <View style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 }}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Live protection</Text>
          <View style={styles.liveBadge}>
            <Activity size={14} color={Colors.primary} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        {/* 🌟 RiskGauge 컴포넌트 호출 (전달 데이터 안전성 확보) [cite: 2026-02-28] */}
        <View style={styles.gaugeContainer}>
          <RiskGauge value={riskLevel} size={width * 0.65} />
        </View>

        <View style={styles.statusCard}>
          <View style={[styles.statusIndicator, { backgroundColor: status.color }]}>
            {status.icon}
          </View>
          <View style={styles.statusInfo}>
            <Text style={styles.statusLabel}>Current device status</Text>
            <Text style={[styles.statusTitle, { color: status.color }]}>{status.title}</Text>
          </View>
          <TouchableOpacity 
            style={styles.scanButton} 
            onPress={startScan}
            disabled={isScanning}
          >
            <Text style={styles.scanButtonText}>{isScanning ? 'Scanning...' : 'Run scan'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionGrid}>
          <TouchableOpacity 
            style={styles.actionItem}
            onPress={() => router.push('/reporting-chatbot')}
          >
            <View style={[styles.actionIcon, { backgroundColor: Colors.primaryLight }]}>
              <MessageCircle size={24} color={Colors.primary} />
            </View>
            <Text style={styles.actionText}>Report assistant</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem}>
            <View style={[styles.actionIcon, { backgroundColor: Colors.dangerBg }]}>
              <Phone size={24} color={Colors.danger} />
            </View>
            <Text style={styles.actionText}>Block list</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.warningCard}
          onPress={() => setShowWarning(true)}
        >
          <View style={styles.warningLeft}>
            <AlertTriangle size={20} color={Colors.caution} />
            <Text style={styles.warningText}>1 suspicious activity detected recently</Text>
          </View>
          <ChevronRight size={18} color={Colors.textTertiary} />
        </TouchableOpacity>
      </ScrollView>

      {/* 경고 팝업 모달 [cite: 2026-02-28] */}
      <Modal visible={showWarning} transparent animationType="slide">
        <View style={styles.warningOverlay}>
          <View style={styles.warningContent}>
            <TouchableOpacity onPress={() => setShowWarning(false)} style={styles.warningClose}>
              <X size={24} color={Colors.textTertiary} />
            </TouchableOpacity>
            <View style={styles.warningIconBg}>
              <ShieldAlert size={40} color={Colors.danger} />
            </View>
            <Text style={styles.warningTitle}>Possible phishing alert</Text>
            <Text style={styles.warningBody}>
              A text about a small payment was received from an unknown number. Do not click any link in it.
            </Text>
            <TouchableOpacity 
              style={styles.dangerButton}
              onPress={() => {
                setShowWarning(false);
                router.push('/reporting-chatbot');
              }}
            >
              <Text style={styles.dangerButtonText}>Talk to report assistant</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 24 },
  headerTitle: { fontSize: 24, fontWeight: '700' as const, color: Colors.text },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: Colors.primaryFaint, borderRadius: 8 },
  liveText: { fontSize: 12, fontWeight: '700' as const, color: Colors.primary },
  gaugeContainer: { alignItems: 'center', justifyContent: 'center', marginVertical: 20 },
  statusCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, marginHorizontal: 24, padding: 20, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  statusIndicator: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  statusInfo: { flex: 1, marginLeft: 16 },
  statusLabel: { fontSize: 13, color: Colors.textTertiary, marginBottom: 2 },
  statusTitle: { fontSize: 18, fontWeight: '700' as const },
  scanButton: { backgroundColor: Colors.background, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
  scanButtonText: { fontSize: 14, fontWeight: '600' as const, color: Colors.text },
  actionGrid: { flexDirection: 'row', paddingHorizontal: 24, gap: 16, marginTop: 24 },
  actionItem: { flex: 1, backgroundColor: Colors.white, padding: 20, borderRadius: 20, alignItems: 'center', gap: 12 },
  actionIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontSize: 15, fontWeight: '600' as const, color: Colors.text },
  warningCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF9E6', marginHorizontal: 24, marginTop: 24, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#FFEBB3' },
  warningLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  warningText: { fontSize: 14, fontWeight: '600' as const, color: '#856404' },
  warningOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  warningContent: { backgroundColor: Colors.white, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40, alignItems: 'center' },
  warningClose: { alignSelf: 'flex-end', padding: 4 },
  warningIconBg: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.dangerBg, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  warningTitle: { fontSize: 24, fontWeight: '700' as const, color: Colors.danger, marginBottom: 8 },
  warningBody: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  dangerButton: { backgroundColor: Colors.danger, width: '100%', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dangerButtonText: { color: Colors.white, fontSize: 18, fontWeight: '700' as const },
});