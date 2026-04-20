import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Bell,
  BookOpen,
  ClipboardList,
  GraduationCap,
  MessageSquare,
  TrendingUp,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { studentDashboardModules } from '../../api/mockData';
import { AppText } from '../../components/AppText';
import { BottomNav } from '../../components/BottomNav';
import { DashboardModuleCard } from '../../components/DashboardModuleCard';
import { PageHeader } from '../../components/PageHeader';
import { Screen } from '../../components/Screen';
import { useAppContent } from '../../hooks/useAppContent';
import { useAuth } from '../../store/auth-store';
import { appTheme, palette } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';
import { studentResults } from '../../api/mockData';
import { getInitials } from '../../utils/string';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const moduleIcons = {
  classes: <BookOpen size={28} color={palette.white} />,
  results: <GraduationCap size={28} color={palette.white} />,
  assignments: <ClipboardList size={28} color={palette.white} />,
  remarks: <MessageSquare size={28} color={palette.white} />,
  progress: <TrendingUp size={28} color={palette.white} />,
};

export function StudentDashboardScreen() {
  const navigation = useNavigation<Nav>();
  const content = useAppContent();
  const { profileName } = useAuth();
  const gradedResults = studentResults.filter(item => item.status === 'GRADED');
  const averageScore =
    gradedResults.reduce((sum, item) => sum + item.score, 0) / Math.max(gradedResults.length, 1);

  return (
    <Screen>
      <PageHeader
        overline={content.student.dashboard.greeting}
        title={profileName}
        subtitle={`${content.roles.STUDENT} • ${content.student.dashboard.subtitle}`}
        gradient={['#4F46E5', '#6D28D9', '#7C5CFC']}
        showNotificationButton
        onNotificationPress={() => navigation.navigate('SharedNotifications')}
        avatarLabel={getInitials(profileName)}
        metrics={[
          { label: content.student.dashboard.metrics.average, value: averageScore.toFixed(1) },
          { label: content.student.dashboard.metrics.exams, value: String(studentResults.length) },
          { label: content.student.dashboard.metrics.rank, value: content.shared.profile.studentRank },
        ]}
      />

      <View style={styles.section}>
        <AppText variant="caption" weight="semibold" color={palette.mutedForeground}>
          {content.common.sections.functions.toUpperCase()}
        </AppText>
        <View style={styles.grid}>
          {studentDashboardModules.map(module => (
            <DashboardModuleCard
              key={module.id}
              icon={moduleIcons[module.id as keyof typeof moduleIcons]}
              title={content.student.dashboard.modules[module.id as keyof typeof content.student.dashboard.modules]}
              subtitle={content.student.dashboard.moduleCounts[module.id as keyof typeof content.student.dashboard.moduleCounts]}
              colors={module.gradient}
              onPress={() => {
                if (module.id === 'classes') navigation.navigate('StudentClasses');
                if (module.id === 'results') navigation.navigate('StudentResults');
                if (module.id === 'assignments') navigation.navigate('StudentAssignments');
                if (module.id === 'remarks') navigation.navigate('StudentRemarks');
                if (module.id === 'progress') navigation.navigate('StudentProgress');
              }}
            />
          ))}
        </View>
      </View>

      <BottomNav role="STUDENT" currentScreen="StudentDashboard" currentModule="home" />
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
