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
    <View style={{ gap: 8 }}>
      <AppText variant="label" weight="semibold" style={{ color: appTheme.palette.foreground }}>
        {label}
      </AppText>
      <View
        style={[
          {
            minHeight: layout.controlMinHeight,
            paddingHorizontal: layout.isCompact ? 14 : 16,
            borderRadius: layout.heroRadius - 4, // squircle
            backgroundColor: appTheme.palette.inputBackground,
            borderWidth: 1.5,
            borderColor: 'transparent',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          },
          focused
            ? {
                borderColor: appTheme.palette.primary,
                // Optional: apply a slight shadow glow here in the future
              }
            : null,
          error ? { borderColor: appTheme.palette.destructive } : null,
        ]}
      >
        <TextInput
          placeholderTextColor={appTheme.palette.mutedForeground}
          selectionColor={appTheme.palette.primary}
          style={[
            {
              flex: 1,
              color: appTheme.palette.foreground,
              fontSize: 16, // Fixed to 16px for accessibility as per design doc
              fontFamily: appTheme.typography.family,
              paddingVertical: 14,
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
        {trailing ? <View hitSlop={8}>{trailing}</View> : null}
      </View>
      {error ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {/* Note: In a real app we'd add the Alert icon here per the doc */}
          <AppText variant="label" color={appTheme.palette.destructive}>
            {error}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}
