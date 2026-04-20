import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { appTheme } from '../theme/tokens';
import { GradientBackground } from './GradientBackground';
import { AppText } from './AppText';
import { SurfaceCard } from './SurfaceCard';

interface DashboardModuleCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  colors: readonly string[];
  onPress: () => void;
}

export function DashboardModuleCard({
  icon,
  title,
  subtitle,
  colors,
  onPress,
}: DashboardModuleCardProps) {
  return (
    <Pressable style={styles.container} onPress={onPress}>
      <SurfaceCard style={styles.card}>
        <GradientBackground colors={colors} style={styles.iconWrap}>
          {icon}
        </GradientBackground>
        <View style={styles.body}>
          <AppText variant="body" weight="medium" style={styles.center}>
            {title}
          </AppText>
          <AppText
            variant="caption"
            color={appTheme.palette.mutedForeground}
            style={styles.center}
          >
            {subtitle}
          </AppText>
        </View>
      </SurfaceCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '48%',
  },
  card: {
    alignItems: 'center',
    minHeight: 156,
    justifyContent: 'center',
    gap: appTheme.spacing.md,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: appTheme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    gap: 4,
  },
  center: {
    textAlign: 'center',
  },
});
