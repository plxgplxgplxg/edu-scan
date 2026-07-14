import React from 'react';
import { Pressable, StyleSheet, View, Animated } from 'react-native';
import { ArrowLeft, Bell } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { appTheme } from '../theme/tokens';
import { useResponsiveLayout } from '../theme/responsive';
import type { RootStackParamList } from '../navigation/types';
import { AppText } from './AppText';
import { GradientBackground } from './GradientBackground';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface MetricItem {
  label: string;
  value: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backLabel?: string;
  onBack?: () => void;
  showNotificationButton?: boolean;
  onNotificationPress?: () => void;
  avatarLabel?: string;
  gradient?: readonly string[];
  metrics?: MetricItem[];
  overline?: string;
  actionIcon?: React.ReactNode;
  onActionPress?: () => void;
  actionBadge?: string | number;
  footer?: React.ReactNode;
  leadingVisual?: React.ReactNode;
  scrollY?: Animated.Value;
  hideBackButton?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  backLabel,
  onBack,
  hideBackButton,
  showNotificationButton,
  onNotificationPress,
  avatarLabel,
  metrics,
  overline,
  actionIcon,
  onActionPress,
  actionBadge,
  footer,
  leadingVisual,
  gradient,
  scrollY,
}: PageHeaderProps) {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const layout = useResponsiveLayout();
  const useCompactMetrics = layout.isCompact && (metrics?.length ?? 0) > 2;

  const headerGradient = gradient || [appTheme.palette.primary, appTheme.palette.tertiary];
  
  const animatedScrollY = scrollY || new Animated.Value(0);
  const hasBackButton = !hideBackButton && (backLabel || onBack || navigation.canGoBack());

  const contentOpacity = animatedScrollY.interpolate({
    inputRange: [0, 40],
    outputRange: [1, 1],
    extrapolate: 'clamp',
  });

  const headerOpacity = animatedScrollY.interpolate({
    inputRange: [-100, 0, 60],
    outputRange: [1, 1, 1],
    extrapolate: 'clamp',
  });

  const glassOpacity = animatedScrollY.interpolate({
    inputRange: [-100, 0, 60],
    outputRange: [0, 0, 0],
    extrapolate: 'clamp',
  });

  const titleScale = animatedScrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [1, 1],
    extrapolate: 'clamp',
  });

  const titleTranslateY = animatedScrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [0, 0],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={[styles.container, { overflow: 'hidden' }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: headerOpacity }]}>
        <GradientBackground
          colors={headerGradient}
          style={[
            styles.gradient,
            {
              flex: 1,
              borderBottomLeftRadius: layout.heroRadius,
              borderBottomRightRadius: layout.heroRadius,
            },
          ]}
        />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: glassOpacity, backgroundColor: 'rgba(255,255,255,0.85)', borderBottomLeftRadius: layout.heroRadius, borderBottomRightRadius: layout.heroRadius }]} />
      
      <View
        style={{
          paddingTop: insets.top + (layout.isCompact ? 8 : 16),
          paddingHorizontal: layout.horizontalPadding,
          paddingBottom: layout.isCompact ? 12 : 16,
        }}
      >
      <View
        style={[
          styles.bubbleLeft,
          {
            left: -layout.headerVisualSize,
            top: layout.headerVisualSize + 24,
            width: layout.headerVisualSize * 2.2,
            height: layout.headerVisualSize * 2.2,
            borderRadius: layout.headerVisualSize * 1.1,
          },
        ]}
      />
      <View
        style={[
          styles.bubbleRight,
          {
            right: -layout.headerVisualSize * 0.3,
            top: -layout.sectionGap,
            width: layout.headerVisualSize * 2.3,
            height: layout.headerVisualSize * 2.3,
            borderRadius: layout.headerVisualSize * 1.15,
          },
        ]}
      />
      {hasBackButton ? (
        <Pressable 
          onPress={onBack ?? navigation.goBack} 
          style={styles.backButton}
          hitSlop={8}
        >
          <ArrowLeft size={16} color={appTheme.palette.white} />
          <AppText variant="label" color={appTheme.palette.white}>
            {backLabel || 'Quay lại'}
          </AppText>
        </Pressable>
      ) : null}

      <Animated.View
        style={[
          styles.headerRow,
          layout.isSmall ? styles.headerRowStack : null,
          { transform: [{ translateY: titleTranslateY }] }
        ]}
      >
        <Animated.View
          style={[
            {
              flex: 1,
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 12,
              transformOrigin: 'left center',
              transform: [{ scale: titleScale }]
            },
            layout.isSmall ? styles.headerRowStack : null,
          ]}
        >
          {leadingVisual ? (
            <View
              style={[
                styles.leadingVisual,
                {
                  width: layout.headerVisualSize,
                  height: layout.headerVisualSize,
                  borderRadius: layout.heroRadius - 4, // squircle
                },
              ]}
            >
              {leadingVisual}
            </View>
          ) : null}
          <View style={styles.headerCopy}>
            {overline ? (
              <Animated.View style={{ opacity: contentOpacity }}>
                <AppText variant="body" weight="semibold" color="rgba(255,255,255,0.78)">
                  {overline}
                </AppText>
              </Animated.View>
            ) : null}
            <AppText
              variant="title"
              weight="heavy"
              color={appTheme.palette.white}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.72}
              style={{ fontFamily: appTheme.typography.displayFamily }}
            >
              {title}
            </AppText>
            {subtitle ? (
              <Animated.View style={{ opacity: contentOpacity }}>
                <AppText
                  variant="body"
                  color="rgba(255,255,255,0.70)"
                  numberOfLines={3}
                  adjustsFontSizeToFit
                  minimumFontScale={0.82}
                >
                  {subtitle}
                </AppText>
              </Animated.View>
            ) : null}
          </View>
        </Animated.View>
        <View style={[styles.actions, layout.isSmall ? styles.actionsWrap : null]}>
          {showNotificationButton ? (
            <Pressable
              onPress={onNotificationPress}
              style={[
                styles.circleButton,
                {
                  width: layout.avatarSize,
                  height: layout.avatarSize,
                  borderRadius: layout.heroRadius - 4, // squircle
                },
              ]}
            >
              <Bell size={18} color={appTheme.palette.white} />
              {actionBadge ? (
                <View style={styles.badgeBubble}>
                  <AppText variant="caption" weight="bold" color={appTheme.palette.white}>
                    {String(actionBadge)}
                  </AppText>
                </View>
              ) : null}
            </Pressable>
          ) : null}
          {actionIcon ? (
            <Pressable
              onPress={onActionPress}
              style={[
                styles.circleButton,
                {
                  width: layout.avatarSize,
                  height: layout.avatarSize,
                  borderRadius: layout.heroRadius - 4,
                },
              ]}
            >
              {actionIcon}
            </Pressable>
          ) : null}
          {avatarLabel ? (
            <View
              style={[
                styles.avatar,
                {
                  width: layout.avatarSize,
                  height: layout.avatarSize,
                  borderRadius: layout.heroRadius - 4, // squircle
                },
              ]}
            >
              <AppText variant="headline" weight="bold" color={appTheme.palette.white}>
                {avatarLabel}
              </AppText>
            </View>
          ) : null}
        </View>
      </Animated.View>

      {metrics?.length ? (
        <View
          style={[
            styles.metricStrip,
            {
              paddingHorizontal: layout.isCompact ? 12 : 16,
              paddingVertical: layout.isCompact ? 12 : 16,
              borderRadius: layout.heroRadius - 4, // squircle
              flexDirection: useCompactMetrics ? 'column' : 'row',
              alignItems: useCompactMetrics ? 'stretch' : 'center',
              gap: useCompactMetrics ? 12 : 0,
            },
          ]}
        >
          {metrics.map((metric, index) => (
            <React.Fragment key={metric.label}>
              <View style={[styles.metricItem, useCompactMetrics ? styles.metricItemStack : null]}>
                <AppText
                  variant="hero"
                  weight="heavy"
                  color={appTheme.palette.white}
                  style={[
                    styles.metricValue,
                    {
                      fontSize: 32 * layout.metricScale,
                      lineHeight: 38 * layout.metricScale,
                      fontFamily: appTheme.typography.displayFamily,
                      fontVariant: ['tabular-nums'],
                    },
                  ]}
                >
                  {metric.value}
                </AppText>
                <AppText variant="body" color="rgba(255,255,255,0.70)">
                  {metric.label}
                </AppText>
              </View>
              {!useCompactMetrics && index < metrics.length - 1 ? <View style={styles.metricDivider} /> : null}
            </React.Fragment>
          ))}
        </View>
      ) : null}

      {footer ? <Animated.View style={[styles.footer, { opacity: contentOpacity }]}>{footer}</Animated.View> : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 10,
  },
  gradient: {
    overflow: 'hidden',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerRowStack: {
    flexWrap: 'wrap',
  },
  leadingVisual: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)', // glassBorder
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginLeft: 'auto',
  },
  actionsWrap: {
    width: '100%',
    justifyContent: 'flex-start',
    marginLeft: 0,
  },
  circleButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.62)', // glassFill
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)', // glassBorder
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 2,
    borderColor: appTheme.palette.success, // status ring demo (would be dynamic)
  },
  metricStrip: {
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.62)', // glassFill
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)', // glassBorder
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  metricItemStack: {
    alignItems: 'flex-start',
  },
  metricValue: {
  },
  metricDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  badgeBubble: {
    position: 'absolute',
    top: -6,
    right: -4,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: appTheme.palette.destructive,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    marginTop: 16,
  },
  bubbleLeft: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.10)',
    // Optional: add blur using react-native effect if available
  },
  bubbleRight: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
});
