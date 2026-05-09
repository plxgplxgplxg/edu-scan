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
            style={[
              styles.chip,
              {
                minHeight: layout.controlMinHeight - 10,
                paddingHorizontal: layout.isCompact ? appTheme.spacing.md : appTheme.spacing.lg,
                borderRadius: layout.heroRadius - 6,
              },
              active ? styles.activeChip : null,
            ]}
          >
            <AppText
              variant="label"
              color={active ? appTheme.palette.white : appTheme.palette.mutedForeground}
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
    gap: appTheme.spacing.sm,
  },
  chip: {
    backgroundColor: appTheme.palette.card,
    borderWidth: 1,
    borderColor: appTheme.palette.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...appTheme.shadows.card,
  },
  activeChip: {
    backgroundColor: appTheme.palette.primary,
    borderColor: 'transparent',
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF0FF',
    paddingHorizontal: 4,
  },
  badgeActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
});
