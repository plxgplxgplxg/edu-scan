/* eslint-disable react/no-unstable-nested-components, no-void, react-native/no-inline-styles */
import React, { useState } from 'react';
import { Pressable, StyleSheet, View, Image, Modal, Alert, ScrollView } from 'react-native';
import { ArrowLeft, ImageIcon, ScanLine, ChevronRight, Pencil, Settings } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  getExamSubmissions,
  getExamDetail,
  getOmrSubmissionDetail,
  updateSubmissionDetail,
} from '../../api/edu-scan';
import { AppText } from '../../components/AppText';
import { ModalSheet } from '../../components/ModalSheet';
import { ErrorState, LoadingState } from '../../components/RequestState';
import { Screen } from '../../components/Screen';
import { PageHeader } from '../../components/PageHeader';
import { SurfaceCard } from '../../components/SurfaceCard';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import type { RootStackParamList } from '../../navigation/types';
import { useAuth } from '../../store/auth-store';
import { appTheme, palette } from '../../theme/tokens';
import { primaryHeroGradient } from '../../theme/header';
import { useResponsiveLayout } from '../../theme/responsive';
import { useOmrUpload } from '../../features/omr/application/useOmrUpload';
import { useToast } from '../../app/ToastProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatVietnameseDate } from '../../utils/format';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function TeacherOmrExamDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>();
  const examId = route.params?.examId as string;
  const { accessToken } = useAuth();
  const layout = useResponsiveLayout();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const [tab, setTab] = useState<'overview' | 'submissions' | 'settings'>('overview');
  const [page] = useState(1);
  const [keyword] = useState('');
  const [sortScore] = useState<'asc'|'desc'>('desc');
  const [showUpload, setShowUpload] = useState(false);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  const { data: exam, loading: examLoading } = useAsyncResource(async () => {
    if (!accessToken || !examId) return null;
    return getExamDetail(accessToken, examId);
  }, [accessToken, examId]);

  const { data: submissionsData, loading: subLoading, reload } = useAsyncResource(async () => {
    if (!accessToken || !examId) return null;
    return getExamSubmissions(accessToken, examId, page, keyword, undefined, sortScore);
  }, [accessToken, examId, page, keyword, sortScore]);

  const { pickFiles } =
    useOmrUpload({
      accessToken,
      onUploaded: async () => {
        await reload();
        showToast('Đã nộp các ảnh OMR để chấm!');
      },
    });

  const loading = examLoading || subLoading;

  // Header Derived Values
  const title = exam?.title || 'Đang tải...';
  const overline = exam?.classes?.length ? `${exam.classes[0].subject} • ${exam.classes.map(c => c.name).join(', ')}` : (exam?.title ? 'Đề thi' : 'Đang tải...');
  const subtitleParts = [
    exam?.questionCount ? `${exam.questionCount} câu` : undefined,
    exam?.createdAt ? `Tạo ngày ${formatVietnameseDate(exam.createdAt)}` : undefined,
  ].filter(Boolean);
  const subtitle = subtitleParts.join(' • ');

  const getStatusStyle = (status?: string) => {
    if (status === 'PUBLISHED') return { bg: '#E2F2FF', color: palette.info }; // Sẵn sàng
    return { bg: '#FFF1DB', color: palette.warning }; // Bản nháp
  };
  const getStatusLabel = (status?: string) => {
    if (status === 'PUBLISHED') return 'Sẵn sàng';
    return 'Bản nháp';
  };
  const sStyle = getStatusStyle(exam?.status);

  const statusBadge = exam?.status !== 'PUBLISHED' ? (
    <View style={{ backgroundColor: sStyle.bg, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 }}>
      <AppText variant="caption" weight="bold" color={sStyle.color}>{getStatusLabel(exam?.status)}</AppText>
    </View>
  ) : undefined;

  const summary = React.useMemo(() => {
    if (!submissionsData?.items || submissionsData.items.length === 0) {
      return { avgCorrect: 0, maxCorrect: 0, minCorrect: 0 };
    }
    const counts = submissionsData.items.map(s => s.correctCount ?? 0);
    if (counts.length === 0) return { avgCorrect: 0, maxCorrect: 0, minCorrect: 0 };
    const maxCorrect = Math.max(...counts);
    const minCorrect = Math.min(...counts);
    const avgCorrect = counts.reduce((a, b) => a + b, 0) / counts.length;
    return { avgCorrect, maxCorrect, minCorrect };
  }, [submissionsData?.items]);

  const metrics = [
    { value: String(submissionsData?.total || 0), label: 'Đã chấm' },
    { value: summary.avgCorrect.toFixed(1), label: 'Câu đúng TB' },
    { value: String(submissionsData?.items?.filter(i => i.status === 'NEEDS_REVIEW').length || 0), label: 'Cần xem lại' },
  ];

  // Render Tabs Content
  const renderOverview = () => {
    const keys = exam?.variants?.[0]?.answerKeys || [];

    return (
      <View style={{ gap: appTheme.spacing.md }}>
        <SurfaceCard>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <ScanLine size={20} color={palette.primary} />
            <AppText variant="headline" weight="bold" color={palette.primary}>Thống kê nhanh</AppText>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <View style={{ flex: 1, minWidth: '45%', backgroundColor: palette.background, padding: 16, borderRadius: 12 }}>
              <AppText variant="title" weight="bold" color={palette.primary}>{submissionsData?.total || 0}</AppText>
              <AppText variant="body" color={palette.mutedForeground}>Số bài</AppText>
            </View>
            <View style={{ flex: 1, minWidth: '45%', backgroundColor: palette.background, padding: 16, borderRadius: 12 }}>
              <AppText variant="title" weight="bold" color={palette.primary}>{summary.avgCorrect.toFixed(1)}</AppText>
              <AppText variant="body" color={palette.mutedForeground}>Câu đúng TB</AppText>
            </View>
            <View style={{ flex: 1, minWidth: '45%', backgroundColor: palette.background, padding: 16, borderRadius: 12 }}>
              <AppText variant="title" weight="bold" color={palette.primary}>{summary.maxCorrect}</AppText>
              <AppText variant="body" color={palette.mutedForeground}>Cao nhất</AppText>
            </View>
            <View style={{ flex: 1, minWidth: '45%', backgroundColor: palette.background, padding: 16, borderRadius: 12 }}>
              <AppText variant="title" weight="bold" color={palette.primary}>{summary.minCorrect}</AppText>
              <AppText variant="body" color={palette.mutedForeground}>Thấp nhất</AppText>
            </View>
          </View>
        </SurfaceCard>

        <SurfaceCard>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Pencil size={20} color={palette.primary} />
            <AppText variant="headline" weight="bold" color={palette.primary}>Đáp án mẫu</AppText>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {keys.length > 0 ? keys.map(k => (
              <View key={k.questionNumber} style={{ width: '18%', aspectRatio: 1, backgroundColor: '#F3E8FF', borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
                <AppText variant="caption" color={palette.mutedForeground}>Câu {k.questionNumber}</AppText>
                <AppText variant="body" weight="bold" color={palette.primary}>{k.correctAnswer}</AppText>
              </View>
            )) : (
              <AppText variant="body" color={palette.mutedForeground}>Chưa có đáp án mẫu cho đề thi này.</AppText>
            )}
          </View>
        </SurfaceCard>
      </View>
    );
  };

  const renderSubmissions = () => {
    return (
      <View style={{ gap: appTheme.spacing.md }}>
        {submissionsData?.items?.map(sub => (
          <Pressable key={sub.id} onPress={() => setSelectedSubmissionId(sub.id)}>
            <SurfaceCard style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: '#F3E8FF', alignItems: 'center', justifyContent: 'center' }}>
                <AppText variant="headline" weight="bold" color={palette.primary}>{sub.correctCount ?? '-'}</AppText>
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="body" weight="bold">SBD: {sub.studentCode || 'Chưa nhận diện'}</AppText>
                <AppText variant="caption" color={palette.mutedForeground}>{sub.correctCount ?? 0}/{exam?.questionCount ?? sub.maxScore ?? 0} câu đúng</AppText>
              </View>

              <ChevronRight size={20} color={palette.mutedForeground} />
            </SurfaceCard>
          </Pressable>
        ))}
        {(!submissionsData?.items || submissionsData?.items?.length === 0) && !loading && (
          <AppText variant="body" color={palette.mutedForeground} style={{ textAlign: 'center', marginTop: appTheme.spacing.xl }}>
            Chưa có lượt chấm nào.
          </AppText>
        )}
      </View>
    );
  };

  const renderSettings = () => {
    return (
      <View style={{ gap: appTheme.spacing.md }}>
        <Pressable onPress={() => navigation.navigate('TeacherOmrExamBuilder', { examId, initialStep: 1 })}>
          <SurfaceCard style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3E8FF', alignItems: 'center', justifyContent: 'center' }}>
              <Settings size={20} color={palette.primary} />
            </View>
            <AppText variant="body" weight="bold" style={{ flex: 1 }}>Sửa thông tin đề thi</AppText>
            <ChevronRight size={20} color={palette.mutedForeground} />
          </SurfaceCard>
        </Pressable>
        <Pressable onPress={() => navigation.navigate('TeacherOmrExamBuilder', { examId, initialStep: 3 })}>
          <SurfaceCard style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3E8FF', alignItems: 'center', justifyContent: 'center' }}>
              <Pencil size={20} color={palette.primary} />
            </View>
            <AppText variant="body" weight="bold" style={{ flex: 1 }}>Cập nhật đáp án</AppText>
            <ChevronRight size={20} color={palette.mutedForeground} />
          </SurfaceCard>
        </Pressable>
      </View>
    );
  };

  return (
    <Screen refreshing={loading} onRefresh={() => { void reload(); }}>
      <PageHeader
        title={title}
        overline={overline}
        subtitle={subtitle}
        gradient={primaryHeroGradient}
        actionIcon={statusBadge}
        onBack={() => navigation.goBack()}
        metrics={metrics}
      />

      <View style={{ flex: 1, paddingHorizontal: layout.horizontalPadding, paddingTop: 16, paddingBottom: 100, maxWidth: layout.contentMaxWidth, alignSelf: 'center', width: '100%' }}>
        
        {/* Segmented Control */}
        <View style={{ flexDirection: 'row', backgroundColor: '#F9F9FF', borderRadius: 24, padding: 4, marginBottom: 24 }}>
          {(['overview', 'submissions', 'settings'] as const).map(t => {
            const label = t === 'overview' ? 'Tổng quan' : t === 'submissions' ? 'Bài chấm' : 'Cài đặt';
            const isActive = tab === t;
            return (
              <Pressable 
                key={t}
                onPress={() => setTab(t)}
                style={{ flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: isActive ? palette.white : 'transparent', borderRadius: 20, shadowColor: isActive ? '#000' : 'transparent', shadowOpacity: 0.05, shadowRadius: 4, elevation: isActive ? 2 : 0 }}
              >
                <AppText variant="body" weight="bold" color={isActive ? palette.primary : palette.mutedForeground}>{label}</AppText>
              </Pressable>
            );
          })}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          {tab === 'overview' && renderOverview()}
          {tab === 'submissions' && renderSubmissions()}
          {tab === 'settings' && renderSettings()}
        </ScrollView>
      </View>

      {/* Floating Bottom Bar */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: layout.horizontalPadding, paddingVertical: 24, paddingBottom: insets.bottom + 24, flexDirection: 'row', gap: 16, backgroundColor: 'rgba(255,255,255,0.9)' }}>
        <Pressable style={{ flex: 1, paddingVertical: 16, borderRadius: 24, backgroundColor: palette.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB' }}>
          <AppText variant="body" weight="bold" color={palette.foreground}>Kết quả</AppText>
        </Pressable>
        <Pressable 
          onPress={() => setShowUpload(true)}
          style={{ flex: 1, paddingVertical: 16, borderRadius: 24, backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center' }}
        >
          <AppText variant="body" weight="bold" color={palette.white}>Chấm bài mới</AppText>
        </Pressable>
      </View>

      {/* Upload Modal */}
      <ModalSheet visible={showUpload} onClose={() => setShowUpload(false)}>
        <AppText variant="headline" weight="bold" style={{ marginBottom: 4 }}>Chấm bài kiểm tra</AppText>
        <AppText variant="body" color={palette.mutedForeground} style={{ marginBottom: appTheme.spacing.xl }}>Chọn cách bạn muốn nhận diện phiếu OMR</AppText>
        
        <View style={{ gap: 16 }}>
          <Pressable 
            onPress={() => { setShowUpload(false); navigation.navigate('TeacherOmrCamera', { examId }); }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, backgroundColor: palette.white, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB' }}
          >
            <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(216, 75, 203, 1)', alignItems: 'center', justifyContent: 'center' }}>
              <ScanLine size={24} color={palette.white} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="body" weight="bold">Quét bài bằng camera</AppText>
              <AppText variant="caption" color={palette.mutedForeground}>Tự động chụp khi phiếu ổn định</AppText>
            </View>
            <ChevronRight size={20} color={palette.mutedForeground} />
          </Pressable>

          <Pressable 
            onPress={async () => {
              setShowUpload(false);
              const pickedFiles = await pickFiles();
              if (pickedFiles?.length) {
                navigation.navigate('TeacherOmrUpload', { examId, initialFiles: pickedFiles });
              }
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, backgroundColor: palette.white, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB' }}
          >
            <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: '#F3E8FF', alignItems: 'center', justifyContent: 'center' }}>
              <ImageIcon size={24} color={palette.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="body" weight="bold">Tải ảnh lên hàng loạt</AppText>
              <AppText variant="caption" color={palette.mutedForeground}>Chọn nhiều ảnh từ thư viện</AppText>
            </View>
            <ChevronRight size={20} color={palette.mutedForeground} />
          </Pressable>
        </View>
      </ModalSheet>
      
      {selectedSubmissionId && <SubmissionDetailModal submissionId={selectedSubmissionId} onClose={() => { setSelectedSubmissionId(null); reload(); }} />}
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
    } catch {
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
                  <AppText variant="headline" weight="bold">SBD: {sub.studentCode || 'Chưa nhận diện'}</AppText>
                  <View style={styles.rowSpace}>
                    <AppText variant="body" color={palette.mutedForeground}>Điểm:</AppText>
                    <AppText variant="title" weight="bold" color={palette.primary}>{sub.score ?? '-'}/{sub.maxScore ?? '-'}</AppText>
                  </View>
                  <View style={styles.rowSpace}>
                    <AppText variant="body" color={palette.mutedForeground}>Mã đề:</AppText>
                    <AppText variant="body" weight="semibold">{sub.resolvedTestCode ?? '?'}</AppText>
                  </View>
                </SurfaceCard>
                {(sub.imageUrl || sub.annotatedImageUrl || sub.processedImageUrl) && (
                  <SurfaceCard>
                    <AppText variant="body" weight="bold" style={{ marginBottom: 8 }}>Hình ảnh bài thi</AppText>
                    <Image source={{ uri: (sub.imageUrl || sub.annotatedImageUrl || sub.processedImageUrl) as string }} style={{ width: '100%', height: 400, resizeMode: 'contain' }} />
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
                            <Pressable key={ans} onPress={() => handleUpdateAnswer(d.questionNumber, ans)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center' }}>
                              <AppText variant="body" weight="bold" color={palette.white}>{ans}</AppText>
                            </Pressable>
                          ))}
                          <Pressable onPress={() => setEditingQuestion(null)} style={{ justifyContent: 'center', paddingHorizontal: 8 }}>
                            <AppText variant="caption" color={palette.mutedForeground}>Hủy</AppText>
                          </Pressable>
                        </View>
                      ) : (
                        <>
                          <AppText variant="body" color={d.isCorrect ? palette.success : palette.destructive} weight="bold">{d.finalAnswer || d.detectedAnswer || 'Chưa tô'}</AppText>
                          {!d.isCorrect && <AppText variant="caption" color={palette.mutedForeground}>(Đúng: {d.correctAnswer})</AppText>}
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
