import React from 'react';
import { StyleSheet, View } from 'react-native';

import { appTheme } from '../theme/tokens';
import { useResponsiveLayout } from '../theme/responsive';
import { AppText } from './AppText';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
}

export function EmptyState({ icon, title }: EmptyStateProps) {
  const layout = useResponsiveLayout();

  return (
    <View
      style={[
        styles.container,
        {
          paddingVertical: layout.isCompact ? appTheme.spacing.huge : appTheme.spacing.huge * 1.5,
          paddingHorizontal: layout.horizontalPadding,
        },
      ]}
    >
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <AppText variant="body" color={appTheme.palette.mutedForeground}>
        {title}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: appTheme.spacing.md,
  },
  icon: {
    opacity: 0.5,
  },
});
