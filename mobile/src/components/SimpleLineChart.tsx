import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { appTheme } from '../theme/tokens';

interface SimpleLineChartProps {
  values: number[];
}

export function SimpleLineChart({ values }: SimpleLineChartProps) {
  const width = 320;
  const height = 180;
  const max = 10;
  const min = 0;

  const points = values.map((value, index) => {
    const x = (index / Math.max(values.length - 1, 1)) * width;
    const y = height - ((value - min) / (max - min)) * (height - 24) - 12;
    return `${x},${y}`;
  });

  const linePath = points.reduce((path, point, index) => {
    if (index === 0) {
      return `M${point}`;
    }

    return `${path} L${point}`;
  }, '');

  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;

  return (
    <View style={styles.wrap}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={appTheme.palette.primary} stopOpacity={0.25} />
            <Stop offset="100%" stopColor={appTheme.palette.primary} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="transparent" />
        <Path d={areaPath} fill="url(#areaFill)" />
        <Path d={linePath} stroke={appTheme.palette.primary} strokeWidth={3} fill="none" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    overflow: 'hidden',
  },
});
