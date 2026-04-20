import React from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { appTheme } from '../theme/tokens';
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
  return (
    <View style={styles.wrapper}>
      <AppText variant="label" weight="semibold" style={styles.label}>
        {label}
      </AppText>
      <Pressable style={[styles.inputContainer, error ? styles.errorBorder : null]}>
        <TextInput
          placeholderTextColor={appTheme.palette.mutedForeground}
          style={[styles.input, style]}
          {...rest}
        />
        {trailing ? <View>{trailing}</View> : null}
      </Pressable>
      {error ? (
        <AppText variant="label" color={appTheme.palette.destructive}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: appTheme.spacing.sm,
  },
  label: {
    color: appTheme.palette.foreground,
  },
  inputContainer: {
    minHeight: 56,
    paddingHorizontal: appTheme.spacing.lg,
    borderRadius: appTheme.radius.lg,
    backgroundColor: appTheme.palette.inputBackground,
    borderWidth: 2,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.spacing.sm,
  },
  input: {
    flex: 1,
    color: appTheme.palette.foreground,
    fontSize: appTheme.typography.sizes.md,
    fontFamily: appTheme.typography.family,
    paddingVertical: appTheme.spacing.sm,
  },
  errorBorder: {
    borderColor: '#FCA5A5',
  },
});
