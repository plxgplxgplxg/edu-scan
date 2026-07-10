import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Award, Target, TrendingUp } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { listStudentProgress, mapProgressPoint } from '../../api/edu-scan';
import { AppText } from '../../components/AppText';
import { PageHeader } from '../../components/PageHeader';
import { ErrorState, LoadingState } from '../../components/RequestState';
import { Screen } from '../../components/Screen';
import { SimpleLineChart } from '../../components/SimpleLineChart';
import { SurfaceCard } from '../../components/SurfaceCard';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { useAppContent } from '../../hooks/useAppContent';
import { useAuth } from '../../store/auth-store';
import { appTheme, palette } from '../../theme/tokens';
import { useResponsiveLayout } from '../../theme/responsive';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function StudentProgressScreen() {
  const navigation = useNavigation<Nav>();
  const content = useAppContent();
  const { accessToken } = useAuth();
  const layout = useResponsiveLayout();
  const { data, loading, error, reload } = useAsyncResource(
    async () => {
      if (!accessToken) {
        return [];
      }

      const progress = await listStudentProgress(accessToken);
      return progress.map(mapProgressPoint);
    },
    [accessToken],
  );
  const progressPoints = data ?? [];
  const scores = progressPoints.map((point) => point.score);
  const averageScore = scores.reduce((sum, score) => sum + score, 0) / Math.max(scores.length, 1);
  const highestScore = scores.length ? Math.max(...scores) : 0;

  const summaryCards = [
    {
      key: 'average',
      icon: <TrendingUp size={18} color={palette.primary} />,
      label: content.student.progress.summaryAverage,
      value: averageScore.toFixed(1),
      backgroundColor: '#EEF0FF',
    },
    {
      key: 'highest',
      icon: <Award size={18} color={palette.success} />,
      label: content.student.progress.summaryHighest,
      value: highestScore.toFixed(1),
      backgroundColor: '#ECFDF5',
    },
    {
      key: 'goal',
      icon: <Target size={18} color={palette.warning} />,
      label: content.student.progress.summaryGoal,
      value: '8.5',
      backgroundColor: '#FEF3C7',
    },
  ];

  return (
    <Screen refreshing={loading} onRefresh={() => { void reload(); }}>
      <PageHeader
        backLabel={content.common.buttons.backToHome}
        title={content.student.progress.title}
        subtitle={content.student.progress.subtitle}
        gradient={['#4F46E5', '#7C5CFC']}
        onBack={() =>
          navigation.navigate('StudentTabs', { screen: 'StudentDashboard' })
        }
      />

      <View
        style={[
          styles.summaryRow,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingTop: layout.sectionGap,
            maxWidth: layout.contentMaxWidth,
            alignSelf: 'center',
            width: '100%',
            flexWrap: 'wrap',
          },
        ]}
      >
        {loading ? <LoadingState label={content.common.labels.loading} /> : null}
        {error ? (
          <ErrorState
            message={error}
            retryLabel={content.common.buttons.retry}
            onRetry={reload}
          />
        ) : null}
        {summaryCards.map(card => (
          <SurfaceCard key={card.key} style={[styles.summaryCard, { backgroundColor: card.backgroundColor }]}>
            {card.icon}
            <AppText variant="headline" weight="bold">
              {card.value}
            </AppText>
            <AppText variant="caption" color={palette.mutedForeground}>
              {card.label}
            </AppText>
          </SurfaceCard>
        ))}
      </View>

      <View
        style={[
          styles.body,
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
        <SurfaceCard style={styles.chartCard}>
          <AppText variant="body" weight="medium">
            {content.common.sections.trend}
          </AppText>
          <SimpleLineChart values={progressPoints.map(point => point.score)} />
        </SurfaceCard>

        <AppText variant="headline" weight="semibold">
          {content.common.sections.scoreHistory}
        </AppText>
        {progressPoints.map(point => (
          <SurfaceCard key={point.examTitle} style={styles.historyCard}>
            <View style={styles.flex}>
              <AppText variant="body" weight="medium">
                {point.examTitle}
              </AppText>
              <AppText variant="caption" color={palette.mutedForeground}>
                {point.date}
              </AppText>
            </View>
            <View style={styles.scoreValue}>
              <AppText variant="body" weight="bold" color={point.score >= 5 ? palette.primary : palette.destructive}>
                {`${String(point.score)}/10`}
              </AppText>
            </View>
          </SurfaceCard>
        ))}
      </View>

    </Screen>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    gap: appTheme.spacing.sm,
  },
  summaryCard: {
    flex: 1,
    minWidth: 140,
    alignItems: 'center',
    gap: 4,
    borderWidth: 0,
  },
  body: {
    gap: appTheme.spacing.lg,
  },
  chartCard: {
    gap: appTheme.spacing.md,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: appTheme.spacing.md,
  },
  flex: {
    flex: 1,
    gap: 4,
  },
  scoreValue: {
    alignItems: 'flex-end',
  },
});
