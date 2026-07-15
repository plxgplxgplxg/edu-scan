/* eslint-disable react/no-unstable-nested-components, no-void, react-native/no-inline-styles */
import React, { useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import {
  BookOpen,
  Clock,
  FileText,
  Link,
  Upload,
  X,
} from 'lucide-react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  getClassDetail,
  listAssignments,
  mapClassDetail,
  mapStudentAssignmentSummary,
} from '../../api/edu-scan';
import { AppText } from '../../components/AppText';
import { FilterChips } from '../../components/FilterChips';
import { ModalSheet } from '../../components/ModalSheet';
import { PageHeader } from '../../components/PageHeader';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ErrorState, LoadingState } from '../../components/RequestState';
import { DocumentViewerModal } from '../../components/DocumentViewerModal';
import { Screen } from '../../components/Screen';
import { StatusBadge } from '../../components/StatusBadge';
import { SurfaceCard } from '../../components/SurfaceCard';
import { TextInputField } from '../../components/TextInputField';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { useAppContent } from '../../hooks/useAppContent';
import { useAuth } from '../../store/auth-store';
import { appTheme, palette } from '../../theme/tokens';
import { useResponsiveLayout } from '../../theme/responsive';
import { primaryHeroGradient } from '../../theme/header';
import { formatVietnameseDate, isExpired } from '../../utils/format';
import type { RootStackParamList } from '../../navigation/types';
import { useAssignmentSubmission } from '../../features/assignments/application/useAssignmentSubmission';
import { formatFileSize } from '../../features/assignments/domain/assignment-file-utils';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type TabKey = 'assignments' | 'info';

export function StudentClassDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'StudentClassDetail'>>();
  const content = useAppContent();
  const { accessToken } = useAuth();
  const layout = useResponsiveLayout();
  const classId = route.params?.classId;
  const assignmentIdParam = route.params?.assignmentId;
  const modeParam = route.params?.mode;
  
  const [tab, setTab] = useState<TabKey>('assignments');
  const [showSubmit, setShowSubmit] = useState<string | null>(null);
  const [submitNote, setSubmitNote] = useState('');

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState('');
  const [previewMimeType, setPreviewMimeType] = useState('');

  const openPreview = (url: string | null | undefined, name: string | null | undefined, mime: string | null | undefined) => {
    if (!url) return;
    setPreviewUrl(url);
    setPreviewFileName(name || 'Tài liệu');
    setPreviewMimeType(mime || '');
  };

  const { data, loading, error, reload } = useAsyncResource(
    async () => {
      if (!accessToken || !classId) {
        return null;
      }

      const [classItem, assignments] = await Promise.all([
        getClassDetail(accessToken, classId),
        listAssignments(accessToken),
      ]);

      const classMap = new Map([[classItem.id, classItem]]);
      return {
        currentClass: mapClassDetail(classItem),
        assignments: assignments
          .filter((item) => item.classId === classItem.id)
          .map((item) => mapStudentAssignmentSummary(item, classMap)),
      };
    },
    [accessToken, classId],
  );

  const classAssignments = useMemo(
    () => data?.assignments ?? [],
    [data?.assignments],
  );
  const {
    selectedFile,
    submitting,
    submitError,
    pickFile,
    clearSelectedFile,
    submitAssignmentContent,
  } = useAssignmentSubmission({
    accessToken,
    onSubmitted: reload,
  });
  const handleRefresh = () => {
    reload().catch(() => undefined);
  };

  React.useEffect(() => {
    if (data?.assignments && modeParam === 'submit' && assignmentIdParam) {
      const assignment = data.assignments.find((a) => a.id === assignmentIdParam);
      if (assignment) {
        const expired = isExpired(assignment.deadline);
        if (!assignment.submitted && (!expired || assignment.allowLate)) {
          setShowSubmit(assignmentIdParam);
        } else {
          setShowSubmit(null);
        }
      }
    }
  }, [data, modeParam, assignmentIdParam]);

  if (!data && loading) {
    return (
      <Screen refreshing={loading} onRefresh={handleRefresh}>
        <LoadingState label={content.common.labels.loading} />
      </Screen>
    );
  }

  if (!data && error) {
    return (
      <Screen refreshing={loading} onRefresh={handleRefresh}>
        <ErrorState
          message={error}
          retryLabel={content.common.buttons.retry}
          onRetry={reload}
        />
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen>
        <ErrorState
          message="Không tìm thấy lớp học"
          retryLabel={content.common.buttons.back}
          onRetry={() => navigation.goBack()}
        />
      </Screen>
    );
  }

  const { currentClass } = data;
  const activeSubmitAssignment = classAssignments.find(item => item.id === showSubmit) ?? null;
  const activeSubmitExpired = activeSubmitAssignment ? isExpired(activeSubmitAssignment.deadline) : false;
  const canSubmitActiveAssignment =
    !!activeSubmitAssignment &&
    !submitting &&
    (!!submitNote.trim() || !!selectedFile) &&
    (!activeSubmitExpired || activeSubmitAssignment.allowLate) &&
    activeSubmitAssignment.gradeStatus !== 'GRADED';

  return (
    <>
    <Screen refreshing={loading} onRefresh={handleRefresh}>
      <PageHeader
        backLabel={content.student.classes.title}
        title={currentClass.name}
        subtitle={`${currentClass.subject} • ${content.common.labels.teacher}: ${currentClass.teacherName ?? ''}`}
        gradient={primaryHeroGradient}
        onBack={() => navigation.navigate('StudentTabs', { screen: 'StudentClasses' })}
        leadingVisual={<BookOpen size={32} color={palette.white} />}
      />

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
          value={tab}
          items={[
            { id: 'assignments', label: `${content.common.tabs.assignments} (${String(classAssignments.length)})` },
            { id: 'info', label: content.student.classes.classInfoTitle },
          ]}
          onChange={setTab}
        />

        {tab === 'assignments' ? (
          <View style={styles.section}>
            {classAssignments.map(item => {
              const expired = isExpired(item.deadline);

              return (
                <SurfaceCard key={item.id} style={styles.assignmentCard}>
                  <View style={[styles.assignmentHead, layout.isCompact ? styles.assignmentHeadStack : null]}>
                    <View style={styles.flex}>
                      <AppText variant="body" weight="medium">
                        {item.title}
                      </AppText>
                      {item.description ? (
                        <AppText variant="caption" color={palette.mutedForeground}>
                          {item.description}
                        </AppText>
                      ) : null}
                    </View>
                    {item.gradeStatus ? <StatusBadge status={item.gradeStatus} /> : null}
                  </View>
                  <View style={styles.metaRow}>
                    <View style={styles.inlineMeta}>
                      <Clock size={12} color={expired && !item.submitted ? palette.destructive : palette.mutedForeground} />
                      <AppText
                        variant="caption"
                        color={expired && !item.submitted ? palette.destructive : palette.mutedForeground}
                      >
                        {`${content.common.form.deadline}: ${formatVietnameseDate(item.deadline)}`}
                      </AppText>
                    </View>
                    {item.submitStatus ? <StatusBadge status={item.submitStatus} /> : null}
                  </View>
                  {item.allowLate && !item.submitted ? (
                    <AppText variant="caption" color={palette.warning}>
                      {`${content.common.messages.lateAllowed} • ${String(item.latePenaltyPct)}%`}
                    </AppText>
                  ) : null}
                  {item.instructionFileUrl ? (
                    <Pressable
                      style={styles.fileRow}
                      onPress={() => {
                        openPreview(item.instructionFileUrl, item.instructionFileOriginalName, item.instructionFileMimeType);
                      }}
                    >
                      <FileText size={16} color={palette.primary} />
                      <View style={styles.flex}>
                        <AppText variant="label" weight="semibold" color={palette.primary} numberOfLines={1} ellipsizeMode="middle">
                          {item.instructionFileOriginalName ?? 'File hướng dẫn'}
                        </AppText>
                        <AppText variant="caption" color={palette.mutedForeground}>
                          {`${item.instructionFileMimeType ?? 'Tài liệu'} • ${formatFileSize(item.instructionFileSizeBytes)}`}
                        </AppText>
                      </View>
                    </Pressable>
                  ) : null}
                  {item.submitted ? (
                    <View style={styles.submittedBox}>
                      <AppText variant="label" weight="semibold" color={palette.success}>
                        Đã nộp {item.submittedAt ? `• ${formatVietnameseDate(item.submittedAt)}` : ''}
                      </AppText>
                      {item.submitStatus ? <StatusBadge status={item.submitStatus} /> : null}
                      {item.submittedNote ? (
                        <AppText variant="caption" color={palette.mutedForeground}>
                          {item.submittedNote}
                        </AppText>
                      ) : null}
                      {item.submittedFileUrl ? (
                        <Pressable
                          style={styles.fileRow}
                          onPress={() => {
                            openPreview(item.submittedFileUrl, item.submittedFileOriginalName, item.submittedFileMimeType);
                          }}
                        >
                          <FileText size={16} color={palette.primary} />
                          <View style={styles.flex}>
                            <AppText variant="label" weight="semibold" color={palette.primary}>
                              {item.submittedFileOriginalName ?? 'File bài làm'}
                            </AppText>
                            <AppText variant="caption" color={palette.mutedForeground}>
                              {`${item.submittedFileMimeType ?? 'Tài liệu'} • ${formatFileSize(item.submittedFileSizeBytes)}`}
                            </AppText>
                          </View>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}
                  {!item.submitted && (!expired || item.allowLate) ? (
                    <PrimaryButton
                      label={content.common.buttons.submitAssignment}
                      icon={<Upload size={18} color={palette.white} />}
                      onPress={() => setShowSubmit(item.id)}
                    />
                  ) : null}
                  {!item.submitted && expired && !item.allowLate ? (
                    <SurfaceCard style={styles.expiredState}>
                      <AppText variant="caption" color={palette.destructive}>
                        {content.common.messages.expiredAssignment}
                      </AppText>
                    </SurfaceCard>
                  ) : null}
                </SurfaceCard>
              );
            })}
          </View>
        ) : null}

        {tab === 'info' ? (
          <View style={styles.section}>
            {[
              { label: content.common.form.className, value: currentClass.name },
              { label: content.common.form.subject, value: currentClass.subject },
              { label: content.roles.TEACHER, value: currentClass.teacherName ?? '' },
              { label: content.common.form.schoolYear, value: currentClass.schoolYear },
              { label: content.student.classes.classInfoTitle, value: currentClass.code },
            ].map(item => (
              <SurfaceCard
                key={item.label}
                style={[styles.infoCard, layout.isCompact ? styles.infoCardStack : null]}
              >
                <AppText variant="caption" color={palette.mutedForeground}>
                  {item.label}
                </AppText>
                <AppText variant="body" weight="medium">
                  {item.value}
                </AppText>
              </SurfaceCard>
            ))}
          </View>
        ) : null}
      </View>
    </Screen>

      <ModalSheet
        visible={!!showSubmit}
        onClose={() => {
          setShowSubmit(null);
          setSubmitNote('');
          clearSelectedFile();
        }}
      >
        <AppText variant="headline" weight="bold" style={styles.sheetTitle}>
          {content.common.buttons.submitAssignment}
        </AppText>
        <AppText variant="body" color={palette.mutedForeground} style={styles.sheetSubtitle}>
          {activeSubmitAssignment?.title ?? ''}
        </AppText>
        <TextInputField
          label="Ghi chú"
          value={submitNote}
          onChangeText={setSubmitNote}
          placeholder="Nhập ghi chú bài làm"
        />
        <TextInputField
          label="File bài làm"
          value={selectedFile?.name ?? ''}
          editable={false}
          placeholder="Chưa có tệp nào được chọn"
          trailing={<Link size={16} color={palette.mutedForeground} />}
        />
        {selectedFile ? (
          <SurfaceCard style={styles.selectedFileCard}>
            <View style={styles.flex}>
              <AppText variant="body" weight="medium">
                {selectedFile.name}
              </AppText>
              <AppText variant="caption" color={palette.mutedForeground}>
                {`${selectedFile.type || 'application/octet-stream'} • ${formatFileSize(selectedFile.size)}`}
              </AppText>
            </View>
            <Pressable onPress={clearSelectedFile}>
              <X size={18} color={palette.destructive} />
            </Pressable>
          </SurfaceCard>
        ) : null}
        <AppText variant="caption" color={palette.mutedForeground} style={styles.sheetHint}>
          PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, TXT, ZIP hoặc ẢNH • tối đa 20MB
        </AppText>
        <PrimaryButton
          label="Chọn tệp"
          variant="outline"
          onPress={() => {
            pickFile().catch(() => undefined);
          }}
        />
        <PrimaryButton
          label={content.common.buttons.submitAssignment}
          loading={submitting}
          disabled={!canSubmitActiveAssignment}
          onPress={async () => {
            if (!showSubmit) {
              return;
            }

            const submitted = await submitAssignmentContent(showSubmit, submitNote);
            if (submitted) {
              setShowSubmit(null);
              setSubmitNote('');
            }
          }}
        />
        {submitError ? (
          <AppText variant="caption" color={palette.destructive}>
            {submitError}
          </AppText>
        ) : null}
      </ModalSheet>
      <DocumentViewerModal
        visible={!!previewUrl}
        onClose={() => setPreviewUrl(null)}
        url={previewUrl}
        fileName={previewFileName}
        mimeType={previewMimeType}
      />
    </>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: appTheme.spacing.lg,
  },
  section: {
    gap: appTheme.spacing.md,
  },
  assignmentCard: {
    gap: appTheme.spacing.md,
  },
  assignmentHead: {
    flexDirection: 'row',
    gap: appTheme.spacing.md,
  },
  assignmentHeadStack: {
    flexWrap: 'wrap',
  },
  flex: {
    flex: 1,
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.spacing.md,
    flexWrap: 'wrap',
  },
  inlineMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.spacing.sm,
    paddingVertical: appTheme.spacing.xs,
  },
  submittedBox: {
    gap: appTheme.spacing.xs,
    paddingTop: appTheme.spacing.xs,
  },
  expiredState: {
    backgroundColor: palette.destructiveSoft,
    borderWidth: 0,
  },
  infoCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: appTheme.spacing.md,
  },
  infoCardStack: {
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  sheetTitle: {
    marginBottom: appTheme.spacing.sm,
  },
  sheetSubtitle: {
    marginBottom: appTheme.spacing.lg,
  },
  sheetHint: {
    marginVertical: appTheme.spacing.md,
  },
  selectedFileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.spacing.md,
  },
});
