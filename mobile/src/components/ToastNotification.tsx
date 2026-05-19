import React from 'react';
import { StyleSheet, View } from 'react-native';

import { appTheme, palette } from '../theme/tokens';
import { AppText } from './AppText';

interface ToastNotificationProps {
  message: string;
}

export function ToastNotification({ message }: ToastNotificationProps) {
  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.toast}>
        <AppText variant="body" weight="semibold" color={palette.white}>
          {message}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: appTheme.spacing.xxl,
    alignItems: 'center',
    zIndex: 100,
  },
  toast: {
    maxWidth: '88%',
    borderRadius: appTheme.radius.lg,
    backgroundColor: palette.foreground,
    paddingHorizontal: appTheme.spacing.lg,
    paddingVertical: appTheme.spacing.md,
    ...appTheme.shadows.floating,
  },
});
