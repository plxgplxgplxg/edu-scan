import React from 'react';
import { Text, type TextProps } from 'react-native';

import { palette, typography } from '../theme/tokens';
import { useResponsiveLayout } from '../theme/responsive';

type Variant = 'body' | 'label' | 'title' | 'headline' | 'hero' | 'caption';
type Weight = 'regular' | 'medium' | 'semibold' | 'bold' | 'heavy';

interface AppTextProps extends TextProps {
  variant?: Variant;
  weight?: Weight;
  color?: string;
}

export function AppText({
  children,
  style,
  variant = 'body',
  weight = 'regular',
  color = palette.foreground,
  ...rest
}: AppTextProps) {
  const layout = useResponsiveLayout();
  const titleScale = layout.titleScale;
  const bodyScale = layout.isCompact ? 0.96 : layout.isTablet ? 1.04 : 1;
  const variantStyle = {
    body: {
      fontSize: 16 * bodyScale,
      lineHeight: 22 * bodyScale,
    },
    label: {
      fontSize: 13 * bodyScale,
      lineHeight: 18 * bodyScale,
    },
    title: {
      fontSize: 34 * titleScale,
      lineHeight: 40 * titleScale,
    },
    headline: {
      fontSize: 22 * titleScale,
      lineHeight: 28 * titleScale,
    },
    hero: {
      fontSize: 44 * titleScale,
      lineHeight: 48 * titleScale,
    },
    caption: {
      fontSize: 13 * bodyScale,
      lineHeight: 18 * bodyScale,
    },
  }[variant];

  return (
    <Text
      allowFontScaling={false}
      {...rest}
      style={[
        {
          color,
          fontFamily: typography.family,
          fontWeight: typography.weights[weight],
        },
        variantStyle,
        style,
      ]}
    >
      {children}
    </Text>
  );
}
