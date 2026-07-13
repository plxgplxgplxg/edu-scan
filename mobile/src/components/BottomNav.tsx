import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell,
  BookOpen,
  Home,
  ScanLine,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../store/auth-store';
import { appTheme } from '../theme/tokens';
import { useResponsiveLayout } from '../theme/responsive';
import type { ModuleKey, UserRole } from '../types/app';
import type { RootStackParamList } from '../navigation/types';
import { AppText } from './AppText';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const roleModules: Record<UserRole, Record<string, { labelKey: string; icon: LucideIcon; route: keyof RootStackParamList }>> = {
  TEACHER: {
    home: { labelKey: 'home', icon: Home, route: 'TeacherDashboard' },
    classes: { labelKey: 'classes', icon: BookOpen, route: 'TeacherClasses' },
    omr: { labelKey: 'omr', icon: ScanLine, route: 'TeacherOMR' },
  },
  STUDENT: {
    home: { labelKey: 'home', icon: Home, route: 'StudentDashboard' },
    classes: { labelKey: 'classes', icon: BookOpen, route: 'StudentClasses' },
  },
  ADMIN: {
    home: { labelKey: 'home', icon: Home, route: 'AdminDashboard' },
    users: { labelKey: 'users', icon: Users, route: 'AdminUsers' },
  },
};

interface BottomNavProps {
  role: UserRole;
  currentModule?: ModuleKey;
  currentScreen: keyof RootStackParamList;
  navigation?: any;
}

export function BottomNav({
  role,
  currentModule = 'home',
  currentScreen,
  navigation: propNavigation,
}: BottomNavProps) {
  const insets = useSafeAreaInsets();
  const layout = useResponsiveLayout();
  const contextNavigation = useNavigation<Nav>();
  const navigation = propNavigation || contextNavigation;
  const { content } = useAuth();
  const module = roleModules[role][currentModule] ?? roleModules[role].home;

  const tabs = [
    {
      key: 'first',
      label: currentModule === 'home'
        ? content.common.labels.home
        : role === 'TEACHER'
          ? content.teacher.dashboard.modules[module.labelKey as keyof typeof content.teacher.dashboard.modules]
          : role === 'STUDENT'
            ? content.student.dashboard.modules[module.labelKey as keyof typeof content.student.dashboard.modules]
            : content.admin.dashboard.modules[module.labelKey as keyof typeof content.admin.dashboard.modules],
      icon: module.icon,
      route: module.route,
      active: currentScreen !== 'SharedNotifications' && currentScreen !== 'SharedProfile',
    },
    {
      key: 'notifications',
      label: content.common.labels.notifications,
      icon: Bell,
      route: 'SharedNotifications' as const,
      active: currentScreen === 'SharedNotifications',
    },
    {
      key: 'profile',
      label: content.common.labels.profile,
      icon: User,
      route: 'SharedProfile' as const,
      active: currentScreen === 'SharedProfile',
    },
  ];
  const activeIndex = Math.max(tabs.findIndex(tab => tab.active), 0);

  return (
    <View 
      pointerEvents="box-none" 
      style={[
        styles.outer, 
        { 
          left: layout.horizontalPadding, 
          right: layout.horizontalPadding, 
          bottom: Math.max(insets.bottom, 0) + 12 
        }
      ]}
    >
      <View
        style={[
          styles.inner,
          {
            minHeight: layout.navHeight,
            borderRadius: appTheme.radius.pill,
            backgroundColor: appTheme.palette.glassFill,
            borderColor: appTheme.palette.glassBorder,
          },
        ]}
      >
        {tabs.map((tab, index) => (
          <Pressable
            key={tab.key}
            onPress={() => navigation.navigate(tab.route as never)}
            style={[
              styles.tab,
              tab.active ? styles.tabActive : null,
              index === activeIndex ? styles.tabActiveLeading : null,
            ]}
          >
            <View
              style={[
                styles.iconWrap,
                tab.active ? { backgroundColor: appTheme.palette.primaryMuted } : null,
              ]}
            >
              <tab.icon
                size={layout.navIconSize}
                strokeWidth={tab.active ? 2.4 : 2.0}
                color={tab.active ? appTheme.palette.primary : appTheme.palette.mutedForeground}
              />
            </View>
            <AppText
              variant="caption"
              weight={tab.active ? 'semibold' : 'medium'}
              color={tab.active ? appTheme.palette.primary : appTheme.palette.mutedForeground}
              numberOfLines={1}
            >
              {tab.label}
            </AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
  },
  inner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderWidth: 1,
    ...appTheme.shadows.floating,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    flex: 1,
    minHeight: 52,
    borderRadius: appTheme.radius.pill,
  },
  tabActive: {
    backgroundColor: 'rgba(101,82,245,0.08)',
  },
  tabActiveLeading: {
    marginLeft: 0,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18, // squircle radius will be rounded, but 18 is perfect for 36
    alignItems: 'center',
    justifyContent: 'center',
  },
});
