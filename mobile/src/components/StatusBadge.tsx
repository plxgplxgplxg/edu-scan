import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useAppContent } from '../hooks/useAppContent';
import { useResponsiveLayout } from '../theme/responsive';
import type { StatusKey } from '../types/app';
import { AppText } from './AppText';

const badgeColors: Record<
  StatusKey,
  { backgroundColor: string; textColor: string }
> = {
  GRADED: { backgroundColor: '#DCFCE7', textColor: '#047857' },
  NEEDS_REVIEW: { backgroundColor: '#FFF0D9', textColor: '#D66A00' },
  FAILED: { backgroundColor: '#FFE8EA', textColor: '#F14156' },
  PENDING: { backgroundColor: '#F0F2FB', textColor: '#65709A' },
  PROCESSING: { backgroundColor: '#E4F2FF', textColor: '#257CE7' },
  COMPLETED: { backgroundColor: '#DCFCE7', textColor: '#047857' },
  PARTIAL_FAILED: { backgroundColor: '#FFEDD5', textColor: '#D66A00' },
  ON_TIME: { backgroundColor: '#DCFCE7', textColor: '#047857' },
  LATE: { backgroundColor: '#FFE8EA', textColor: '#F14156' },
  APPROVED: { backgroundColor: '#DCFCE7', textColor: '#047857' },
  REJECTED: { backgroundColor: '#FFE8EA', textColor: '#F14156' },
  EASY: { backgroundColor: '#DCFCE7', textColor: '#047857' },
  MEDIUM: { backgroundColor: '#FFF0D9', textColor: '#D66A00' },
  HARD: { backgroundColor: '#FFE8EA', textColor: '#F14156' },
};

export function StatusBadge({ status }: { status: StatusKey }) {
  const content = useAppContent();
  const layout = useResponsiveLayout();
  const config = badgeColors[status];

  return (
    <View
      style={[
        styles.badge,
        {
          paddingHorizontal: layout.isCompact ? 10 : 12,
        },
        { backgroundColor: config.backgroundColor },
      ]}
    >
      <AppText variant="label" weight="medium" color={config.textColor}>
        {content.common.statuses[status]}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
  },
});
