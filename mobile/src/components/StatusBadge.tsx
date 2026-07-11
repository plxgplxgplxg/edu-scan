import React from 'react';
import { StyleSheet, View } from 'react-native';

import { appTheme } from '../theme/tokens';
import { useAppContent } from '../hooks/useAppContent';
import { useResponsiveLayout } from '../theme/responsive';
import type { StatusKey } from '../types/app';
import { AppText } from './AppText';

export function StatusBadge({ status }: { status: StatusKey }) {
  const content = useAppContent();
  const layout = useResponsiveLayout();
  
  let backgroundColor = appTheme.palette.muted;
  let textColor = appTheme.palette.mutedForeground;
  let dotColor = appTheme.palette.mutedForeground;

  if (['GRADED', 'COMPLETED', 'ON_TIME'].includes(status)) {
    backgroundColor = appTheme.palette.successSoft;
    textColor = appTheme.palette.success;
    dotColor = appTheme.palette.success;
  } else if (['NEEDS_REVIEW', 'PARTIAL_FAILED'].includes(status)) {
    backgroundColor = appTheme.palette.warningSoft;
    textColor = appTheme.palette.warning;
    dotColor = appTheme.palette.warning;
  } else if (['FAILED', 'LATE'].includes(status)) {
    backgroundColor = appTheme.palette.destructiveSoft;
    textColor = appTheme.palette.destructive;
    dotColor = appTheme.palette.destructive;
  } else if (['PROCESSING'].includes(status)) {
    backgroundColor = appTheme.palette.infoSoft;
    textColor = appTheme.palette.info;
    dotColor = appTheme.palette.info;
  } else if (['PENDING'].includes(status)) {
    backgroundColor = appTheme.palette.muted;
    textColor = appTheme.palette.mutedForeground;
    dotColor = appTheme.palette.mutedForeground;
  }

  return (
    <View
      style={[
        styles.badge,
        {
          paddingHorizontal: layout.isCompact ? 10 : 12,
        },
        { backgroundColor },
      ]}
    >
      {/* 6px Dot */}
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <AppText variant="label" weight="medium" color={textColor}>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
