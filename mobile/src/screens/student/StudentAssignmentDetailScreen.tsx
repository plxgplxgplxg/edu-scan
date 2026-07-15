/* eslint-disable react-native/no-inline-styles */
import React, { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, Clock, FileText, Maximize, MessageSquare, Upload, X } from 'lucide-react-native';

import {
  getClassDetail,
  listAssignments,
  mapClassDetail,
  mapStudentAssignmentSummary,
} from '../../api/edu-scan';
import { AppText } from '../../components/AppText';
import { DocumentViewerModal } from '../../components/DocumentViewerModal';
import { ErrorState, LoadingState } from '../../components/RequestState';
import { ModalSheet } from '../../components/ModalSheet';
import { PageHeader } from '../../components/PageHeader';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen } from '../../components/Screen';
import { StatusBadge } from '../../components/StatusBadge';
import { SurfaceCard } from '../../components/SurfaceCard';
import { TextInputField } from '../../components/TextInputField';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { useAppContent } from '../../hooks/useAppContent';
import { useAuth } from '../../store/auth-store';
import { appTheme, palette } from '../../theme/tokens';
import { useResponsiveLayout } from '../../theme/responsive';
import { formatVietnameseDate, isExpired } from '../../utils/format';
import { useAssignmentSubmission } from '../../features/assignments/application/useAssignmentSubmission';
import { formatFileSize } from '../../features/assignments/domain/assignment-file-utils';
import type { AttachmentMetadata } from '../../types/domain';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type DetailRoute = RouteProp<RootStackParamList, 'StudentAssignmentDetail'>;

export function StudentAssignmentDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<DetailRoute>();
  const content = useAppContent();
  const { accessToken } = useAuth();
  const layout = useResponsiveLayout();
  const { assignmentId, classId, classCode, mode } = route.params;

  const [showSubmit, setShowSubmit] = useState(mode === 'submit');
  const [isEditingSubmit, setIsEditingSubmit] = useState(false);
  const [submitNote, setSubmitNote] = useState('');
  const [retainedAttachments, setRetainedAttachments] = useState<AttachmentMetadata[]>([]);
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
      if (!accessToken || !classId) return null;

      const [classItem, assignments] = await Promise.all([
        getClassDetail(accessToken, classId),
        listAssignments(accessToken),
      ]);
      const classMap = new Map([[classItem.id, classItem]]);
      const assignment = assignments
        .filter(item => item.classId === classItem.id)
        .map(item => mapStudentAssignmentSummary(item, classMap))
        .find(item => item.id === assignmentId);

      return {
        currentClass: mapClassDetail(classItem),
        assignment,
      };
    },
    [accessToken, classId, assignmentId],
  );

  const assignment = data?.assignment;
  const expired = assignment ? isExpired(assignment.deadline) : false;

  const {
    selectedFiles,
    submitting,
    submitError,
    pickFiles,
    removeFile,
    clearSelectedFiles,
    submitAssignmentContent,
    updateSubmissionContent,
  } = useAssignmentSubmission({
    accessToken,
    onSubmitted: reload,
  });

  const canSubmit = useMemo(
    () =>
      !!assignment &&
      !submitting &&
      (!!submitNote.trim() || selectedFiles.length > 0 || retainedAttachments.length > 0) &&
      (!expired || assignment.allowLate) &&
      assignment.gradeStatus !== 'GRADED',
    [assignment, expired, retainedAttachments.length, selectedFiles.length, submitNote, submitting],
  );

  const closeSubmitSheet = () => {
    setShowSubmit(false);
    setIsEditingSubmit(false);
    setSubmitNote('');
    setRetainedAttachments([]);
    clearSelectedFiles();
  };

  const handleEditSubmit = () => {
    if (!assignment) return;
    setIsEditingSubmit(true);
    setSubmitNote(assignment.submittedNote || '');
    setRetainedAttachments(assignment.submittedAttachments || []);
    clearSelectedFiles();
    setShowSubmit(true);
  };

  const removeRetainedAttachment = (idx: number) => {
    setRetainedAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const renderAttachment = (attachment: AttachmentMetadata, idx: number, fallbackName: string) => {
    const isImage = attachment.mimeType?.startsWith('image/');

    if (isImage) {
      return (
        <View key={attachment.publicId || idx} style={styles.imagePreviewContainer}>
          <Image source={{ uri: attachment.url }} style={styles.imagePreview} resizeMode="contain" />
          <Pressable
            style={styles.expandIconContainer}
            onPress={() => openPreview(attachment.url, attachment.originalName, attachment.mimeType)}
          >
            <Maximize size={20} color={palette.white} />
          </Pressable>
          <View style={styles.fileRow}>
            <FileText size={15} color={palette.primary} />
            <View style={styles.flex}>
              <AppText variant="label" weight="semibold" color={palette.primary} numberOfLines={1} ellipsizeMode="middle">
                {attachment.originalName ?? fallbackName}
              </AppText>
              <AppText variant="caption" color={palette.mutedForeground}>
                {`${attachment.mimeType ?? 'Hình ảnh'} • ${formatFileSize(attachment.sizeBytes)}`}
              </AppText>
            </View>
          </View>
        </View>
      );
    }

    return (
      <Pressable
        key={attachment.publicId || idx}
        style={styles.fileRowOutline}
        onPress={() => openPreview(attachment.url, attachment.originalName, attachment.mimeType)}
      >
        <FileText size={18} color={palette.primary} />
        <View style={styles.flex}>
          <AppText variant="label" weight="semibold" color={palette.primary} numberOfLines={1} ellipsizeMode="middle">
            {attachment.originalName ?? fallbackName}
          </AppText>
          <AppText variant="caption" color={palette.mutedForeground}>
            {`${attachment.mimeType ?? 'Tài liệu'} • ${formatFileSize(attachment.sizeBytes)}`}
          </AppText>
        </View>
      </Pressable>
    );
  };

  const handleSubmit = async () => {
    if (!assignment) return;
    const success = isEditingSubmit
      ? await updateSubmissionContent(assignment.id, submitNote, retainedAttachments)
      : await submitAssignmentContent(assignment.id, submitNote);

    if (success) closeSubmitSheet();
  };

  if (!data && loading) {
    return (
      <Screen refreshing={loading} onRefresh={() => reload().catch(() => undefined)}>
        <LoadingState label={content.common.labels.loading} />
      </Screen>
    );
  }

  if (error || !assignment) {
    return (
      <Screen refreshing={loading} onRefresh={() => reload().catch(() => undefined)}>
        <ErrorState
          message={error || 'Không tìm thấy bài tập'}
          retryLabel={content.common.buttons.back}
          onRetry={() => navigation.goBack()}
        />
      </Screen>
    );
  }

  const canOpenSubmit = (!expired || assignment.allowLate) && assignment.gradeStatus !== 'GRADED';

  return (
    <>
      <Screen refreshing={loading} onRefresh={() => reload().catch(() => undefined)}>
        <PageHeader
          title={assignment.title}
          subtitle={`${classCode || data?.currentClass.code || ''} • Bài tập`}
          onBack={() => navigation.goBack()}
          leadingVisual={<ChevronLeft size={24} color={palette.foreground} />}
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
          <SurfaceCard style={styles.assignmentCard}>
            <AppText variant="headline" weight="bold">
              {assignment.title}
            </AppText>
            {assignment.description ? (
              <AppText variant="body" color={palette.mutedForeground}>
                {assignment.description}
              </AppText>
            ) : null}

            {assignment.attachments?.length ? (
              <View style={styles.fileSection}>
                <AppText variant="label" weight="semibold">
                  Tệp bài tập
                </AppText>
                {assignment.attachments.map((attachment, idx) => renderAttachment(attachment, idx, 'File hướng dẫn'))}
              </View>
            ) : null}

            <View style={styles.metaRow}>
              <Clock size={16} color={expired && !assignment.submitted ? palette.destructive : palette.mutedForeground} />
              <AppText
                variant="body"
                color={expired && !assignment.submitted ? palette.destructive : palette.mutedForeground}
              >
                {`${content.common.form.deadline}: ${formatVietnameseDate(assignment.deadline)}`}
              </AppText>
            </View>
            {assignment.allowLate && !assignment.submitted ? (
              <AppText variant="caption" color={palette.warning}>
                {`${content.common.messages.lateAllowed} • ${String(assignment.latePenaltyPct)}%`}
              </AppText>
            ) : null}
          </SurfaceCard>

          {assignment.submitted ? (
            <SurfaceCard style={styles.assignmentCard}>
              <View style={styles.rowSpace}>
                <AppText variant="body" weight="bold">
                  Bài nộp
                </AppText>
                {assignment.submitStatus ? <StatusBadge status={assignment.submitStatus} /> : null}
              </View>
              {assignment.submittedAt ? (
                <AppText variant="caption" color={palette.mutedForeground}>
                  {formatVietnameseDate(assignment.submittedAt)}
                </AppText>
              ) : null}
              {assignment.submittedNote ? (
                <View style={styles.noteBox}>
                  <MessageSquare size={14} color={palette.mutedForeground} style={{ marginTop: 2 }} />
                  <AppText variant="body" color={palette.foreground} style={styles.flex}>
                    {assignment.submittedNote}
                  </AppText>
                </View>
              ) : null}
              {assignment.submittedAttachments?.length ? (
                <View style={styles.fileSection}>
                  {assignment.submittedAttachments.map((attachment, idx) => renderAttachment(attachment, idx, 'File bài làm'))}
                </View>
              ) : null}
              {assignment.gradeStatus ? <StatusBadge status={assignment.gradeStatus} /> : null}
              {assignment.score !== null ? (
                <AppText variant="body" weight="bold" color={palette.primary}>
                  {`Điểm: ${String(assignment.score)} / ${String(assignment.maxScore)}`}
                </AppText>
              ) : null}
              {canOpenSubmit ? (
                <PrimaryButton
                  label="Sửa bài nộp"
                  variant="outline"
                  icon={<Upload size={18} color={palette.primary} />}
                  onPress={handleEditSubmit}
                />
              ) : null}
            </SurfaceCard>
          ) : canOpenSubmit ? (
            <PrimaryButton
              label={content.common.buttons.submitAssignment}
              icon={<Upload size={18} color={palette.white} />}
              onPress={() => setShowSubmit(true)}
            />
          ) : (
            <SurfaceCard style={styles.expiredState}>
              <AppText variant="caption" color={palette.destructive}>
                {content.common.messages.expiredAssignment}
              </AppText>
            </SurfaceCard>
          )}
        </View>
      </Screen>

      <ModalSheet visible={showSubmit} onClose={closeSubmitSheet}>
        <AppText variant="headline" weight="bold" style={styles.sheetTitle}>
          {isEditingSubmit ? 'Cập nhật bài nộp' : content.common.buttons.submitAssignment}
        </AppText>
        <AppText variant="body" color={palette.mutedForeground} style={styles.sheetSubtitle}>
          {assignment.title}
        </AppText>
        <TextInputField
          label="Ghi chú"
          value={submitNote}
          onChangeText={setSubmitNote}
          placeholder="Nhập ghi chú bài làm"
        />
        {retainedAttachments.map((attachment, idx) => (
          <SurfaceCard key={attachment.publicId || idx} style={styles.selectedFileCard}>
            <View style={styles.flex}>
              <AppText variant="body" weight="medium">
                {attachment.originalName}
              </AppText>
              <AppText variant="caption" color={palette.mutedForeground}>
                {`${attachment.mimeType} • ${formatFileSize(attachment.sizeBytes)}`}
              </AppText>
            </View>
            <Pressable onPress={() => removeRetainedAttachment(idx)}>
              <X size={18} color={palette.destructive} />
            </Pressable>
          </SurfaceCard>
        ))}
        {selectedFiles.map((file, idx) => (
          <SurfaceCard key={`${file.uri}-${idx}`} style={styles.selectedFileCard}>
            <View style={styles.flex}>
              <AppText variant="body" weight="medium">
                {file.name}
              </AppText>
              <AppText variant="caption" color={palette.mutedForeground}>
                {`${file.type || 'application/octet-stream'} • ${formatFileSize(file.size)}`}
              </AppText>
            </View>
            <Pressable onPress={() => removeFile(idx)}>
              <X size={18} color={palette.destructive} />
            </Pressable>
          </SurfaceCard>
        ))}
        <AppText variant="caption" color={palette.mutedForeground} style={styles.sheetHint}>
          PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, TXT, ZIP hoặc ẢNH • tối đa 20MB
        </AppText>
        <PrimaryButton label="Chọn tệp" variant="outline" onPress={() => pickFiles().catch(() => undefined)} />
        <PrimaryButton
          label={isEditingSubmit ? 'Cập nhật' : content.common.buttons.submitAssignment}
          loading={submitting}
          disabled={!canSubmit}
          onPress={handleSubmit}
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
  assignmentCard: {
    gap: appTheme.spacing.md,
  },
  flex: {
    flex: 1,
  },
  fileSection: {
    gap: appTheme.spacing.sm,
    marginTop: appTheme.spacing.sm,
  },
  imagePreviewContainer: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: 'hidden',
    backgroundColor: palette.background,
  },
  imagePreview: {
    width: '100%',
    height: 250,
    backgroundColor: palette.foreground,
  },
  expandIconContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 16,
    padding: 6,
    zIndex: 10,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.spacing.sm,
    padding: appTheme.spacing.md,
  },
  fileRowOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.spacing.sm,
    padding: appTheme.spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.background,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.spacing.sm,
    flexWrap: 'wrap',
  },
  rowSpace: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: appTheme.spacing.md,
  },
  noteBox: {
    flexDirection: 'row',
    gap: appTheme.spacing.sm,
    padding: appTheme.spacing.md,
    backgroundColor: palette.muted,
    borderRadius: 8,
  },
  expiredState: {
    backgroundColor: palette.destructiveSoft,
    borderWidth: 0,
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
