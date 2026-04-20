import React from 'react';
import { StyleSheet, View } from 'react-native';

import { appTheme } from '../theme/tokens';
import { AppText } from './AppText';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
}

export function EmptyState({ icon, title }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <AppText variant="body" color={appTheme.palette.mutedForeground}>
        {title}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: appTheme.spacing.xxxl * 1.5,
    gap: appTheme.spacing.md,
  },
  icon: {
    opacity: 0.45,
  },
});
