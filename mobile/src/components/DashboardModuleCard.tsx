import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { appTheme } from '../theme/tokens';
import { useResponsiveLayout } from '../theme/responsive';
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
  const layout = useResponsiveLayout();
  const cardWidth =
    layout.dashboardColumns === 1
      ? '100%'
      : (layout.contentWidth - layout.gridGap * (layout.dashboardColumns - 1)) / layout.dashboardColumns;

  return (
    <Pressable style={[styles.container, { width: cardWidth }]} onPress={onPress}>
      <SurfaceCard
        style={[
          styles.card,
          {
            minHeight: layout.dashboardColumns === 1 ? 152 : layout.isCompact ? 160 : 172,
            gap: layout.sectionGap,
            borderRadius: layout.heroRadius - 6,
          },
        ]}
      >
        <GradientBackground
          colors={colors}
          style={[
            styles.iconWrap,
            {
              width: layout.moduleIconSize,
              height: layout.moduleIconSize,
              borderRadius: layout.heroRadius - 6,
            },
          ]}
        >
          {icon}
        </GradientBackground>
        <View style={styles.body}>
          <AppText variant="body" weight="medium" style={styles.center} numberOfLines={2}>
            {title}
          </AppText>
          <AppText
            variant="caption"
            color={appTheme.palette.mutedForeground}
            style={styles.center}
            numberOfLines={2}
          >
            {subtitle}
          </AppText>
        </View>
      </SurfaceCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {},
  card: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    ...appTheme.shadows.card,
  },
  body: {
    gap: 4,
  },
  center: {
    textAlign: 'center',
  },
});
