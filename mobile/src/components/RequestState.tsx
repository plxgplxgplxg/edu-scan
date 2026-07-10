import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { appTheme, palette } from '../theme/tokens';
import { AppText } from './AppText';
import { SkeletonCard } from './SkeletonCard';

export function LoadingState({ label }: { label: string }) {
  return (
    <View
      style={{
        paddingVertical: appTheme.spacing.huge,
        gap: appTheme.spacing.md,
      }}
    >
      <View style={{ alignItems: 'center', gap: appTheme.spacing.md }}>
        <ActivityIndicator color={palette.primary} />
        <AppText variant="body" color={palette.mutedForeground}>
          {label}
        </AppText>
      </View>
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard lines={2} />
    </View>
  );
}

export function ErrorState({
  message,
  retryLabel: _retryLabel,
  onRetry: _onRetry,
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
    </View>
  );
}
