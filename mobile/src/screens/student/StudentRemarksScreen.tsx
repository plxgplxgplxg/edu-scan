import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Check, MessageSquare, Plus } from 'lucide-react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  createRemark,
  getSubmissionDetail,
  listStudentRemarks,
  listStudentSubmissions,
  mapRemarkSummary,
  mapResultSummary,
} from '../../api/edu-scan';
import { AppText } from '../../components/AppText';
import { ModalSheet } from '../../components/ModalSheet';
import { PageHeader } from '../../components/PageHeader';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ErrorState, LoadingState } from '../../components/RequestState';
import { Screen } from '../../components/Screen';
import { StatusBadge } from '../../components/StatusBadge';
import { SurfaceCard } from '../../components/SurfaceCard';
import { TextInputField } from '../../components/TextInputField';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { useAppContent } from '../../hooks/useAppContent';
import type { RootStackParamList } from '../../navigation/types';
import { useAuth } from '../../store/auth-store';
import { appTheme, palette } from '../../theme/tokens';
import { useResponsiveLayout } from '../../theme/responsive';
import { primaryHeroGradient } from '../../theme/header';
import { formatVietnameseDate } from '../../utils/format';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function StudentRemarksScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'StudentRemarks'>>();
  const content = useAppContent();
  const { accessToken } = useAuth();
  const layout = useResponsiveLayout();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    resultId: '',
    questionNumber: '',
    reason: '',
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { data, loading, error, reload } = useAsyncResource(
    async () => {
      if (!accessToken) {
        return [];
      }

      const remarks = await listStudentRemarks(accessToken);
      return remarks.map(mapRemarkSummary);
    },
    [accessToken],
  );
  const { data: resultOptions } = useAsyncResource(
    async () => {
      if (!accessToken) {
        return [];
      }

      const response = await listStudentSubmissions(accessToken);
      return response.items.map(mapResultSummary);
    },
    [accessToken],
  );
  const { data: selectedResultDetail } = useAsyncResource(
    async () => {
      if (!accessToken || !form.resultId.trim()) {
        return null;
      }

      return getSubmissionDetail(accessToken, form.resultId.trim());
    },
    [accessToken, form.resultId],
  );
  const studentRemarks = data ?? [];
  const questionOptions = useMemo(
    () => selectedResultDetail?.details ?? [],
    [selectedResultDetail],
  );

  useEffect(() => {
    if (route.params?.resultId && !showCreate) {
      setShowCreate(true);
    }
  }, [route.params?.resultId, showCreate]);

  useEffect(() => {
    if (!showCreate || !route.params?.resultId) {
      return;
    }

    setForm((current) => ({
      ...current,
      resultId: current.resultId || route.params?.resultId || '',
      questionNumber:
        current.questionNumber
        || (route.params?.questionNumber ? String(route.params.questionNumber) : ''),
    }));
  }, [route.params?.questionNumber, route.params?.resultId, showCreate]);
  const handleRefresh = () => {
    reload().catch(() => undefined);
  };

  return (
    <Screen refreshing={loading} onRefresh={handleRefresh}>
      <PageHeader
        backLabel={content.common.buttons.backToHome}
        title={content.student.remarks.title}
        subtitle={`${String(studentRemarks.length)} ${content.student.remarks.reasonTitle.toLowerCase()}`}
        gradient={primaryHeroGradient}
        onBack={() => navigation.navigate('StudentTabs', { screen: 'StudentDashboard' })}
        leadingVisual={<MessageSquare size={28} color={palette.white} />}
        actionIcon={
          <Pressable onPress={() => setShowCreate(true)} hitSlop={8}>
            <Plus size={18} color={palette.white} />
          </Pressable>
        }
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
            retryLabel={content.common.buttons.retry}
            onRetry={reload}
          />
        ) : null}
        {studentRemarks.map(item => (
          <SurfaceCard key={item.id} style={styles.card}>
            <View style={[styles.rowBetween, layout.isCompact ? styles.rowWrap : null]}>
              <View style={styles.flex}>
                <AppText variant="body" weight="medium">
                  {item.examTitle}
                </AppText>
                <AppText variant="caption" color={palette.mutedForeground}>
                  {`${content.common.labels.question} ${String(item.questionNumber)} • ${formatVietnameseDate(item.createdAt)}`}
                </AppText>
              </View>
              <StatusBadge status={item.status} />
            </View>
            <SurfaceCard style={styles.reasonCard}>
              <AppText variant="caption" color={palette.mutedForeground}>
                {content.student.remarks.reasonTitle}
              </AppText>
              <AppText variant="body">{item.reason}</AppText>
            </SurfaceCard>
            {item.teacherComment ? (
              <SurfaceCard style={styles.commentCard}>
                <AppText variant="caption" color={palette.mutedForeground}>
                  {content.student.remarks.teacherComment}
                </AppText>
                <AppText
                  variant="body"
                  color={item.status === 'APPROVED' ? palette.success : palette.destructive}
                >
                  {item.teacherComment}
                </AppText>
              </SurfaceCard>
            ) : null}
          </SurfaceCard>
        ))}
      </View>

      <ModalSheet visible={showCreate} onClose={() => setShowCreate(false)}>
        <AppText variant="headline" weight="bold" style={styles.sheetTitle}>
          {content.student.remarks.createTitle}
        </AppText>
        <View style={styles.sheetBody}>
          <AppText variant="label" weight="semibold">
            Chọn bài thi
          </AppText>
          <View style={styles.optionList}>
            {(resultOptions ?? []).map((item) => {
              const selected = form.resultId === item.id;

              return (
                <Pressable
                  key={item.id}
                  style={[styles.optionCard, selected ? styles.optionCardActive : null]}
                  onPress={() =>
                    setForm((current) => ({
                      ...current,
                      resultId: item.id,
                      questionNumber: '',
                    }))
                  }
                >
                  <View style={styles.flex}>
                    <AppText
                      variant="body"
                      weight="medium"
                      color={selected ? palette.white : palette.foreground}
                    >
                      {item.examTitle}
                    </AppText>
                    <AppText
                      variant="caption"
                      color={selected ? 'rgba(255,255,255,0.76)' : palette.mutedForeground}
                    >
                      {`${item.score}/${item.maxScore} điểm`}
                    </AppText>
                  </View>
                  {selected ? <Check size={16} color={palette.white} /> : null}
                </Pressable>
              );
            })}
          </View>
          {questionOptions.length ? (
            <>
              <AppText variant="label" weight="semibold">
                Chọn câu cần phúc khảo
              </AppText>
              <View style={styles.questionWrap}>
                {questionOptions.map((question) => {
                  const selected = form.questionNumber === String(question.questionNumber);

                  return (
                    <Pressable
                      key={question.id}
                      style={[
                        styles.questionChip,
                        selected ? styles.questionChipActive : null,
                      ]}
                      onPress={() =>
                        setForm((current) => ({
                          ...current,
                          questionNumber: String(question.questionNumber),
                        }))
                      }
                    >
                      <AppText
                        variant="caption"
                        weight="semibold"
                        color={selected ? palette.white : palette.foreground}
                      >
                        {`Câu ${String(question.questionNumber)}`}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}
          <TextInputField
            label={content.common.form.questionNumber}
            value={form.questionNumber}
            onChangeText={value =>
              setForm((current) => ({ ...current, questionNumber: value }))
            }
            placeholder={content.common.placeholders.questionNumber}
          />
          <TextInputField
            label={content.common.form.reason}
            value={form.reason}
            onChangeText={value => setForm((current) => ({ ...current, reason: value }))}
            placeholder={content.common.placeholders.remarkReason}
          />
          <PrimaryButton
            label={content.common.buttons.sendRequest}
            loading={submitting}
            onPress={async () => {
              if (!accessToken) {
                return;
              }

              setSubmitting(true);
              setSubmitError(null);

              try {
                const detail = await getSubmissionDetail(accessToken, form.resultId.trim());
                const question = detail.details.find(
                  (item) => item.questionNumber === Number(form.questionNumber),
                );

                if (!question) {
                  throw new Error('Không tìm thấy câu hỏi trong bài làm');
                }

                await createRemark(accessToken, {
                  submissionDetailId: question.id,
                  reason: form.reason.trim(),
                });
                setShowCreate(false);
                setForm({
                  resultId: '',
                  questionNumber: '',
                  reason: '',
                });
                await reload();
              } catch (err) {
                setSubmitError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
              } finally {
                setSubmitting(false);
              }
            }}
          />
          {submitError ? (
            <AppText variant="caption" color={palette.destructive}>
              {submitError}
            </AppText>
          ) : null}
        </View>
      </ModalSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: appTheme.spacing.md,
  },
  card: {
    gap: appTheme.spacing.md,
  },
  rowBetween: {
    flexDirection: 'row',
    gap: appTheme.spacing.md,
  },
  rowWrap: {
    flexWrap: 'wrap',
  },
  flex: {
    flex: 1,
    gap: 4,
  },
  reasonCard: {
    backgroundColor: palette.inputBackground,
    gap: 4,
  },
  commentCard: {
    gap: 4,
  },
  sheetTitle: {
    marginBottom: appTheme.spacing.lg,
  },
  sheetBody: {
    gap: appTheme.spacing.lg,
  },
  optionList: {
    gap: appTheme.spacing.sm,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.spacing.md,
    borderRadius: appTheme.radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.inputBackground,
    paddingHorizontal: appTheme.spacing.md,
    paddingVertical: appTheme.spacing.md,
  },
  optionCardActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  questionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: appTheme.spacing.sm,
  },
  questionChip: {
    borderRadius: appTheme.radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: appTheme.spacing.md,
    paddingVertical: appTheme.spacing.sm,
    backgroundColor: palette.inputBackground,
  },
  questionChipActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
});
