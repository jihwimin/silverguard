import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Users,
  Bell,
  Settings,
  Shield,
  Info,
  ChevronRight,
} from 'lucide-react-native';
import Colors from '@/constants/colors';

interface MenuItem {
  title: string;
  icon: React.ReactNode;
  route?: string;
}

const menuItems: MenuItem[] = [
  {
    title: '보호자 연동 및 알림',
    icon: <Users size={22} color={Colors.primary} strokeWidth={2} />,
    route: '/guardian-hub',
  },
  {
    title: '알림 설정',
    icon: <Bell size={22} color="#5B8DEF" strokeWidth={2} />,
  },
  {
    title: '권한/접근성 설정',
    icon: <Settings size={22} color="#A78BFA" strokeWidth={2} />,
  },
  {
    title: '개인정보/보안 안내',
    icon: <Shield size={22} color={Colors.caution} strokeWidth={2} />,
  },
  {
    title: '앱 정보',
    icon: <Info size={22} color={Colors.textTertiary} strokeWidth={2} />,
  },
];

export default function MoreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>더보기</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.profileCard}>
          <View style={styles.profileIcon}>
            <Shield size={28} color={Colors.primary} strokeWidth={2} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>SilverGuard 사용자</Text>
            <Text style={styles.profileStatus}>보호 활성화됨</Text>
          </View>
        </View>

        <View style={styles.menuCard}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.menuItem,
                index < menuItems.length - 1 && styles.menuItemBorder,
              ]}
              activeOpacity={0.7}
              onPress={() => item.route && router.push(item.route as any)}
              testID={`menu-item-${index}`}
            >
              <View style={styles.menuLeft}>
                <View style={styles.menuIconBg}>{item.icon}</View>
                <Text style={styles.menuTitle}>{item.title}</Text>
              </View>
              <ChevronRight size={20} color={Colors.textTertiary} strokeWidth={2} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.versionInfo}>
          <Text style={styles.versionText}>SilverGuard v1.0.0</Text>
          <Text style={styles.copyrightText}>AI 기반 보이스피싱 방어 솔루션</Text>
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
  header: {
    paddingHorizontal: 20,
    height: 56,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  profileIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  profileStatus: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500' as const,
    marginTop: 2,
  },
  menuCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  menuIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  versionInfo: {
    alignItems: 'center',
    marginTop: 32,
    gap: 4,
  },
  versionText: {
    fontSize: 13,
    color: Colors.textTertiary,
    fontWeight: '500' as const,
  },
  copyrightText: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
});