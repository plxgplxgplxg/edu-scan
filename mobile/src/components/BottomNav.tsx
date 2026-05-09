import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell,
  BookOpen,
  FileText,
  GraduationCap,
  HelpCircle,
  Home,
  MessageSquare,
  ScanLine,
  TrendingUp,
  User,
  Users,
  ClipboardList,
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
    exams: { labelKey: 'exams', icon: FileText, route: 'TeacherExams' },
    omr: { labelKey: 'omr', icon: ScanLine, route: 'TeacherOMR' },
    remarks: { labelKey: 'remarks', icon: MessageSquare, route: 'TeacherRemarks' },
    questions: { labelKey: 'questions', icon: HelpCircle, route: 'TeacherQuestions' },
    assignments: { labelKey: 'assignments', icon: ClipboardList, route: 'TeacherAssignments' },
  },
  STUDENT: {
    home: { labelKey: 'home', icon: Home, route: 'StudentDashboard' },
    classes: { labelKey: 'classes', icon: BookOpen, route: 'StudentClasses' },
    results: { labelKey: 'results', icon: GraduationCap, route: 'StudentResults' },
    assignments: { labelKey: 'assignments', icon: ClipboardList, route: 'StudentAssignments' },
    remarks: { labelKey: 'remarks', icon: MessageSquare, route: 'StudentRemarks' },
    progress: { labelKey: 'progress', icon: TrendingUp, route: 'StudentProgress' },
  },
  ADMIN: {
    home: { labelKey: 'home', icon: Home, route: 'AdminDashboard' },
    users: { labelKey: 'users', icon: Users, route: 'AdminUsers' },
    classes: { labelKey: 'classes', icon: BookOpen, route: 'TeacherClasses' },
  },
};

interface BottomNavProps {
  role: UserRole;
  currentModule?: ModuleKey;
  currentScreen: keyof RootStackParamList;
}

export function BottomNav({
  role,
  currentModule = 'home',
  currentScreen,
}: BottomNavProps) {
  const insets = useSafeAreaInsets();
  const layout = useResponsiveLayout();
  const navigation = useNavigation<Nav>();
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

  return (
    <View pointerEvents="box-none" style={styles.outer}>
      <View
        style={[
          styles.wrapper,
          {
            paddingBottom: 0,
            paddingHorizontal: 0,
          },
        ]}
      >
        <View
          style={[
            styles.inner,
            {
              minHeight: layout.navHeight,
              borderTopLeftRadius: layout.heroRadius + 2,
              borderTopRightRadius: layout.heroRadius + 2,
              maxWidth: '100%',
              paddingBottom: Math.max(insets.bottom, layout.bottomOffset) + appTheme.spacing.sm,
            },
          ]}
        >
          {tabs.map(tab => (
            <Pressable key={tab.key} onPress={() => navigation.navigate(tab.route)} style={styles.tab}>
              <View
                style={[
                  styles.iconWrap,
                  {
                    width: layout.isCompact ? 34 : 40,
                    height: layout.isCompact ? 28 : 30,
                    borderRadius: layout.heroRadius - 10,
                  },
                ]}
              >
                <tab.icon
                  size={layout.navIconSize}
                  strokeWidth={tab.active ? 2.4 : 2.1}
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
              {tab.active ? <View style={styles.dot} /> : null}
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  wrapper: {
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.92)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: appTheme.spacing.md,
    paddingHorizontal: appTheme.spacing.md,
    ...appTheme.shadows.floating,
  },
  tab: {
    alignItems: 'center',
    gap: 3,
    flex: 1,
    paddingTop: 2,
  },
  iconWrap: {
    width: 40,
    height: 32,
    borderRadius: appTheme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: appTheme.palette.primary,
  },
});
