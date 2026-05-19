import React from 'react';
import {
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { appTheme } from '../theme/tokens';
import { useResponsiveLayout } from '../theme/responsive';
import { AppText } from './AppText';

interface TextInputFieldProps extends TextInputProps {
  label: string;
  trailing?: React.ReactNode;
  error?: string;
}

export function TextInputField({
  label,
  trailing,
  error,
  style,
  ...rest
}: TextInputFieldProps) {
  const [focused, setFocused] = React.useState(false);
  const layout = useResponsiveLayout();

  return (
    <View style={{ gap: appTheme.spacing.sm }}>
      <AppText variant="label" weight="semibold" style={{ color: appTheme.palette.foreground }}>
        {label}
      </AppText>
      <View
        style={[
          {
            minHeight: layout.controlMinHeight,
            paddingHorizontal: layout.isCompact ? appTheme.spacing.md : appTheme.spacing.lg,
            borderRadius: layout.heroRadius - 6,
            backgroundColor: appTheme.palette.inputBackground,
            borderWidth: 1.5,
            borderColor: 'rgba(97,91,227,0.04)',
            flexDirection: 'row',
            alignItems: 'center',
            gap: appTheme.spacing.sm,
          },
          focused
            ? {
                borderColor: 'rgba(97,91,227,0.35)',
                backgroundColor: '#FBFBFF',
              }
            : null,
          error ? { borderColor: '#FFBCC3' } : null,
        ]}
      >
        <TextInput
          placeholderTextColor={appTheme.palette.mutedForeground}
          selectionColor={appTheme.palette.primary}
          style={[
            {
              flex: 1,
              color: appTheme.palette.foreground,
              fontSize: appTheme.typography.sizes.xl * (layout.isCompact ? 0.92 : 1),
              fontFamily: appTheme.typography.family,
              paddingVertical: appTheme.spacing.md,
            },
            style,
          ]}
          onFocus={event => {
            setFocused(true);
            rest.onFocus?.(event);
          }}
          onBlur={event => {
            setFocused(false);
            rest.onBlur?.(event);
          }}
          {...rest}
        />
        {trailing ? <View>{trailing}</View> : null}
      </View>
      {error ? (
        <AppText variant="label" color={appTheme.palette.destructive}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}
