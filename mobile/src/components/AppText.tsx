import React from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';

import { palette, typography } from '../theme/tokens';

type Variant = 'body' | 'label' | 'title' | 'headline' | 'hero' | 'caption';
type Weight = 'regular' | 'medium' | 'semibold' | 'bold' | 'heavy';

interface AppTextProps extends TextProps {
  variant?: Variant;
  weight?: Weight;
  color?: string;
}

const variantStyles = StyleSheet.create({
  body: {
    fontSize: typography.sizes.md,
    lineHeight: 20,
  },
  label: {
    fontSize: typography.sizes.sm,
    lineHeight: 18,
  },
  title: {
    fontSize: typography.sizes.xxl,
    lineHeight: 30,
  },
  headline: {
    fontSize: typography.sizes.xl,
    lineHeight: 24,
  },
  hero: {
    fontSize: typography.sizes.display,
    lineHeight: 54,
  },
  caption: {
    fontSize: typography.sizes.xs,
    lineHeight: 16,
  },
});

export function AppText({
  children,
  style,
  variant = 'body',
  weight = 'regular',
  color = palette.foreground,
  ...rest
}: AppTextProps) {
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
        variantStyles[variant],
        style,
      ]}
    >
      {children}
    </Text>
  );
}
