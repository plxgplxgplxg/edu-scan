import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
} from 'react-native';

import { appTheme } from '../theme/tokens';
import { GradientBackground } from './GradientBackground';
import { AppText } from './AppText';

interface PrimaryButtonProps extends PressableProps {
  label: string;
  icon?: React.ReactNode;
  loading?: boolean;
  variant?: 'solid' | 'soft' | 'danger' | 'outline';
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
        styles.pressable,
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
        variant === 'outline' ? styles.outline : null,
        variant === 'soft' ? styles.soft : null,
        variant === 'danger' ? styles.danger : null,
        style,
      ]}
    >
      {variant === 'solid' ? (
        <GradientBackground colors={[appTheme.palette.primary, appTheme.palette.accent]} style={styles.fill}>
          {content}
        </GradientBackground>
      ) : (
        <View style={styles.fill}>{content}</View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    overflow: 'hidden',
    borderRadius: appTheme.radius.lg,
  },
  fill: {
    minHeight: 54,
    justifyContent: 'center',
    borderRadius: appTheme.radius.lg,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: appTheme.spacing.sm,
    paddingHorizontal: appTheme.spacing.lg,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.7,
  },
  outline: {
    backgroundColor: appTheme.palette.card,
    borderWidth: 1,
    borderColor: appTheme.palette.primary,
  },
  soft: {
    backgroundColor: appTheme.palette.secondary,
  },
  danger: {
    backgroundColor: '#FEF2F2',
  },
});
