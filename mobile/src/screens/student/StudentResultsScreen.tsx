import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { listStudentSubmissions, mapResultSummary } from '../../api/edu-scan';
import { AppText } from '../../components/AppText';
import { PageHeader } from '../../components/PageHeader';
import { ErrorState, LoadingState } from '../../components/RequestState';
import { ScoreRing } from '../../components/ScoreRing';
import { Screen } from '../../components/Screen';
import { StatusBadge } from '../../components/StatusBadge';
import { SurfaceCard } from '../../components/SurfaceCard';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { useAppContent } from '../../hooks/useAppContent';
import { useAuth } from '../../store/auth-store';
import { appTheme, palette } from '../../theme/tokens';
import { useResponsiveLayout } from '../../theme/responsive';
import { formatVietnameseDate } from '../../utils/format';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function StudentResultsScreen() {
  const navigation = useNavigation<Nav>();
  const content = useAppContent();
  const { accessToken } = useAuth();
  const layout = useResponsiveLayout();
  const { data, loading, error, reload } = useAsyncResource(
    async () => {
      if (!accessToken) {
        return [];
      }

      const submissions = await listStudentSubmissions(accessToken);
      return submissions.items.map(mapResultSummary);
    },
    [accessToken],
  );
  const studentResults = data ?? [];
  const graded = studentResults.filter(item => item.status === 'GRADED');
  const avg =
    graded.reduce((sum, item) => sum + item.score, 0) / Math.max(graded.length, 1);
  const maxScore = graded.length ? Math.max(...graded.map(item => item.score)) : 0;

  return (
    <Screen>
      <PageHeader
        backLabel={content.common.buttons.backToHome}
        title={content.student.results.title}
        subtitle={content.student.results.totalExams}
        gradient={['#4F46E5', '#7C5CFC']}
        onBack={() =>
          navigation.navigate('StudentTabs', { screen: 'StudentDashboard' })
        }
        footer={(
          <View style={[styles.summaryMetrics, layout.isCompact ? styles.summaryMetricsStack : null]}>
            <View style={styles.metricItem}>
              <AppText variant="headline" weight="bold" color={palette.white}>
                {String(studentResults.length)}
              </AppText>
              <AppText variant="label" color="rgba(255,255,255,0.72)">
                {content.student.results.totalExams}
              </AppText>
            </View>
            <View style={styles.metricItem}>
              <AppText variant="headline" weight="bold" color={palette.white}>
                {avg.toFixed(1)}
              </AppText>
              <AppText variant="label" color="rgba(255,255,255,0.72)">
                {content.student.results.average}
              </AppText>
            </View>
            <View style={styles.metricItem}>
              <AppText variant="headline" weight="bold" color={palette.white}>
                {maxScore.toFixed(1)}
              </AppText>
              <AppText variant="label" color="rgba(255,255,255,0.72)">
                {content.student.results.highest}
              </AppText>
            </View>
          </View>
        )}
      />

      <View
        style={[
          styles.list,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingTop: layout.sectionGap,
            maxWidth: layout.contentMaxWidth,
            alignSelf: 'center',
            width: '100%',
            gap: layout.sectionGap,
          },
        ]}
      >
        {loading ? <LoadingState label={content.common.labels.loading} /> : null}
        {error ? (
          <ErrorState
            message={error}
            retryLabel={content.common.buttons.confirm}
            onRetry={reload}
          />
        ) : null}
        {studentResults.map(item => (
          <Pressable
            key={item.id}
            onPress={() => navigation.navigate('StudentResultDetail', { resultId: item.id })}
          >
            <SurfaceCard style={styles.rowCard}>
              <ScoreRing score={item.score} maxScore={item.maxScore} />
              <View style={styles.flex}>
                <View style={[styles.resultHead, layout.isCompact ? styles.resultHeadStack : null]}>
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

    </Screen>
  );
}

const styles = StyleSheet.create({
  summaryMetrics: {
    flexDirection: 'row',
    gap: appTheme.spacing.md,
  },
  summaryMetricsStack: {
    flexWrap: 'wrap',
  },
  metricItem: {
    alignItems: 'center',
    gap: 2,
    flex: 1,
    minWidth: 84,
  },
  list: {
    gap: appTheme.spacing.lg,
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
    gap: appTheme.spacing.md,
  },
  resultHeadStack: {
    flexWrap: 'wrap',
  },
});
