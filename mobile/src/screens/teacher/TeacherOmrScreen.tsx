import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  ArrowLeft,
  ImageIcon,
  ScanLine,
  Upload,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { listExams, listOmrBatches, mapOmrBatchSummary, uploadOmrBatch } from '../../api/edu-scan';
import { AppText } from '../../components/AppText';
import { BottomNav } from '../../components/BottomNav';
import { ModalSheet } from '../../components/ModalSheet';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ProgressBar } from '../../components/ProgressBar';
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
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function TeacherOmrScreen() {
  const navigation = useNavigation<Nav>();
  const content = useAppContent();
  const { accessToken } = useAuth();
  const layout = useResponsiveLayout();
  const [showUpload, setShowUpload] = useState(false);
  const [examCode, setExamCode] = useState('');
  const [fileUris, setFileUris] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { data, loading, error, reload } = useAsyncResource(
    async () => {
      if (!accessToken) {
        return {
          exams: [],
          batches: [],
        };
      }

      const [exams, batches] = await Promise.all([
        listExams(accessToken),
        listOmrBatches(accessToken),
      ]);

      return {
        exams,
        batches: batches.map(mapOmrBatchSummary),
      };
    },
    [accessToken],
  );
  const omrBatches = data?.batches ?? [];

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
        <Pressable style={styles.backRow} onPress={() => navigation.navigate('TeacherDashboard')}>
          <ArrowLeft size={16} color={palette.mutedForeground} />
          <AppText variant="label" color={palette.mutedForeground}>
            {content.common.buttons.backToHome}
          </AppText>
        </Pressable>
        <AppText variant="title" weight="bold">
          {content.teacher.omr.title}
        </AppText>
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
        {loading ? <LoadingState label={content.common.labels.loading} /> : null}
        {error ? (
          <ErrorState
            message={error}
            retryLabel={content.common.buttons.confirm}
            onRetry={reload}
          />
        ) : null}
        <Pressable onPress={() => setShowUpload(true)}>
          <SurfaceCard style={styles.heroCard}>
            <View style={styles.uploadIcon}>
              <Upload size={26} color={palette.white} />
            </View>
            <View style={styles.flex}>
              <AppText variant="body" weight="semibold" color={palette.white}>
                {content.teacher.omr.uploadTitle}
              </AppText>
              <AppText variant="label" color="rgba(255,255,255,0.76)">
                {`${content.teacher.omr.uploadSubtitle} • ${content.common.messages.uploadHint}`}
              </AppText>
            </View>
          </SurfaceCard>
        </Pressable>

        <AppText variant="headline" weight="semibold">
          {content.teacher.omr.historyTitle}
        </AppText>
        {omrBatches.map(batch => (
          <SurfaceCard key={batch.id} style={styles.batchCard}>
            <View style={styles.batchHead}>
              <View style={styles.flex}>
                <AppText variant="body" weight="medium">
                  {batch.examTitle}
                </AppText>
                <AppText variant="caption" color={palette.mutedForeground}>
                  {batch.createdAt}
                </AppText>
              </View>
              <StatusBadge status={batch.status} />
            </View>
            <ProgressBar
              progress={batch.progressPercentage}
              color={batch.status === 'COMPLETED' ? palette.success : palette.primary}
            />
            <View style={styles.batchMeta}>
              <AppText variant="caption" color={palette.mutedForeground}>
                {`${String(batch.successCount)} thành công • ${String(batch.failedCount)} lỗi • ${String(batch.totalFiles)} tổng`}
              </AppText>
              <AppText variant="caption" color={palette.mutedForeground}>
                {`${String(batch.progressPercentage)}%`}
              </AppText>
            </View>
          </SurfaceCard>
        ))}
      </View>

      <ModalSheet visible={showUpload} onClose={() => setShowUpload(false)}>
        <AppText variant="headline" weight="bold" style={styles.sheetTitle}>
          {content.teacher.omr.uploadTitle}
        </AppText>
        <SurfaceCard style={styles.dropZone}>
          <ImageIcon size={40} color={palette.primary} />
          <AppText variant="body" weight="medium" style={styles.center}>
            {content.teacher.omr.selectImages}
          </AppText>
          <AppText variant="caption" color={palette.mutedForeground} style={styles.center}>
            {content.common.messages.uploadHint}
          </AppText>
        </SurfaceCard>
        <TextInputField
          label="Mã hoặc tên đề thi"
          value={examCode}
          onChangeText={setExamCode}
          placeholder="Nhập tên đề thi"
        />
        <TextInputField
          label="File URI"
          value={fileUris}
          onChangeText={setFileUris}
          placeholder="uri1, uri2"
        />
        <PrimaryButton
          label={content.common.buttons.startScan}
          icon={<ScanLine size={18} color={palette.white} />}
          loading={submitting}
          onPress={async () => {
            if (!accessToken || !data) {
              return;
            }

            const normalizedExam = examCode.trim().toLowerCase();
            const exam = data.exams.find(
              (item) =>
                item.title.toLowerCase() === normalizedExam ||
                item.id.toLowerCase() === normalizedExam,
            );

            const files = fileUris
              .split(',')
              .map((item, index) => item.trim())
              .filter(Boolean)
              .map((uri, index) => ({
                uri,
                name: `omr-${index + 1}.jpg`,
              }));

            if (!exam || files.length === 0) {
              setSubmitError('Cần chọn đề thi hợp lệ và ít nhất một file URI');
              return;
            }

            setSubmitting(true);
            setSubmitError(null);

            try {
              await uploadOmrBatch(accessToken, {
                examId: exam.id,
                files,
              });
              setShowUpload(false);
              setExamCode('');
              setFileUris('');
              await reload();
            } catch (err) {
              setSubmitError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
            } finally {
              setSubmitting(false);
            }
          }}
          style={styles.sheetButton}
        />
        {submitError ? (
          <AppText variant="caption" color={palette.destructive}>
            {submitError}
          </AppText>
        ) : null}
      </ModalSheet>

      <BottomNav role="TEACHER" currentScreen="TeacherOMR" currentModule="omr" />
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
  body: {
    gap: appTheme.spacing.md,
  },
  heroCard: {
    backgroundColor: palette.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.spacing.lg,
  },
  uploadIcon: {
    width: 56,
    height: 56,
    borderRadius: appTheme.radius.lg,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
    gap: 4,
  },
  batchCard: {
    gap: appTheme.spacing.md,
  },
  batchHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: appTheme.spacing.md,
  },
  batchMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: appTheme.spacing.md,
    flexWrap: 'wrap',
  },
  sheetTitle: {
    marginBottom: appTheme.spacing.lg,
  },
  dropZone: {
    alignItems: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(91,91,214,0.25)',
    backgroundColor: '#F9F9FF',
    gap: appTheme.spacing.sm,
  },
  center: {
    textAlign: 'center',
  },
  sheetButton: {
    marginTop: appTheme.spacing.lg,
  },
});
