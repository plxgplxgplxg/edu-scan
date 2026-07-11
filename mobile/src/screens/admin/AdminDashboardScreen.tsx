/* eslint-disable react/no-unstable-nested-components, no-void, react-native/no-inline-styles */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  BarChart2,
  Users,
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
import { adminHeroGradient } from '../../theme/header';
import type { RootStackParamList } from '../../navigation/types';
import { listClasses, listUsers } from '../../api/edu-scan';
import { useAsyncResource } from '../../hooks/useAsyncResource';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const adminDashboardModules = [
  { id: 'users', gradient: ['#6552F5', '#8B5CF6'], isLarge: true },
  { id: 'stats', gradient: ['#12B886', '#00D4B4'], isLarge: false },
] as const;

const moduleIcons = {
  users: <Users size={24} color={palette.white} />,
  stats: <BarChart2 size={24} color={palette.white} />,
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
    <Screen refreshing={loading} onRefresh={() => { void reload(); }}>
      <PageHeader
        overline={content.admin.dashboard.title}
        title={content.meta.appName}
        subtitle={content.admin.dashboard.subtitle}
        gradient={adminHeroGradient}
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
              isLarge={module.isLarge}
              title={content.admin.dashboard.modules[module.id as keyof typeof content.admin.dashboard.modules]}
              subtitle={
                module.id === 'users'
                  ? `${String(metrics.teachers + metrics.students)} người dùng`
                  : `${String(metrics.classes)} lớp trong thống kê`
              }
              colors={module.gradient}
              onPress={() => {
                if (module.id === 'users') {
                  navigation.navigate('AdminTabs', { screen: 'AdminUsers' });
                }
                if (module.id === 'stats') {
                  navigation.navigate('AdminStatistics');
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
