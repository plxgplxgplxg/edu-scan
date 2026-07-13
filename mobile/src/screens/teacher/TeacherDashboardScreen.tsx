/* eslint-disable react/no-unstable-nested-components, no-void, react-native/no-inline-styles */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  BarChart2,
  BookOpen,
  ScanLine,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { DashboardModuleCard } from '../../components/DashboardModuleCard';
import { AppText } from '../../components/AppText';
import { PageHeader } from '../../components/PageHeader';
import { Screen } from '../../components/Screen';
import { SurfaceCard } from '../../components/SurfaceCard';
import { ErrorState, LoadingState } from '../../components/RequestState';
import { useAppContent } from '../../hooks/useAppContent';
import { useAuth } from '../../store/auth-store';
import { appTheme } from '../../theme/tokens';
import { useResponsiveLayout } from '../../theme/responsive';
import { primaryHeroGradient } from '../../theme/header';
import type { RootStackParamList } from '../../navigation/types';
import { getInitials } from '../../utils/string';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { requestJson } from '../../api/http';
import { useNotifications } from '../../features/notifications/application/notifications-provider';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const teacherDashboardModules = [
  { id: 'classes', gradient: ['#6552F5', '#8B5CF6'], isLarge: true },
  { id: 'omr', gradient: ['#2E9BFF', '#00D4B4'], isLarge: false },
  { id: 'stats', gradient: ['#FF5FA2', '#FF3B5C'], isLarge: false },
] as const;

const moduleIcons = {
  classes: <BookOpen size={24} color={appTheme.palette.white} />,
  omr: <ScanLine size={24} color={appTheme.palette.white} />,
  stats: <BarChart2 size={24} color={appTheme.palette.white} />,
};

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

export function TeacherDashboardScreen() {
  const navigation = useNavigation<Nav>();
  const content = useAppContent();
  const { accessToken, profileName } = useAuth();
  const layout = useResponsiveLayout();

  const { data, loading, error, reload } = useAsyncResource(
    async () => {
      if (!accessToken) return null;
      const stats = await requestJson<any>('/stats/teacher', { token: accessToken });
      return {
        classCount: stats.totalClasses ?? 0,
        examCount: stats.totalExams ?? 0,
      };
    },
    [accessToken],
  );

  const metrics = data ?? {
    classCount: 0,
    examCount: 0,
  };

  return (
    <Screen refreshing={loading} onRefresh={() => { void reload(); }}>
      <PageHeader
        title={profileName}
        subtitle={`${content.roles.TEACHER} • ${content.teacher.dashboard.subtitle}`}
        overline={content.teacher.dashboard.greeting}
        gradient={primaryHeroGradient}
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
              <MetricBlock label={content.teacher.dashboard.metrics.classes} value={String(metrics.classCount)} light />
              <MetricBlock label={content.teacher.dashboard.metrics.exams} value={String(metrics.examCount)} light />
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
        <AppText variant="caption" weight="semibold" color={appTheme.palette.mutedForeground}>
          {content.common.sections.functions.toUpperCase()}
        </AppText>
        <View style={[styles.grid, { gap: layout.gridGap, rowGap: layout.gridGap }]}>
          {teacherDashboardModules.map(module => (
            <DashboardModuleCard
              key={module.id}
              icon={moduleIcons[module.id as keyof typeof moduleIcons]}
              isLarge={module.isLarge}
              title={
                content.teacher.dashboard.modules[module.id as keyof typeof content.teacher.dashboard.modules]
              }
              subtitle={
                module.id === 'classes'
                  ? `${String(metrics.classCount)} lớp`
                  : module.id === 'omr'
                    ? `${String(metrics.examCount)} đề kiểm tra`
                    : content.teacher.dashboard.moduleCounts[module.id as keyof typeof content.teacher.dashboard.moduleCounts]
              }
              colors={module.gradient}
              onPress={() => {
                if (module.id === 'classes') {
                  navigation.navigate('TeacherTabs', { screen: 'TeacherClasses' });
                }
                if (module.id === 'omr') {
                  navigation.navigate('TeacherTabs', { screen: 'TeacherOMR' });
                }
                if (module.id === 'stats') {
                  navigation.navigate('TeacherStatistics');
                }
              }}
            />
          ))}
        </View>

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
  attentionCard: {
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
