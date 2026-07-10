import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { appTheme } from '../theme/tokens';
import { useResponsiveLayout } from '../theme/responsive';
import { GradientBackground } from './GradientBackground';
import { AppText } from './AppText';

interface PrimaryButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  icon?: React.ReactNode;
  loading?: boolean;
  variant?: 'solid' | 'soft' | 'danger' | 'outline' | 'ghost';
  style?: StyleProp<ViewStyle>;
}

export function PrimaryButton({
  label,
  icon,
  loading,
  variant = 'solid',
  disabled,
  style,
  ...rest
}: PrimaryButtonProps) {
  const layout = useResponsiveLayout();
  const isDisabled = disabled || loading;

  let textColor = appTheme.palette.white;
  if (variant === 'outline' || variant === 'ghost' || variant === 'soft') textColor = appTheme.palette.primary;
  if (variant === 'danger') textColor = appTheme.palette.destructive;

  const content = (
    <View style={styles.inner}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : null}
      {!loading && icon ? <View>{icon}</View> : null}
      <AppText
        variant="body"
        weight="semibold"
        color={textColor}
      >
        {label}
      </AppText>
    </View>
  );

  return (
    <Pressable
      {...rest}
      disabled={isDisabled}
      style={({ pressed }) => [
        {
          overflow: 'hidden',
          borderRadius: layout.heroRadius - 4, // squircle radius
        },
        pressed && !isDisabled ? { opacity: 1, transform: [{ scale: 0.97 }] } : null,
        isDisabled ? { opacity: 0.5 } : null, // changed from 0.7 to 0.5
        variant === 'outline'
          ? {
              backgroundColor: 'transparent',
              borderWidth: 1.5,
              borderColor: appTheme.palette.primary,
            }
          : null,
        variant === 'soft' ? { backgroundColor: appTheme.palette.primaryMuted } : null,
        variant === 'danger' ? { backgroundColor: appTheme.palette.destructiveSoft } : null,
        variant === 'ghost' ? { backgroundColor: 'transparent' } : null,
        variant === 'solid' && pressed && !isDisabled ? { ...appTheme.shadows.glow } : null,
        variant === 'solid' && !pressed && !isDisabled ? { ...appTheme.shadows.glow, shadowOpacity: 0.08 } : null,
        style,
      ]}
    >
      {variant === 'solid' ? (
        <GradientBackground
          colors={[appTheme.palette.primary, appTheme.palette.primaryStrong]}
          style={{
            minHeight: layout.controlMinHeight,
            justifyContent: 'center',
            borderRadius: layout.heroRadius - 4,
          }}
        >
          {content}
        </GradientBackground>
      ) : (
        <View
          style={{
            minHeight: layout.controlMinHeight,
            justifyContent: 'center',
            borderRadius: layout.heroRadius - 4,
          }}
        >
          {content}
        </View>
      )}
    </Pressable>
  );
}

const styles = {
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 22,
  } as const,
};
