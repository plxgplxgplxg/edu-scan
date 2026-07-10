import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  BarChart2,
  BookOpen,
  FileText,
  HelpCircle,
  MessageSquare,
  ScanLine,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { DashboardModuleCard } from '../../components/DashboardModuleCard';
import { AppText } from '../../components/AppText';
import { PageHeader } from '../../components/PageHeader';
import { Screen } from '../../components/Screen';
import { ErrorState, LoadingState } from '../../components/RequestState';
import { useAppContent } from '../../hooks/useAppContent';
import { useAuth } from '../../store/auth-store';
import { appTheme } from '../../theme/tokens';
import { useResponsiveLayout } from '../../theme/responsive';
import { primaryHeroGradient } from '../../theme/header';
import type { RootStackParamList } from '../../navigation/types';
import { getInitials } from '../../utils/string';
import { listClasses, listExams, listTeacherRemarks } from '../../api/edu-scan';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { useNotifications } from '../../features/notifications/application/notifications-provider';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const teacherDashboardModules = [
  { id: 'classes', gradient: ['#6552F5', '#8B5CF6'], isLarge: true },
  { id: 'omrExams', gradient: ['#2E9BFF', '#00D4B4'], isLarge: false },
  { id: 'classExams', gradient: ['#0EA5E9', '#14B8A6'], isLarge: false },
  { id: 'omr', gradient: ['#8B5CF6', '#C084FC'], isLarge: false },
  { id: 'remarks', gradient: ['#FF9500', '#FF5FA2'], isLarge: false },
  { id: 'questions', gradient: ['#12B886', '#00D4B4'], isLarge: false },
  { id: 'stats', gradient: ['#FF5FA2', '#FF3B5C'], isLarge: false },
] as const;

const moduleIcons = {
  classes: <BookOpen size={24} color={appTheme.palette.white} />,
  omrExams: <FileText size={24} color={appTheme.palette.white} />,
  classExams: <FileText size={24} color={appTheme.palette.white} />,
  omr: <ScanLine size={24} color={appTheme.palette.white} />,
  remarks: <MessageSquare size={24} color={appTheme.palette.white} />,
  questions: <HelpCircle size={24} color={appTheme.palette.white} />,
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
          remarkCount: 0,
        };
      }

      const [classes, exams, remarks] = await Promise.all([
        listClasses(accessToken),
        listExams(accessToken),
        listTeacherRemarks(accessToken),
      ]);

      return {
        classCount: classes.length,
        examCount: exams.length,
        remarkCount: remarks.length,
      };
    },
    [accessToken],
  );

  const metrics = data ?? {
    classCount: 0,
    examCount: 0,
    remarkCount: 0,
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
          { label: content.teacher.dashboard.metrics.remarks, value: String(metrics.remarkCount) },
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
                module.id === 'omrExams'
                  ? 'Đề OMR'
                  : module.id === 'classExams'
                    ? 'Đề lớp học'
                    : content.teacher.dashboard.modules[module.id as keyof typeof content.teacher.dashboard.modules]
              }
              subtitle={
                module.id === 'classes'
                  ? `${String(metrics.classCount)} lớp`
                  : module.id === 'omrExams' || module.id === 'classExams'
                    ? `${String(metrics.examCount)} đề`
                    : module.id === 'remarks'
                      ? `${String(metrics.remarkCount)} yêu cầu`
                      : content.teacher.dashboard.moduleCounts[module.id as keyof typeof content.teacher.dashboard.moduleCounts]
              }
              colors={module.gradient}
              onPress={() => {
                if (module.id === 'classes') {
                  navigation.navigate('TeacherTabs', { screen: 'TeacherClasses' });
                }
                if (module.id === 'omrExams') navigation.navigate('TeacherOmrExams');
                if (module.id === 'classExams') navigation.navigate('TeacherClassExams');
                if (module.id === 'omr') {
                  navigation.navigate('TeacherTabs', { screen: 'TeacherOMR' });
                }
                if (module.id === 'remarks') navigation.navigate('TeacherRemarks');
                if (module.id === 'questions') navigation.navigate('TeacherQuestions');
                if (module.id === 'stats') {
                  navigation.navigate('TeacherTabs', { screen: 'TeacherOMR' });
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
  section: {
    gap: appTheme.spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
});
