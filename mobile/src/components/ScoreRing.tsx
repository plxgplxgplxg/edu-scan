import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { appTheme } from '../theme/tokens';
import { useResponsiveLayout } from '../theme/responsive';
import { AppText } from './AppText';

interface ScoreRingProps {
  score: number;
  maxScore: number;
}

export function ScoreRing({ score, maxScore }: ScoreRingProps) {
  const layout = useResponsiveLayout();
  const size = layout.isCompact ? 56 : 64;
  const strokeWidth = 5;
  const radius = size / 2 - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const ratio = maxScore ? Math.min(score / maxScore, 1) : 0;
  const strokeDashoffset = circumference * (1 - ratio);

  let gradientColors = [appTheme.palette.destructive, appTheme.palette.destructive];
  let gradientId = 'scoreGrad_destructive';
  if (score >= 8) {
    gradientColors = [appTheme.palette.success, appTheme.palette.quaternary];
    gradientId = 'scoreGrad_success';
  } else if (score >= 5) {
    gradientColors = [appTheme.palette.primary, appTheme.palette.tertiary];
    gradientId = 'scoreGrad_primary';
  }

  const useGradient = score >= 5;
  const strokeValue = useGradient ? `url(#${gradientId})` : appTheme.palette.destructive;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          {useGradient && (
            <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={gradientColors[0]} />
              <Stop offset="100%" stopColor={gradientColors[1]} />
            </LinearGradient>
          )}
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={appTheme.palette.muted}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeValue}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.center}>
        <AppText 
          variant="headline" 
          weight="heavy" 
          color={gradientColors[0]}
          style={{ fontFamily: appTheme.typography.displayFamily, fontVariant: ['tabular-nums'] }}
        >
          {String(score)}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
