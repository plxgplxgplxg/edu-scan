import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
  getOmrBatchHeader,
  getOmrBatchSubmissions,
  updateSubmissionAnswers,
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

const PAGE_SIZE = 20;

type SubmissionItem = {
  id: string;
  studentId: string | null;
  studentCode: string | null;
  studentName: string | null;
  detectedTestId: string | null;
  resolvedTestCode: string | null;
  resolvedVariantId: string | null;
  testCodeResolutionStatus: string;
  imageUrl: string | null;
  processedImageUrl: string | null;
  annotatedImageUrl: string | null;
  warpOverlayUrl: string | null;
  answerScoresUrl: string | null;
  status: 'GRADED' | 'NEEDS_REVIEW' | 'FAILED';
  score: number;
  maxScore: number;
  correctCount: number;
  wrongCount: number;
  reviewCount: number;
  needsReview: boolean;
  details: Array<{
    questionNumber: number;
    correctAnswer: string | null;
    detectedAnswer: string | null;
    finalAnswer: string | null;
    isCorrect: boolean;
    needsReview: boolean;
    reviewReason: string | null;
  }>;
};

export function TeacherOmrBatchDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'TeacherOmrBatchDetail'>>();
  const content = useAppContent();
  const { accessToken } = useAuth();
  const layout = useResponsiveLayout();
  const { showToast } = useToast();
  const batchId = route.params?.batchId;

  const [filter, setFilter] = useState<FilterKey>('ALL');
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionItem | null>(null);
  const [studentCode, setStudentCode] = useState('');
  const [resolvedTestCode, setResolvedTestCode] = useState('');
  const [answerDraft, setAnswerDraft] = useState<Record<number, AnswerChoice | null>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'override' | 'answers'>('override');

  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);

  const { data: batchHeader, loading: headerLoading, error: headerError, reload: reloadHeader } = useAsyncResource(
    async () => {
      if (!accessToken || !batchId) {
        return null;
      }

      return getOmrBatchHeader(accessToken, batchId);
    },
    [accessToken, batchId],
  );

  const loadSubmissions = useCallback(
    async (targetPage: number, currentFilter: FilterKey, replace: boolean) => {
      if (!accessToken || !batchId) {
        return;
      }

      if (loadingMoreRef.current) {
        return;
      }

      loadingMoreRef.current = true;
      setLoadingMore(true);

      try {
        const statusParam = currentFilter !== 'ALL' ? currentFilter : undefined;
        const result = await getOmrBatchSubmissions(accessToken, batchId, targetPage, statusParam);

        setSubmissions((prev) => {
          const incoming = result.items as SubmissionItem[];
          return replace ? incoming : [...prev, ...incoming];
        });
        setTotalPages(result.totalPages);
        setPage(result.page);
      } finally {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    },
    [accessToken, batchId],
  );

  const { loading: submissionsLoading, error: submissionsError } = useAsyncResource(
    async () => {
      setSubmissions([]);
      setPage(1);
      await loadSubmissions(1, filter, true);
      return null;
    },
    [filter, accessToken, batchId],
  );

  const handleLoadMore = useCallback(() => {
    if (page < totalPages && !loadingMoreRef.current) {
      void loadSubmissions(page + 1, filter, false);
    }
  }, [page, totalPages, filter, loadSubmissions]);

  const handleFilterChange = useCallback((next: FilterKey) => {
    setFilter(next);
  }, []);

  const openSubmission = useCallback((submission: SubmissionItem) => {
    setSelectedSubmission(submission);
    setStudentCode(submission.studentCode ?? '');
    setResolvedTestCode(submission.resolvedTestCode ?? submission.detectedTestId ?? '');
    setAnswerDraft(
      Object.fromEntries(
        submission.details.map((d) => [d.questionNumber, (d.finalAnswer as AnswerChoice | null) ?? null]),
      ),
    );
    setSubmitError(null);
    setActiveTab('override');
  }, []);

  const reloadAll = useCallback(async () => {
    await Promise.all([
      reloadHeader(),
      loadSubmissions(1, filter, true),
    ]);
  }, [reloadHeader, loadSubmissions, filter]);

  const handleSaveOverride = useCallback(async () => {
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
            (answerDraft[detail.questionNumber] as AnswerChoice | null) ??
            (detail.finalAnswer as AnswerChoice | null) ??
            'A',
        })),
      });
      showToast('Đã cập nhật bài làm OMR');
      setSelectedSubmission(null);
      await reloadAll();
    } catch (nextError) {
      setSubmitError(nextError instanceof Error ? nextError.message : 'Có lỗi xảy ra');
    } finally {
      setSaving(false);
    }
  }, [accessToken, selectedSubmission, studentCode, resolvedTestCode, answerDraft, showToast, reloadAll]);

  const handleSaveAnswers = useCallback(async () => {
    if (!accessToken || !selectedSubmission) {
      return;
    }

    setSaving(true);
    setSubmitError(null);

    try {
      const answers = Object.entries(answerDraft).map(([qn, ans]) => ({
        questionNumber: Number(qn),
        finalAnswer: ans ?? undefined,
      }));

      await updateSubmissionAnswers(accessToken, selectedSubmission.id, answers);
      showToast('Đã cập nhật đáp án và tính lại điểm');
      setSelectedSubmission(null);
      await reloadAll();
    } catch (nextError) {
      setSubmitError(nextError instanceof Error ? nextError.message : 'Có lỗi xảy ra');
    } finally {
      setSaving(false);
    }
  }, [accessToken, selectedSubmission, answerDraft, showToast, reloadAll]);

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

  if (!batchHeader && headerLoading) {
    return (
      <Screen>
        <LoadingState label={content.common.labels.loading} />
      </Screen>
    );
  }

  if (!batchHeader && headerError) {
    return (
      <Screen>
        <ErrorState
          message={headerError}
          retryLabel={content.common.buttons.confirm}
          onRetry={reloadHeader}
        />
      </Screen>
    );
  }

  if (!batchHeader) {
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

  const reviewCount = batchHeader.successCount - (batchHeader.matchedCount ?? 0);
  const selectedImageUrl =
    selectedSubmission?.annotatedImageUrl ||
    selectedSubmission?.processedImageUrl ||
    selectedSubmission?.imageUrl ||
    null;

  const renderSubmissionItem = ({ item }: { item: SubmissionItem }) => (
    <Pressable onPress={() => openSubmission(item)}>
      <SurfaceCard
        style={[
          styles.submissionCard,
          item.status === 'NEEDS_REVIEW' ? styles.reviewCard : null,
          item.status === 'FAILED' ? styles.failedCard : null,
        ]}
      >
        <View style={styles.rowBetween}>
          <View style={styles.flex}>
            <AppText variant="body" weight="medium">
              {item.studentName || item.studentCode || 'Chưa ghép học sinh'}
            </AppText>
            <AppText variant="caption" color={palette.mutedForeground}>
              {[
                item.studentCode || 'Không có mã HS',
                item.resolvedTestCode || item.detectedTestId || 'Chưa rõ mã đề',
              ].join(' • ')}
            </AppText>
          </View>
          <StatusBadge status={item.status} />
        </View>
        <View style={styles.inlineMeta}>
          <AppText variant="caption" color={palette.mutedForeground}>
            {`${item.correctCount}/${item.details.length} đúng`}
          </AppText>
          <AppText variant="caption" color={palette.mutedForeground}>
            {`${item.score}/${item.maxScore} điểm`}
          </AppText>
        </View>
        {item.reviewCount ? (
          <View style={styles.reviewHint}>
            <AlertTriangle size={14} color={palette.warning} />
            <AppText variant="caption" color={palette.warning}>
              {`${String(item.reviewCount)} câu cần đối chiếu thủ công`}
            </AppText>
          </View>
        ) : null}
      </SurfaceCard>
    </Pressable>
  );

  const renderFooter = () => {
    if (!loadingMore) {
      return null;
    }

    return (
      <View style={styles.loadMoreIndicator}>
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  };

  return (
    <Screen>
      <FlatList
        data={submissions}
        keyExtractor={(item) => item.id}
        renderItem={renderSubmissionItem}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        ListHeaderComponent={() => (
          <>
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
                {batchHeader.examTitle}
              </AppText>
              <AppText variant="label" color="rgba(255,255,255,0.76)">
                {formatVietnameseDate(batchHeader.createdAt)}
              </AppText>
              <View style={[styles.metricsRow, layout.isCompact ? styles.metricsRowWrap : null]}>
                <View style={styles.metricPill}>
                  <AppText variant="headline" weight="bold" color={palette.white}>
                    {String(batchHeader.successCount)}
                  </AppText>
                  <AppText variant="caption" color="rgba(255,255,255,0.76)">
                    Thành công
                  </AppText>
                </View>
                <View style={styles.metricPill}>
                  <AppText variant="headline" weight="bold" color={palette.white}>
                    {String(batchHeader.failedCount)}
                  </AppText>
                  <AppText variant="caption" color="rgba(255,255,255,0.76)">
                    Thất bại
                  </AppText>
                </View>
                <View style={styles.metricPill}>
                  <AppText variant="headline" weight="bold" color={palette.white}>
                    {`${String(batchHeader.progressPercentage)}%`}
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
                  { id: 'FAILED', label: content.common.statuses.FAILED, count: batchHeader.failedCount },
                ]}
                onChange={(v) => handleFilterChange(v as FilterKey)}
              />

              {submissionsLoading && submissions.length === 0 ? (
                <LoadingState label={content.common.labels.loading} />
              ) : submissionsError && submissions.length === 0 ? (
                <ErrorState message={submissionsError} retryLabel="Thử lại" onRetry={() => loadSubmissions(1, filter, true)} />
              ) : submissions.length === 0 ? (
                <EmptyState
                  title="Không có bài làm phù hợp bộ lọc"
                  icon={<UserRoundSearch size={34} color={palette.mutedForeground} />}
                />
              ) : null}
            </View>
          </>
        )}
        contentContainerStyle={styles.listContent}
      />

      <ModalSheet
        visible={!!selectedSubmission}
        onClose={() => setSelectedSubmission(null)}
      >
        {selectedSubmission ? (
          <>
            <AppText variant="headline" weight="bold" style={styles.sheetTitle}>
              Chi tiết bài làm OMR
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

            <View style={styles.tabRow}>
              <Pressable
                style={[styles.tab, activeTab === 'override' ? styles.tabActive : null]}
                onPress={() => setActiveTab('override')}
              >
                <AppText
                  variant="label"
                  weight={activeTab === 'override' ? 'semibold' : 'regular'}
                  color={activeTab === 'override' ? palette.primary : palette.mutedForeground}
                >
                  Ghép học sinh / Mã đề
                </AppText>
              </Pressable>
              <Pressable
                style={[styles.tab, activeTab === 'answers' ? styles.tabActive : null]}
                onPress={() => setActiveTab('answers')}
              >
                <AppText
                  variant="label"
                  weight={activeTab === 'answers' ? 'semibold' : 'regular'}
                  color={activeTab === 'answers' ? palette.primary : palette.mutedForeground}
                >
                  Sửa đáp án ({selectedSubmission.details.length} câu)
                </AppText>
              </Pressable>
            </View>

            {activeTab === 'override' ? (
              <>
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

                <SurfaceCard style={styles.scoreSummary}>
                  <AppText variant="body" weight="semibold">
                    Kết quả hiện tại
                  </AppText>
                  <View style={styles.scoreRow}>
                    <AppText variant="caption" color={palette.mutedForeground}>
                      {`Đúng: ${selectedSubmission.correctCount} | Sai: ${selectedSubmission.wrongCount} | Cần xem: ${selectedSubmission.reviewCount}`}
                    </AppText>
                    <AppText variant="label" weight="bold" color={palette.primary}>
                      {`${selectedSubmission.score}/${selectedSubmission.maxScore}`}
                    </AppText>
                  </View>
                </SurfaceCard>

                <PrimaryButton
                  label="Lưu ghép học sinh / Mã đề"
                  loading={saving}
                  onPress={handleSaveOverride}
                />
              </>
            ) : (
              <>
                <SurfaceCard style={styles.scoreSummary}>
                  <AppText variant="body" weight="semibold">
                    Kết quả hiện tại
                  </AppText>
                  <View style={styles.scoreRow}>
                    <AppText variant="caption" color={palette.mutedForeground}>
                      {`Đúng: ${selectedSubmission.correctCount} | Sai: ${selectedSubmission.wrongCount} | Cần xem: ${selectedSubmission.reviewCount}`}
                    </AppText>
                    <AppText variant="label" weight="bold" color={palette.primary}>
                      {`${selectedSubmission.score}/${selectedSubmission.maxScore}`}
                    </AppText>
                  </View>
                </SurfaceCard>

                <View style={styles.answersList}>
                  {selectedSubmission.details.map((detail) => {
                    const currentAnswer = answerDraft[detail.questionNumber] ?? null;

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
                          {currentAnswer && detail.correctAnswer ? (
                            currentAnswer === detail.correctAnswer ? (
                              <CheckCircle2 size={16} color={palette.success} />
                            ) : (
                              <XCircle size={16} color={palette.destructive} />
                            )
                          ) : detail.isCorrect ? (
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
                                  [detail.questionNumber]: current[detail.questionNumber] === choice ? null : choice,
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
                  label="Lưu đáp án & Tính lại điểm"
                  loading={saving}
                  onPress={handleSaveAnswers}
                />
              </>
            )}

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
  listContent: {
    paddingBottom: 40,
  },
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
    marginHorizontal: appTheme.spacing.md,
    marginBottom: appTheme.spacing.sm,
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
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    marginVertical: appTheme.spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: appTheme.spacing.sm,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: palette.primary,
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
  scoreSummary: {
    gap: appTheme.spacing.sm,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  loadMoreIndicator: {
    paddingVertical: appTheme.spacing.lg,
    alignItems: 'center',
  },
});
