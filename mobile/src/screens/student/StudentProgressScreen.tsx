import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Award, Target, TrendingUp } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { progressPoints } from '../../api/mockData';
import { AppText } from '../../components/AppText';
import { BottomNav } from '../../components/BottomNav';
import { PageHeader } from '../../components/PageHeader';
import { Screen } from '../../components/Screen';
import { SimpleLineChart } from '../../components/SimpleLineChart';
import { SurfaceCard } from '../../components/SurfaceCard';
import { useAppContent } from '../../hooks/useAppContent';
import { appTheme, palette } from '../../theme/tokens';
import { useResponsiveLayout } from '../../theme/responsive';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function StudentProgressScreen() {
  const navigation = useNavigation<Nav>();
  const content = useAppContent();
  const layout = useResponsiveLayout();

  const summaryCards = [
    {
      key: 'average',
      icon: <TrendingUp size={18} color={palette.primary} />,
      label: content.student.progress.summaryAverage,
      value: '7.8',
      backgroundColor: '#EEF0FF',
    },
    {
      key: 'highest',
      icon: <Award size={18} color={palette.success} />,
      label: content.student.progress.summaryHighest,
      value: '9.0',
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
    <Screen>
      <PageHeader
        backLabel={content.common.buttons.backToHome}
        title={content.student.progress.title}
        subtitle={content.student.progress.subtitle}
        gradient={['#4F46E5', '#7C5CFC']}
        onBack={() => navigation.navigate('StudentDashboard')}
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

      <BottomNav role="STUDENT" currentScreen="StudentProgress" currentModule="progress" />
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
