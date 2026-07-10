import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  BookOpen,
  ClipboardList,
  GraduationCap,
  MessageSquare,
  TrendingUp,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppText } from '../../components/AppText';
import { DashboardModuleCard } from '../../components/DashboardModuleCard';
import { PageHeader } from '../../components/PageHeader';
import { Screen } from '../../components/Screen';
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
  listStudentProgress,
  listStudentSubmissions,
} from '../../api/edu-scan';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { useNotifications } from '../../features/notifications/application/notifications-provider';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const studentDashboardModules = [
  { id: 'assignments', gradient: ['#12B886', '#00D4B4'], isLarge: true },
  { id: 'classes', gradient: ['#6552F5', '#8B5CF6'], isLarge: false },
  { id: 'results', gradient: ['#2E9BFF', '#00D4B4'], isLarge: false },
  { id: 'remarks', gradient: ['#FF9500', '#FF5FA2'], isLarge: false },
  { id: 'progress', gradient: ['#FF5FA2', '#FF3B5C'], isLarge: false },
] as const;

const moduleIcons = {
  classes: <BookOpen size={24} color={palette.white} />,
  results: <GraduationCap size={24} color={palette.white} />,
  assignments: <ClipboardList size={24} color={palette.white} />,
  remarks: <MessageSquare size={24} color={palette.white} />,
  progress: <TrendingUp size={24} color={palette.white} />,
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
          resultCount: 0,
          pendingAssignments: 0,
          averageScore: 0,
        };
      }

      const [classes, assignments, submissions, progress] = await Promise.all([
        listClasses(accessToken),
        listAssignments(accessToken),
        listStudentSubmissions(accessToken),
        listStudentProgress(accessToken),
      ]);

      const graded = submissions.items.filter((item) => item.status === 'GRADED');
      const averageScore = graded.reduce((sum, item) => sum + item.score, 0) / Math.max(graded.length, 1);

      return {
        classCount: classes.length,
        resultCount: submissions.items.length,
        pendingAssignments: assignments.filter((item) => !item.submits?.[0]).length,
        averageScore: progress.length ? averageScore : 0,
      };
    },
    [accessToken],
  );

  const metrics = data ?? {
    classCount: 0,
    resultCount: 0,
    pendingAssignments: 0,
    averageScore: 0,
  };

  return (
    <Screen refreshing={loading} onRefresh={() => { void reload(); }}>
      <PageHeader
        overline={content.student.dashboard.greeting}
        title={profileName}
        subtitle={`${content.roles.STUDENT} • ${content.student.dashboard.subtitle}`}
        gradient={primaryHeroGradient}
        showNotificationButton
        actionBadge={unreadCount || undefined}
        onNotificationPress={() => navigation.navigate('SharedNotifications')}
        avatarLabel={getInitials(profileName)}
        metrics={[
          { label: content.student.dashboard.metrics.average, value: metrics.averageScore.toFixed(1) },
          { label: content.student.dashboard.metrics.exams, value: String(metrics.resultCount) },
          { label: content.student.dashboard.metrics.rank, value: content.shared.profile.studentRank },
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
                  : module.id === 'results'
                    ? `${String(metrics.resultCount)} bài thi`
                    : module.id === 'assignments'
                      ? `${String(metrics.pendingAssignments)} chưa nộp`
                      : module.id === 'progress'
                        ? `TB: ${metrics.averageScore.toFixed(1)}`
                        : content.student.dashboard.moduleCounts[module.id as keyof typeof content.student.dashboard.moduleCounts]
              }
              colors={module.gradient}
              onPress={() => {
                if (module.id === 'classes') {
                  navigation.navigate('StudentTabs', { screen: 'StudentClasses' });
                }
                if (module.id === 'results') {
                  navigation.navigate('StudentTabs', { screen: 'StudentResults' });
                }
                if (module.id === 'assignments') {
                  navigation.navigate('StudentTabs', { screen: 'StudentAssignments' });
                }
                if (module.id === 'remarks') navigation.navigate('StudentRemarks');
                if (module.id === 'progress') navigation.navigate('StudentProgress');
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
  section: {
    gap: appTheme.spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
});
