import React from 'react';
import { View, type ViewProps } from 'react-native';

import { appTheme } from '../theme/tokens';
import { useResponsiveLayout } from '../theme/responsive';

export function SurfaceCard({ style, ...rest }: ViewProps) {
  const layout = useResponsiveLayout();

  return (
    <View
      style={[
        {
          backgroundColor: appTheme.palette.card,
          borderRadius: layout.heroRadius - 6,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.72)',
          padding: layout.isCompact ? appTheme.spacing.lg : appTheme.spacing.xl,
          ...appTheme.shadows.card,
        },
        style,
      ]}
      {...rest}
    />
  );
}
