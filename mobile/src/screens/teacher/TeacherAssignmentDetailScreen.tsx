import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Linking, Image, Pressable } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import {
  FileText,
  Clock,
  CheckCircle,
  ChevronLeft,
  MessageSquare,
  Edit2,
} from 'lucide-react-native';

import {
  getAssignmentSubmits,
  listAssignments,
  getClassDetail,
  mapClassDetail,
  mapTeacherAssignmentSummary,
  gradeAssignmentSubmit,
  type AssignmentSubmitApi,
} from '../../api/edu-scan';
import { AppText } from '../../components/AppText';
import { PageHeader } from '../../components/PageHeader';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ProgressBar } from '../../components/ProgressBar';
import { SurfaceCard } from '../../components/SurfaceCard';
import { TextInputField } from '../../components/TextInputField';
import { Screen } from '../../components/Screen';
import { ErrorState, LoadingState } from '../../components/RequestState';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { useAuth } from '../../store/auth-store';
import { useAppContent } from '../../hooks/useAppContent';
import { appTheme, palette } from '../../theme/tokens';
import { useResponsiveLayout } from '../../theme/responsive';
import { formatVietnameseDate, percentage } from '../../utils/format';
import { formatFileSize } from '../../features/assignments/domain/assignment-file-utils';
import type { RootStackParamList } from '../../navigation/types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function TeacherAssignmentDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'TeacherAssignmentDetail'>>();
  const content = useAppContent();
  const { accessToken } = useAuth();
  const layout = useResponsiveLayout();

  const { assignmentId, classId, classCode } = route.params;

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [gradeForms, setGradeForms] = useState<Record<string, { score: string; feedback: string }>>({});

  const { data, loading, error, reload } = useAsyncResource(
    async () => {
      if (!accessToken || !classId) return null;

      const [classItem, assignments, submits] = await Promise.all([
        getClassDetail(accessToken, classId),
        listAssignments(accessToken),
        getAssignmentSubmits(accessToken, assignmentId),
      ]);

      const detail = mapClassDetail(classItem);
      const classMap = new Map([[classItem.id, classItem]]);
      const assignmentList = assignments
        .filter((item) => item.classId === classItem.id)
        .map((item) => mapTeacherAssignmentSummary(item, classMap));

      const assignment = assignmentList.find(a => a.id === assignmentId);

      // Initialize grade forms
      const initialForms: Record<string, { score: string; feedback: string }> = {};
      submits.forEach(s => {
        initialForms[s.id] = {
          score: s.score === null ? '' : String(s.score),
          feedback: s.feedback ?? '',
        };
      });
      setGradeForms(initialForms);

      return {
        currentClass: detail,
        assignment,
        submits,
      };
    },
    [accessToken, classId, assignmentId],
  );

  const assignment = data?.assignment;
  const submits = data?.submits ?? [];

  const handleGrade = async (submitId: string) => {
    if (!accessToken) return;
    const form = gradeForms[submitId];
    if (!form || !form.score) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      await gradeAssignmentSubmit(accessToken, assignmentId, submitId, {
        score: Number(form.score),
        feedback: form.feedback || undefined,
      });
      await reload();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  if (!data && loading) {
    return (
      <Screen refreshing={loading} onRefresh={() => { void reload(); }}>
        <LoadingState label={content.common.labels.loading} />
      </Screen>
    );
  }

  if (error || (!assignment && !loading)) {
    return (
      <Screen refreshing={loading} onRefresh={() => { void reload(); }}>
        <ErrorState
          message={error || "Không tìm thấy bài tập"}
          retryLabel={content.common.buttons.back}
          onRetry={() => navigation.goBack()}
        />
      </Screen>
    );
  }

  if (!assignment) return null;

  const submitCount = assignment.submitCount ?? 0;
  const totalStudents = assignment.totalStudents ?? 0;
  const progress = percentage(submitCount, totalStudents);

  const isImageFile = assignment.instructionFileMimeType?.startsWith('image/');

  return (
    <Screen refreshing={loading} onRefresh={() => { void reload(); }}>
      <PageHeader
        title={assignment.title}
        subtitle={`${classCode || ''} • Bài tập`}
        onBack={() => navigation.goBack()}
        leadingVisual={<ChevronLeft size={24} color={palette.foreground} />}
      />

      <ScrollView contentContainerStyle={[styles.body, { maxWidth: layout.contentMaxWidth, alignSelf: 'center', width: '100%', paddingHorizontal: layout.horizontalPadding, gap: layout.sectionGap }]}>
        
        {/* Assignment Detail Card */}
        <SurfaceCard style={styles.assignmentCard}>
          <AppText variant="headline" weight="bold" style={{ marginBottom: 8 }}>
            {assignment.title}
          </AppText>
          {assignment.description ? (
            <AppText variant="body" color={palette.mutedForeground} style={{ marginBottom: 16 }}>
              {assignment.description}
            </AppText>
          ) : null}

          {/* File Attachment */}
          {assignment.instructionFileUrl ? (
            <View style={styles.fileSection}>
              {isImageFile ? (
                <View style={styles.imagePreviewContainer}>
                  <Image 
                    source={{ uri: assignment.instructionFileUrl }} 
                    style={styles.imagePreview} 
                    resizeMode="contain" 
                  />
                  <View style={styles.fileRow}>
                    <FileText size={15} color={palette.primary} />
                    <View style={styles.flex}>
                      <AppText variant="label" weight="semibold" color={palette.primary}>
                        {assignment.instructionFileOriginalName ?? 'Hình ảnh'}
                      </AppText>
                      <AppText variant="caption" color={palette.mutedForeground}>
                        {`${assignment.instructionFileMimeType} • ${formatFileSize(assignment.instructionFileSizeBytes)}`}
                      </AppText>
                    </View>
                  </View>
                </View>
              ) : (
                <Pressable
                  style={[styles.fileRow, { padding: 12, backgroundColor: palette.background, borderRadius: 8, borderWidth: 1, borderColor: palette.border }]}
                  onPress={() => {
                    void Linking.openURL(assignment.instructionFileUrl || '');
                  }}
                >
                  <FileText size={20} color={palette.primary} />
                  <View style={styles.flex}>
                    <AppText variant="label" weight="semibold" color={palette.primary}>
                      {assignment.instructionFileOriginalName ?? 'File hướng dẫn'}
                    </AppText>
                    <AppText variant="caption" color={palette.mutedForeground}>
                      {`${assignment.instructionFileMimeType ?? 'Tài liệu'} • ${formatFileSize(assignment.instructionFileSizeBytes)}`}
                    </AppText>
                  </View>
                </Pressable>
              )}
            </View>
          ) : null}

          <View style={styles.assignmentMeta}>
            <View style={styles.inlineMeta}>
              <Clock size={16} color={palette.mutedForeground} />
              <AppText variant="body" color={palette.mutedForeground}>
                {`${content.common.form.deadline}: ${formatVietnameseDate(assignment.deadline)}`}
              </AppText>
            </View>
            <View style={styles.inlineMeta}>
              <CheckCircle size={16} color={palette.success} />
              <AppText variant="body" color={palette.mutedForeground}>
                {`${submitCount}/${totalStudents} đã nộp`}
              </AppText>
            </View>
          </View>

          <View style={styles.progressRow}>
            <View style={styles.flex}>
              <ProgressBar progress={progress} color={progress === 100 ? palette.success : palette.primary} />
            </View>
            <AppText variant="caption" color={palette.mutedForeground}>
              {`${progress}%`}
            </AppText>
          </View>
        </SurfaceCard>

        {/* Submissions Section */}
        <AppText variant="headline" weight="bold">
          Danh sách bài nộp ({submits.length})
        </AppText>
        {submitError ? (
          <AppText variant="caption" color={palette.destructive}>
            {submitError}
          </AppText>
        ) : null}

        {submits.length === 0 ? (
          <SurfaceCard style={{ padding: 24, alignItems: 'center' }}>
            <AppText variant="body" color={palette.mutedForeground}>
              Chưa có học sinh nào nộp bài.
            </AppText>
          </SurfaceCard>
        ) : (
          submits.map((submit) => {
            const isSubmitImage = submit.fileMimeType?.startsWith('image/');
            return (
              <SurfaceCard key={submit.id} style={styles.submitCard}>
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

                {submit.fileUrl ? (
                  <View style={styles.fileSection}>
                    {isSubmitImage ? (
                      <View style={styles.imagePreviewContainer}>
                        <Image 
                          source={{ uri: submit.fileUrl }} 
                          style={styles.imagePreview} 
                          resizeMode="contain" 
                        />
                        <View style={styles.fileRow}>
                          <FileText size={15} color={palette.primary} />
                          <View style={styles.flex}>
                            <AppText variant="label" weight="semibold" color={palette.primary}>
                              {submit.fileOriginalName ?? 'Hình ảnh đính kèm'}
                            </AppText>
                          </View>
                        </View>
                      </View>
                    ) : (
                      <Pressable
                        style={styles.fileRowOutline}
                        onPress={() => Linking.openURL(submit.fileUrl || '')}
                      >
                        <FileText size={16} color={palette.primary} />
                        <AppText variant="label" weight="semibold" color={palette.primary} style={{ flex: 1 }} numberOfLines={1}>
                          {submit.fileOriginalName ?? 'Tệp đính kèm'}
                        </AppText>
                      </Pressable>
                    )}
                  </View>
                ) : null}

                {/* Grading Area */}
                <View style={styles.gradeArea}>
                  <AppText variant="label" weight="semibold" style={{ marginBottom: 8 }}>
                    Chấm điểm & Nhận xét
                  </AppText>
                  <TextInputField
                    label="Điểm"
                    value={gradeForms[submit.id]?.score || ''}
                    onChangeText={(val) => setGradeForms(cur => ({ ...cur, [submit.id]: { ...cur[submit.id], score: val } }))}
                    keyboardType="numeric"
                    placeholder={`/ ${assignment.maxScore}`}
                  />
                  <TextInputField
                    label="Nhận xét"
                    value={gradeForms[submit.id]?.feedback || ''}
                    onChangeText={(val) => setGradeForms(cur => ({ ...cur, [submit.id]: { ...cur[submit.id], feedback: val } }))}
                    placeholder="Nhập nhận xét..."
                  />
                  <PrimaryButton
                    label={submit.score !== null ? 'Cập nhật điểm' : 'Chấm điểm'}
                    onPress={() => handleGrade(submit.id)}
                    loading={submitting}
                    icon={<Edit2 size={16} color={palette.white} />}
                    style={{ marginTop: 8 }}
                  />
                </View>
              </SurfaceCard>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingVertical: 16,
    paddingBottom: 40,
  },
  assignmentCard: {
    padding: 20,
    marginBottom: 8,
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
  flex: {
    flex: 1,
  },
  assignmentMeta: {
    flexDirection: 'column',
    gap: 8,
    marginVertical: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  inlineMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  gradeArea: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    gap: 12,
  },
});
