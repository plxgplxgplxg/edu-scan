import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AlertTriangle, ArrowLeft, CheckCircle, XCircle } from 'lucide-react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { getSubmissionDetail, mapResultDetail, mapResultSummary } from '../../api/edu-scan';
import { AppText } from '../../components/AppText';
import { ErrorState, LoadingState } from '../../components/RequestState';
import { Screen } from '../../components/Screen';
import { SurfaceCard } from '../../components/SurfaceCard';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { useAppContent } from '../../hooks/useAppContent';
import { useAuth } from '../../store/auth-store';
import { appTheme, palette } from '../../theme/tokens';
import { useResponsiveLayout } from '../../theme/responsive';
import type { RootStackParamList } from '../../navigation/types';
import { formatVietnameseDate } from '../../utils/format';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function StudentResultDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'StudentResultDetail'>>();
  const content = useAppContent();
  const { accessToken } = useAuth();
  const layout = useResponsiveLayout();
  const resultId = route.params?.resultId;
  const { data, loading, error, reload } = useAsyncResource(
    async () => {
      if (!accessToken || !resultId) {
        return null;
      }

      const detail = await getSubmissionDetail(accessToken, resultId);
      const result = mapResultSummary({
        id: detail.id,
        examId: detail.examId,
        examTitle: detail.exam.title,
        status: detail.status,
        createdAt: detail.createdAt,
        reviewedAt: null,
        score: detail.score.calculatedScore,
        maxScore: detail.score.maxScore,
        totalCorrect: detail.score.totalCorrect,
        totalQuestions: detail.details.length,
        needsReview: detail.details.some((item) => item.needsReview),
        reviewNote: null,
      });

      return {
        selectedResult: result,
        resultDetails: mapResultDetail(detail),
      };
    },
    [accessToken, resultId],
  );

  if (!data && loading) {
    return (
      <Screen>
        <LoadingState label={content.common.labels.loading} />
      </Screen>
    );
  }

  if (!data && error) {
    return (
      <Screen>
        <ErrorState
          message={error}
          retryLabel={content.common.buttons.confirm}
          onRetry={reload}
        />
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen>
        <ErrorState
          message="Không tìm thấy kết quả"
          retryLabel={content.common.buttons.back}
          onRetry={() => navigation.goBack()}
        />
      </Screen>
    );
  }

  const { selectedResult, resultDetails } = data;
  const correctCount = resultDetails.filter(item => item.isCorrect).length;
  const reviewCount = resultDetails.filter(item => item.needsReview).length;

  return (
    <Screen>
      <View
        style={[
          styles.hero,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingTop: layout.sectionGap,
            paddingBottom: layout.sectionGap + appTheme.spacing.xl,
            borderBottomLeftRadius: layout.heroRadius,
            borderBottomRightRadius: layout.heroRadius,
          },
        ]}
      >
        <Pressable style={styles.backRow} onPress={() => navigation.goBack()}>
          <ArrowLeft size={18} color={palette.white} />
          <AppText variant="label" color={palette.white}>
            {content.common.buttons.back}
          </AppText>
        </Pressable>
        <AppText variant="headline" weight="bold" color={palette.white}>
          {selectedResult.examTitle}
        </AppText>
        <AppText variant="label" color="rgba(255,255,255,0.72)">
          {`${content.student.results.resultCodePrefix}: ${selectedResult.id} • ${formatVietnameseDate(selectedResult.createdAt)}`}
        </AppText>
        <View style={styles.scoreRow}>
          <AppText variant="hero" weight="heavy" color={palette.white}>
            {String(selectedResult.score)}
          </AppText>
          <AppText variant="title" color="rgba(255,255,255,0.65)">
            {`/${String(selectedResult.maxScore)}`}
          </AppText>
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.summaryBadge}>
            <CheckCircle size={13} color="#A7F3D0" />
            <AppText variant="caption" color={palette.white}>
              {`${String(correctCount)}/${String(resultDetails.length)} ${content.student.results.totalExams.toLowerCase()}`}
            </AppText>
          </View>
          {reviewCount ? (
            <View style={[styles.summaryBadge, styles.warningBadge]}>
              <AlertTriangle size={13} color="#FDE68A" />
              <AppText variant="caption" color="#FEF3C7">
                {`${String(reviewCount)} ${content.common.statuses.NEEDS_REVIEW.toLowerCase()}`}
              </AppText>
            </View>
          ) : null}
        </View>
      </View>

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
        <AppText variant="headline" weight="semibold">
          {content.common.sections.resultDetails}
        </AppText>
        {resultDetails.map(item => (
          <SurfaceCard
            key={item.questionNumber}
            style={[styles.card, item.needsReview ? styles.warningBorder : null]}
          >
            <View style={[styles.indexBox, item.isCorrect ? styles.correctBox : styles.wrongBox]}>
              <AppText
                variant="label"
                weight="bold"
                color={item.isCorrect ? palette.success : palette.destructive}
              >
                {String(item.questionNumber)}
              </AppText>
            </View>
            <View style={styles.flex}>
              <View style={styles.inlineRow}>
                {item.isCorrect ? (
                  <CheckCircle size={14} color={palette.success} />
                ) : (
                  <XCircle size={14} color={palette.destructive} />
                )}
                <AppText variant="body" color={item.isCorrect ? palette.success : palette.destructive}>
                  {item.finalAnswer ?? '—'}
                </AppText>
                {!item.isCorrect ? (
                  <AppText variant="caption" color={palette.mutedForeground}>
                    {`→ ${item.correctAnswer ?? '—'}`}
                  </AppText>
                ) : null}
              </View>
              {item.needsReview ? (
                <AppText variant="caption" color={palette.warning}>
                  {item.reviewReason ?? ''}
                </AppText>
              ) : null}
            </View>
            {item.needsReview ? (
              <Pressable
                style={styles.remarkButton}
                onPress={() =>
                  navigation.navigate('StudentRemarks', {
                    resultId: selectedResult.id,
                    questionNumber: item.questionNumber,
                  })
                }
              >
                <AppText variant="caption" weight="medium" color={palette.warning}>
                  {content.student.results.remarkAction}
                </AppText>
              </Pressable>
            ) : null}
          </SurfaceCard>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: palette.primary,
    gap: appTheme.spacing.sm,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: appTheme.spacing.sm,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    marginTop: appTheme.spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: appTheme.spacing.sm,
    marginTop: appTheme.spacing.md,
    flexWrap: 'wrap',
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  warningBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  list: {
    gap: appTheme.spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.spacing.md,
  },
  warningBorder: {
    borderLeftWidth: 4,
    borderLeftColor: palette.warning,
  },
  indexBox: {
    width: 34,
    height: 34,
    borderRadius: appTheme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  correctBox: {
    backgroundColor: '#DCFCE7',
  },
  wrongBox: {
    backgroundColor: '#FEE2E2',
  },
  flex: {
    flex: 1,
    gap: 4,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  remarkButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: appTheme.radius.sm,
    backgroundColor: '#FEF3C7',
  },
});
