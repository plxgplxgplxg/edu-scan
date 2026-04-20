import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  ArrowLeft,
  Bell,
  BookOpen,
  CheckCircle,
  FileText,
  MessageSquare,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { notifications } from '../../api/mockData';
import { AppText } from '../../components/AppText';
import { BottomNav } from '../../components/BottomNav';
import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { Screen } from '../../components/Screen';
import { SurfaceCard } from '../../components/SurfaceCard';
import { useAuth } from '../../store/auth-store';
import { appTheme, palette } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function NotificationsScreen() {
  const navigation = useNavigation<Nav>();
  const { content, role } = useAuth();
  const unreadCount = notifications.filter(item => !item.read).length;

  return (
    <Screen>
      <PageHeader
        backLabel={content.common.buttons.backToHome}
        title={content.shared.notifications.title}
        subtitle={
          unreadCount
            ? `${String(unreadCount)} ${content.shared.notifications.unread}`
            : undefined
        }
        gradient={['#4F46E5', '#6D28D9', '#7C5CFC']}
        onBack={() => {
          if (role === 'TEACHER') navigation.navigate('TeacherDashboard');
          if (role === 'STUDENT') navigation.navigate('StudentDashboard');
          if (role === 'ADMIN') navigation.navigate('AdminDashboard');
        }}
      />

      <View style={styles.list}>
        {notifications.map(item => (
          <SurfaceCard
            key={item.id}
            style={[styles.card, !item.read ? styles.unreadCard : null]}
          >
            <View style={styles.iconWrap}>
              {item.type === 'assignment' ? (
                <BookOpen size={18} color={palette.primary} />
              ) : null}
              {item.type === 'result' ? (
                <FileText size={18} color={palette.info} />
              ) : null}
              {item.type === 'remark' ? (
                <MessageSquare size={18} color={palette.warning} />
              ) : null}
              {item.type === 'system' ? (
                <CheckCircle size={18} color={palette.success} />
              ) : null}
            </View>
            <View style={styles.flex}>
              <View style={styles.rowBetween}>
                <AppText variant="body" weight={item.read ? 'regular' : 'semibold'}>
                  {item.title}
                </AppText>
                {!item.read ? <View style={styles.unreadDot} /> : null}
              </View>
              <AppText variant="caption" color={palette.mutedForeground}>
                {item.body}
              </AppText>
              <AppText variant="caption" color={palette.mutedForeground}>
                {item.time}
              </AppText>
            </View>
          </SurfaceCard>
        ))}

        {!notifications.length ? (
          <EmptyState
            title={content.common.messages.emptyNotifications}
            icon={<Bell size={38} color={palette.mutedForeground} />}
          />
        ) : null}
      </View>

      {role ? (
        <BottomNav role={role} currentScreen="SharedNotifications" currentModule="home" />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: appTheme.spacing.xl,
    paddingTop: appTheme.spacing.lg,
    gap: appTheme.spacing.md,
  },
  card: {
    flexDirection: 'row',
    gap: appTheme.spacing.md,
  },
  unreadCard: {
    backgroundColor: '#F5F5FF',
    borderColor: '#E8E8FF',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: appTheme.radius.md,
    backgroundColor: palette.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
    gap: 6,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: appTheme.spacing.sm,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.primary,
    marginTop: 6,
  },
});
