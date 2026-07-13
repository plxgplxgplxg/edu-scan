/* eslint-disable react/no-unstable-nested-components, no-void, react-native/no-inline-styles */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  BookOpen,
  ClipboardList,
  BarChart2,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppText } from '../../components/AppText';
import { DashboardModuleCard } from '../../components/DashboardModuleCard';
import { PageHeader } from '../../components/PageHeader';
import { Screen } from '../../components/Screen';
import { SurfaceCard } from '../../components/SurfaceCard';
import { ErrorState, LoadingState } from '../../components/RequestState';
import { useAppContent } from '../../hooks/useAppContent';
import { useAuth } from '../../store/auth-store';
import { appTheme, palette } from '../../theme/tokens';
import { useResponsiveLayout } from '../../theme/responsive';
import { primaryHeroGradient } from '../../theme/header';
import type { RootStackParamList } from '../../navigation/types';
import { getInitials } from '../../utils/string';
import {
  listAssignments,
  listClasses,
} from '../../api/edu-scan';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { useNotifications } from '../../features/notifications/application/notifications-provider';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const studentDashboardModules = [
  { id: 'classes', gradient: ['#6552F5', '#8B5CF6'], isLarge: true },
  { id: 'assignments', gradient: ['#12B886', '#00D4B4'], isLarge: false },
  { id: 'stats', gradient: ['#FF5FA2', '#FF3B5C'], isLarge: false },
] as const;

const moduleIcons = {
  classes: <BookOpen size={24} color={palette.white} />,
  assignments: <ClipboardList size={24} color={palette.white} />,
  stats: <BarChart2 size={24} color={palette.white} />,
};

export function StudentDashboardScreen() {
  const navigation = useNavigation<Nav>();
  const content = useAppContent();
  const { accessToken, profileName } = useAuth();
  const layout = useResponsiveLayout();
  const { unreadCount } = useNotifications();
  const { data, loading, error, reload } = useAsyncResource(
    async () => {
      if (!accessToken) {
        return {
          classCount: 0,
          pendingAssignments: 0,
          upcomingAssignments: [] as Array<{ id: string; title: string; deadline: string }>,
        };
      }

      const [classes, assignments] = await Promise.all([
        listClasses(accessToken),
        listAssignments(accessToken),
      ]);

      return {
        classCount: classes.length,
        pendingAssignments: assignments.filter((item) => !item.submits?.[0]).length,
        upcomingAssignments: assignments
          .filter((item) => !item.submits?.[0])
          .sort((a, b) => Date.parse(a.deadline) - Date.parse(b.deadline))
          .slice(0, 3)
          .map((item) => ({ id: item.id, title: item.title, deadline: item.deadline })),
      };
    },
    [accessToken],
  );

  const metrics = data ?? {
    classCount: 0,
    pendingAssignments: 0,
    upcomingAssignments: [] as Array<{ id: string; title: string; deadline: string }>,
  };

  return (
    <Screen refreshing={loading} onRefresh={() => { void reload(); }}>
      <PageHeader
        title={profileName}
        subtitle={`${content.roles.STUDENT} • ${content.student.dashboard.subtitle}`}
        overline={content.student.dashboard.greeting}
        gradient={primaryHeroGradient}
        showNotificationButton
        actionBadge={unreadCount || undefined}
        onNotificationPress={() => navigation.navigate('SharedNotifications')}
        leadingVisual={
          <View
            style={[
              styles.initialsCard,
              {
                width: '100%',
                height: '100%',
                borderRadius: layout.heroRadius - 6,
              },
            ]}
          >
            <AppText variant="title" weight="bold" color={appTheme.palette.white}>
              {getInitials(profileName)}
            </AppText>
          </View>
        }
        footer={
          <View style={styles.headerFooter}>
            <View style={[styles.metricsCard, layout.isCompact ? styles.metricsCardStack : null]}>
              <MetricBlock label={content.student.dashboard.metrics.classes} value={String(metrics.classCount)} light />
              <MetricBlock label={content.student.dashboard.metrics.assignments} value={String(metrics.pendingAssignments)} light />
              <MetricBlock label={content.common.labels.today} value={content.common.labels.active} light />
            </View>
          </View>
        }
      />

      <View
        style={[
          styles.section,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingTop: layout.sectionGap + appTheme.spacing.sm,
            maxWidth: layout.contentMaxWidth,
            alignSelf: 'center',
            width: '100%',
            gap: layout.sectionGap,
          },
        ]}
      >
        <AppText variant="caption" weight="semibold" color={palette.mutedForeground}>
          {content.common.sections.functions.toUpperCase()}
        </AppText>
        <View style={[styles.grid, { gap: layout.gridGap, rowGap: layout.gridGap }]}>
          {studentDashboardModules.map(module => (
            <DashboardModuleCard
              key={module.id}
              icon={moduleIcons[module.id as keyof typeof moduleIcons]}
              isLarge={module.isLarge}
              title={content.student.dashboard.modules[module.id as keyof typeof content.student.dashboard.modules]}
              subtitle={
                module.id === 'classes'
                  ? `${String(metrics.classCount)} lớp đang học`
                  : `${String(metrics.pendingAssignments)} bài sắp đến hạn`
              }
              colors={module.gradient}
              onPress={() => {
                if (module.id === 'classes') {
                  navigation.navigate('StudentTabs', { screen: 'StudentClasses' });
                }
                if (module.id === 'assignments') {
                  navigation.navigate('StudentTabs', { screen: 'StudentClasses' });
                }
                if (module.id === 'stats') {
                  navigation.navigate('StudentStatistics');
                }
              }}
            />
          ))}
        </View>
        <SurfaceCard style={styles.upcomingCard}>
          <AppText variant="body" weight="semibold">
            Bài tập sắp đến hạn
          </AppText>
          {metrics.upcomingAssignments.map((item) => (
            <View key={item.id} style={styles.assignmentRow}>
              <View style={styles.flex}>
                <AppText variant="body" weight="medium">
                  {item.title}
                </AppText>
                <AppText variant="caption" color={palette.mutedForeground}>
                  {item.deadline}
                </AppText>
              </View>
            </View>
          ))}
          {!metrics.upcomingAssignments.length ? (
            <AppText variant="caption" color={palette.mutedForeground}>
              Không có bài tập sắp đến hạn
            </AppText>
          ) : null}
        </SurfaceCard>
        {loading ? <LoadingState label={content.common.labels.loading} /> : null}
        {error ? (
          <ErrorState
            message={error}
            retryLabel={content.common.buttons.retry}
            onRetry={reload}
          />
        ) : null}
      </View>

    </Screen>
  );
}

function MetricBlock({
  label,
  value,
  light = false,
}: {
  label: string;
  value: string;
  light?: boolean;
}) {
  return (
    <View style={styles.metricBlock}>
      <AppText 
        variant="headline" 
        weight="bold" 
        color={light ? appTheme.palette.white : appTheme.palette.foreground}
        style={{ fontFamily: appTheme.typography.displayFamily }}
      >
        {value}
      </AppText>
      <AppText variant="label" color={light ? 'rgba(255,255,255,0.7)' : appTheme.palette.mutedForeground}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  initialsCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: appTheme.palette.glassFill,
  },
  headerFooter: {
    gap: appTheme.spacing.lg,
  },
  metricsCard: {
    backgroundColor: appTheme.palette.glassFill,
    borderRadius: appTheme.radius.lg,
    padding: appTheme.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: appTheme.palette.glassBorder,
  },
  metricsCardStack: {
    flexWrap: 'wrap',
    rowGap: appTheme.spacing.md,
  },
  metricBlock: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
    minWidth: 90,
  },
  section: {
    gap: appTheme.spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  upcomingCard: {
    gap: appTheme.spacing.md,
  },
  assignmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.spacing.md,
  },
  flex: {
    flex: 1,
  },
});
