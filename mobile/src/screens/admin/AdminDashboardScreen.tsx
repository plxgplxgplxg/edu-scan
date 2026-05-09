import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  BarChart2,
  BookOpen,
  Settings,
  Users,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppText } from '../../components/AppText';
import { BottomNav } from '../../components/BottomNav';
import { DashboardModuleCard } from '../../components/DashboardModuleCard';
import { PageHeader } from '../../components/PageHeader';
import { Screen } from '../../components/Screen';
import { ErrorState, LoadingState } from '../../components/RequestState';
import { useAppContent } from '../../hooks/useAppContent';
import { useAuth } from '../../store/auth-store';
import { appTheme, palette } from '../../theme/tokens';
import { useResponsiveLayout } from '../../theme/responsive';
import type { RootStackParamList } from '../../navigation/types';
import { listClasses, listUsers } from '../../api/edu-scan';
import { useAsyncResource } from '../../hooks/useAsyncResource';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const adminDashboardModules = [
  { id: 'users', gradient: ['#5B5BD6', '#7C5CFC'] },
  { id: 'classes', gradient: ['#3B82F6', '#06B6D4'] },
  { id: 'stats', gradient: ['#10B981', '#14B8A6'] },
  { id: 'settings', gradient: ['#F59E0B', '#F97316'] },
] as const;

const moduleIcons = {
  users: <Users size={28} color={palette.white} />,
  classes: <BookOpen size={28} color={palette.white} />,
  stats: <BarChart2 size={28} color={palette.white} />,
  settings: <Settings size={28} color={palette.white} />,
};

export function AdminDashboardScreen() {
  const navigation = useNavigation<Nav>();
  const content = useAppContent();
  const layout = useResponsiveLayout();
  const { accessToken } = useAuth();
  const { data, loading, error, reload } = useAsyncResource(
    async () => {
      if (!accessToken) {
        return {
          teachers: 0,
          students: 0,
          classes: 0,
        };
      }

      const [users, classes] = await Promise.all([
        listUsers(accessToken),
        listClasses(accessToken),
      ]);

      return {
        teachers: users.filter((user) => user.role === 'TEACHER').length,
        students: users.filter((user) => user.role === 'STUDENT').length,
        classes: classes.length,
      };
    },
    [accessToken],
  );

  const metrics = data ?? {
    teachers: 0,
    students: 0,
    classes: 0,
  };

  return (
    <Screen>
      <PageHeader
        overline={content.admin.dashboard.title}
        title={content.meta.appName}
        subtitle={content.admin.dashboard.subtitle}
        gradient={['#4F46E5', '#6D28D9', '#7C5CFC']}
        showNotificationButton
        onNotificationPress={() => navigation.navigate('SharedNotifications')}
        metrics={[
          {
            label: content.admin.dashboard.metrics.teachers,
            value: String(metrics.teachers),
          },
          {
            label: content.admin.dashboard.metrics.students,
            value: String(metrics.students),
          },
          { label: content.admin.dashboard.metrics.classes, value: String(metrics.classes) },
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
          {content.common.sections.systemManagement.toUpperCase()}
        </AppText>
        <View style={[styles.grid, { gap: layout.gridGap, rowGap: layout.gridGap }]}>
          {adminDashboardModules.map(module => (
            <DashboardModuleCard
              key={module.id}
              icon={moduleIcons[module.id as keyof typeof moduleIcons]}
              title={content.admin.dashboard.modules[module.id as keyof typeof content.admin.dashboard.modules]}
              subtitle={
                module.id === 'users'
                  ? `${String(metrics.teachers + metrics.students)} người dùng`
                  : module.id === 'classes'
                    ? `${String(metrics.classes)} lớp đang hoạt động`
                    : content.admin.dashboard.moduleCounts[module.id as keyof typeof content.admin.dashboard.moduleCounts]
              }
              colors={module.gradient}
              onPress={() => {
                if (module.id === 'users') navigation.navigate('AdminUsers');
                if (module.id === 'classes') navigation.navigate('TeacherClasses');
                if (module.id === 'settings') navigation.navigate('SharedProfile');
                if (module.id === 'stats') navigation.navigate('AdminDashboard');
              }}
            />
          ))}
        </View>
        {loading ? <LoadingState label={content.common.labels.loading} /> : null}
        {error ? (
          <ErrorState
            message={error}
            retryLabel={content.common.buttons.confirm}
            onRetry={reload}
          />
        ) : null}
      </View>

      <BottomNav role="ADMIN" currentScreen="AdminDashboard" currentModule="home" />
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
