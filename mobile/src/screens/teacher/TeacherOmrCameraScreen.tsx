import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View, Pressable, Alert } from 'react-native';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { Camera, useCameraDevice, useCameraPermission, usePhotoOutput } from 'react-native-vision-camera';
import DocumentPicker from 'react-native-document-picker';
import { Check, ImageIcon, X, Zap } from 'lucide-react-native';
import { AppText } from '../../components/AppText';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useToast } from '../../app/ToastProvider';
import { palette } from '../../theme/tokens';
import { useResponsiveLayout } from '../../theme/responsive';
import type { NativeFile } from '../../features/shared/domain/native-file';

export function TeacherOmrCameraScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const isFocused = useIsFocused();
  const layout = useResponsiveLayout();
  const { showToast } = useToast();
  const examId = route.params?.examId as string;
  const existingFiles = (route.params?.existingFiles as NativeFile[]) ?? [];
  const device = useCameraDevice('back');
  const photoOutput = usePhotoOutput();
  const { hasPermission, requestPermission } = useCameraPermission();

  const [flashEnabled, setFlashEnabled] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission().catch(() => undefined);
    }
  }, [hasPermission, requestPermission]);

  const readyChecks = useMemo(
    () => [
      { label: 'Căn khung', ready: Boolean(device) },
      { label: 'Khoảng cách', ready: Boolean(device) },
      { label: 'Giữ yên', ready: !isCapturing },
      { label: 'Đủ sáng', ready: hasPermission },
    ],
    [device, hasPermission, isCapturing],
  );

  const navigateWithFile = (file: NativeFile) => {
    navigation.replace('TeacherOmrUpload', {
      examId,
      initialFiles: [...existingFiles, file],
    });
  };

  const handleCapture = async () => {
    if (isCapturing) {
      return;
    }

    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        showToast('Ứng dụng cần quyền camera để chụp phiếu OMR');
        return;
      }
    }

    if (!device) {
      showToast('Không tìm thấy camera phía sau trên thiết bị này');
      return;
    }

    setIsCapturing(true);
    try {
      const capturedPhoto = await photoOutput.capturePhotoToFile(
        { flashMode: flashEnabled ? 'on' : 'off' },
        {},
      );
      const rawPath: string = capturedPhoto.filePath;
      const fileUri = rawPath.startsWith('file://') ? rawPath : `file://${rawPath}`;
      navigateWithFile({
        uri: fileUri,
        name: `omr-${Date.now()}.jpg`,
        type: 'image/jpeg',
        size: null,
      });
    } catch (error: any) {
      Alert.alert(
        'Lỗi chụp ảnh',
        error?.message ?? String(error),
        [{ text: 'OK' }],
      );
      setIsCapturing(false);
    }
  };

  const handlePickFromGallery = async () => {
    if (isCapturing) {
      return;
    }
    setIsCapturing(true);
    try {
      const files = await DocumentPicker.pick({
        type: DocumentPicker.types.images,
        allowMultiSelection: true,
        copyTo: 'cachesDirectory',
      });

      const nativeFiles: NativeFile[] = files.map(file => {
        const rawUri = (file.fileCopyUri ?? file.uri) as string;
        return {
          uri: rawUri.startsWith('file://') ? rawUri : `file://${rawUri}`,
          name: file.name ?? `omr-${Date.now()}.jpg`,
          type: file.type ?? 'image/jpeg',
          size: file.size ?? null,
        };
      });

      navigation.replace('TeacherOmrUpload', {
        examId,
        initialFiles: [...existingFiles, ...nativeFiles],
      });
    } catch (error: any) {
      if (!DocumentPicker.isCancel(error)) {
        showToast(error?.message || 'Không thể chọn ảnh OMR');
      }
    } finally {
      setIsCapturing(false);
    }
  };

  const handleRequestPermission = async () => {
    const granted = await requestPermission();
    if (!granted) {
      showToast('Bạn cần cấp quyền camera để tiếp tục');
    }
  };

  return (
    <View style={styles.container}>
      {hasPermission && device ? (
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={isFocused}
          outputs={[photoOutput]}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.cameraFallback]}>
          <AppText variant="headline" weight="bold" color={palette.white} style={styles.permissionTitle}>
            Camera chưa sẵn sàng
          </AppText>
          <AppText variant="body" color={palette.white} style={styles.permissionBody}>
            Cần quyền camera và thiết bị camera khả dụng để chụp phiếu OMR.
          </AppText>
          <PrimaryButton label="Cấp quyền camera" onPress={handleRequestPermission} />
        </View>
      )}

      <View style={styles.previewOverlay} />

      <View style={[styles.topRow, { paddingHorizontal: layout.horizontalPadding }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconButton}>
          <X size={24} color={palette.white} />
        </Pressable>
        <View style={[styles.statusBadge, { backgroundColor: 'rgba(18, 184, 134, 0.9)' }]}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: palette.white, marginRight: 6 }} />
          <AppText variant="caption" weight="bold" color={palette.white}>
            {hasPermission && device ? 'SẴN SÀNG CHỤP' : 'CHỜ QUYỀN CAMERA'}
          </AppText>
        </View>
        <Pressable
          onPress={() => setFlashEnabled(current => !current)}
          style={[styles.iconButton, flashEnabled ? styles.iconButtonActive : null]}
        >
          <Zap size={24} color={palette.white} />
        </Pressable>
      </View>

      <View style={styles.frameContainer}>
        <View style={[styles.corner, styles.topLeft]} />
        <View style={[styles.corner, styles.topRight]} />
        <View style={[styles.corner, styles.bottomLeft]} />
        <View style={[styles.corner, styles.bottomRight]} />
        <View style={styles.guideCard}>
          <AppText variant="headline" weight="bold" color={palette.white}>
            Đặt phiếu vào đúng khung
          </AppText>
          <AppText variant="caption" color={palette.white} style={styles.guideText}>
            Giữ thiết bị song song với mặt giấy để ảnh không bị nghiêng hoặc mờ.
          </AppText>
        </View>
      </View>

      <View style={[styles.bottomContainer, { paddingHorizontal: layout.horizontalPadding, paddingBottom: layout.bottomOffset + 24 }]}>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
          {readyChecks.map(item => (
            <View
              key={item.label}
              style={[
                styles.conditionPill,
                { backgroundColor: item.ready ? 'rgba(18, 184, 134, 0.8)' : 'rgba(255,255,255,0.18)' },
              ]}
            >
              <Check size={12} color={palette.white} />
              <AppText variant="caption" color={palette.white} weight="bold">
                {item.label}
              </AppText>
            </View>
          ))}
        </View>

        <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 24, marginBottom: 40 }}>
          <AppText variant="body" weight="bold" color={palette.white}>
            {hasPermission && device ? 'Căn đúng khung rồi bấm chụp' : 'Cấp quyền camera để bắt đầu chụp'}
          </AppText>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ alignItems: 'center', gap: 8 }}>
            <Pressable style={styles.bottomIcon} onPress={handlePickFromGallery} disabled={isCapturing}>
              <ImageIcon size={24} color={palette.white} />
            </Pressable>
            <AppText variant="caption" color={palette.white} weight="bold">THƯ VIỆN</AppText>
          </View>

          <Pressable
            onPress={handleCapture}
            disabled={!hasPermission || !device || isCapturing}
            style={[
              styles.captureButtonOuter,
              !hasPermission || !device || isCapturing ? styles.captureButtonDisabled : null,
            ]}
          >
            <View style={styles.captureButtonInner}>
              {isCapturing ? (
                <ActivityIndicator color="rgba(216, 75, 203, 1)" />
              ) : (
                <AppText variant="title" weight="bold" color="rgba(216, 75, 203, 1)">●</AppText>
              )}
            </View>
          </Pressable>

          <View style={{ alignItems: 'center', gap: 8 }}>
            <Pressable style={styles.bottomIcon}>
              <AppText variant="body" weight="bold" color={palette.white}>?</AppText>
            </Pressable>
            <AppText variant="caption" color={palette.white} weight="bold">HƯỚNG DẪN</AppText>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  cameraFallback: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16, backgroundColor: '#111' },
  previewOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.18)' },
  topRow: { position: 'absolute', top: 60, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 },
  iconButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  iconButtonActive: { backgroundColor: 'rgba(216, 75, 203, 0.35)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  frameContainer: { flex: 1, marginHorizontal: 40, marginVertical: 140, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  corner: { position: 'absolute', width: 40, height: 40, borderColor: 'rgba(18, 184, 134, 1)', borderWidth: 4 },
  topLeft: { top: -2, left: -2, borderBottomWidth: 0, borderRightWidth: 0, borderTopLeftRadius: 16 },
  topRight: { top: -2, right: -2, borderBottomWidth: 0, borderLeftWidth: 0, borderTopRightRadius: 16 },
  bottomLeft: { bottom: -2, left: -2, borderTopWidth: 0, borderRightWidth: 0, borderBottomLeftRadius: 16 },
  bottomRight: { bottom: -2, right: -2, borderTopWidth: 0, borderLeftWidth: 0, borderBottomRightRadius: 16 },
  guideCard: { alignItems: 'center', gap: 10, backgroundColor: 'rgba(0,0,0,0.35)', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 20 },
  guideText: { textAlign: 'center', maxWidth: 220 },
  bottomContainer: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  conditionPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  bottomIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  captureButtonOuter: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: 'rgba(216, 75, 203, 0.5)' },
  captureButtonInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: palette.white, alignItems: 'center', justifyContent: 'center' },
  captureButtonDisabled: { opacity: 0.6 },
  permissionTitle: { textAlign: 'center' },
  permissionBody: { textAlign: 'center', opacity: 0.85, marginBottom: 8 },
});
