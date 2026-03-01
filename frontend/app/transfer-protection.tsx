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
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  ShieldCheck,
  ShieldAlert,
  Info,
  History,
  XCircle,
  AlertTriangle,
  Flag,
  X,
  CheckCircle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { BASE_URL } from '@/constants/config';

// ── Types ─────────────────────────────────────────────────────────────────────
interface FraudResult {
  query: string;
  is_fraud: boolean;
  type?: string;
  account_id?: string;
  name?: string;
  real_name?: string;
  fraud_count?: number;
  reason?: string;
  lastReported?: string;
  similarity_score?: number;
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function FraudScannerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Search state
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'idle' | 'searching' | 'danger' | 'safe'>('idle');
  const [resultData, setResultData] = useState<FraudResult | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Report modal state
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportNote, setReportNote] = useState('');
  const [reportContact, setReportContact] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // ── Search handler ──────────────────────────────────────────────────────────
  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    Keyboard.dismiss();
    setStatus('searching');
    setResultData(null);
    setReportSuccess(false);
    fadeAnim.setValue(0);

    try {
      const res = await fetch(
        `${BASE_URL}/fraud/check?query=${encodeURIComponent(query.trim())}`
      );
      const data: FraudResult = await res.json();
      setResultData(data);
      setStatus(data.is_fraud ? 'danger' : 'safe');
    } catch {
      setResultData(null);
      setStatus('safe');
    }

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  }, [query]);

  // ── Report handler ──────────────────────────────────────────────────────────
  const handleOpenReport = () => {
    setReportNote('');
    setReportContact('');
    setReportModalVisible(true);
  };

  const handleSubmitReport = async () => {
    if (!reportNote.trim()) {
      Alert.alert('Required', 'Please describe the suspicious activity.');
      return;
    }

    setReportSubmitting(true);
    try {
      const res = await fetch(`${BASE_URL}/fraud/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          reporter_note: reportNote.trim(),
          contact: reportContact.trim() || undefined,
        }),
      });

      if (res.ok) {
        setReportModalVisible(false);
        setReportSuccess(true);
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        Alert.alert('Error', 'Failed to submit report. Please try again.');
      }
    } catch {
      Alert.alert('Network Error', 'Could not reach the server. Please try again.');
    } finally {
      setReportSubmitting(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Fraud Scanner',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '700' as const, fontSize: 18 },
        }}
      />

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Search size={18} color={Colors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Account ID or merchant name"
              placeholderTextColor={Colors.textTertiary}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setQuery('');
                  setStatus('idle');
                  setResultData(null);
                  setReportSuccess(false);
                }}
              >
                <XCircle size={18} color={Colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={handleSearch}
            activeOpacity={0.8}
          >
            <Text style={styles.scanButtonText}>Scan</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Body */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollBody,
          { paddingBottom: insets.bottom + 20 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Idle */}
        {status === 'idle' && (
          <View style={styles.centerState}>
            <Info size={40} color={Colors.border} />
            <Text style={styles.infoText}>
              Enter an account ID or merchant name to check{'\n'}against the Nessie fraud database.
            </Text>
          </View>
        )}

        {/* Searching */}
        {status === 'searching' && (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Verifying with Nessie DB…</Text>
          </View>
        )}

        {/* Report success banner */}
        {reportSuccess && (
          <View style={styles.successBanner}>
            <CheckCircle size={16} color="#276749" />
            <Text style={styles.successBannerText}>
              Report submitted successfully. Thank you for helping keep others safe.
            </Text>
          </View>
        )}

        {/* Danger result */}
        {status === 'danger' && resultData && (
          <Animated.View style={[styles.card, styles.dangerCard, { opacity: fadeAnim }]}>
            {/* Header */}
            <View style={styles.cardTop}>
              <ShieldAlert size={24} color={Colors.danger} />
              <Text style={styles.dangerTitle}>High Risk Detected</Text>
            </View>

            {/* Type */}
            {resultData.type && (
              <View style={styles.dataRow}>
                <Text style={styles.label}>Type</Text>
                <Text style={styles.val}>{resultData.type}</Text>
              </View>
            )}

            {/* Name */}
            {resultData.name && (
              <View style={styles.dataRow}>
                <Text style={styles.label}>Name</Text>
                <Text style={[styles.val, { color: Colors.danger }]}>
                  {resultData.name}
                </Text>
              </View>
            )}

            {/* Impersonation warning */}
            {resultData.real_name && (
              <View style={styles.impersonationBox}>
                <AlertTriangle size={14} color="#856404" strokeWidth={2} />
                <Text style={styles.impersonationText}>
                  Impersonating:{' '}
                  <Text style={styles.impersonationReal}>{resultData.real_name}</Text>
                </Text>
              </View>
            )}

            {/* Fraud count */}
            {resultData.fraud_count !== undefined && (
              <View style={styles.dataRow}>
                <Text style={styles.label}>Fraud reports</Text>
                <Text style={[styles.val, { color: Colors.danger }]}>
                  {resultData.fraud_count} times
                </Text>
              </View>
            )}

            <View style={styles.line} />

            {/* Reason */}
            <Text style={styles.subLabel}>Analysis</Text>
            <Text style={styles.descText}>{resultData.reason}</Text>

            {/* Last reported badge */}
            {resultData.lastReported && (
              <View style={styles.badge}>
                <History size={12} color={Colors.danger} />
                <Text style={styles.badgeText}>
                  Last reported: {resultData.lastReported}
                </Text>
              </View>
            )}

            {/* Report button */}
            <TouchableOpacity
              style={styles.reportButton}
              onPress={handleOpenReport}
              activeOpacity={0.8}
            >
              <Flag size={15} color={Colors.danger} />
              <Text style={styles.reportButtonText}>Submit Additional Report</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Safe result */}
        {status === 'safe' && (
          <Animated.View style={[styles.card, styles.safeCard, { opacity: fadeAnim }]}>
            <View style={styles.cardTop}>
              <ShieldCheck size={24} color="#2F855A" />
              <Text style={styles.safeTitle}>Verified Secure</Text>
            </View>
            <Text style={styles.descText}>
              No fraudulent records found in the Nessie database. Always stay
              vigilant when transferring funds.
            </Text>

            <View style={styles.line} />

            {/* Still allow reporting even if "safe" */}
            <Text style={styles.subLabel}>Something look wrong?</Text>
            <TouchableOpacity
              style={styles.reportButtonSafe}
              onPress={handleOpenReport}
              activeOpacity={0.8}
            >
              <Flag size={15} color={Colors.textSecondary} />
              <Text style={styles.reportButtonSafeText}>Report Suspicious Activity</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>

      {/* ── Report Modal ─────────────────────────────────────────────────────── */}
      <Modal
        visible={reportModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 20 }]}>

            {/* Modal header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Flag size={18} color={Colors.danger} />
                <Text style={styles.modalTitle}>Report Fraud</Text>
              </View>
              <TouchableOpacity onPress={() => setReportModalVisible(false)}>
                <X size={22} color={Colors.textTertiary} />
              </TouchableOpacity>
            </View>

            {/* Target */}
            <Text style={styles.modalLabel}>Target</Text>
            <View style={styles.modalTargetBox}>
              <Text style={styles.modalTargetText}>{query}</Text>
            </View>

            {/* Description */}
            <Text style={styles.modalLabel}>
              Describe the suspicious activity{' '}
              <Text style={{ color: Colors.danger }}>*</Text>
            </Text>
            <TextInput
              style={styles.modalTextArea}
              placeholder="e.g. I received a call asking me to transfer money to this account."
              placeholderTextColor={Colors.textTertiary}
              value={reportNote}
              onChangeText={setReportNote}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            {/* Contact (optional) */}
            <Text style={styles.modalLabel}>
              Contact info{' '}
              <Text style={styles.modalOptional}>(optional)</Text>
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Email or phone number"
              placeholderTextColor={Colors.textTertiary}
              value={reportContact}
              onChangeText={setReportContact}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            {/* Submit */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                reportSubmitting && { opacity: 0.6 },
              ]}
              onPress={handleSubmitReport}
              disabled={reportSubmitting}
              activeOpacity={0.8}
            >
              {reportSubmitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Report</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Search
  searchSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 48,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.text },
  scanButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 16,
    justifyContent: 'center',
    minWidth: 70,
  },
  scanButtonText: { color: Colors.white, fontWeight: '700', textAlign: 'center' },

  // Body
  scrollBody: { padding: 20, flexGrow: 1 },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 80,
    gap: 15,
  },
  infoText: {
    color: Colors.textTertiary,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 22,
  },
  loadingText: { color: Colors.primary, fontWeight: '600', marginTop: 10 },

  // Report success banner
  successBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F0FFF4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#9AE6B4',
    padding: 14,
    marginBottom: 16,
  },
  successBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#276749',
    fontWeight: '500',
    lineHeight: 20,
  },

  // Cards
  card: {
    borderRadius: 20,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  dangerCard: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1.5,
    borderColor: '#FEB2B2',
  },
  safeCard: {
    backgroundColor: '#F0FFF4',
    borderWidth: 1.5,
    borderColor: '#9AE6B4',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 15,
  },
  dangerTitle: { fontSize: 17, fontWeight: '800', color: Colors.danger },
  safeTitle: { fontSize: 17, fontWeight: '800', color: '#2F855A' },

  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: { color: Colors.textTertiary, fontSize: 13, fontWeight: '600' },
  val: { color: Colors.text, fontSize: 14, fontWeight: '700' },

  // Impersonation box
  impersonationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  impersonationText: { fontSize: 13, color: '#856404', flex: 1 },
  impersonationReal: { fontWeight: '700', color: '#856404' },

  // Similarity bar
  similarityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  similarityBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#FFE0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  similarityFill: {
    height: '100%',
    backgroundColor: Colors.danger,
    borderRadius: 3,
  },
  similarityScore: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.danger,
    minWidth: 36,
    textAlign: 'right',
  },

  line: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 15,
    opacity: 0.3,
  },
  subLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  descText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
    fontWeight: '500',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFEBEB',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 15,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: Colors.danger },

  // Report buttons
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 18,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.danger,
    backgroundColor: '#FFF5F5',
  },
  reportButtonText: {
    color: Colors.danger,
    fontWeight: '700',
    fontSize: 14,
  },
  reportButtonSafe: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  reportButtonSafeText: {
    color: Colors.textSecondary,
    fontWeight: '700',
    fontSize: 14,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  modalOptional: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.textTertiary,
  },
  modalTargetBox: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 18,
  },
  modalTargetText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
  },
  modalTextArea: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 14,
    color: Colors.text,
    minHeight: 110,
    marginBottom: 18,
  },
  modalInput: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 14,
    color: Colors.text,
    height: 48,
    marginBottom: 24,
  },
  submitButton: {
    backgroundColor: Colors.danger,
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
});