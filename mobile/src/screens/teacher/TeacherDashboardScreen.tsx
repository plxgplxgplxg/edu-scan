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
import { listAssignments, listClasses, listExams } from '../../api/edu-scan';
import { useAsyncResource } from '../../hooks/useAsyncResource';
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

export function TeacherDashboardScreen() {
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
          examCount: 0,
          attentionAssignments: [] as Array<{ id: string; title: string; missing: number; deadline: string }>,
        };
      }

      const [classes, exams, assignments] = await Promise.all([
        listClasses(accessToken),
        listExams(accessToken),
        listAssignments(accessToken),
      ]);
      const classesById = new Map(classes.map((item) => [item.id, item]));

      return {
        classCount: classes.length,
        examCount: exams.length,
        attentionAssignments: assignments
          .map((assignment) => {
            const classItem = classesById.get(assignment.classId);
            const totalStudents = classItem?.enrollments.length ?? 0;
            const submitCount = assignment._count?.submits ?? 0;
            return {
              id: assignment.id,
              title: assignment.title,
              deadline: assignment.deadline,
              missing: Math.max(totalStudents - submitCount, 0),
            };
          })
          .filter((item) => item.missing > 0)
          .sort((a, b) => Date.parse(a.deadline) - Date.parse(b.deadline))
          .slice(0, 3),
      };
    },
    [accessToken],
  );

  const metrics = data ?? {
    classCount: 0,
    examCount: 0,
    attentionAssignments: [] as Array<{ id: string; title: string; missing: number; deadline: string }>,
  };

  return (
    <Screen refreshing={loading} onRefresh={() => { void reload(); }}>
      <PageHeader
        overline={content.teacher.dashboard.greeting}
        title={profileName}
        subtitle={`${content.roles.TEACHER} • ${content.teacher.dashboard.subtitle}`}
        gradient={primaryHeroGradient}
        showNotificationButton
        actionBadge={unreadCount || undefined}
        onNotificationPress={() => navigation.navigate('SharedNotifications')}
        avatarLabel={getInitials(profileName)}
        metrics={[
          { label: content.teacher.dashboard.metrics.classes, value: String(metrics.classCount) },
          { label: content.teacher.dashboard.metrics.exams, value: String(metrics.examCount) },
          { label: content.common.labels.active, value: content.teacher.dashboard.metrics.checks },
        ]}
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
        <SurfaceCard style={styles.attentionCard}>
          <AppText variant="body" weight="semibold">
            Bài tập cần chú ý
          </AppText>
          {metrics.attentionAssignments.map((item) => (
            <View key={item.id} style={styles.assignmentRow}>
              <View style={styles.flex}>
                <AppText variant="body" weight="medium">
                  {item.title}
                </AppText>
                <AppText variant="caption" color={appTheme.palette.mutedForeground}>
                  {`${String(item.missing)} học sinh chưa nộp`}
                </AppText>
              </View>
            </View>
          ))}
          {!metrics.attentionAssignments.length ? (
            <AppText variant="caption" color={appTheme.palette.mutedForeground}>
              Không có bài tập cần chú ý
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

const styles = StyleSheet.create({
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
