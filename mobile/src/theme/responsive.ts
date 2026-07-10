import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

const COMPACT_WIDTH = 360;
const EXTRA_COMPACT_WIDTH = 330;
const SMALL_WIDTH = 390;
const LARGE_PHONE_WIDTH = 430;
const FOLDABLE_WIDTH = 600;
const TABLET_WIDTH = 768;

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function getResponsiveLayout(width: number) {
  const isCompact = width < COMPACT_WIDTH;
  const isExtraCompact = width < EXTRA_COMPACT_WIDTH;
  const isSmall = width < SMALL_WIDTH;
  const isLargePhone = width >= LARGE_PHONE_WIDTH;
  const isFoldable = width >= FOLDABLE_WIDTH && width < TABLET_WIDTH;
  const isTablet = width >= TABLET_WIDTH;

  const horizontalPadding = clamp(Math.round(width * 0.045), 16, 22);
  const sectionGap = isCompact ? 10 : isTablet ? 18 : 14;
  const gridGap = isCompact ? 12 : 16;
  const contentMaxWidth = isTablet ? 760 : 560;
  const contentWidth = Math.min(width - horizontalPadding * 2, contentMaxWidth);
  
  // Hero radius from design doc: clamp(width * 0.072, 22, 34)
  const heroRadius = clamp(Math.round(width * 0.072), 22, 34);
  const controlMinHeight = clamp(Math.round(width * 0.136), 52, 58);
  const headerVisualSize = clamp(Math.round(width * 0.17), 52, 84);
  const moduleIconSize = clamp(Math.round(width * 0.145), 46, 60);
  const avatarSize = clamp(Math.round(width * 0.102), 34, 48);
  const navIconSize = isCompact ? 20 : 22;
  
  // Nav height from design doc: 64-72px
  const navHeight = clamp(Math.round(width * 0.17), 64, 72);
  
  const titleScale = isCompact ? 0.84 : isTablet ? 0.98 : 0.9;
  const bodyScale = isCompact ? 0.96 : isTablet ? 1.04 : 1;
  const metricScale = isCompact ? 0.8 : isTablet ? 0.95 : 0.88;
  const dashboardColumns = isTablet ? 3 : isExtraCompact ? 1 : 2;
  const bottomOffset = isCompact ? 8 : 10;

  return {
    width,
    isCompact,
    isExtraCompact,
    isSmall,
    isLargePhone,
    isFoldable,
    isTablet,
    horizontalPadding,
    sectionGap,
    gridGap,
    contentMaxWidth,
    contentWidth,
    heroRadius,
    controlMinHeight,
    headerVisualSize,
    moduleIconSize,
    avatarSize,
    navIconSize,
    navHeight,
    titleScale,
    bodyScale,
    metricScale,
    dashboardColumns,
    bottomOffset,
  };
}

export function useResponsiveLayout() {
  const { width } = useWindowDimensions();

  return useMemo(() => getResponsiveLayout(width), [width]);
}

