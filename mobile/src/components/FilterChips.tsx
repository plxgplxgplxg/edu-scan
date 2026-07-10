import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { appTheme } from '../theme/tokens';
import { useResponsiveLayout } from '../theme/responsive';
import { AppText } from './AppText';

interface FilterChipsProps<T extends string> {
  value: T;
  items: Array<{ id: T; label: string; count?: number }>;
  onChange: (value: T) => void;
}

export function FilterChips<T extends string>({
  value,
  items,
  onChange,
}: FilterChipsProps<T>) {
  const layout = useResponsiveLayout();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={100} // nhẹ snapToInterval, real app needs exact calculation based on chip width
      decelerationRate="fast"
      contentContainerStyle={[
        styles.container,
        {
          paddingRight: layout.horizontalPadding * 0.25,
        },
      ]}
    >
      {items.map(item => {
        const active = item.id === value;

        return (
          <Pressable
            key={item.id}
            onPress={() => onChange(item.id)}
            style={({ pressed }) => [
              styles.chip,
              {
                minHeight: layout.controlMinHeight - 8,
                paddingHorizontal: layout.isCompact ? 14 : 16,
                borderRadius: appTheme.radius.pill,
                backgroundColor: appTheme.palette.surface1,
                borderColor: appTheme.palette.border,
              },
              active ? {
                backgroundColor: appTheme.palette.primary,
                borderColor: 'transparent',
                ...appTheme.shadows.glow,
              } : null,
              pressed ? { opacity: 0.8 } : null,
            ]}
          >
            <AppText
              variant="label"
              color={active ? appTheme.palette.white : appTheme.palette.foregroundSoft}
            >
              {item.label}
            </AppText>
            {item.count ? (
              <View style={[styles.badge, active ? styles.badgeActive : null]}>
                <AppText
                  variant="caption"
                  color={active ? appTheme.palette.white : appTheme.palette.primary}
                >
                  {String(item.count)}
                </AppText>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: appTheme.palette.primaryMuted,
    paddingHorizontal: 4,
  },
  badgeActive: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
});
