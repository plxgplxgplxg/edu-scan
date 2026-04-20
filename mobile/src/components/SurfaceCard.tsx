import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { appTheme } from '../theme/tokens';

export function SurfaceCard({ style, ...rest }: ViewProps) {
  return <View style={[styles.card, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: appTheme.palette.card,
    borderRadius: appTheme.radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    padding: appTheme.spacing.lg,
    ...appTheme.shadows.card,
  },
});
