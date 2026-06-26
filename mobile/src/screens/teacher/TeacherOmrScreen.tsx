import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import {
  ArrowLeft,
  Check,
  FolderOpen,
  ImageIcon,
  ScanLine,
  Search,
  Upload,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  listOmrBatches,
  listOmrExams,
  mapExamSummary,
  mapOmrBatchSummary,
} from '../../api/edu-scan';
import { AppText } from '../../components/AppText';
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
import type { RootStackParamList } from '../../navigation/types';
import { useAuth } from '../../store/auth-store';
import { appTheme, palette } from '../../theme/tokens';
import { useResponsiveLayout } from '../../theme/responsive';
import { useOmrUpload } from '../../features/omr/application/useOmrUpload';
import { useToast } from '../../app/ToastProvider';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function TeacherOmrScreen() {
  const navigation = useNavigation<Nav>();
  const content = useAppContent();
  const { accessToken } = useAuth();
  const layout = useResponsiveLayout();
  const [showUpload, setShowUpload] = useState(false);
  const [examSearch, setExamSearch] = useState('');
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const { data, loading, error, reload } = useAsyncResource(
    async () => {
      if (!accessToken) {
        return {
          batches: [],
        };
      }

      const batches = await listOmrBatches(accessToken);

      return {
        batches: batches.map(mapOmrBatchSummary),
      };
    },
    [accessToken],
  );
  const { data: omrExamOptions } = useAsyncResource(
    async () => {
      if (!accessToken) {
        return [];
      }

      const exams = await listOmrExams(accessToken);
      return exams.map(mapExamSummary);
    },
    [accessToken],
  );
  const omrBatches = data?.batches ?? [];
  const filteredExams = useMemo(() => {
    const keyword = examSearch.trim().toLowerCase();
    if (!keyword) {
      return omrExamOptions ?? [];
    }

    return (omrExamOptions ?? []).filter((item) =>
      [item.title, ...item.classNames].join(' ').toLowerCase().includes(keyword),
    );
  }, [examSearch, omrExamOptions]);
  const { showToast } = useToast();
  const prevBatchesRef = useRef<typeof omrBatches>([]);
  const [showSourceOptions, setShowSourceOptions] = useState(false);

  const { selectedFiles, submitting, submitError, pickFiles, submit } =
    useOmrUpload({
      accessToken,
      onUploaded: reload,
    });

  useEffect(() => {
    if (prevBatchesRef.current.length > 0) {
      omrBatches.forEach((batch) => {
        const prevBatch = prevBatchesRef.current.find((b) => b.id === batch.id);
        if (
          prevBatch &&
          (prevBatch.status === 'PENDING' || prevBatch.status === 'PROCESSING') &&
          batch.status !== 'PENDING' &&
          batch.status !== 'PROCESSING'
        ) {
          if (batch.status === 'COMPLETED') {
            showToast(
              `Đã xử lý xong phiếu OMR đề: ${batch.examTitle} (${batch.successCount}/${batch.totalFiles} thành công)!`
            );
          } else if (batch.status === 'PARTIAL_FAILED') {
            showToast(
              `Đã xử lý xong phiếu OMR đề: ${batch.examTitle} (${batch.successCount} thành công, ${batch.failedCount} lỗi)!`
            );
          } else {
            showToast(
              `Xử lý thất bại toàn bộ phiếu OMR đề: ${batch.examTitle}!`
            );
          }
        }
      });
    }
    prevBatchesRef.current = omrBatches;
  }, [omrBatches, showToast]);

  useEffect(() => {
    const hasActiveBatch = omrBatches.some(
      (batch) => batch.status === 'PENDING' || batch.status === 'PROCESSING'
    );

    if (!hasActiveBatch) {
      return;
    }

    const interval = setInterval(() => {
      void reload();
    }, 3000);

    return () => clearInterval(interval);
  }, [omrBatches, reload]);

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
        <Pressable
          style={styles.backRow}
          onPress={() =>
            navigation.navigate('TeacherTabs', { screen: 'TeacherDashboard' })
          }
        >
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
          <Pressable
            key={batch.id}
            onPress={() =>
              navigation.navigate('TeacherOmrBatchDetail', { batchId: batch.id })
            }
          >
            <SurfaceCard style={styles.batchCard}>
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
          </Pressable>
        ))}
      </View>

      <ModalSheet visible={showUpload} onClose={() => setShowUpload(false)}>
        <AppText variant="headline" weight="bold" style={styles.sheetTitle}>
          {content.teacher.omr.uploadTitle}
        </AppText>
        {showSourceOptions ? (
          <View style={styles.inlineSourceContainer}>
            <Pressable
              style={styles.inlineSourceButton}
              onPress={() => {
                setShowSourceOptions(false);
                void pickFiles();
              }}
            >
              <FolderOpen size={24} color={palette.primary} />
              <AppText variant="caption" weight="semibold" color={palette.primary}>
                Chọn trong Tệp
              </AppText>
            </Pressable>
            <View style={styles.inlineDivider} />
            <Pressable
              style={styles.inlineSourceButton}
              onPress={() => {
                setShowSourceOptions(false);
                void pickFiles();
              }}
            >
              <ImageIcon size={24} color={palette.primary} />
              <AppText variant="caption" weight="semibold" color={palette.primary}>
                Chọn trong Ảnh
              </AppText>
            </Pressable>
            <View style={styles.inlineDivider} />
            <Pressable
              style={styles.inlineSourceCancelButton}
              onPress={() => setShowSourceOptions(false)}
            >
              <AppText variant="caption" weight="semibold" color={palette.mutedForeground}>
                Hủy
              </AppText>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => setShowSourceOptions(true)}>
            <SurfaceCard style={styles.dropZone}>
              <ImageIcon size={40} color={palette.primary} />
              <AppText variant="body" weight="medium" style={styles.center}>
                {content.teacher.omr.selectImages}
              </AppText>
              <AppText
                variant="caption"
                color={palette.mutedForeground}
                style={styles.center}
              >
                {content.common.messages.uploadHint}
              </AppText>
            </SurfaceCard>
          </Pressable>
        )}
        <TextInputField
          label="Tìm đề thi OMR"
          value={examSearch}
          onChangeText={setExamSearch}
          placeholder="Nhập tên đề hoặc lớp"
          trailing={<Search size={18} color={palette.mutedForeground} />}
        />
        <View style={styles.examList}>
          {(filteredExams ?? []).map((exam) => {
            const selected = selectedExamId === exam.id;

            return (
              <Pressable
                key={exam.id}
                style={[styles.examOption, selected ? styles.examOptionActive : null]}
                onPress={() => setSelectedExamId(exam.id)}
              >
                <View style={styles.flex}>
                  <AppText
                    variant="body"
                    weight="medium"
                    color={selected ? palette.white : palette.foreground}
                  >
                    {exam.title}
                  </AppText>
                  <AppText
                    variant="caption"
                    color={selected ? 'rgba(255,255,255,0.76)' : palette.mutedForeground}
                  >
                    {`${String(exam.questionCount)} câu • ${exam.classNames.join(', ') || 'Chưa gán lớp'}`}
                  </AppText>
                </View>
                {selected ? <Check size={16} color={palette.white} /> : null}
              </Pressable>
            );
          })}
        </View>
        <TextInputField
          label="Ảnh đã chọn"
          value={
            selectedFiles.length
              ? selectedFiles.map((item) => item.name).join(', ')
              : ''
          }
          editable={false}
          placeholder="Chưa có ảnh nào được chọn"
        />
        <PrimaryButton
          label={content.common.buttons.startScan}
          icon={<ScanLine size={18} color={palette.white} />}
          loading={submitting}
          onPress={async () => {
            const uploaded = await submit(selectedExamId ?? '');
            if (uploaded) {
              setShowUpload(false);
              setExamSearch('');
              setSelectedExamId(null);
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
  examList: {
    gap: appTheme.spacing.sm,
  },
  examOption: {
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
  examOptionActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  inlineSourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(91,91,214,0.25)',
    backgroundColor: '#F9F9FF',
    borderRadius: appTheme.radius.md,
    padding: appTheme.spacing.lg,
    gap: appTheme.spacing.md,
  },
  inlineSourceButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: appTheme.spacing.xs,
    paddingVertical: appTheme.spacing.sm,
    backgroundColor: palette.white,
    borderRadius: appTheme.radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(91,91,214,0.12)',
    ...appTheme.shadows.card,
  },
  inlineDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(91,91,214,0.15)',
  },
  inlineSourceCancelButton: {
    paddingHorizontal: appTheme.spacing.sm,
    paddingVertical: appTheme.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
