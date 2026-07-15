import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, Pressable, ScrollView } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import {
  FileText,
  ChevronLeft,
  MessageSquare,
  Edit2,
  Maximize,
} from 'lucide-react-native';

import {
  getAssignmentSubmit,
  gradeAssignmentSubmit,
  listAssignments,
} from '../../api/edu-scan';
import { AppText } from '../../components/AppText';
import { PageHeader } from '../../components/PageHeader';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SurfaceCard } from '../../components/SurfaceCard';
import { TextInputField } from '../../components/TextInputField';
import { Screen } from '../../components/Screen';
import { ErrorState, LoadingState } from '../../components/RequestState';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { DocumentViewerModal } from '../../components/DocumentViewerModal';
import { useAuth } from '../../store/auth-store';
import { useAppContent } from '../../hooks/useAppContent';
import { palette } from '../../theme/tokens';
import { useResponsiveLayout } from '../../theme/responsive';
import { formatVietnameseDate } from '../../utils/format';
import { formatFileSize } from '../../features/assignments/domain/assignment-file-utils';
import type { RootStackParamList } from '../../navigation/types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function TeacherSubmitDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'TeacherSubmitDetail'>>();
  const content = useAppContent();
  const { accessToken } = useAuth();
  const layout = useResponsiveLayout();

  const { assignmentId, submitId } = route.params;

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState('');
  const [previewMimeType, setPreviewMimeType] = useState('');

  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');

  const openPreview = (url: string | null | undefined, name: string | null | undefined, mime: string | null | undefined) => {
    if (!url) return;
    setPreviewUrl(url);
    setPreviewFileName(name || 'Tài liệu');
    setPreviewMimeType(mime || '');
  };

  const { data, loading, error, reload } = useAsyncResource(
    async () => {
      if (!accessToken) return null;
      const [submit, assignments] = await Promise.all([
        getAssignmentSubmit(accessToken, assignmentId, submitId),
        listAssignments(accessToken),
      ]);
      const assignment = assignments.find(a => a.id === assignmentId);
      return { submit, assignment };
    },
    [accessToken, assignmentId, submitId]
  );

  useEffect(() => {
    if (data?.submit) {
      setScore(data.submit.score !== null ? String(data.submit.score) : '');
      setFeedback(data.submit.feedback || '');
    }
  }, [data]);

  const handleGrade = async () => {
    if (!accessToken) return;
    if (!score) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      await gradeAssignmentSubmit(accessToken, assignmentId, submitId, {
        score: Number(score),
        feedback: feedback || undefined,
      });
      await reload();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !data) {
    return (
      <Screen refreshing={loading} onRefresh={() => void reload()}>
        <LoadingState label={content.common.labels.loading} />
      </Screen>
    );
  }

  if (error || !data?.submit) {
    return (
      <Screen refreshing={loading} onRefresh={() => void reload()}>
        <ErrorState
          message={error || 'Không tìm thấy bài nộp'}
          retryLabel={content.common.buttons.back}
          onRetry={() => navigation.goBack()}
        />
      </Screen>
    );
  }

  const { submit, assignment } = data;

  return (
    <>
      <Screen>
        <PageHeader
          title="Chi tiết bài nộp"
          subtitle={submit.student?.name || 'Học sinh'}
          onBack={() => navigation.goBack()}
          leadingVisual={<ChevronLeft size={24} color={palette.foreground} />}
        />

        <ScrollView contentContainerStyle={[styles.body, { maxWidth: layout.contentMaxWidth, alignSelf: 'center', width: '100%', paddingHorizontal: layout.horizontalPadding, paddingBottom: 100 }]}>
          <SurfaceCard style={styles.submitCard}>
            <View style={styles.submitHead}>
              <View style={styles.avatarCircle}>
                <AppText variant="label" weight="bold" color={palette.secondaryForeground}>
                  {submit.student?.name?.charAt(0) || '?'}
                </AppText>
              </View>
              <View style={styles.flex}>
                <AppText variant="body" weight="medium">
                  {submit.student?.name || 'Unknown student'}
                </AppText>
                <AppText variant="caption" color={palette.mutedForeground}>
                  {submit.student?.studentCode || 'No code'} • {formatVietnameseDate(submit.submittedAt)}
                </AppText>
              </View>
              {submit.score !== null ? (
                <View style={styles.scoreBadge}>
                  <AppText variant="label" weight="bold" color={palette.primary}>
                    {submit.score}
                  </AppText>
                </View>
              ) : null}
            </View>

            {submit.note ? (
              <View style={styles.noteBox}>
                <MessageSquare size={14} color={palette.mutedForeground} style={{ marginTop: 2 }} />
                <AppText variant="body" color={palette.foreground} style={{ flex: 1 }}>
                  {submit.note}
                </AppText>
              </View>
            ) : null}

            {submit.attachments && submit.attachments.length > 0 ? (
              <View style={styles.fileSection}>
                {submit.attachments.map((attachment, idx) => {
                  const isImage = attachment.mimeType?.startsWith('image/');
                  return isImage ? (
                    <View key={attachment.publicId || idx} style={[styles.imagePreviewContainer, { marginBottom: 8 }]}>
                      <Image 
                        source={{ uri: attachment.url }} 
                        style={styles.imagePreview} 
                        resizeMode="contain" 
                      />
                      <Pressable
                        style={styles.expandIconContainer}
                        onPress={() => openPreview(attachment.url, attachment.originalName, attachment.mimeType)}
                      >
                        <Maximize size={20} color="#fff" />
                      </Pressable>
                      <View style={styles.fileRow}>
                        <FileText size={15} color={palette.primary} />
                        <View style={styles.flex}>
                          <AppText variant="label" weight="semibold" color={palette.primary} numberOfLines={1} ellipsizeMode="middle">
                            {attachment.originalName ?? 'Hình ảnh đính kèm'}
                          </AppText>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <Pressable
                      key={attachment.publicId || idx}
                      style={[styles.fileRowOutline, { marginBottom: 8 }]}
                      onPress={() => openPreview(attachment.url, attachment.originalName, attachment.mimeType)}
                    >
                      <FileText size={16} color={palette.primary} />
                      <AppText variant="label" weight="semibold" color={palette.primary} style={{ flex: 1 }} numberOfLines={1} ellipsizeMode="middle">
                        {attachment.originalName ?? 'Tệp đính kèm'}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {/* Grading Area */}
            <View style={styles.gradeArea}>
              <AppText variant="label" weight="semibold" style={{ marginBottom: 8 }}>
                Chấm điểm & Nhận xét
              </AppText>
              <TextInputField
                label="Điểm"
                value={score}
                onChangeText={setScore}
                keyboardType="numeric"
                placeholder={`/ ${assignment?.maxScore ?? 10}`}
              />
              <TextInputField
                label="Nhận xét"
                value={feedback}
                onChangeText={setFeedback}
                placeholder="Nhập nhận xét..."
              />
              <PrimaryButton
                label={submit.score !== null ? 'Cập nhật điểm' : 'Chấm điểm'}
                onPress={handleGrade}
                loading={submitting}
                icon={<Edit2 size={16} color={palette.white} />}
                style={{ marginTop: 8 }}
              />
              {submitError ? (
                <AppText variant="caption" color={palette.destructive} style={{ marginTop: 8 }}>
                  {submitError}
                </AppText>
              ) : null}
            </View>
          </SurfaceCard>
        </ScrollView>
      </Screen>

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
    paddingVertical: 16,
  },
  submitCard: {
    padding: 16,
    marginBottom: 8,
  },
  submitHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: palette.secondary,
    borderRadius: 16,
  },
  noteBox: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    backgroundColor: palette.muted,
    borderRadius: 8,
    marginBottom: 16,
  },
  fileSection: {
    marginVertical: 16,
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
    backgroundColor: '#000',
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
    gap: 8,
    padding: 12,
  },
  fileRowOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
  },
  gradeArea: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    gap: 12,
  },
});
