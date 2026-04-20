import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { appTheme } from '../theme/tokens';
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
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {items.map(item => {
        const active = item.id === value;

        return (
          <Pressable
            key={item.id}
            onPress={() => onChange(item.id)}
            style={[styles.chip, active ? styles.activeChip : null]}
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
    minHeight: 40,
    paddingHorizontal: appTheme.spacing.md,
    borderRadius: appTheme.radius.md,
    backgroundColor: appTheme.palette.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeChip: {
    backgroundColor: appTheme.palette.primary,
  },
  badge: {
    minWidth: 18,
    height: 18,
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
