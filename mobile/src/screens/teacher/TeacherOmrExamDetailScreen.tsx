/* eslint-disable react/no-unstable-nested-components, no-void, react-native/no-inline-styles */
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, Image, Modal, Alert } from 'react-native';
import {
  ArrowLeft,
  Camera,
  FolderOpen,
  ImageIcon,
  ScanLine,
  Search,
  Upload,
  ChevronRight,
  Pencil,
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  getExamSubmissions,
  getOmrSubmissionDetail,
  updateSubmissionDetail,
  uploadOmrBatch,
} from '../../api/edu-scan';
import { AppText } from '../../components/AppText';
import { ModalSheet } from '../../components/ModalSheet';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ErrorState, LoadingState } from '../../components/RequestState';
import { Screen } from '../../components/Screen';
import { StatusBadge } from '../../components/StatusBadge';
import { SurfaceCard } from '../../components/SurfaceCard';
import { TextInputField } from '../../components/TextInputField';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import type { RootStackParamList } from '../../navigation/types';
import { useAuth } from '../../store/auth-store';
import { appTheme, palette } from '../../theme/tokens';
import { useResponsiveLayout } from '../../theme/responsive';
import { useOmrUpload } from '../../features/omr/application/useOmrUpload';
import { useToast } from '../../app/ToastProvider';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function TeacherOmrExamDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>();
  const examId = route.params?.examId as string;
  const { accessToken } = useAuth();
  const layout = useResponsiveLayout();
  const { showToast } = useToast();

  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [sortScore, setSortScore] = useState<'asc'|'desc'>('desc');
  const [showUpload, setShowUpload] = useState(false);
  const [showSourceOptions, setShowSourceOptions] = useState(false);

  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  const { data, loading, error, reload } = useAsyncResource(async () => {
    if (!accessToken || !examId) return null;
    return getExamSubmissions(accessToken, examId, page, keyword, undefined, sortScore);
  }, [accessToken, examId, page, keyword, sortScore]);

  const { selectedFiles, submitting, submitError, pickFiles, submit } =
    useOmrUpload({
      accessToken,
      onUploaded: async () => {
        await reload();
        showToast('Đã nộp các ảnh OMR để chấm!');
      },
    });

  const handleUploadClick = () => {
    setShowUpload(true);
  };

  const handleStartScan = async () => {
    if (selectedFiles.length === 0) {
      showToast('Vui lòng chọn ảnh trước khi quét!');
      return;
    }
    const success = await submit(examId);
    if (success) {
      setShowUpload(false);
    }
  };

  return (
    <Screen refreshing={loading && !!data} onRefresh={() => { void reload(); }}>
      <View style={[styles.container, { paddingHorizontal: layout.horizontalPadding, paddingTop: layout.sectionGap, paddingBottom: 100 }]}>
        
        {/* Header */}
        <Pressable style={styles.backRow} onPress={() => navigation.goBack()}>
          <ArrowLeft size={16} color={palette.mutedForeground} />
          <AppText variant="label" color={palette.mutedForeground}>Quay lại</AppText>
        </Pressable>

        <View style={styles.rowSpace}>
          <AppText variant="title" weight="bold">Chấm bài thi</AppText>
          <PrimaryButton 
            label="Chấm OMR" 
            icon={<ScanLine size={16} color={palette.white} />} 
            onPress={handleUploadClick}
          />
        </View>

        {/* Filters */}
        <View style={{ gap: appTheme.spacing.sm, marginTop: appTheme.spacing.md }}>
          <TextInputField
            label="Tìm kiếm"
            placeholder="Tìm theo tên học sinh, mã HS..."
            value={keyword}
            onChangeText={setKeyword}
            trailing={<Search size={18} color={palette.mutedForeground} />}
          />
          <Pressable onPress={() => setSortScore(s => s === 'desc' ? 'asc' : 'desc')}>
            <AppText variant="caption" color={palette.primary} weight="semibold">
              Sắp xếp theo điểm: {sortScore === 'desc' ? 'Cao -> Thấp' : 'Thấp -> Cao'}
            </AppText>
          </Pressable>
        </View>

        {error ? <ErrorState message={error} retryLabel="Thử lại" onRetry={() => void reload()} /> : null}
        {loading && !data ? <LoadingState label="Đang tải danh sách..." /> : null}

        {/* List submissions */}
        <View style={{ gap: appTheme.spacing.md, marginTop: appTheme.spacing.md }}>
          {data?.items.map(sub => (
            <Pressable key={sub.id} onPress={() => setSelectedSubmissionId(sub.id)}>
              <SurfaceCard style={styles.subCard}>
                <View style={{ flex: 1, gap: 4 }}>
                  <AppText variant="body" weight="bold">{sub.studentName || 'Chưa nhận diện'}</AppText>
                  <AppText variant="caption" color={palette.mutedForeground}>
                    Mã HS: {sub.studentCode || '?'} • Đề: {sub.resolvedTestCode || '?'}
                  </AppText>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <AppText variant="headline" weight="bold" color={palette.primary}>{sub.score ?? '-'}/{sub.maxScore ?? '-'}</AppText>
                  <StatusBadge status={sub.status} />
                </View>
              </SurfaceCard>
            </Pressable>
          ))}
          {data?.items.length === 0 && !loading && (
            <AppText variant="body" color={palette.mutedForeground} style={{ textAlign: 'center', marginTop: appTheme.spacing.xl }}>
              Chưa có lượt chấm nào cho bài thi này.
            </AppText>
          )}
        </View>

      </View>

      {/* Upload Modal */}
      <ModalSheet visible={showUpload} onClose={() => setShowUpload(false)}>
        <AppText variant="headline" weight="bold" style={{ marginBottom: appTheme.spacing.lg }}>
          Tải ảnh phiếu OMR lên
        </AppText>
        
        {showSourceOptions ? (
          <View style={styles.inlineSourceContainer}>
            <Pressable
              style={styles.inlineSourceButton}
              onPress={() => { setShowSourceOptions(false); void pickFiles(); }}
            >
              <FolderOpen size={24} color={palette.primary} />
              <AppText variant="caption" weight="semibold" color={palette.primary}>Tệp</AppText>
            </Pressable>
            <View style={styles.inlineDivider} />
            <Pressable
              style={styles.inlineSourceButton}
              onPress={() => { setShowSourceOptions(false); void pickFiles(); }}
            >
              <ImageIcon size={24} color={palette.primary} />
              <AppText variant="caption" weight="semibold" color={palette.primary}>Ảnh</AppText>
            </Pressable>
            <View style={styles.inlineDivider} />
            <Pressable
              style={styles.inlineSourceCancelButton}
              onPress={() => setShowSourceOptions(false)}
            >
              <AppText variant="caption" weight="semibold" color={palette.mutedForeground}>Hủy</AppText>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => setShowSourceOptions(true)}>
            <SurfaceCard style={styles.dropZone}>
              <ImageIcon size={40} color={palette.primary} />
              <AppText variant="body" weight="medium" style={styles.center}>
                Nhấn để chọn ảnh OMR
              </AppText>
            </SurfaceCard>
          </Pressable>
        )}

        <TextInputField
          label="Tên tệp/ảnh"
          value={selectedFiles.length ? selectedFiles.map((item) => item.name).join(', ') : ''}
          editable={false}
          placeholder="Chưa có ảnh nào được chọn"
        />

        <PrimaryButton
          label="Bắt đầu quét"
          icon={<ScanLine size={18} color={palette.white} />}
          loading={submitting}
          onPress={handleStartScan}
          style={{ marginTop: appTheme.spacing.lg }}
        />
        {submitError ? <AppText variant="caption" color={palette.destructive}>{submitError}</AppText> : null}
      </ModalSheet>

      {/* Detail Modal */}
      {selectedSubmissionId && (
        <SubmissionDetailModal 
          submissionId={selectedSubmissionId} 
          onClose={() => { setSelectedSubmissionId(null); reload(); }} 
        />
      )}

    </Screen>
  );
}

function SubmissionDetailModal({ submissionId, onClose }: { submissionId: string, onClose: () => void }) {
  const { accessToken } = useAuth();
  const [editingQuestion, setEditingQuestion] = useState<{ qNum: number, current: string | null } | null>(null);
  
  const { data: sub, loading, error, reload } = useAsyncResource(async () => {
    if (!accessToken) return null;
    return getOmrSubmissionDetail(accessToken, submissionId);
  }, [accessToken, submissionId]);

  const handleUpdateAnswer = async (qNum: number, answer: 'A'|'B'|'C'|'D') => {
    if (!accessToken) return;
    try {
      await updateSubmissionDetail(accessToken, submissionId, qNum, answer);
      setEditingQuestion(null);
      await reload();
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể cập nhật đáp án');
    }
  };

  return (
    <Modal visible={true} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: palette.background }}>
        <View style={[styles.backRow, { padding: appTheme.spacing.md, backgroundColor: palette.card }]}>
          <Pressable onPress={onClose} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <ArrowLeft size={20} color={palette.foreground} />
            <AppText variant="body" weight="semibold">Đóng</AppText>
          </Pressable>
        </View>
        <Screen>
          <View style={{ padding: appTheme.spacing.md, gap: appTheme.spacing.md }}>
            {loading ? <LoadingState label="Đang tải..." /> : null}
            {error ? <ErrorState message={error} retryLabel="Thử lại" onRetry={() => void reload()} /> : null}
            
            {sub && (
              <>
                <SurfaceCard style={{ gap: appTheme.spacing.md }}>
                  <AppText variant="headline" weight="bold">{sub.studentName ?? 'Unknown'}</AppText>
                  <View style={styles.rowSpace}>
                    <AppText variant="body" color={palette.mutedForeground}>Điểm:</AppText>
                    <AppText variant="title" weight="bold" color={palette.primary}>{sub.score}/{sub.maxScore}</AppText>
                  </View>
                  <View style={styles.rowSpace}>
                    <AppText variant="body" color={palette.mutedForeground}>Mã đề:</AppText>
                    <AppText variant="body" weight="semibold">{sub.resolvedTestCode ?? '?'}</AppText>
                  </View>
                </SurfaceCard>

                {sub.annotatedImageUrl && (
                  <SurfaceCard>
                    <AppText variant="body" weight="bold" style={{ marginBottom: 8 }}>Ảnh đã nhận diện</AppText>
                    <Image source={{ uri: sub.annotatedImageUrl }} style={{ width: '100%', height: 300, resizeMode: 'contain' }} />
                  </SurfaceCard>
                )}

                <AppText variant="headline" weight="bold">Chi tiết đáp án</AppText>
                {sub.details?.map(d => (
                  <SurfaceCard key={d.questionNumber} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                      <AppText variant="body" weight="bold">Câu {d.questionNumber}</AppText>
                      {editingQuestion?.qNum === d.questionNumber ? (
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          {(['A','B','C','D'] as const).map(ans => (
                            <Pressable 
                              key={ans} 
                              onPress={() => handleUpdateAnswer(d.questionNumber, ans)}
                              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center' }}
                            >
                              <AppText variant="body" weight="bold" color={palette.white}>{ans}</AppText>
                            </Pressable>
                          ))}
                          <Pressable onPress={() => setEditingQuestion(null)} style={{ justifyContent: 'center', paddingHorizontal: 8 }}>
                            <AppText variant="caption" color={palette.mutedForeground}>Hủy</AppText>
                          </Pressable>
                        </View>
                      ) : (
                        <>
                          <AppText variant="body" color={d.isCorrect ? palette.success : palette.destructive} weight="bold">
                            {d.finalAnswer || d.detectedAnswer || 'Chưa tô'}
                          </AppText>
                          {!d.isCorrect && (
                            <AppText variant="caption" color={palette.mutedForeground}>(Đúng: {d.correctAnswer})</AppText>
                          )}
                        </>
                      )}
                    </View>
                    {!editingQuestion && (
                      <Pressable onPress={() => setEditingQuestion({ qNum: d.questionNumber, current: d.finalAnswer })}>
                        <Pencil size={18} color={palette.primary} />
                      </Pressable>
                    )}
                  </SurfaceCard>
                ))}
              </>
            )}
          </View>
        </Screen>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'center', width: '100%', maxWidth: 600, gap: appTheme.spacing.md },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowSpace: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  subCard: { flexDirection: 'row', alignItems: 'center', gap: appTheme.spacing.md },
  inlineSourceContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(91,91,214,0.25)', backgroundColor: '#F9F9FF', borderRadius: appTheme.radius.md, padding: appTheme.spacing.lg, gap: appTheme.spacing.md },
  inlineSourceButton: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: appTheme.spacing.xs, paddingVertical: appTheme.spacing.sm, backgroundColor: palette.white, borderRadius: appTheme.radius.sm, borderWidth: 1, borderColor: 'rgba(91,91,214,0.12)' },
  inlineDivider: { width: 1, height: 40, backgroundColor: 'rgba(91,91,214,0.15)' },
  inlineSourceCancelButton: { paddingHorizontal: appTheme.spacing.sm, paddingVertical: appTheme.spacing.sm, justifyContent: 'center', alignItems: 'center' },
  dropZone: { alignItems: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(91,91,214,0.25)', backgroundColor: '#F9F9FF', gap: appTheme.spacing.sm },
  center: { textAlign: 'center' },
});
