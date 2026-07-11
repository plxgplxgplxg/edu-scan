import React, { useState } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { ArrowLeft, ChevronRight, Search, FileText } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { createOmrExam, listOmrExams } from '../../api/edu-scan';
import { AppText } from '../../components/AppText';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ErrorState, LoadingState } from '../../components/RequestState';
import { Screen } from '../../components/Screen';
import { SurfaceCard } from '../../components/SurfaceCard';
import { TextInputField } from '../../components/TextInputField';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import type { RootStackParamList } from '../../navigation/types';
import { useAuth } from '../../store/auth-store';
import { appTheme, palette } from '../../theme/tokens';
import { useResponsiveLayout } from '../../theme/responsive';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function TeacherOmrScreen() {
  const navigation = useNavigation<Nav>();
  const { accessToken } = useAuth();
  const layout = useResponsiveLayout();

  const [examName, setExamName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [keyword, setKeyword] = useState('');
  const [page] = useState(1);

  const { data, loading, error, reload } = useAsyncResource(async () => {
    if (!accessToken) return null;
    return listOmrExams(accessToken, page, 20, keyword);
  }, [accessToken, page, keyword]);

  const handleCreateExam = async () => {
    if (!examName.trim()) {
      setCreateError('Vui lòng nhập tên bài kiểm tra');
      return;
    }
    setCreateError(null);
    setCreating(true);
    try {
      const exam = await createOmrExam(accessToken!, {
        title: examName.trim(),
        maxScore: 10,
      });
      setExamName('');
      reload();
      navigation.navigate('TeacherOmrExamBuilder', { examId: exam.id });
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Screen refreshing={loading && !!data} onRefresh={() => { void reload(); }}>
      <View style={[styles.container, { paddingHorizontal: layout.horizontalPadding, paddingTop: layout.sectionGap, paddingBottom: 100 }]}>
        
        {/* Header */}
        <Pressable style={styles.backRow} onPress={() => navigation.navigate('TeacherTabs', { screen: 'TeacherDashboard' })}>
          <ArrowLeft size={16} color={palette.mutedForeground} />
          <AppText variant="label" color={palette.mutedForeground}>Về trang chủ</AppText>
        </Pressable>

        <AppText variant="title" weight="bold">Kiểm tra Trắc nghiệm</AppText>

        {/* Quick Create Exam */}
        <SurfaceCard style={{ gap: appTheme.spacing.md }}>
          <AppText variant="headline" weight="bold">Tạo bài thi mới</AppText>
          <TextInputField
            label="Tên bài thi"
            placeholder="VD: Kiểm tra 15p"
            value={examName}
            onChangeText={setExamName}
          />
          {createError && <AppText variant="caption" color={palette.destructive}>{createError}</AppText>}
          <PrimaryButton
            label="Tiếp tục cấu hình đề thi"
            icon={<ChevronRight size={18} color={palette.white} />}
            onPress={handleCreateExam}
            loading={creating}
            style={{ alignSelf: 'flex-start' }}
          />
        </SurfaceCard>

        {/* List Exams */}
        <AppText variant="headline" weight="bold" style={{ marginTop: appTheme.spacing.md }}>Danh sách bài thi</AppText>
        <TextInputField
          label="Tìm kiếm"
          placeholder="Tìm bài thi..."
          value={keyword}
          onChangeText={setKeyword}
          trailing={<Search size={18} color={palette.mutedForeground} />}
        />

        {error ? <ErrorState message={error} retryLabel="Thử lại" onRetry={() => void reload()} /> : null}
        {loading && !data ? <LoadingState label="Đang tải danh sách đề thi..." /> : null}

        <View style={{ gap: appTheme.spacing.md }}>
          {data?.items.map(exam => (
            <Pressable key={exam.id} onPress={() => navigation.navigate('TeacherOmrExamDetail', { examId: exam.id })}>
              <SurfaceCard style={styles.examCard}>
                <View style={styles.examIcon}>
                  <FileText size={24} color={palette.primary} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <AppText variant="body" weight="bold">{exam.title}</AppText>
                  <AppText variant="caption" color={palette.mutedForeground}>
                    {exam.status === 'PUBLISHED' ? 'Đã phát hành' : 'Bản nháp'}
                  </AppText>
                </View>
                <ChevronRight size={20} color={palette.mutedForeground} />
              </SurfaceCard>
            </Pressable>
          ))}

          {data?.items.length === 0 && !loading && (
            <AppText variant="body" color={palette.mutedForeground} style={{ textAlign: 'center', marginTop: appTheme.spacing.xl }}>
              Chưa có bài thi nào
            </AppText>
          )}
        </View>

      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'center', width: '100%', maxWidth: 600, gap: appTheme.spacing.md },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  examCard: { flexDirection: 'row', alignItems: 'center', gap: appTheme.spacing.md },
  examIcon: { width: 48, height: 48, borderRadius: appTheme.radius.md, backgroundColor: palette.primary + '1A', alignItems: 'center', justifyContent: 'center' },
});
