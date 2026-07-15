import React, { useState } from 'react';
import { Modal, View, StyleSheet, Pressable, ActivityIndicator, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { X, Download } from 'lucide-react-native';
import { AppText } from './AppText';
import { palette } from '../theme/tokens';
import { primaryHeroGradient } from '../theme/header';
import LinearGradient from 'react-native-linear-gradient';

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

  if (!visible || !url) return null;

  let finalUrl = url;

  const isImage = mimeType?.startsWith('image/') || url.match(/\.(jpeg|jpg|gif|png|webp)$/i);

  if (Platform.OS === 'android' && !isImage) {
    // encodeURIComponent is necessary for the url param
    finalUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(finalUrl)}`;
  }

  const handleDownload = () => {
    // Open in browser so OS can handle the download
    void Linking.openURL(url);
  };

  return (
    <Modal visible={visible} transparent={false} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <LinearGradient colors={primaryHeroGradient} style={styles.header}>
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
            scalesPageToFit={true}
            javaScriptEnabled={true}
            domStorageEnabled={true}
          />
          {loading && (
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
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
});
