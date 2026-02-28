import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import {
  ArrowLeft,
  ShieldAlert,
  Ban,
  Save,
  MessageCircle,
  AlertTriangle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import Colors from '@/constants/colors';

type TransferStep = 'form' | 'blocked';

export default function TransferProtectionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<TransferStep>('form');
  const [recipient, setRecipient] = useState<string>('');
  const [account, setAccount] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const blockAnim = useRef(new Animated.Value(0)).current;

  const handleTransfer = useCallback(() => {
    setStep('blocked');
    Animated.spring(blockAnim, {
      toValue: 1,
      tension: 50,
      friction: 9,
      useNativeDriver: true,
    }).start();
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Transfer protection',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '700' as const, fontSize: 18 },
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {step === 'form' && (
          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Recipient</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter name"
                placeholderTextColor={Colors.textTertiary}
                value={recipient}
                onChangeText={setRecipient}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Account number</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter account number"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="number-pad"
                value={account}
                onChangeText={setAccount}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Amount</Text>
              <TextInput
                style={styles.input}
                placeholder="Amount to transfer"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="number-pad"
                value={amount}
                onChangeText={setAmount}
              />
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleTransfer}
              activeOpacity={0.85}
              testID="transfer-button"
            >
              <Text style={styles.primaryButtonText}>Transfer</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'blocked' && (
          <Animated.View
            style={[
              styles.blockedSection,
              {
                opacity: blockAnim,
                transform: [{ scale: blockAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }],
              },
            ]}
          >
            <View style={styles.blockedHeader}>
              <View style={styles.blockedIconBg}>
                <Ban size={40} color={Colors.danger} strokeWidth={2} />
              </View>
              <Text style={styles.blockedTitle}>Transfer was cancelled</Text>
            </View>

            <View style={styles.systemMessage}>
              <ShieldAlert size={18} color={Colors.primary} strokeWidth={2} />
              <Text style={styles.systemText}>
                Nessie security engine: Transaction stopped due to risky account detection.
              </Text>
            </View>

            <View style={styles.detailsCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Risk reason</Text>
                <Text style={styles.detailValue}>Account with voice phishing reports</Text>
              </View>
              <View style={styles.detailDivider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Recommended actions</Text>
                <View style={styles.recommendList}>
                  <View style={styles.recommendItem}>
                    <AlertTriangle size={14} color={Colors.caution} strokeWidth={2} />
                    <Text style={styles.recommendText}>Stop transactions with this account</Text>
                  </View>
                  <View style={styles.recommendItem}>
                    <AlertTriangle size={14} color={Colors.caution} strokeWidth={2} />
                    <Text style={styles.recommendText}>Re-verify the recipient's identity</Text>
                  </View>
                  <View style={styles.recommendItem}>
                    <AlertTriangle size={14} color={Colors.caution} strokeWidth={2} />
                    <Text style={styles.recommendText}>Report to police or financial authority</Text>
                  </View>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push('/reporting-chatbot')}
              activeOpacity={0.85}
            >
              <MessageCircle size={20} color={Colors.white} strokeWidth={2} />
              <Text style={styles.primaryButtonText}>Go to report assistant</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.75}>
              <Save size={18} color={Colors.primary} strokeWidth={2} />
              <Text style={styles.secondaryButtonText}>Save details</Text>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 16,
  },
  formSection: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    height: 56,
    paddingHorizontal: 18,
    fontSize: 17,
    color: Colors.text,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '700' as const,
  },
  blockedSection: {
    gap: 16,
  },
  blockedHeader: {
    alignItems: 'center',
    gap: 16,
    marginVertical: 16,
  },
  blockedIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockedTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  systemMessage: {
    backgroundColor: Colors.primaryFaint,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  systemText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
    flex: 1,
  },
  detailsCard: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  detailRow: {
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.danger,
  },
  detailDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 14,
  },
  recommendList: {
    gap: 8,
  },
  recommendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recommendText: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  secondaryButtonText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600' as const,
  },
});
