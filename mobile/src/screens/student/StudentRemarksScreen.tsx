import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ArrowLeft, Plus } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  createRemark,
  getSubmissionDetail,
  listStudentRemarks,
  mapRemarkSummary,
} from '../../api/edu-scan';
import { AppText } from '../../components/AppText';
import { BottomNav } from '../../components/BottomNav';
import { ModalSheet } from '../../components/ModalSheet';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ErrorState, LoadingState } from '../../components/RequestState';
import { Screen } from '../../components/Screen';
import { StatusBadge } from '../../components/StatusBadge';
import { SurfaceCard } from '../../components/SurfaceCard';
import { TextInputField } from '../../components/TextInputField';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { useAppContent } from '../../hooks/useAppContent';
import { useAuth } from '../../store/auth-store';
import { appTheme, palette } from '../../theme/tokens';
import { useResponsiveLayout } from '../../theme/responsive';
import { formatVietnameseDate } from '../../utils/format';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function StudentRemarksScreen() {
  const navigation = useNavigation<Nav>();
  const content = useAppContent();
  const { accessToken, role } = useAuth();
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
  const studentRemarks = data ?? [];

  return (
    <Screen>
      <View
        style={[
          styles.header,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingTop: layout.sectionGap,
            maxWidth: layout.contentMaxWidth,
            alignSelf: 'center',
            width: '100%',
          },
        ]}
      >
        <Pressable style={styles.backRow} onPress={() => navigation.navigate('StudentDashboard')}>
          <ArrowLeft size={16} color={palette.mutedForeground} />
          <AppText variant="label" color={palette.mutedForeground}>
            {content.common.buttons.backToHome}
          </AppText>
        </Pressable>
        <View style={styles.titleRow}>
          <AppText variant="title" weight="bold">
            {content.student.remarks.title}
          </AppText>
          <Pressable style={styles.iconButton} onPress={() => setShowCreate(true)}>
            <Plus size={20} color={palette.white} />
          </Pressable>
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
        {loading ? <LoadingState label={content.common.labels.loading} /> : null}
        {error ? (
          <ErrorState
            message={error}
            retryLabel={content.common.buttons.confirm}
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
          <TextInputField
            label="Result ID"
            value={form.resultId}
            onChangeText={value => setForm((current) => ({ ...current, resultId: value }))}
            placeholder="Nhập ID kết quả"
          />
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

      {role ? (
        <BottomNav role={role} currentScreen="StudentRemarks" currentModule="remarks" />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: appTheme.spacing.md,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.spacing.md,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: appTheme.radius.md,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
});
