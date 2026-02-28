import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { useRouter, Stack } from 'expo-router'; // Stack 임포트 합침 [cite: 2026-02-28]
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AlertTriangle,
  ChevronLeft,
  MessageCircle,
  ShieldCheck,
  BookOpen,
  Phone,
  ScanLine,
  CreditCard,
} from 'lucide-react-native';
import Colors from '../constants/colors'; // 상대 경로로 안전하게 변경 [cite: 2026-02-28]
import { guardianAlerts, GuardianAlert } from '../constants/mockData';

// 🌟 파일 시스템에 적힌 실제 파일명 'RiskGuage'로 수정 [cite: 2026-02-28]
import RiskGauge from '../components/RiskGuage'; 

type FilterType = 'All' | 'High risk' | 'Transfer' | 'Smishing';
const filters: FilterType[] = ['All', 'High risk', 'Transfer', 'Smishing'];

export default function GuardianAlertsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [selectedAlert, setSelectedAlert] = useState<GuardianAlert | null>(null);
  const detailAnim = useRef(new Animated.Value(0)).current;

  // ... 나머지 로직 동일 ...
  
  const filteredAlerts = guardianAlerts.filter((alert) => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'High risk') return alert.riskLevel >= 80;
    if (activeFilter === 'Transfer') return alert.type === 'Transfer';
    if (activeFilter === 'Smishing') return alert.type === 'Smishing';
    return true;
  });

  const handleSelectAlert = useCallback((alert: GuardianAlert) => {
    setSelectedAlert(alert);
    detailAnim.setValue(0);
    Animated.timing(detailAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [detailAnim]); // 의존성 추가 [cite: 2026-02-28]

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Call': return <Phone size={16} color={Colors.danger} strokeWidth={2} />;
      case 'Smishing': return <ScanLine size={16} color={Colors.caution} strokeWidth={2} />;
      case 'Transfer': return <CreditCard size={16} color={Colors.danger} strokeWidth={2} />;
      default: return <AlertTriangle size={16} color={Colors.textTertiary} strokeWidth={2} />;
    }
  };

  const getRiskColor = (level: number) => {
    if (level >= 80) return Colors.danger;
    if (level >= 50) return Colors.caution;
    return Colors.safe;
  };

  const getRiskBg = (level: number) => {
    if (level >= 80) return Colors.dangerBg;
    if (level >= 50) return Colors.cautionBg;
    return Colors.safeBg;
  };

  if (selectedAlert) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Alert details',
            headerStyle: { backgroundColor: Colors.background },
            headerTintColor: Colors.text,
            headerShadowVisible: false,
            headerTitleStyle: { fontWeight: '700' as const, fontSize: 18 },
            headerLeft: () => (
              <TouchableOpacity onPress={() => setSelectedAlert(null)} style={styles.backButton}>
                <ChevronLeft size={24} color={Colors.text} strokeWidth={2} />
              </TouchableOpacity>
            ),
          }}
        />
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32, opacity: detailAnim }]}
        >
          <View style={styles.detailGauge}>
            {/* 🌟 파일명이 RiskGuage라도 컴포넌트 이름은 RiskGauge로 쓸 수 있습니다 */}
            <RiskGauge value={selectedAlert.riskLevel} size={160} animated={false} />
          </View>

          <View style={styles.detailCard}>
            <Text style={styles.detailCardTitle}>Risk type</Text>
            <View style={styles.detailTypeRow}>
              {getTypeIcon(selectedAlert.type)}
              <Text style={styles.detailTypeText}>{selectedAlert.riskType}</Text>
            </View>
            <Text style={styles.detailDescription}>{selectedAlert.description}</Text>
          </View>

          <View style={styles.detailCard}>
            <Text style={styles.detailCardTitle}>Recommended action</Text>
            <Text style={styles.detailRecommendation}>{selectedAlert.recommendedAction}</Text>
          </View>

          <TouchableOpacity style={styles.primaryButton} activeOpacity={0.85}>
            <BookOpen size={18} color={Colors.white} strokeWidth={2} />
            <Text style={styles.primaryButtonText}>Open guardian guide</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.outlineButton}
            onPress={() => {
              setSelectedAlert(null);
              router.push('/reporting-chatbot');
            }}
            activeOpacity={0.75}
          >
            <MessageCircle size={18} color={Colors.primary} strokeWidth={2} />
            <Text style={styles.outlineButtonText}>Connect to report assistant</Text>
          </TouchableOpacity>
        </Animated.ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Guardian alerts',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '700' as const, fontSize: 18 },
        }}
      />

      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}
              onPress={() => setActiveFilter(filter)}
              activeOpacity={0.75}
            >
              <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
      >
        {filteredAlerts.length === 0 ? (
          <View style={styles.emptyState}>
            <ShieldCheck size={48} color={Colors.textTertiary} strokeWidth={1.5} />
            <Text style={styles.emptyText}>No matching alerts</Text>
          </View>
        ) : (
          filteredAlerts.map((alert) => (
            <TouchableOpacity
              key={alert.id}
              style={styles.alertCard}
              onPress={() => handleSelectAlert(alert)}
              activeOpacity={0.75}
            >
              <View style={styles.alertTop}>
                <View style={[styles.riskBadge, { backgroundColor: getRiskBg(alert.riskLevel) }]}>
                  <Text style={[styles.riskBadgeText, { color: getRiskColor(alert.riskLevel) }]}>
                    {alert.riskLevel >= 80 ? 'High risk' : alert.riskLevel >= 50 ? 'Caution' : 'Note'} ({alert.riskLevel}%)
                  </Text>
                </View>
                <Text style={styles.alertTime}>{alert.time}</Text>
              </View>
              <Text style={styles.alertTitle}>{alert.title}</Text>
              <View style={styles.alertActions}>
                <TouchableOpacity
                  style={styles.alertAction}
                  onPress={() => handleSelectAlert(alert)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.alertActionText}>View recommended action</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.alertAction}
                  onPress={() => router.push('/reporting-chatbot')}
                  activeOpacity={0.75}
                >
                  <Text style={styles.alertActionText}>Report assistant</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

// ... styles 부분은 기존과 동일 [cite: 2026-02-28]

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  filterRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  filterScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: Colors.white,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textTertiary,
    fontWeight: '500' as const,
  },
  alertCard: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  alertTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  riskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  riskBadgeText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  alertTime: {
    fontSize: 13,
    color: Colors.textTertiary,
    fontWeight: '500' as const,
  },
  alertTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
    lineHeight: 24,
    marginBottom: 12,
  },
  alertActions: {
    flexDirection: 'row',
    gap: 8,
  },
  alertAction: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.primaryFaint,
  },
  alertActionText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  detailGauge: {
    alignItems: 'center',
    marginVertical: 16,
  },
  detailCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  detailCardTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
    marginBottom: 10,
  },
  detailTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  detailTypeText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  detailDescription: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  detailRecommendation: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 26,
    fontWeight: '500' as const,
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
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
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
});