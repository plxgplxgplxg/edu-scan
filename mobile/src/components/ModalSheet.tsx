import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { appTheme } from '../theme/tokens';
import { useResponsiveLayout } from '../theme/responsive';

interface ModalSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function ModalSheet({ visible, onClose, children }: ModalSheetProps) {
  const insets = useSafeAreaInsets();
  const layout = useResponsiveLayout();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ width: '100%' }}
        >
          <Pressable
            onPress={event => event.stopPropagation()}
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
            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{
                paddingBottom: insets.bottom + appTheme.spacing.xxl,
                gap: appTheme.spacing.md,
              }}
            >
              {children}
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}
const styles = {
  overlay: {
    flex: 1,
    backgroundColor: appTheme.palette.overlay,
    justifyContent: 'flex-end',
  } as const,
};
