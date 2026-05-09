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
  variant?: 'solid' | 'soft' | 'danger' | 'outline';
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

  const content = (
    <View style={styles.inner}>
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? appTheme.palette.primary : appTheme.palette.white} />
      ) : null}
      {!loading && icon ? <View>{icon}</View> : null}
      <AppText
        variant="body"
        weight="semibold"
        color={variant === 'outline' ? appTheme.palette.primary : appTheme.palette.white}
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
          borderRadius: layout.heroRadius - 6,
        },
        pressed && !isDisabled ? { opacity: 0.92, transform: [{ scale: 0.99 }] } : null,
        isDisabled ? { opacity: 0.7 } : null,
        variant === 'outline'
          ? {
              backgroundColor: appTheme.palette.card,
              borderWidth: 1,
              borderColor: 'rgba(97,91,227,0.22)',
            }
          : null,
        variant === 'soft' ? { backgroundColor: appTheme.palette.primaryMuted } : null,
        variant === 'danger' ? { backgroundColor: appTheme.palette.destructiveSoft } : null,
        style,
      ]}
    >
      {variant === 'solid' ? (
        <GradientBackground
          colors={[appTheme.palette.primary, appTheme.palette.accent]}
          style={{
            minHeight: layout.controlMinHeight,
            justifyContent: 'center',
            borderRadius: layout.heroRadius - 6,
          }}
        >
          {content}
        </GradientBackground>
      ) : (
        <View
          style={{
            minHeight: layout.controlMinHeight,
            justifyContent: 'center',
            borderRadius: layout.heroRadius - 6,
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
    gap: appTheme.spacing.sm,
    paddingHorizontal: appTheme.spacing.xl,
  } as const,
};
