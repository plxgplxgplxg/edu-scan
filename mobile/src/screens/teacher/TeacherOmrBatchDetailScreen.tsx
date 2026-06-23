import React, { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ImageIcon,
  UserRoundSearch,
  XCircle,
} from 'lucide-react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  getOmrBatchDetail,
  updateSubmissionOverride,
  type OmrSubmissionDetailView,
} from '../../api/edu-scan';
import { AppText } from '../../components/AppText';
import { EmptyState } from '../../components/EmptyState';
import { FilterChips } from '../../components/FilterChips';
import { ModalSheet } from '../../components/ModalSheet';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ErrorState, LoadingState } from '../../components/RequestState';
import { Screen } from '../../components/Screen';
import { StatusBadge } from '../../components/StatusBadge';
import { SurfaceCard } from '../../components/SurfaceCard';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { useAppContent } from '../../hooks/useAppContent';
import type { RootStackParamList } from '../../navigation/types';
import { useAuth } from '../../store/auth-store';
import { appTheme, palette } from '../../theme/tokens';
import { useResponsiveLayout } from '../../theme/responsive';
import { formatVietnameseDate } from '../../utils/format';
import { useToast } from '../../app/ToastProvider';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type FilterKey = 'ALL' | 'NEEDS_REVIEW' | 'GRADED' | 'FAILED';

const answerChoices = ['A', 'B', 'C', 'D'] as const;

type AnswerChoice = (typeof answerChoices)[number];

export function TeacherOmrBatchDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'TeacherOmrBatchDetail'>>();
  const content = useAppContent();
  const { accessToken } = useAuth();
  const layout = useResponsiveLayout();
  const { showToast } = useToast();
  const batchId = route.params?.batchId;
  const [filter, setFilter] = useState<FilterKey>('ALL');
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [studentCode, setStudentCode] = useState('');
  const [resolvedTestCode, setResolvedTestCode] = useState('');
  const [answerDraft, setAnswerDraft] = useState<Record<number, AnswerChoice>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data, loading, error, reload } = useAsyncResource(
    async () => {
      if (!accessToken || !batchId) {
        return null;
      }

      return getOmrBatchDetail(accessToken, batchId);
    },
    [accessToken, batchId],
  );

  const submissions = useMemo(() => data?.submissions ?? [], [data?.submissions]);
  const filteredSubmissions = useMemo(
    () =>
      submissions.filter((item) => filter === 'ALL' || item.status === filter),
    [filter, submissions],
  );

  const selectedSubmission = submissions.find((item) => item.id === selectedSubmissionId) ?? null;
  const selectedImageUrl =
    selectedSubmission?.annotatedImageUrl
    || selectedSubmission?.processedImageUrl
    || selectedSubmission?.imageUrl
    || null;

  const openSubmission = (submission: OmrSubmissionDetailView) => {
    setSelectedSubmissionId(submission.id);
    setStudentCode(submission.studentCode ?? '');
    setResolvedTestCode(submission.resolvedTestCode ?? submission.detectedTestId ?? '');
    setAnswerDraft(
      Object.fromEntries(
        submission.details
          .filter((detail) => detail.finalAnswer)
          .map((detail) => [detail.questionNumber, detail.finalAnswer as AnswerChoice]),
      ),
    );
    setSubmitError(null);
  };

  if (!batchId) {
    return (
      <Screen>
        <ErrorState
          message="Không tìm thấy batch OMR"
          retryLabel={content.common.buttons.back}
          onRetry={() => navigation.goBack()}
        />
      </Screen>
    );
  }

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
          message="Không có dữ liệu batch"
          retryLabel={content.common.buttons.back}
          onRetry={() => navigation.goBack()}
        />
      </Screen>
    );
  }

  const reviewCount = submissions.filter((item) => item.status === 'NEEDS_REVIEW').length;

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
          {data.examTitle}
        </AppText>
        <AppText variant="label" color="rgba(255,255,255,0.76)">
          {formatVietnameseDate(data.createdAt)}
        </AppText>
        <View style={[styles.metricsRow, layout.isCompact ? styles.metricsRowWrap : null]}>
          <View style={styles.metricPill}>
            <AppText variant="headline" weight="bold" color={palette.white}>
              {String(data.successCount)}
            </AppText>
            <AppText variant="caption" color="rgba(255,255,255,0.76)">
              Thành công
            </AppText>
          </View>
          <View style={styles.metricPill}>
            <AppText variant="headline" weight="bold" color={palette.white}>
              {String(reviewCount)}
            </AppText>
            <AppText variant="caption" color="rgba(255,255,255,0.76)">
              Cần review
            </AppText>
          </View>
          <View style={styles.metricPill}>
            <AppText variant="headline" weight="bold" color={palette.white}>
              {`${String(data.progressPercentage)}%`}
            </AppText>
            <AppText variant="caption" color="rgba(255,255,255,0.76)">
              Tiến độ
            </AppText>
          </View>
        </View>
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
        <FilterChips
          value={filter}
          items={[
            { id: 'ALL', label: content.common.labels.all },
            { id: 'NEEDS_REVIEW', label: content.common.statuses.NEEDS_REVIEW, count: reviewCount },
            { id: 'GRADED', label: content.common.statuses.GRADED },
            { id: 'FAILED', label: content.common.statuses.FAILED, count: data.failedCount },
          ]}
          onChange={setFilter}
        />

        {filteredSubmissions.length ? null : (
          <EmptyState
            title="Không có bài làm phù hợp bộ lọc"
            icon={<UserRoundSearch size={34} color={palette.mutedForeground} />}
          />
        )}

        {filteredSubmissions.map((submission) => (
          <Pressable
            key={submission.id}
            onPress={() => openSubmission(submission)}
          >
            <SurfaceCard
              style={[
                styles.submissionCard,
                submission.status === 'NEEDS_REVIEW' ? styles.reviewCard : null,
                submission.status === 'FAILED' ? styles.failedCard : null,
              ]}
            >
              <View style={styles.rowBetween}>
                <View style={styles.flex}>
                  <AppText variant="body" weight="medium">
                    {submission.studentName || submission.studentCode || 'Chưa ghép học sinh'}
                  </AppText>
                  <AppText variant="caption" color={palette.mutedForeground}>
                    {[
                      submission.studentCode || 'Không có mã HS',
                      submission.resolvedTestCode || submission.detectedTestId || 'Chưa rõ mã đề',
                    ].join(' • ')}
                  </AppText>
                </View>
                <StatusBadge status={submission.status} />
              </View>
              <View style={styles.inlineMeta}>
                <AppText variant="caption" color={palette.mutedForeground}>
                  {`${submission.correctCount}/${submission.details.length} đúng`}
                </AppText>
                <AppText variant="caption" color={palette.mutedForeground}>
                  {`${submission.score}/${submission.maxScore} điểm`}
                </AppText>
              </View>
              {submission.reviewCount ? (
                <View style={styles.reviewHint}>
                  <AlertTriangle size={14} color={palette.warning} />
                  <AppText variant="caption" color={palette.warning}>
                    {`${String(submission.reviewCount)} câu cần đối chiếu thủ công`}
                  </AppText>
                </View>
              ) : null}
            </SurfaceCard>
          </Pressable>
        ))}
      </View>

      <ModalSheet
        visible={!!selectedSubmission}
        onClose={() => setSelectedSubmissionId(null)}
      >
        {selectedSubmission ? (
          <>
            <AppText variant="headline" weight="bold" style={styles.sheetTitle}>
              Override bài làm OMR
            </AppText>
            {selectedImageUrl ? (
              <SurfaceCard style={styles.previewCard}>
                <Image
                  source={{ uri: selectedImageUrl }}
                  resizeMode="contain"
                  style={styles.previewImage}
                />
              </SurfaceCard>
            ) : (
              <SurfaceCard style={styles.previewFallback}>
                <ImageIcon size={34} color={palette.mutedForeground} />
                <AppText variant="caption" color={palette.mutedForeground}>
                  Không có ảnh xem trước cho bài làm này
                </AppText>
              </SurfaceCard>
            )}

            <SurfaceCard style={styles.infoPanel}>
              <AppText variant="caption" color={palette.mutedForeground}>
                Mã học sinh
              </AppText>
              <TextInput
                value={studentCode}
                onChangeText={setStudentCode}
                placeholder="Nhập mã học sinh để ghép bài"
                placeholderTextColor={palette.mutedForeground}
                style={styles.inlineInput}
              />
            </SurfaceCard>

            <SurfaceCard style={styles.infoPanel}>
              <AppText variant="caption" color={palette.mutedForeground}>
                Mã đề
              </AppText>
              <TextInput
                value={resolvedTestCode}
                onChangeText={setResolvedTestCode}
                placeholder="Ví dụ: 101"
                placeholderTextColor={palette.mutedForeground}
                style={styles.inlineInput}
              />
            </SurfaceCard>

            <View style={styles.answersList}>
              {selectedSubmission.details.map((detail) => {
                const currentAnswer =
                  answerDraft[detail.questionNumber]
                  || (detail.finalAnswer as AnswerChoice | null)
                  || 'A';

                return (
                  <SurfaceCard
                    key={detail.questionNumber}
                    style={[
                      styles.answerCard,
                      detail.needsReview ? styles.answerNeedsReview : null,
                    ]}
                  >
                    <View style={styles.rowBetween}>
                      <View style={styles.flex}>
                        <AppText variant="body" weight="semibold">
                          {`Câu ${String(detail.questionNumber)}`}
                        </AppText>
                        <AppText variant="caption" color={palette.mutedForeground}>
                          {`Máy đọc: ${detail.detectedAnswer ?? 'Trống'} • Đáp án chuẩn: ${detail.correctAnswer ?? '—'}`}
                        </AppText>
                        {detail.reviewReason ? (
                          <AppText variant="caption" color={palette.warning}>
                            {detail.reviewReason}
                          </AppText>
                        ) : null}
                      </View>
                      {detail.isCorrect ? (
                        <CheckCircle2 size={16} color={palette.success} />
                      ) : (
                        <XCircle size={16} color={palette.destructive} />
                      )}
                    </View>
                    <View style={styles.answerOptions}>
                      {answerChoices.map((choice) => (
                        <Pressable
                          key={`${detail.questionNumber}-${choice}`}
                          style={[
                            styles.answerOption,
                            currentAnswer === choice ? styles.answerOptionActive : null,
                          ]}
                          onPress={() =>
                            setAnswerDraft((current) => ({
                              ...current,
                              [detail.questionNumber]: choice,
                            }))
                          }
                        >
                          <AppText
                            variant="label"
                            weight="semibold"
                            color={currentAnswer === choice ? palette.white : palette.foreground}
                          >
                            {choice}
                          </AppText>
                        </Pressable>
                      ))}
                    </View>
                  </SurfaceCard>
                );
              })}
            </View>

            <PrimaryButton
              label={content.common.buttons.save}
              loading={saving}
              onPress={async () => {
                if (!accessToken || !selectedSubmission) {
                  return;
                }

                setSaving(true);
                setSubmitError(null);

                try {
                  await updateSubmissionOverride(accessToken, selectedSubmission.id, {
                    studentCode: studentCode.trim() || undefined,
                    resolvedTestCode: resolvedTestCode.trim() || undefined,
                    details: selectedSubmission.details.map((detail) => ({
                      questionNumber: detail.questionNumber,
                      finalAnswer:
                        answerDraft[detail.questionNumber]
                        || (detail.finalAnswer as AnswerChoice | null)
                        || 'A',
                    })),
                  });
                  showToast('Đã cập nhật bài làm OMR');
                  setSelectedSubmissionId(null);
                  await reload();
                } catch (nextError) {
                  setSubmitError(
                    nextError instanceof Error ? nextError.message : 'Có lỗi xảy ra',
                  );
                } finally {
                  setSaving(false);
                }
              }}
            />
            {submitError ? (
              <AppText variant="caption" color={palette.destructive}>
                {submitError}
              </AppText>
            ) : null}
          </>
        ) : null}
      </ModalSheet>
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
  metricsRow: {
    flexDirection: 'row',
    gap: appTheme.spacing.sm,
    marginTop: appTheme.spacing.md,
  },
  metricsRowWrap: {
    flexWrap: 'wrap',
  },
  metricPill: {
    flex: 1,
    minWidth: 92,
    borderRadius: appTheme.radius.lg,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: appTheme.spacing.md,
    paddingVertical: appTheme.spacing.md,
    gap: 2,
  },
  body: {
    gap: appTheme.spacing.md,
  },
  submissionCard: {
    gap: appTheme.spacing.sm,
  },
  reviewCard: {
    borderLeftWidth: 4,
    borderLeftColor: palette.warning,
  },
  failedCard: {
    borderLeftWidth: 4,
    borderLeftColor: palette.destructive,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: appTheme.spacing.md,
  },
  inlineMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: appTheme.spacing.md,
  },
  reviewHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flex: {
    flex: 1,
    gap: 4,
  },
  sheetTitle: {
    marginBottom: appTheme.spacing.sm,
  },
  previewCard: {
    padding: appTheme.spacing.sm,
  },
  previewImage: {
    width: '100%',
    height: 280,
    borderRadius: appTheme.radius.md,
    backgroundColor: '#F8FAFC',
  },
  previewFallback: {
    alignItems: 'center',
    gap: appTheme.spacing.sm,
  },
  infoPanel: {
    gap: 6,
  },
  inlineInput: {
    borderRadius: appTheme.radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.inputBackground,
    paddingHorizontal: appTheme.spacing.md,
    paddingVertical: appTheme.spacing.md,
    color: palette.foreground,
    fontFamily: appTheme.typography.family,
  },
  answersList: {
    gap: appTheme.spacing.md,
  },
  answerCard: {
    gap: appTheme.spacing.md,
  },
  answerNeedsReview: {
    borderLeftWidth: 4,
    borderLeftColor: palette.warning,
  },
  answerOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: appTheme.spacing.sm,
  },
  answerOption: {
    width: 44,
    height: 44,
    borderRadius: appTheme.radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.inputBackground,
  },
  answerOptionActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
});
