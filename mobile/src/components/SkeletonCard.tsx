import React from 'react';
import { StyleSheet, View } from 'react-native';

import { appTheme, palette } from '../theme/tokens';

interface SkeletonCardProps {
  lines?: number;
}

export function SkeletonCard({ lines = 3 }: SkeletonCardProps) {
  return (
    <View style={styles.card}>
      <View style={[styles.line, styles.title]} />
      {Array.from({ length: lines }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.line,
            index === lines - 1 ? styles.shortLine : null,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: appTheme.spacing.sm,
    borderRadius: appTheme.radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.card,
    padding: appTheme.spacing.lg,
  },
  line: {
    height: 12,
    borderRadius: 999,
    backgroundColor: '#E8ECF5',
  },
  title: {
    height: 16,
    width: '62%',
  },
  shortLine: {
    width: '48%',
  },
});
