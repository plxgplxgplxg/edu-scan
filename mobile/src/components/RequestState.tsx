import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { appTheme, palette } from '../theme/tokens';
import { AppText } from './AppText';
import { PrimaryButton } from './PrimaryButton';

export function LoadingState({ label }: { label: string }) {
  return (
    <View
      style={{
        paddingVertical: appTheme.spacing.huge,
        alignItems: 'center',
        gap: appTheme.spacing.md,
      }}
    >
      <ActivityIndicator color={palette.primary} />
      <AppText variant="body" color={palette.mutedForeground}>
        {label}
      </AppText>
    </View>
  );
}

export function ErrorState({
  message,
  retryLabel,
  onRetry,
}: {
  message: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <View
      style={{
        paddingVertical: appTheme.spacing.huge,
        gap: appTheme.spacing.md,
      }}
    >
      <AppText variant="body" color={palette.destructive}>
        {message}
      </AppText>
      <PrimaryButton label={retryLabel} onPress={onRetry} />
    </View>
  );
}
