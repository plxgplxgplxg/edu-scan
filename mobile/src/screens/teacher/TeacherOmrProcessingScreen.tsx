import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, CheckCircle2, Circle, XCircle } from 'lucide-react-native';
import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { palette } from '../../theme/tokens';
import { useResponsiveLayout } from '../../theme/responsive';
import { getOmrBatchHeader } from '../../api/edu-scan';
import { useAuth } from '../../store/auth-store';

export function TeacherOmrProcessingScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const layout = useResponsiveLayout();
  const { accessToken } = useAuth();
  
  const totalFiles = route.params?.totalFiles as number || 0;
  const examId = route.params?.examId as string;
  const batchId = route.params?.batchId as string;
  
  const [processed, setProcessed] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);

  useEffect(() => {
    if (!accessToken || !batchId) return;

    const interval = setInterval(async () => {
      try {
        const batch = await getOmrBatchHeader(accessToken, batchId);
        setProcessed(batch.processedFiles);
        setSuccessCount(batch.successCount);
        setFailedCount(batch.failedCount);

        if (batch.status === 'COMPLETED' || batch.status === 'PARTIAL_FAILED' || batch.status === 'FAILED') {
          clearInterval(interval);
          navigation.replace('TeacherOmrExamDetail', { examId });
        }
      } catch (err) {
        console.error('Lỗi khi kiểm tra trạng thái OMR:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [accessToken, batchId, examId, navigation]);

  return (
    <Screen>
      <View style={[styles.header, { paddingHorizontal: layout.horizontalPadding }]}>
        <Pressable onPress={() => navigation.goBack()} style={{ padding: 8, marginLeft: -8 }}>
          <ArrowLeft size={24} color={palette.foreground} />
        </Pressable>
        <AppText variant="title" weight="bold" style={{ marginLeft: 8 }}>Tải ảnh lên</AppText>
      </View>
      <View style={{ flex: 1, padding: layout.horizontalPadding, alignItems: 'center' }}>
        
        <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(216, 75, 203, 0.8)', alignItems: 'center', justifyContent: 'center', marginTop: 40, marginBottom: 24 }}>
          <AppText variant="hero" weight="bold" color={palette.white}>{processed}/{totalFiles}</AppText>
        </View>

        <AppText variant="headline" weight="bold" style={{ marginBottom: 8 }}>Đang xử lý OMR...</AppText>
        <AppText variant="body" color={palette.mutedForeground} style={{ marginBottom: 40 }}>Vui lòng giữ ứng dụng mở</AppText>

        <View style={{ width: '100%', height: 6, backgroundColor: '#F3E8FF', borderRadius: 3, overflow: 'hidden', marginBottom: 40 }}>
          <View style={{ width: `${(processed / totalFiles) * 100}%`, height: '100%', backgroundColor: 'rgba(216, 75, 203, 0.8)' }} />
        </View>

        <ScrollView style={{ width: '100%' }} showsVerticalScrollIndicator={false}>
          {Array.from({ length: totalFiles }).map((_, i) => {
            const isProcessed = i < processed;
            const isSuccess = i < successCount;
            const isFailed = isProcessed && !isSuccess;

            return (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, paddingHorizontal: 16, backgroundColor: palette.white, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12 }}>
                {isSuccess ? (
                  <CheckCircle2 size={20} color={palette.success} />
                ) : isFailed ? (
                  <XCircle size={20} color={palette.destructive} />
                ) : (
                  <Circle size={20} color={palette.mutedForeground} />
                )}
                <AppText variant="body" color={isProcessed ? (isFailed ? palette.destructive : palette.foreground) : palette.mutedForeground}>
                  Ảnh #{i + 1} — {isSuccess ? 'nhận diện thành công' : isFailed ? 'nhận diện thất bại' : 'đang chờ xử lý...'}
                </AppText>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
});
