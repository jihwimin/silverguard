import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Linking,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import {
  Users,
  UserPlus,
  Phone,
  Link2,
  Bell,
  ShieldCheck,
  Info,
  ChevronRight,
} from 'lucide-react-native';
import { useApp } from '@/components/providers/AppProvider';
import { getMe, linkUnlink } from '@/lib/authApi';
import Colors from '@/constants/colors';


interface NotificationSetting {
  id: string;
  label: string;
  enabled: boolean;
}

export default function GuardianHubScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { authToken } = useApp();
  const [isLinked, setIsLinked] = useState<boolean>(false);
  const [linkedUserPhone, setLinkedUserPhone] = useState<string | null>(null);
  const [unlinking, setUnlinking] = useState(false);
  const [notifications, setNotifications] = useState<NotificationSetting[]>([
    { id: 'call', label: 'Alert on high-risk call detection', enabled: true },
    { id: 'transfer', label: 'Alert when transfer is blocked', enabled: true },
    { id: 'smishing', label: 'Alert on high-risk smishing result', enabled: false },
    { id: 'emergency', label: 'Alert on emergency help request', enabled: true },
  ]);

  const toggleNotification = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, enabled: !n.enabled } : n))
    );
  };

  const fetchLinkStatus = useCallback(async () => {
    if (!authToken) return;
    try {
      const res = await getMe(authToken);
      setIsLinked(!!res.linkedUserId);
      setLinkedUserPhone(res.linkedUserPhone ?? null);
    } catch (_) {}
  }, [authToken]);

  useFocusEffect(
    useCallback(() => {
      fetchLinkStatus();
    }, [fetchLinkStatus])
  );

  const handleUnlink = useCallback(async () => {
    if (!authToken || unlinking) return;
    setUnlinking(true);
    try {
      await linkUnlink(authToken);
      setIsLinked(false);
    } catch (_) {}
    finally { setUnlinking(false); }
  }, [authToken, unlinking]);

  const handleContact = useCallback(() => {
    if (linkedUserPhone) {
      Linking.openURL(`tel:${linkedUserPhone}`);
    }
  }, [linkedUserPhone]);

  return (
    
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: '',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '700' as const, fontSize: 18 },
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
      >
        <View style={styles.statusCard}>
          <View style={styles.statusIconBg}>
            <Users size={28} color={isLinked ? Colors.primary : Colors.textTertiary} strokeWidth={2} />
          </View>
          <Text style={styles.statusLabel}>Current status</Text>
          <Text style={[styles.statusValue, isLinked && styles.statusLinked]}>
            {isLinked ? '1 guardian linked' : 'No guardian linked'}
          </Text>
          <Text style={styles.statusSubtext}>
            You can notify your guardian when risks are detected.
          </Text>
        </View>

        {!isLinked ? (
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.push('/guardian-link')}
            activeOpacity={0.85}
            testID="link-guardian"
          >
            <UserPlus size={20} color={Colors.white} strokeWidth={2} />
            <Text style={styles.linkButtonText}>Link guardian</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.guardianCard}>
            <View style={styles.guardianInfo}>
              <View style={styles.guardianAvatar}>
                <Text style={styles.guardianAvatarText}>G</Text>
              </View>
              <View style={styles.guardianDetails}>
                <Text style={styles.guardianName}>Guardian</Text>
                {linkedUserPhone ? (
                  <Text style={styles.guardianPhone}>{linkedUserPhone}</Text>
                ) : null}
              </View>
            </View>
            <View style={styles.guardianActions}>
              <TouchableOpacity
                style={styles.guardianAction}
                onPress={handleUnlink}
                disabled={unlinking}
                activeOpacity={0.75}
              >
                <Link2 size={16} color={Colors.textTertiary} strokeWidth={2} />
                <Text style={styles.guardianActionText}>{unlinking ? 'Unlinking...' : 'Unlink'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.guardianAction}
                onPress={handleContact}
                disabled={!linkedUserPhone}
                activeOpacity={0.75}
              >
                <Phone size={16} color={Colors.primary} strokeWidth={2} />
                <Text style={[styles.guardianActionText, { color: Colors.primary }]}>Contact</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Bell size={18} color={Colors.text} strokeWidth={2} />
          <Text style={styles.sectionTitle}>Alert settings</Text>
        </View>

        <View style={styles.notificationCard}>
          {notifications.map((setting, index) => (
            <View
              key={setting.id}
              style={[
                styles.notificationRow,
                index < notifications.length - 1 && styles.notificationBorder,
              ]}
            >
              <Text style={styles.notificationLabel}>{setting.label}</Text>
              <Switch
                value={setting.enabled}
                onValueChange={() => toggleNotification(setting.id)}
                trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                thumbColor={setting.enabled ? Colors.primary : Colors.textTertiary}
              />
            </View>
          ))}
        </View>
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
    paddingTop: 16,
  },
  statusCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statusIconBg: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  statusLabel: {
    fontSize: 14,
    color: Colors.textTertiary,
    fontWeight: '500' as const,
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
  },
  statusLinked: {
    color: Colors.primary,
  },
  statusSubtext: {
    fontSize: 14,
    color: Colors.textTertiary,
    marginTop: 6,
    textAlign: 'center',
  },
  linkButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  linkButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '700' as const,
  },
  guardianCard: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  guardianInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  guardianAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guardianAvatarText: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  guardianDetails: {
    flex: 1,
    gap: 4,
  },
  guardianName: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  guardianPhone: {
    fontSize: 14,
    color: Colors.textTertiary,
  },
  guardianActions: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 14,
  },
  guardianAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.background,
  },
  guardianActionText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  notificationCard: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
  },
  notificationBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  notificationLabel: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500' as const,
    flex: 1,
    marginRight: 12,
  },
  disclosureCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  disclosureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  disclosureTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  disclosureItem: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  disclosureDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 10,
  },
  disclosureNote: {
    fontSize: 13,
    color: Colors.textTertiary,
    fontStyle: 'italic',
  },
  alertsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.primaryFaint,
  },
  alertsButtonText: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '600' as const,
  },
});
