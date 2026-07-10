import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

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
  isLarge?: boolean;
}

export function DashboardModuleCard({
  icon,
  title,
  subtitle,
  colors,
  onPress,
  isLarge,
}: DashboardModuleCardProps) {
  const layout = useResponsiveLayout();
  // Bento grid calculation
  const cardWidth = isLarge || layout.dashboardColumns === 1
    ? '100%'
    : (layout.contentWidth - layout.gridGap * (layout.dashboardColumns - 1)) / layout.dashboardColumns;

  return (
    <Pressable style={[styles.container, { width: cardWidth }]} onPress={onPress}>
      <SurfaceCard
        style={[
          styles.card,
          isLarge ? {
            height: 96,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 20,
            gap: 16,
          } : {
            minHeight: layout.isCompact ? 122 : 128,
            alignItems: 'flex-start',
            paddingVertical: 18,
            paddingHorizontal: 16,
          },
        ]}
      >
        <GradientBackground
          colors={colors}
          style={[
            styles.iconWrap,
            {
              width: 48,
              height: 48,
              borderRadius: Math.max(layout.heroRadius - 10, 8),
              ...appTheme.shadows.glow,
              // Update shadowColor dynamically based on gradient colors to simulate glow
              shadowColor: colors[0],
            },
          ]}
        >
          {icon}
        </GradientBackground>
        
        <View
          style={[
            styles.body,
            isLarge
              ? { flex: 1, alignItems: 'flex-start', gap: 4 }
              : { marginTop: 12, alignItems: 'flex-start' },
          ]}
        >
          <AppText
            variant="bodyStrong"
            numberOfLines={isLarge ? 1 : 2}
            style={isLarge ? undefined : styles.title}
          >
            {title}
          </AppText>
          <AppText
            variant="caption"
            color={appTheme.palette.mutedForeground}
            numberOfLines={1}
          >
            {subtitle}
          </AppText>
        </View>
        
        {isLarge && (
          <View style={styles.chevronWrap}>
            <ChevronRight size={18} color={appTheme.palette.mutedForeground} />
          </View>
        )}
      </SurfaceCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {},
  card: {
    justifyContent: 'center',
    width: '100%',
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    gap: 2,
  },
  title: {
    minHeight: 48, // ensure height aligns nicely in grid
  },
  chevronWrap: {
    marginLeft: 'auto',
    opacity: 0.72,
  },
});
