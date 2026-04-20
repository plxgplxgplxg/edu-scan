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
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../store/auth-store';
import { appTheme } from '../theme/tokens';
import type { ModuleKey, UserRole } from '../types/app';
import type { RootStackParamList } from '../navigation/types';
import { AppText } from './AppText';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const roleModules: Record<UserRole, Record<string, { labelKey: string; icon: React.ReactNode; route: keyof RootStackParamList }>> = {
  TEACHER: {
    home: { labelKey: 'home', icon: <Home size={20} color={appTheme.palette.primary} />, route: 'TeacherDashboard' },
    classes: { labelKey: 'classes', icon: <BookOpen size={20} color={appTheme.palette.primary} />, route: 'TeacherClasses' },
    exams: { labelKey: 'exams', icon: <FileText size={20} color={appTheme.palette.primary} />, route: 'TeacherExams' },
    omr: { labelKey: 'omr', icon: <ScanLine size={20} color={appTheme.palette.primary} />, route: 'TeacherOMR' },
    remarks: { labelKey: 'remarks', icon: <MessageSquare size={20} color={appTheme.palette.primary} />, route: 'TeacherRemarks' },
    questions: { labelKey: 'questions', icon: <HelpCircle size={20} color={appTheme.palette.primary} />, route: 'TeacherQuestions' },
    assignments: { labelKey: 'assignments', icon: <ClipboardList size={20} color={appTheme.palette.primary} />, route: 'TeacherAssignments' },
  },
  STUDENT: {
    home: { labelKey: 'home', icon: <Home size={20} color={appTheme.palette.primary} />, route: 'StudentDashboard' },
    classes: { labelKey: 'classes', icon: <BookOpen size={20} color={appTheme.palette.primary} />, route: 'StudentClasses' },
    results: { labelKey: 'results', icon: <GraduationCap size={20} color={appTheme.palette.primary} />, route: 'StudentResults' },
    assignments: { labelKey: 'assignments', icon: <ClipboardList size={20} color={appTheme.palette.primary} />, route: 'StudentAssignments' },
    remarks: { labelKey: 'remarks', icon: <MessageSquare size={20} color={appTheme.palette.primary} />, route: 'StudentRemarks' },
    progress: { labelKey: 'progress', icon: <TrendingUp size={20} color={appTheme.palette.primary} />, route: 'StudentProgress' },
  },
  ADMIN: {
    home: { labelKey: 'home', icon: <Home size={20} color={appTheme.palette.primary} />, route: 'AdminDashboard' },
    users: { labelKey: 'users', icon: <Users size={20} color={appTheme.palette.primary} />, route: 'AdminUsers' },
    classes: { labelKey: 'classes', icon: <BookOpen size={20} color={appTheme.palette.primary} />, route: 'TeacherClasses' },
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
      icon: <Bell size={20} color={appTheme.palette.primary} />,
      route: 'SharedNotifications' as const,
      active: currentScreen === 'SharedNotifications',
    },
    {
      key: 'profile',
      label: content.common.labels.profile,
      icon: <User size={20} color={appTheme.palette.primary} />,
      route: 'SharedProfile' as const,
      active: currentScreen === 'SharedProfile',
    },
  ];

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {tabs.map(tab => (
        <Pressable
          key={tab.key}
          onPress={() => navigation.navigate(tab.route)}
          style={styles.tab}
        >
          <View style={[styles.iconWrap, tab.active ? styles.iconActive : null]}>
            {tab.icon}
          </View>
          <AppText
            variant="caption"
            color={tab.active ? appTheme.palette.primary : appTheme.palette.mutedForeground}
          >
            {tab.label}
          </AppText>
          {tab.active ? <View style={styles.dot} /> : null}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 0,
    borderTopLeftRadius: appTheme.radius.xl,
    borderTopRightRadius: appTheme.radius.xl,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: appTheme.spacing.md,
    ...appTheme.shadows.floating,
  },
  tab: {
    alignItems: 'center',
    gap: 4,
    minWidth: 88,
  },
  iconWrap: {
    width: 40,
    height: 32,
    borderRadius: appTheme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActive: {
    backgroundColor: '#EEF0FF',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 999,
    backgroundColor: appTheme.palette.primary,
  },
});
