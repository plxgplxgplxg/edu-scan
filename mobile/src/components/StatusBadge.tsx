import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useAppContent } from '../hooks/useAppContent';
import type { StatusKey } from '../types/app';
import { AppText } from './AppText';

const badgeColors: Record<
  StatusKey,
  { backgroundColor: string; textColor: string }
> = {
  GRADED: { backgroundColor: '#DCFCE7', textColor: '#047857' },
  NEEDS_REVIEW: { backgroundColor: '#FEF3C7', textColor: '#B45309' },
  FAILED: { backgroundColor: '#FEE2E2', textColor: '#B91C1C' },
  PENDING: { backgroundColor: '#E2E8F0', textColor: '#475569' },
  PROCESSING: { backgroundColor: '#DBEAFE', textColor: '#1D4ED8' },
  COMPLETED: { backgroundColor: '#DCFCE7', textColor: '#047857' },
  PARTIAL_FAILED: { backgroundColor: '#FFEDD5', textColor: '#C2410C' },
  ON_TIME: { backgroundColor: '#DCFCE7', textColor: '#047857' },
  LATE: { backgroundColor: '#FEE2E2', textColor: '#B91C1C' },
  APPROVED: { backgroundColor: '#DCFCE7', textColor: '#047857' },
  REJECTED: { backgroundColor: '#FEE2E2', textColor: '#B91C1C' },
  EASY: { backgroundColor: '#DCFCE7', textColor: '#047857' },
  MEDIUM: { backgroundColor: '#FEF3C7', textColor: '#B45309' },
  HARD: { backgroundColor: '#FEE2E2', textColor: '#B91C1C' },
};

export function StatusBadge({ status }: { status: StatusKey }) {
  const content = useAppContent();
  const config = badgeColors[status];

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.backgroundColor },
      ]}
    >
      <AppText variant="caption" weight="medium" color={config.textColor}>
        {content.common.statuses[status]}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
});
