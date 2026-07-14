import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Camera, ImageIcon, X, Plus } from 'lucide-react-native';
import DocumentPicker from 'react-native-document-picker';
import { AppText } from '../../components/AppText';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SurfaceCard } from '../../components/SurfaceCard';
import { Screen } from '../../components/Screen';
import { palette } from '../../theme/tokens';
import { useResponsiveLayout } from '../../theme/responsive';
import { useAuth } from '../../store/auth-store';
import { useToast } from '../../app/ToastProvider';
import { uploadOmrBatch } from '../../api/edu-scan';
import type { NativeFile } from '../../features/shared/domain/native-file';

export function TeacherOmrUploadScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const examId = route.params?.examId as string;
  const initialFiles = route.params?.initialFiles as NativeFile[] | undefined;

  const layout = useResponsiveLayout();
  const { accessToken } = useAuth();
  const { showToast } = useToast();

  const [files, setFiles] = useState<NativeFile[]>(initialFiles ?? []);
  const [submitting, setSubmitting] = useState(false);

  const handleAddFromGallery = async () => {
    try {
      const picked = await DocumentPicker.pick({
        type: ['image/*'],
        allowMultiSelection: true,
        copyTo: 'cachesDirectory',
      });
      const newFiles: NativeFile[] = picked.map(file => {
        const rawUri = (file.fileCopyUri ?? file.uri) as string;
        return {
          uri: rawUri.startsWith('file://') ? rawUri : `file://${rawUri}`,
          name: file.name ?? `omr-${Date.now()}.jpg`,
          type: file.type ?? 'image/jpeg',
          size: file.size ?? null,
        };
      });
      setFiles(prev => [...prev, ...newFiles]);
    } catch (error: any) {
      if (!DocumentPicker.isCancel(error)) {
        showToast('Không thể chọn ảnh');
      }
    }
  };

  const handleAddFromCamera = () => {
    navigation.navigate('TeacherOmrCamera', { examId, existingFiles: files });
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
    try {
      const batch = await uploadOmrBatch(accessToken!, {
        examId,
        files: files.map(f => ({ uri: f.uri, name: f.name, type: f.type })),
      });
      navigation.replace('TeacherOmrProcessing', { examId, batchId: batch.id, totalFiles: files.length });
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

      <ScrollView contentContainerStyle={{ padding: layout.horizontalPadding, paddingBottom: 120 }}>
        <View style={styles.countRow}>
          <View>
            <AppText variant="headline" weight="bold">Đã chọn {files.length} ảnh</AppText>
            <AppText variant="caption" color={palette.mutedForeground}>Nhấn X để xoá ảnh</AppText>
          </View>
          <Pressable onPress={handleAddFromGallery} style={styles.addButton}>
            <Plus size={16} color={palette.primary} />
            <AppText variant="caption" weight="bold" color={palette.primary}>Thêm ảnh</AppText>
          </Pressable>
        </View>

        <View style={styles.actionRow}>
          <Pressable style={styles.actionCard} onPress={handleAddFromCamera}>
            <Camera size={20} color={palette.primary} />
            <AppText variant="caption" weight="bold" color={palette.primary}>Chụp thêm</AppText>
          </Pressable>
          <Pressable style={styles.actionCard} onPress={handleAddFromGallery}>
            <ImageIcon size={20} color={palette.primary} />
            <AppText variant="caption" weight="bold" color={palette.primary}>Chọn từ thư viện</AppText>
          </Pressable>
        </View>

        <View style={styles.grid}>
          {files.map((f, i) => (
            <SurfaceCard key={i} style={styles.imageCard}>
              <Image source={{ uri: f.uri }} style={styles.image} resizeMode="cover" />
              <View style={styles.badge}>
                <AppText variant="caption" color={palette.white}>#{i + 1}</AppText>
              </View>
              <Pressable onPress={() => handleRemove(i)} style={styles.removeButton}>
                <X size={12} color={palette.white} />
              </Pressable>
            </SurfaceCard>
          ))}
          <Pressable onPress={handleAddFromGallery} style={styles.addCard}>
            <ImageIcon size={24} color={palette.mutedForeground} />
            <AppText variant="caption" color={palette.mutedForeground}>Thêm</AppText>
          </Pressable>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingHorizontal: layout.horizontalPadding }]}>
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
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F3E8FF',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  imageCard: {
    width: '30%',
    aspectRatio: 0.7,
    borderRadius: 12,
    overflow: 'hidden',
    padding: 0,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 4,
  },
  addCard: {
    width: '30%',
    aspectRatio: 0.7,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 16,
    backgroundColor: palette.white,
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
  },
});
