/* eslint-disable react/no-unstable-nested-components, no-void, react-native/no-inline-styles */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  Bell,
  BookOpen,
  CheckCircle,
  FileText,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppText } from '../../components/AppText';
import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { ErrorState, LoadingState } from '../../components/RequestState';
import { Screen } from '../../components/Screen';
import { SurfaceCard } from '../../components/SurfaceCard';
import { useAuth } from '../../store/auth-store';
import { appTheme, palette } from '../../theme/tokens';
import { useResponsiveLayout } from '../../theme/responsive';
import { primaryHeroGradient } from '../../theme/header';
import type { RootStackParamList } from '../../navigation/types';
import { useNotifications } from '../../features/notifications/application/notifications-provider';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function NotificationsScreen() {
  const navigation = useNavigation<Nav>();
  const { content, role } = useAuth();
  const layout = useResponsiveLayout();
  const { notifications, unreadCount, loading, error, reload, markAsRead } =
    useNotifications();
  const handleRefresh = () => {
    reload().catch(() => undefined);
  };
  const openNotification = async (item: typeof notifications[number]) => {
    await markAsRead(item.id);

    const intent = item.routeIntent;
    if (!intent) {
      return;
    }

    if (intent.route === 'StudentClassDetail' && role === 'STUDENT') {
      navigation.navigate('StudentClassDetail', { 
        classId: intent.classId, 
        assignmentId: intent.assignmentId, 
        mode: intent.mode 
      });
      return;
    }

    if (intent.route === 'TeacherClassDetail' && role === 'TEACHER') {
      navigation.navigate('TeacherClassDetail', { classId: intent.classId });
      return;
    }

    if (intent.route === 'TeacherOmrBatchDetail' && role === 'TEACHER') {
      navigation.navigate('TeacherOmrBatchDetail', { batchId: intent.batchId });
    }
  };

  return (
    <Screen refreshing={loading} onRefresh={handleRefresh}>
      <PageHeader
        hideBackButton
        title={content.shared.notifications.title}
        subtitle={
          unreadCount
            ? `${String(unreadCount)} ${content.shared.notifications.unread}`
            : undefined
        }
        gradient={primaryHeroGradient}
      />

      <View
        style={[
          styles.list,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingTop: layout.sectionGap,
            maxWidth: layout.contentMaxWidth,
            alignSelf: 'center',
            width: '100%',
            gap: layout.sectionGap,
          },
        ]}
      >
        {loading ? <LoadingState label={content.common.labels.loading} /> : null}
        {error ? (
          <ErrorState
            message={error}
            retryLabel={content.common.buttons.retry}
            onRetry={reload}
          />
        ) : null}
        {notifications.map(item => (
          <Pressable
            key={item.id}
            onPress={() => {
              openNotification(item).catch(() => undefined);
            }}
          >
            <SurfaceCard style={[styles.card, !item.read ? styles.unreadCard : null]}>
              <View
                style={[
                  styles.iconWrap,
                  {
                    width: layout.headerVisualSize - 6,
                    height: layout.headerVisualSize - 6,
                    borderRadius: layout.heroRadius - 6,
                  },
                ]}
              >
                {item.type === 'assignment' ? (
                  <BookOpen size={18} color={palette.primary} />
                ) : null}
                {item.type === 'result' ? (
                  <FileText size={18} color={palette.info} />
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
          </Pressable>
        ))}

        {!notifications.length ? (
          <EmptyState
            title={content.common.messages.emptyNotifications}
            icon={<Bell size={38} color={palette.mutedForeground} />}
          />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: appTheme.spacing.lg,
  },
  card: {
    flexDirection: 'row',
    gap: appTheme.spacing.md,
    alignItems: 'flex-start',
  },
  unreadCard: {
    backgroundColor: palette.primaryMuted,
    borderColor: palette.border,
  },
  iconWrap: {
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
    alignItems: 'flex-start',
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
