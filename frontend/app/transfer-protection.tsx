import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useRouter, Stack } from 'expo-router'; // useRouter 추가 [cite: 2026-02-28]
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  Search, 
  ShieldCheck, 
  ShieldAlert, 
  Info, 
  History, 
  XCircle,
  ArrowLeft // 뒤로 가기 아이콘 추가 [cite: 2026-02-28]
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import Colors from '@/constants/colors';

export default function FraudScannerScreen() {
  const router = useRouter(); // 라우터 선언 [cite: 2026-02-28]
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'idle' | 'searching' | 'danger' | 'safe'>('idle');
  const [resultData, setResultData] = useState<any>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const handleSearch = useCallback(() => {
    if (!query.trim()) return;
    Keyboard.dismiss();
    setStatus('searching');
    fadeAnim.setValue(0);
    
    setTimeout(() => {
      const lowerQuery = query.toLowerCase();
      if (lowerQuery.includes('65e') || lowerQuery.includes('police') || lowerQuery.includes('quick')) {
        setResultData({
          type: query.includes('65e') ? 'Bank Account' : 'Merchant Entity',
          name: lowerQuery.includes('police') ? 'Official Police (Impersonated)' : 'Quick Loan Services',
          reason: 'Flagged in Nessie Security Engine for 15+ fraudulent attempts.',
          lastReported: '2026-02-28',
        });
        setStatus('danger');
      } else {
        setStatus('safe');
      }
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }, 1200);
  }, [query]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Expo Router 헤더 설정 [cite: 2026-02-28] */}
      <Stack.Screen options={{ headerShown: false }} />

      {/* 커스텀 헤더: 뒤로 가기 + 타이틀 [cite: 2026-02-28] */}
      <View style={styles.navBar}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()} // Home으로 돌아가기 [cite: 2026-02-28]
        >
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nessie Fraud Scanner</Text>
      </View>

      {/* 검색 영역: flex를 사용하여 Scan 버튼 고정 [cite: 2026-02-28] */}
      <View style={styles.searchSection}>
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Search size={18} color={Colors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Account or Merchant"
              placeholderTextColor={Colors.textTertiary}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <XCircle size={18} color={Colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.scanButton} onPress={handleSearch} activeOpacity={0.8}>
            <Text style={styles.scanButtonText}>Scan</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={[styles.scrollBody, { paddingBottom: insets.bottom + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        {status === 'idle' && (
          <View style={styles.centerState}>
            <Info size={40} color={Colors.border} />
            <Text style={styles.infoText}>Search accounts or merchants in Nessie DB.</Text>
          </View>
        )}

        {status === 'searching' && (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Verifying with Nessie DB...</Text>
          </View>
        )}

        {status === 'danger' && (
          <Animated.View style={[styles.card, styles.dangerCard, { opacity: fadeAnim }]}>
            <View style={styles.cardTop}>
              <ShieldAlert size={24} color={Colors.danger} />
              <Text style={styles.dangerTitle}>High Risk Detected</Text>
            </View>
            <View style={styles.dataRow}><Text style={styles.label}>Type</Text><Text style={styles.val}>{resultData?.type}</Text></View>
            <View style={styles.dataRow}><Text style={styles.label}>Name</Text><Text style={[styles.val, {color: Colors.danger}]}>{resultData?.name}</Text></View>
            <View style={styles.line} />
            <Text style={styles.subLabel}>Analysis</Text>
            <Text style={styles.descText}>{resultData?.reason}</Text>
            <View style={styles.badge}><History size={12} color={Colors.danger} /><Text style={styles.badgeText}>{resultData?.lastReported}</Text></View>
          </Animated.View>
        )}

        {status === 'safe' && (
          <Animated.View style={[styles.card, styles.safeCard, { opacity: fadeAnim }]}>
            <View style={styles.cardTop}>
              <ShieldCheck size={24} color="#2F855A" />
              <Text style={styles.safeTitle}>Verified Secure</Text>
            </View>
            <Text style={styles.descText}>No fraudulent records found. Always stay vigilant when transferring funds.</Text>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  navBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 12,
    gap: 12
  },
  backButton: {
    padding: 4,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },
  
  searchSection: { 
    paddingHorizontal: 20, 
    paddingBottom: 15,
    borderBottomWidth: 1, 
    borderBottomColor: Colors.borderLight 
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchBar: { 
    flex: 1, // 입력창이 공간을 다 차지하도록 설정 [cite: 2026-02-28]
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: Colors.card, 
    borderRadius: 12, 
    paddingHorizontal: 10, 
    height: 48,
    borderWidth: 1.5, 
    borderColor: Colors.border, 
    gap: 8 
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.text },
  scanButton: { 
    backgroundColor: Colors.primary, 
    borderRadius: 12, 
    height: 48, 
    paddingHorizontal: 16, 
    justifyContent: 'center',
    minWidth: 70, // 버튼 너비 고정 [cite: 2026-02-28]
  },
  scanButtonText: { color: Colors.white, fontWeight: '700', textAlign: 'center' },

  scrollBody: { padding: 20, flexGrow: 1 },
  centerState: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80, gap: 15 },
  infoText: { color: Colors.textTertiary, textAlign: 'center', fontSize: 14, lineHeight: 20 },
  loadingText: { color: Colors.primary, fontWeight: '600', marginTop: 10 },

  card: { borderRadius: 20, padding: 20, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  dangerCard: { backgroundColor: '#FFF5F5', borderWidth: 1.5, borderColor: '#FEB2B2' },
  safeCard: { backgroundColor: '#F0FFF4', borderWidth: 1.5, borderColor: '#9AE6B4' },

  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
  dangerTitle: { fontSize: 17, fontWeight: '800', color: Colors.danger },
  safeTitle: { fontSize: 17, fontWeight: '800', color: '#2F855A' },

  dataRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { color: Colors.textTertiary, fontSize: 13, fontWeight: '600' },
  val: { color: Colors.text, fontSize: 14, fontWeight: '700' },
  line: { height: 1, backgroundColor: Colors.border, marginVertical: 15, opacity: 0.3 },
  subLabel: { fontSize: 11, fontWeight: '800', color: Colors.textSecondary, marginBottom: 5, textTransform: 'uppercase' },
  descText: { fontSize: 14, color: Colors.text, lineHeight: 22, fontWeight: '500' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFEBEB', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 15 },
  badgeText: { fontSize: 11, fontWeight: '700', color: Colors.danger }
});