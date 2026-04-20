import React from 'react';
import LinearGradient from 'react-native-linear-gradient';
import { StyleSheet, View, type ViewStyle } from 'react-native';

interface GradientBackgroundProps {
  colors: readonly string[];
  style?: ViewStyle | ViewStyle[];
  children?: React.ReactNode;
}

export function GradientBackground({
  colors,
  style,
  children,
}: GradientBackgroundProps) {
  return (
    <LinearGradient
      colors={[...colors]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradient, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    width: '100%',
  },
});
