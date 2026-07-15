import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Image, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import {
  FileText,
  Clock,
  CheckCircle,
  ChevronLeft,
  MessageSquare,
  Edit2,
  Maximize,
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
import { FilterChips } from '../../components/FilterChips';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { DocumentViewerModal } from '../../components/DocumentViewerModal';
import { useAuth } from '../../store/auth-store';
import { useAppContent } from '../../hooks/useAppContent';
import { palette } from '../../theme/tokens';
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

  const [activeTab, setActiveTab] = useState<'info' | 'submits'>('info');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState('');
  const [previewMimeType, setPreviewMimeType] = useState('');

  const openPreview = (url: string | null | undefined, name: string | null | undefined, mime: string | null | undefined) => {
    if (!url) return;
    setPreviewUrl(url);
    setPreviewFileName(name || 'Tài liệu');
    setPreviewMimeType(mime || '');
  };
  
  // Pagination State for Submits
  const [submits, setSubmits] = useState<AssignmentSubmitApi[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingSubmits, setLoadingSubmits] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [gradeForms, setGradeForms] = useState<Record<string, { score: string; feedback: string }>>({});

  const { data: assignmentData, loading: loadingAssignment, error: assignmentError, reload: reloadAssignment } = useAsyncResource(
    async () => {
      if (!accessToken || !classId) return null;

      const [classItem, assignments] = await Promise.all([
        getClassDetail(accessToken, classId),
        listAssignments(accessToken),
      ]);

      const detail = mapClassDetail(classItem);
      const classMap = new Map([[classItem.id, classItem]]);
      const assignmentList = assignments
        .filter((item) => item.classId === classItem.id)
        .map((item) => mapTeacherAssignmentSummary(item, classMap));

      const assignment = assignmentList.find(a => a.id === assignmentId);

      return {
        currentClass: detail,
        assignment,
      };
    },
    [accessToken, classId, assignmentId],
  );

  const assignment = assignmentData?.assignment;

  const fetchSubmits = useCallback(async (pageNum: number, isLoadMore = false) => {
    if (!accessToken) return;
    
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoadingSubmits(true);
    }

    try {
      const res = await getAssignmentSubmits(accessToken, assignmentId, pageNum, 10);
      
      setSubmits(prev => isLoadMore ? [...prev, ...res.items] : res.items);
      setTotalPages(res.totalPages);
      setPage(res.page);

      // Initialize grade forms for new items
      setGradeForms(prev => {
        const newForms = { ...prev };
        res.items.forEach(s => {
          if (!newForms[s.id]) {
            newForms[s.id] = {
              score: s.score === null ? '' : String(s.score),
              feedback: s.feedback ?? '',
            };
          }
        });
        return newForms;
      });

    } catch {
      // ignore
    } finally {
      setLoadingSubmits(false);
      setLoadingMore(false);
    }
  }, [accessToken, assignmentId]);

  useEffect(() => {
    void fetchSubmits(1);
  }, [fetchSubmits]);

  const handleLoadMore = () => {
    if (!loadingMore && page < totalPages) {
      void fetchSubmits(page + 1, true);
    }
  };

  const handleRefresh = async () => {
    await reloadAssignment();
    await fetchSubmits(1);
  };

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
      // Refresh only the submit item locally or re-fetch current page?
      // Re-fetch page 1 to simple refresh or update local state
      await fetchSubmits(1);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  if (!assignmentData && loadingAssignment) {
    return (
      <Screen refreshing={loadingAssignment} onRefresh={handleRefresh}>
        <LoadingState label={content.common.labels.loading} />
      </Screen>
    );
  }

  if (assignmentError || (!assignment && !loadingAssignment)) {
    return (
      <Screen refreshing={loadingAssignment} onRefresh={handleRefresh}>
        <ErrorState
          message={assignmentError || "Không tìm thấy bài tập"}
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

  const renderInfo = () => (
    <SurfaceCard style={styles.assignmentCard}>
      <AppText variant="headline" weight="bold" style={{ marginBottom: 8 }}>
        {assignment.title}
      </AppText>
      {assignment.description ? (
        <AppText variant="body" color={palette.mutedForeground} style={{ marginBottom: 16 }}>
          {assignment.description}
        </AppText>
      ) : null}

      {/* File Attachments */}
      {assignment.attachments && assignment.attachments.length > 0 ? (
        <View style={styles.fileSection}>
          {assignment.attachments.map((attachment, idx) => {
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
                      {attachment.originalName ?? 'Hình ảnh'}
                    </AppText>
                    <AppText variant="caption" color={palette.mutedForeground}>
                      {`${attachment.mimeType} • ${formatFileSize(attachment.sizeBytes)}`}
                    </AppText>
                  </View>
                </View>
              </View>
            ) : (
              <Pressable
                key={attachment.publicId || idx}
                style={[styles.fileRow, { padding: 12, backgroundColor: palette.background, borderRadius: 8, borderWidth: 1, borderColor: palette.border, marginBottom: 8 }]}
                onPress={() => {
                  openPreview(attachment.url, attachment.originalName, attachment.mimeType);
                }}
              >
                <FileText size={20} color={palette.primary} />
                <View style={styles.flex}>
                  <AppText variant="label" weight="semibold" color={palette.primary} numberOfLines={1} ellipsizeMode="middle">
                    {attachment.originalName ?? 'File hướng dẫn'}
                  </AppText>
                  <AppText variant="caption" color={palette.mutedForeground}>
                    {`${attachment.mimeType ?? 'Tài liệu'} • ${formatFileSize(attachment.sizeBytes)}`}
                  </AppText>
                </View>
              </Pressable>
            );
          })}
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
  );

  const renderSubmitItem = ({ item: submit }: { item: AssignmentSubmitApi }) => {
    return (
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
  };

  const renderHeader = () => (
    <View style={{ gap: layout.sectionGap, marginBottom: 16 }}>
      <FilterChips
        items={[
          { label: 'Thông tin bài tập', id: 'info' },
          { label: `Bài nộp (${submitCount})`, id: 'submits' },
        ]}
        value={activeTab}
        onChange={(val) => setActiveTab(val as 'info' | 'submits')}
      />

      {activeTab === 'info' ? renderInfo() : (
        submitError ? (
          <AppText variant="caption" color={palette.destructive} style={{ marginTop: 8 }}>
            {submitError}
          </AppText>
        ) : null
      )}
    </View>
  );

  const renderEmptySubmits = () => (
    <SurfaceCard style={{ padding: 24, alignItems: 'center' }}>
      <AppText variant="body" color={palette.mutedForeground}>
        Chưa có học sinh nào nộp bài.
      </AppText>
    </SurfaceCard>
  );

  const renderFooter = () => (
    loadingMore ? <ActivityIndicator size="small" color={palette.primary} style={{ padding: 16 }} /> : null
  );

  return (
    <>
    <Screen scrollable={false}>
      <PageHeader
        title={assignment.title}
        subtitle={`${classCode || ''} • Bài tập`}
        onBack={() => navigation.goBack()}
        leadingVisual={<ChevronLeft size={24} color={palette.foreground} />}
      />

      <FlatList
        data={activeTab === 'submits' ? submits : []}
        keyExtractor={(item) => item.id}
        renderItem={renderSubmitItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={activeTab === 'submits' && !loadingSubmits ? renderEmptySubmits : null}
        ListFooterComponent={activeTab === 'submits' ? renderFooter : null}
        onEndReached={activeTab === 'submits' ? handleLoadMore : null}
        onEndReachedThreshold={0.5}
        contentContainerStyle={[styles.body, { maxWidth: layout.contentMaxWidth, alignSelf: 'center', width: '100%', paddingHorizontal: layout.horizontalPadding, paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
        refreshing={loadingAssignment || (loadingSubmits && !loadingMore)}
        onRefresh={handleRefresh}
      />
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
