import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { appTheme } from '../theme/tokens';
import { useResponsiveLayout } from '../theme/responsive';
import { AppText } from './AppText';

interface ScoreRingProps {
  score: number;
  maxScore: number;
}

export function ScoreRing({ score, maxScore }: ScoreRingProps) {
  const layout = useResponsiveLayout();
  const size = layout.isCompact ? 52 : 56;
  const radius = size / 2 - 6;
  const circumference = 2 * Math.PI * radius;
  const ratio = maxScore ? Math.min(score / maxScore, 1) : 0;
  const strokeDashoffset = circumference * (1 - ratio);
  const strokeColor =
    score >= 8 ? appTheme.palette.success : score >= 5 ? appTheme.palette.primary : appTheme.palette.destructive;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#F0F0F5"
          strokeWidth={4}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={4}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.center}>
        <AppText variant="body" weight="bold" color={strokeColor}>
          {String(score)}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 56,
    height: 56,
  },
  center: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
