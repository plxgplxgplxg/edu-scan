/* eslint-disable react/no-unstable-nested-components, no-void, react-native/no-inline-styles */
import React, { useMemo, useState } from 'react';
import { Alert, Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { ArrowLeft, ChevronRight, Pencil } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  getExamDetail,
  getOmrBatchDetail,
  getOmrSubmissionDetail,
  updateSubmissionDetail,
} from '../../api/edu-scan';
import { AppText } from '../../components/AppText';
import { ErrorState, LoadingState } from '../../components/RequestState';
import { Screen } from '../../components/Screen';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { SurfaceCard } from '../../components/SurfaceCard';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import type { RootStackParamList } from '../../navigation/types';
import { useAuth } from '../../store/auth-store';
import { appTheme, palette } from '../../theme/tokens';
import { primaryHeroGradient } from '../../theme/header';
import { useResponsiveLayout } from '../../theme/responsive';
import { formatVietnameseDate } from '../../utils/format';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function TeacherOmrBatchDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>();
  const batchId = route.params?.batchId as string;
  const { accessToken } = useAuth();
  const layout = useResponsiveLayout();
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  const {
    data,
    loading,
    error,
    reload,
  } = useAsyncResource(async () => {
    if (!accessToken || !batchId) {
      return null;
    }

    const batch = await getOmrBatchDetail(accessToken, batchId);
    const exam = await getExamDetail(accessToken, batch.examId);

    return { batch, exam };
  }, [accessToken, batchId]);

  const batch = data?.batch ?? null;
  const exam = data?.exam ?? null;

  const summary = useMemo(() => {
    if (!batch) {
      return {
        averageScore: 0,
        needsReviewCount: 0,
      };
    }

    const scoredSubmissions = batch.submissions.filter(
      (submission) => typeof submission.score === 'number' && Number.isFinite(submission.score),
    );
    const totalScore = scoredSubmissions.reduce(
      (accumulator, submission) => accumulator + submission.score,
      0,
    );

    return {
      averageScore:
        scoredSubmissions.length > 0 ? totalScore / scoredSubmissions.length : 0,
      needsReviewCount: batch.submissions.filter((submission) => submission.needsReview)
        .length,
    };
  }, [batch]);

  const statusNode = batch ? <StatusBadge status={batch.status} /> : undefined;
  const overline = exam?.classes?.length
    ? `${exam.classes[0].subject} • ${exam.classes.map((item) => item.name).join(', ')}`
    : 'Kết quả chấm OMR';
  const subtitleParts = [
    exam?.questionCount ? `${exam.questionCount} câu` : undefined,
    batch?.createdAt ? `Tạo ngày ${formatVietnameseDate(batch.createdAt)}` : undefined,
  ].filter(Boolean);

  return (
    <Screen refreshing={loading} onRefresh={() => { void reload(); }}>
      <PageHeader
        title={batch?.examTitle ?? 'Kết quả chấm'}
        overline={overline}
        subtitle={subtitleParts.join(' • ')}
        gradient={primaryHeroGradient}
        actionIcon={statusNode}
        onBack={() => navigation.goBack()}
        metrics={[
          { value: String(batch?.successCount ?? 0), label: 'Đã chấm' },
          {
            value: batch ? summary.averageScore.toFixed(1) : '0.0',
            label: 'Điểm TB',
          },
          {
            value: String(summary.needsReviewCount),
            label: 'Cần xem lại',
          },
        ]}
      />

      <View
        style={[
          styles.content,
          {
            paddingHorizontal: layout.horizontalPadding,
            maxWidth: layout.contentMaxWidth,
          },
        ]}
      >
        {loading ? <LoadingState label="Đang tải kết quả batch..." /> : null}
        {error ? (
          <ErrorState message={error} retryLabel="Thử lại" onRetry={reload} />
        ) : null}

        {batch ? (
          <View style={styles.stack}>
            <SurfaceCard style={styles.segmentCard}>
              <View style={styles.segmentControl}>
                <View style={styles.segmentActive}>
                  <AppText variant="body" weight="bold" color={palette.primary}>
                    Bài chấm
                  </AppText>
                </View>
                <View style={styles.segmentInactive}>
                  <AppText variant="body" weight="bold" color={palette.mutedForeground}>
                    Batch #{batch.id.slice(0, 8)}
                  </AppText>
                </View>
              </View>
            </SurfaceCard>

            {batch.submissions.length ? (
              batch.submissions.map((submission) => (
                <Pressable
                  key={submission.id}
                  onPress={() => setSelectedSubmissionId(submission.id)}
                >
                  <SurfaceCard style={styles.submissionCard}>
                    <View style={styles.scoreBadge}>
                      <AppText variant="headline" weight="bold" color={palette.primary}>
                        {submission.score.toFixed(1)}
                      </AppText>
                    </View>

                    <View style={styles.submissionCopy}>
                      <AppText variant="body" weight="bold">
                        SBD{submission.studentCode ? submission.studentCode : ' chưa nhận diện'}
                      </AppText>
                      <AppText variant="caption" color={palette.mutedForeground}>
                        {submission.correctCount}/{submission.details.length || exam?.questionCount || 0} đúng
                      </AppText>
                    </View>

                    {submission.needsReview ? (
                      <View style={styles.reviewBadge}>
                        <AppText variant="caption" weight="bold" color={palette.warning}>
                          Cần xem
                        </AppText>
                      </View>
                    ) : null}

                    <ChevronRight size={20} color={palette.mutedForeground} />
                  </SurfaceCard>
                </Pressable>
              ))
            ) : (
              <SurfaceCard>
                <AppText variant="body" color={palette.mutedForeground} style={styles.emptyText}>
                  Batch này chưa có bài chấm nào.
                </AppText>
              </SurfaceCard>
            )}
          </View>
        ) : null}
      </View>

      {selectedSubmissionId ? (
        <SubmissionDetailModal
          submissionId={selectedSubmissionId}
          onClose={() => {
            setSelectedSubmissionId(null);
            void reload();
          }}
        />
      ) : null}
    </Screen>
  );
}

function SubmissionDetailModal({
  submissionId,
  onClose,
}: {
  submissionId: string;
  onClose: () => void;
}) {
  const { accessToken } = useAuth();
  const [editingQuestion, setEditingQuestion] = useState<{
    qNum: number;
  } | null>(null);
  const { data: submission, loading, error, reload } = useAsyncResource(async () => {
    if (!accessToken) {
      return null;
    }

    return getOmrSubmissionDetail(accessToken, submissionId);
  }, [accessToken, submissionId]);

  const handleUpdateAnswer = async (qNum: number, answer: 'A' | 'B' | 'C' | 'D') => {
    if (!accessToken) {
      return;
    }

    try {
      await updateSubmissionDetail(accessToken, submissionId, qNum, answer);
      setEditingQuestion(null);
      await reload();
    } catch {
      Alert.alert('Lỗi', 'Không thể cập nhật đáp án');
    }
  };

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Pressable onPress={onClose} style={styles.modalBack}>
            <ArrowLeft size={20} color={palette.foreground} />
            <AppText variant="body" weight="semibold">
              Đóng
            </AppText>
          </Pressable>
        </View>

        <Screen>
          <View style={styles.modalContent}>
            {loading ? <LoadingState label="Đang tải..." /> : null}
            {error ? (
              <ErrorState message={error} retryLabel="Thử lại" onRetry={reload} />
            ) : null}

            {submission ? (
              <>
                <SurfaceCard style={styles.modalSummaryCard}>
                  <AppText variant="headline" weight="bold">
                    SBD: {submission.studentCode || 'Chưa nhận diện'}
                  </AppText>
                  <View style={styles.rowSpace}>
                    <AppText variant="body" color={palette.mutedForeground}>
                      Kết quả:
                    </AppText>
                    <AppText variant="title" weight="bold" color={palette.primary}>
                      {submission.correctCount ?? 0}/{submission.details?.length ?? 0} câu đúng
                    </AppText>
                  </View>
                  <View style={styles.rowSpace}>
                    <AppText variant="body" color={palette.mutedForeground}>
                      Mã đề:
                    </AppText>
                    <AppText variant="body" weight="semibold">
                      {submission.resolvedTestCode ?? '?'}
                    </AppText>
                  </View>
                </SurfaceCard>

                {submission.imageUrl || submission.annotatedImageUrl || submission.processedImageUrl ? (
                  <SurfaceCard>
                    <AppText variant="body" weight="bold" style={{ marginBottom: 8 }}>
                      Hình ảnh bài thi
                    </AppText>
                    <Image
                      source={{
                        uri: (submission.imageUrl ||
                          submission.annotatedImageUrl ||
                          submission.processedImageUrl) as string,
                      }}
                      style={styles.previewImage}
                    />
                  </SurfaceCard>
                ) : null}

                <AppText variant="headline" weight="bold">
                  Chi tiết đáp án
                </AppText>

                {submission.details.map((detail) => (
                  <SurfaceCard key={detail.questionNumber} style={styles.answerCard}>
                    <View style={styles.answerLeft}>
                      <AppText variant="body" weight="bold">
                        Câu {detail.questionNumber}
                      </AppText>

                      {editingQuestion?.qNum === detail.questionNumber ? (
                        <View style={styles.answerEditor}>
                          {(['A', 'B', 'C', 'D'] as const).map((answer) => (
                            <Pressable
                              key={answer}
                              onPress={() => handleUpdateAnswer(detail.questionNumber, answer)}
                              style={styles.answerChoice}
                            >
                              <AppText variant="body" weight="bold" color={palette.white}>
                                {answer}
                              </AppText>
                            </Pressable>
                          ))}
                          <Pressable onPress={() => setEditingQuestion(null)}>
                            <AppText variant="caption" color={palette.mutedForeground}>
                              Hủy
                            </AppText>
                          </Pressable>
                        </View>
                      ) : (
                        <View style={styles.answerResult}>
                          <AppText
                            variant="body"
                            weight="bold"
                            color={detail.isCorrect ? palette.success : palette.destructive}
                          >
                            {detail.finalAnswer || detail.detectedAnswer || 'Chưa tô'}
                          </AppText>
                          {!detail.isCorrect ? (
                            <AppText variant="caption" color={palette.mutedForeground}>
                              (Đúng: {detail.correctAnswer})
                            </AppText>
                          ) : null}
                        </View>
                      )}
                    </View>

                    {!editingQuestion ? (
                      <Pressable
                        onPress={() =>
                          setEditingQuestion({
                            qNum: detail.questionNumber,
                          })
                        }
                      >
                        <Pencil size={18} color={palette.primary} />
                      </Pressable>
                    ) : null}
                  </SurfaceCard>
                ))}
              </>
            ) : null}
          </View>
        </Screen>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: {
    alignSelf: 'center',
    width: '100%',
    paddingTop: 16,
    paddingBottom: 100,
  },
  stack: {
    gap: appTheme.spacing.md,
  },
  segmentCard: {
    padding: 6,
  },
  segmentControl: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#F3F2FD',
    borderRadius: 24,
    padding: 4,
  },
  segmentActive: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: palette.white,
  },
  segmentInactive: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 20,
  },
  submissionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  scoreBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#F3D9FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submissionCopy: {
    flex: 1,
    gap: 4,
  },
  reviewBadge: {
    backgroundColor: '#FFF1DB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  emptyText: {
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: palette.background,
  },
  modalHeader: {
    padding: appTheme.spacing.md,
    backgroundColor: palette.card,
  },
  modalBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalContent: {
    padding: appTheme.spacing.md,
    gap: appTheme.spacing.md,
  },
  modalSummaryCard: {
    gap: appTheme.spacing.md,
  },
  rowSpace: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewImage: {
    width: '100%',
    height: 400,
    resizeMode: 'contain',
  },
  answerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  answerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  answerEditor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  answerChoice: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  answerResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
