import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  BarChart2,
  Bell,
  BookOpen,
  FileText,
  HelpCircle,
  MessageSquare,
  ScanLine,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { teacherDashboardModules } from '../../api/mockData';
import { BottomNav } from '../../components/BottomNav';
import { DashboardModuleCard } from '../../components/DashboardModuleCard';
import { AppText } from '../../components/AppText';
import { PageHeader } from '../../components/PageHeader';
import { Screen } from '../../components/Screen';
import { useAppContent } from '../../hooks/useAppContent';
import { useAuth } from '../../store/auth-store';
import { appTheme } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';
import { teacherClasses, teacherExams, teacherRemarks } from '../../api/mockData';
import { getInitials } from '../../utils/string';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const moduleIcons = {
  classes: <BookOpen size={28} color={appTheme.palette.white} />,
  exams: <FileText size={28} color={appTheme.palette.white} />,
  omr: <ScanLine size={28} color={appTheme.palette.white} />,
  remarks: <MessageSquare size={28} color={appTheme.palette.white} />,
  questions: <HelpCircle size={28} color={appTheme.palette.white} />,
  stats: <BarChart2 size={28} color={appTheme.palette.white} />,
};

export function TeacherDashboardScreen() {
  const navigation = useNavigation<Nav>();
  const content = useAppContent();
  const { profileName } = useAuth();

  return (
    <Screen>
      <PageHeader
        overline={content.teacher.dashboard.greeting}
        title={profileName}
        subtitle={`${content.roles.TEACHER} • ${content.teacher.dashboard.subtitle}`}
        gradient={['#4F46E5', '#6D28D9', '#7C5CFC']}
        showNotificationButton
        onNotificationPress={() => navigation.navigate('SharedNotifications')}
        avatarLabel={getInitials(profileName)}
        metrics={[
          { label: content.teacher.dashboard.metrics.classes, value: String(teacherClasses.length) },
          { label: content.teacher.dashboard.metrics.exams, value: String(teacherExams.length) },
          { label: content.teacher.dashboard.metrics.remarks, value: String(teacherRemarks.length) },
        ]}
      />

      <View style={styles.section}>
        <AppText variant="caption" weight="semibold" color={appTheme.palette.mutedForeground}>
          {content.common.sections.functions.toUpperCase()}
        </AppText>
        <View style={styles.grid}>
          {teacherDashboardModules.map(module => (
            <DashboardModuleCard
              key={module.id}
              icon={moduleIcons[module.id as keyof typeof moduleIcons]}
              title={content.teacher.dashboard.modules[module.id as keyof typeof content.teacher.dashboard.modules]}
              subtitle={content.teacher.dashboard.moduleCounts[module.id as keyof typeof content.teacher.dashboard.moduleCounts]}
              colors={module.gradient}
              onPress={() => {
                if (module.id === 'classes') navigation.navigate('TeacherClasses');
                if (module.id === 'exams') navigation.navigate('TeacherExams');
                if (module.id === 'omr') navigation.navigate('TeacherOMR');
                if (module.id === 'remarks') navigation.navigate('TeacherRemarks');
                if (module.id === 'questions') navigation.navigate('TeacherQuestions');
                if (module.id === 'stats') navigation.navigate('TeacherOMR');
              }}
            />
          ))}
        </View>
      </View>

      <BottomNav role="TEACHER" currentScreen="TeacherDashboard" currentModule="home" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: appTheme.spacing.xl,
    paddingTop: appTheme.spacing.xl,
    gap: appTheme.spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: appTheme.spacing.md,
  },
});
