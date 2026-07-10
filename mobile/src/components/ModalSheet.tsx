import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { appTheme } from '../theme/tokens';
import { useResponsiveLayout } from '../theme/responsive';

interface ModalSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  scrollable?: boolean;
}

export function ModalSheet({ visible, onClose, children, scrollable = true }: ModalSheetProps) {
  const insets = useSafeAreaInsets();
  const layout = useResponsiveLayout();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đóng chi tiết"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
          style={{ width: '100%', flex: 1, justifyContent: 'flex-end' }}
        >
          <View
            style={{
              alignSelf: 'center',
              width: '100%',
              maxWidth: layout.contentMaxWidth + layout.horizontalPadding * 2,
              borderTopLeftRadius: layout.heroRadius,
              borderTopRightRadius: layout.heroRadius,
              backgroundColor: appTheme.palette.card,
              paddingHorizontal: layout.isCompact ? appTheme.spacing.xl : appTheme.spacing.xxl,
              paddingTop: layout.sectionGap,
              maxHeight: layout.isCompact ? '92%' : '88%',
              height: scrollable ? undefined : (layout.isCompact ? '92%' : '88%'),
              marginBottom: Platform.OS === 'android' ? insets.bottom : 0,
              ...appTheme.shadows.floating,
            }}
          >
            <View
              style={{
                alignSelf: 'center',
                width: 42,
                height: 4,
                borderRadius: 999,
                backgroundColor: '#D9DCF0',
                marginBottom: appTheme.spacing.xl,
              }}
            />
            {scrollable ? (
              <ScrollView
                bounces={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  paddingBottom: insets.bottom + appTheme.spacing.xxl,
                  gap: appTheme.spacing.md,
                }}
              >
                {children}
              </ScrollView>
            ) : (
              <View style={styles.virtualizedContent}>{children}</View>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
const styles = {
  overlay: {
    flex: 1,
    backgroundColor: appTheme.palette.overlay,
    justifyContent: 'flex-end',
  } as const,
  virtualizedContent: {
    flex: 1,
  } as const,
};
