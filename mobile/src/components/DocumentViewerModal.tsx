import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { X, Download } from 'lucide-react-native';
import { AppText } from './AppText';
import { palette } from '../theme/tokens';
import { primaryHeroGradient } from '../theme/header';
import LinearGradient from 'react-native-linear-gradient';
import {
  downloadRemoteFile,
  normalizeCloudinaryDocumentUrl,
} from '../utils/file-download';

interface DocumentViewerModalProps {
  visible: boolean;
  onClose: () => void;
  url: string | null;
  fileName?: string;
  mimeType?: string | null;
}

export function DocumentViewerModal({
  visible,
  onClose,
  url,
  fileName = 'Tài liệu',
  mimeType,
}: DocumentViewerModalProps) {
  const [loading, setLoading] = useState(true);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [hasPreviewError, setHasPreviewError] = useState(false);

  const normalizedUrl = url
    ? normalizeCloudinaryDocumentUrl(url, { fileName, mimeType })
    : '';
  const previewUrls = useMemo(() => {
    if (!url) {
      return [];
    }

    const uniqueUrls = Array.from(new Set([normalizedUrl, url].filter(Boolean)));
    const lowerName = `${fileName ?? ''} ${normalizedUrl}`.toLowerCase();
    const isImage =
      !!mimeType?.startsWith('image/') ||
      /\.(jpeg|jpg|gif|png|webp)(\?|$)/i.test(normalizedUrl);
    const isPdf =
      mimeType === 'application/pdf' ||
      /\.pdf(\?|$)/i.test(lowerName);
    const isPlainText =
      mimeType === 'text/plain' ||
      /\.txt(\?|$)/i.test(lowerName);

    if (isImage || isPlainText) {
      return uniqueUrls;
    }

    if (isPdf) {
      return [
        ...uniqueUrls.map(
          (item) =>
            `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(item)}`,
        ),
        ...uniqueUrls.map(
          (item) =>
            `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(item)}`,
        ),
      ];
    }

    return uniqueUrls.map(
      (item) =>
        `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(item)}`,
    );
  }, [fileName, mimeType, normalizedUrl, url]);

  useEffect(() => {
    setLoading(true);
    setSourceIndex(0);
    setHasPreviewError(false);
  }, [url, visible]);

  const finalUrl = previewUrls[sourceIndex] ?? normalizedUrl;

  if (!visible || !url) return null;

  const handleDownload = async () => {
    await downloadRemoteFile({
      url: normalizedUrl,
      fileName,
      mimeType,
    });
  };

  return (
    <Modal visible={visible} transparent={false} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <LinearGradient colors={[...primaryHeroGradient]} style={styles.header}>
          <SafeAreaView edges={['top']}>
            <View style={styles.headerContent}>
              <Pressable style={styles.iconButton} onPress={onClose}>
                <X color={palette.white} size={24} />
              </Pressable>
              
              <View style={styles.titleContainer}>
                <AppText variant="body" weight="bold" color={palette.white} numberOfLines={1} ellipsizeMode="middle">
                  {fileName}
                </AppText>
              </View>

              <Pressable style={styles.iconButton} onPress={handleDownload}>
                <Download color={palette.white} size={24} />
              </Pressable>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View style={styles.content}>
          <WebView
            source={{ uri: finalUrl }}
            style={styles.webview}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              if (sourceIndex < previewUrls.length - 1) {
                setSourceIndex((current) => current + 1);
                setLoading(true);
                return;
              }

              setLoading(false);
              setHasPreviewError(true);
            }}
            onHttpError={() => {
              if (sourceIndex < previewUrls.length - 1) {
                setSourceIndex((current) => current + 1);
                setLoading(true);
                return;
              }

              setLoading(false);
              setHasPreviewError(true);
            }}
            scalesPageToFit={true}
            javaScriptEnabled={true}
            domStorageEnabled={true}
          />
          {hasPreviewError ? (
            <View style={styles.errorContainer}>
              <AppText variant="body" weight="semibold" color={palette.foreground}>
                Không xem trước được tệp này
              </AppText>
              <AppText variant="caption" color={palette.mutedForeground} style={styles.errorText}>
                Công chúa vẫn có thể tải tệp về máy để mở bằng ứng dụng phù hợp.
              </AppText>
              <Pressable style={styles.downloadButton} onPress={handleDownload}>
                <Download color={palette.white} size={18} />
                <AppText variant="label" weight="semibold" color={palette.white}>
                  Tải xuống
                </AppText>
              </Pressable>
            </View>
          ) : null}
          {loading && !hasPreviewError && (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color={palette.primary} />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  header: {
    width: '100%',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  loaderContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    backgroundColor: palette.background,
  },
  errorText: {
    marginTop: 8,
    textAlign: 'center',
  },
  downloadButton: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: palette.primary,
  },
});
