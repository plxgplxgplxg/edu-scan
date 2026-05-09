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

import { adminDashboardModules } from '../../api/mockData';
import { AppText } from '../../components/AppText';
import { BottomNav } from '../../components/BottomNav';
import { DashboardModuleCard } from '../../components/DashboardModuleCard';
import { PageHeader } from '../../components/PageHeader';
import { Screen } from '../../components/Screen';
import { useAppContent } from '../../hooks/useAppContent';
import { appTheme, palette } from '../../theme/tokens';
import { useResponsiveLayout } from '../../theme/responsive';
import type { RootStackParamList } from '../../navigation/types';
import { adminUsers, teacherClasses } from '../../api/mockData';

type Nav = NativeStackNavigationProp<RootStackParamList>;

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
            value: String(adminUsers.filter(user => user.role === 'TEACHER').length),
          },
          {
            label: content.admin.dashboard.metrics.students,
            value: String(adminUsers.filter(user => user.role === 'STUDENT').length),
          },
          { label: content.admin.dashboard.metrics.classes, value: String(teacherClasses.length) },
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
              subtitle={content.admin.dashboard.moduleCounts[module.id as keyof typeof content.admin.dashboard.moduleCounts]}
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
