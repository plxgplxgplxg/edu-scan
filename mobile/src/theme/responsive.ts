import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

const COMPACT_WIDTH = 360;
const SMALL_WIDTH = 390;
const LARGE_PHONE_WIDTH = 430;
const TABLET_WIDTH = 768;

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function getResponsiveLayout(width: number) {
  const isCompact = width < COMPACT_WIDTH;
  const isSmall = width < SMALL_WIDTH;
  const isLargePhone = width >= LARGE_PHONE_WIDTH;
  const isTablet = width >= TABLET_WIDTH;

  const horizontalPadding = clamp(Math.round(width * (isTablet ? 0.042 : 0.045)), 16, isTablet ? 28 : 22);
  const sectionGap = isCompact ? 10 : isTablet ? 18 : 14;
  const gridGap = isCompact ? 12 : 16;
  const contentMaxWidth = isTablet ? 760 : 560;
  const contentWidth = Math.min(width - horizontalPadding * 2, contentMaxWidth);
  const heroRadius = clamp(Math.round(width * 0.068), 20, 32);
  const controlMinHeight = clamp(Math.round(width * 0.136), 52, 60);
  const headerVisualSize = clamp(Math.round(width * 0.17), 52, 84);
  const moduleIconSize = clamp(Math.round(width * 0.165), 52, 68);
  const avatarSize = clamp(Math.round(width * 0.102), 34, 48);
  const navIconSize = isCompact ? 20 : 22;
  const navHeight = clamp(Math.round(width * 0.17), 72, 82);
  const titleScale = isCompact ? 0.84 : isTablet ? 0.98 : 0.9;
  const metricScale = isCompact ? 0.8 : isTablet ? 0.95 : 0.88;
  const dashboardColumns = isTablet ? 3 : isSmall ? 1 : 2;
  const bottomOffset = isCompact ? 8 : 10;

  return {
    width,
    isCompact,
    isSmall,
    isLargePhone,
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
    metricScale,
    dashboardColumns,
    bottomOffset,
  };
}

export function useResponsiveLayout() {
  const { width } = useWindowDimensions();

  return useMemo(() => getResponsiveLayout(width), [width]);
}
