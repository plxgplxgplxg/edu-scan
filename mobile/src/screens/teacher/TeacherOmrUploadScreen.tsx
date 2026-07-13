import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Image, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, ImageIcon, X, AlertTriangle, Plus } from 'lucide-react-native';
import { AppText } from '../../components/AppText';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SurfaceCard } from '../../components/SurfaceCard';
import { Screen } from '../../components/Screen';
import { appTheme, palette } from '../../theme/tokens';
import { useResponsiveLayout } from '../../theme/responsive';
import { useOmrUpload } from '../../features/omr/application/useOmrUpload';
import { useAuth } from '../../store/auth-store';
import { useToast } from '../../app/ToastProvider';
import type { NativeFile } from '../../features/shared/domain/native-file';

export function TeacherOmrUploadScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const examId = route.params?.examId as string;
  const initialFiles = route.params?.initialFiles as NativeFile[] | undefined;
  
  const layout = useResponsiveLayout();
  const { accessToken } = useAuth();
  const { showToast } = useToast();
  
  const [files, setFiles] = useState<NativeFile[]>(initialFiles || []);
  const [submitting, setSubmitting] = useState(false);

  const { pickFiles } = useOmrUpload({
    accessToken,
    onUploaded: async () => {},
  });

  const handleAddFiles = async () => {
    try {
      const { pickMultipleDocuments, documentTypes } = require('../../features/shared/infrastructure/document-picker/document-picker-adapter');
      const newFiles = await pickMultipleDocuments(documentTypes.images);
      if (newFiles && newFiles.length > 0) {
        setFiles(prev => [...prev, ...newFiles]);
      }
    } catch (e) {
      console.log('User cancelled or error picking files', e);
    }
  };

  const handleRemove = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleStartGrading = async () => {
    if (!files.length) {
      showToast('Vui lòng chọn ít nhất 1 ảnh');
      return;
    }
    setSubmitting(true);
    // Submit the batch using the api
    const { uploadOmrBatch } = require('../../api/edu-scan');
    try {
      await uploadOmrBatch(accessToken!, {
        examId,
        files: files.map(f => ({ uri: f.uri, name: f.name, type: f.type }))
      });
      navigation.replace('TeacherOmrProcessing', { examId, totalFiles: files.length });
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi tải ảnh lên');
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <View style={[styles.header, { paddingHorizontal: layout.horizontalPadding }]}>
        <Pressable onPress={() => navigation.goBack()} style={{ padding: 8, marginLeft: -8 }}>
          <ArrowLeft size={24} color={palette.foreground} />
        </Pressable>
        <AppText variant="title" weight="bold" style={{ marginLeft: 8 }}>Tải ảnh lên</AppText>
      </View>
      <ScrollView contentContainerStyle={{ padding: layout.horizontalPadding, paddingBottom: 100 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <View>
            <AppText variant="headline" weight="bold">Đã chọn {files.length} ảnh</AppText>
            <AppText variant="caption" color={palette.mutedForeground}>Kéo để sắp xếp thứ tự chấm</AppText>
          </View>
          <Pressable onPress={handleAddFiles} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3E8FF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 4 }}>
            <Plus size={16} color={palette.primary} />
            <AppText variant="caption" weight="bold" color={palette.primary}>Thêm</AppText>
          </Pressable>
        </View>

        <SurfaceCard style={{ backgroundColor: '#FFFBEB', borderColor: '#FDE68A', borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, marginBottom: 16 }}>
          <AlertTriangle size={16} color={palette.warning} />
          <AppText variant="caption" color={palette.warning} style={{ flex: 1 }}>Phát hiện 1 ảnh có thể bị mờ. Bạn nên chụp lại trước khi xử lý.</AppText>
        </SurfaceCard>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {files.map((f, i) => (
            <View key={i} style={{ width: '30%', aspectRatio: 0.7, borderRadius: 12, overflow: 'hidden', backgroundColor: '#F3E8FF', borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed' }}>
              <Image source={{ uri: f.uri }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
              <View style={{ position: 'absolute', top: 4, left: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2 }}>
                <AppText variant="caption" color={palette.white}>#{i + 1}</AppText>
              </View>
              <Pressable onPress={() => handleRemove(i)} style={{ position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, padding: 4 }}>
                <X size={12} color={palette.white} />
              </Pressable>
            </View>
          ))}
          <Pressable onPress={handleAddFiles} style={{ width: '30%', aspectRatio: 0.7, borderRadius: 12, backgroundColor: palette.background, borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' }}>
            <ImageIcon size={24} color={palette.mutedForeground} />
          </Pressable>
        </View>
      </ScrollView>
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: layout.horizontalPadding, backgroundColor: palette.white, borderTopWidth: 1, borderColor: '#E5E7EB' }}>
        <PrimaryButton label="Bắt đầu chấm điểm" onPress={handleStartGrading} loading={submitting} />
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
