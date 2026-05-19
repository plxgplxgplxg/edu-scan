import React from 'react';
import { StyleSheet, View } from 'react-native';

import { appTheme } from '../theme/tokens';

interface ProgressBarProps {
  progress: number;
  color?: string;
}

export function ProgressBar({
  progress,
  color = appTheme.palette.primary,
}: ProgressBarProps) {
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${progress}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#ECEEFA',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
});
