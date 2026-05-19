import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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
  actionBadge?: string | number;
  footer?: React.ReactNode;
  leadingVisual?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  backLabel,
  onBack,
  showNotificationButton,
  onNotificationPress,
  avatarLabel,
  metrics,
  overline,
  actionIcon,
  actionBadge,
  footer,
  leadingVisual,
}: PageHeaderProps) {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const layout = useResponsiveLayout();
  const useCompactMetrics = layout.isCompact && (metrics?.length ?? 0) > 2;
  const extraTopInset = layout.isCompact ? appTheme.spacing.xxxl : appTheme.spacing.huge - appTheme.spacing.sm;

  const headerGradient = ['#5B5BD6', '#7C5CFC'] as const;

  return (
    <GradientBackground
      colors={headerGradient}
      style={[
        styles.gradient,
        {
          paddingTop: insets.top + layout.sectionGap + extraTopInset,
          paddingHorizontal: layout.horizontalPadding,
          paddingBottom: layout.isCompact ? appTheme.spacing.xl : appTheme.spacing.xxl,
          marginHorizontal: layout.horizontalPadding,
          marginTop: -insets.top,
          borderBottomLeftRadius: layout.heroRadius,
          borderBottomRightRadius: layout.heroRadius,
          maxWidth: layout.contentMaxWidth + layout.horizontalPadding * 2,
          alignSelf: 'center',
          width: '100%',
        },
      ]}
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
      {backLabel ? (
        <Pressable onPress={onBack ?? navigation.goBack} style={styles.backButton}>
          <ArrowLeft size={16} color={appTheme.palette.white} />
          <AppText variant="label" color={appTheme.palette.white}>
            {backLabel}
          </AppText>
        </Pressable>
      ) : null}

      <View
        style={[
          styles.headerRow,
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
                borderRadius: layout.heroRadius - 6,
              },
            ]}
          >
            {leadingVisual}
          </View>
        ) : null}
        <View style={styles.headerCopy}>
          {overline ? (
            <AppText variant="body" weight="semibold" color="rgba(255,255,255,0.74)">
              {overline}
            </AppText>
          ) : null}
          <AppText
            variant="title"
            weight="bold"
            color={appTheme.palette.white}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
          >
            {title}
          </AppText>
          {subtitle ? (
            <AppText
              variant="body"
              color="rgba(255,255,255,0.68)"
              numberOfLines={3}
              adjustsFontSizeToFit
              minimumFontScale={0.82}
            >
              {subtitle}
            </AppText>
          ) : null}
        </View>
        <View style={[styles.actions, layout.isSmall ? styles.actionsWrap : null]}>
          {showNotificationButton ? (
            <Pressable
              onPress={onNotificationPress}
              style={[
                styles.circleButton,
                {
                  width: layout.avatarSize,
                  height: layout.avatarSize,
                  borderRadius: layout.heroRadius - 10,
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
            <View
              style={[
                styles.circleButton,
                {
                  width: layout.avatarSize,
                  height: layout.avatarSize,
                  borderRadius: layout.heroRadius - 10,
                },
              ]}
            >
              {actionIcon}
            </View>
          ) : null}
          {avatarLabel ? (
            <View
              style={[
                styles.avatar,
                {
                  width: layout.avatarSize,
                  height: layout.avatarSize,
                  borderRadius: layout.heroRadius - 10,
                },
              ]}
            >
              <AppText variant="headline" weight="bold" color={appTheme.palette.white}>
                {avatarLabel}
              </AppText>
            </View>
          ) : null}
        </View>
      </View>

      {metrics?.length ? (
        <View
          style={[
            styles.metricStrip,
            {
              paddingHorizontal: layout.isCompact ? appTheme.spacing.md : appTheme.spacing.lg,
              paddingVertical: layout.isCompact ? appTheme.spacing.md : appTheme.spacing.lg,
              borderRadius: layout.heroRadius - 6,
              flexDirection: useCompactMetrics ? 'column' : 'row',
              alignItems: useCompactMetrics ? 'stretch' : 'center',
              gap: useCompactMetrics ? appTheme.spacing.md : 0,
            },
          ]}
        >
          {metrics.map((metric, index) => (
            <React.Fragment key={metric.label}>
              <View style={[styles.metricItem, useCompactMetrics ? styles.metricItemStack : null]}>
                <AppText
                  variant="hero"
                  weight="bold"
                  color={appTheme.palette.white}
                  style={[
                    styles.metricValue,
                    {
                      fontSize: 26 * layout.metricScale,
                      lineHeight: 28 * layout.metricScale,
                    },
                  ]}
                >
                  {metric.value}
                </AppText>
                <AppText variant="body" weight="medium" color="rgba(255,255,255,0.68)">
                  {metric.label}
                </AppText>
              </View>
              {!useCompactMetrics && index < metrics.length - 1 ? <View style={styles.metricDivider} /> : null}
            </React.Fragment>
          ))}
        </View>
      ) : null}

      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  gradient: {
    overflow: 'hidden',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: appTheme.spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: appTheme.spacing.md,
  },
  headerRowStack: {
    flexWrap: 'wrap',
  },
  leadingVisual: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: appTheme.spacing.sm,
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
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  metricStrip: {
    marginTop: appTheme.spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
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
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  badgeBubble: {
    position: 'absolute',
    top: -6,
    right: -4,
    minWidth: 26,
    height: 26,
    paddingHorizontal: 6,
    borderRadius: 13,
    backgroundColor: '#FF6A69',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    marginTop: appTheme.spacing.lg,
  },
  bubbleLeft: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  bubbleRight: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
});
