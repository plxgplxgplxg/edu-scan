import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ArrowLeft, Award, TrendingUp } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { studentResults } from '../../api/mockData';
import { AppText } from '../../components/AppText';
import { BottomNav } from '../../components/BottomNav';
import { PageHeader } from '../../components/PageHeader';
import { ScoreRing } from '../../components/ScoreRing';
import { Screen } from '../../components/Screen';
import { StatusBadge } from '../../components/StatusBadge';
import { SurfaceCard } from '../../components/SurfaceCard';
import { useAppContent } from '../../hooks/useAppContent';
import { appTheme, palette } from '../../theme/tokens';
import { formatVietnameseDate } from '../../utils/format';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function StudentResultsScreen() {
  const navigation = useNavigation<Nav>();
  const content = useAppContent();
  const graded = studentResults.filter(item => item.status === 'GRADED');
  const avg =
    graded.reduce((sum, item) => sum + item.score, 0) / Math.max(graded.length, 1);
  const maxScore = Math.max(...graded.map(item => item.score));

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable style={styles.backRow} onPress={() => navigation.navigate('StudentDashboard')}>
          <ArrowLeft size={16} color={palette.mutedForeground} />
          <AppText variant="label" color={palette.mutedForeground}>
            {content.common.buttons.backToHome}
          </AppText>
        </Pressable>
        <View style={styles.titleRow}>
          <AppText variant="title" weight="bold">
            {content.student.results.title}
          </AppText>
          <Pressable style={styles.iconButton} onPress={() => navigation.navigate('StudentProgress')}>
            <TrendingUp size={20} color={palette.white} />
          </Pressable>
        </View>
        <SurfaceCard style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Award size={26} color={palette.white} />
          </View>
          <View style={styles.summaryMetrics}>
            <View style={styles.metricItem}>
              <AppText variant="headline" weight="bold" color={palette.white}>
                {String(studentResults.length)}
              </AppText>
              <AppText variant="caption" color="rgba(255,255,255,0.72)">
                {content.student.results.totalExams}
              </AppText>
            </View>
            <View style={styles.metricItem}>
              <AppText variant="headline" weight="bold" color={palette.white}>
                {avg.toFixed(1)}
              </AppText>
              <AppText variant="caption" color="rgba(255,255,255,0.72)">
                {content.student.results.average}
              </AppText>
            </View>
            <View style={styles.metricItem}>
              <AppText variant="headline" weight="bold" color={palette.white}>
                {maxScore.toFixed(1)}
              </AppText>
              <AppText variant="caption" color="rgba(255,255,255,0.72)">
                {content.student.results.highest}
              </AppText>
            </View>
          </View>
        </SurfaceCard>
      </View>

      <View style={styles.list}>
        {studentResults.map(item => (
          <Pressable
            key={item.id}
            onPress={() => navigation.navigate('StudentResultDetail', { resultId: item.id })}
          >
            <SurfaceCard style={styles.rowCard}>
              <ScoreRing score={item.score} maxScore={item.maxScore} />
              <View style={styles.flex}>
                <View style={styles.resultHead}>
                  <AppText variant="body" weight="medium">
                    {item.examTitle}
                  </AppText>
                  <StatusBadge status={item.status} />
                </View>
                <AppText variant="caption" color={palette.mutedForeground}>
                  {`${String(item.totalCorrect)}/${String(item.totalQuestions)} • ${formatVietnameseDate(item.createdAt)}`}
                </AppText>
              </View>
            </SurfaceCard>
          </Pressable>
        ))}
      </View>

      <BottomNav role="STUDENT" currentScreen="StudentResults" currentModule="results" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: appTheme.spacing.xl,
    paddingTop: 56,
    gap: appTheme.spacing.md,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: appTheme.radius.md,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    backgroundColor: palette.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.spacing.lg,
  },
  summaryIcon: {
    width: 56,
    height: 56,
    borderRadius: appTheme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  summaryMetrics: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    alignItems: 'center',
    gap: 2,
  },
  list: {
    paddingHorizontal: appTheme.spacing.xl,
    paddingTop: appTheme.spacing.lg,
    gap: appTheme.spacing.md,
  },
  rowCard: {
    flexDirection: 'row',
    gap: appTheme.spacing.md,
    alignItems: 'center',
  },
  flex: {
    flex: 1,
    gap: 6,
  },
  resultHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: appTheme.spacing.md,
  },
});
