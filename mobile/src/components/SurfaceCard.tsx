import React from 'react';
import { View, type ViewProps } from 'react-native';

import { appTheme } from '../theme/tokens';
import { useResponsiveLayout } from '../theme/responsive';

interface SurfaceCardProps extends ViewProps {
  level?: 1 | 2;
}

export function SurfaceCard({ style, level = 1, ...rest }: SurfaceCardProps) {
  const layout = useResponsiveLayout();

  return (
    <View
      style={[
        {
          backgroundColor: level === 1 ? appTheme.palette.surface1 : appTheme.palette.surface2,
          borderRadius: layout.heroRadius - 4, // squircle radius
          borderWidth: 1,
          borderColor: appTheme.palette.border,
          padding: layout.isCompact ? 16 : 20,
          // Only level 1 gets the shadow by default, level 2 is usually nested
          ...(level === 1 ? appTheme.shadows.card : {}),
        },
        style,
      ]}
      {...rest}
    />
  );
}
