import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ArrowLeft, Bell } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { appTheme } from '../theme/tokens';
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
  gradient: readonly string[];
  metrics?: MetricItem[];
  overline?: string;
}

export function PageHeader({
  title,
  subtitle,
  backLabel,
  onBack,
  showNotificationButton,
  onNotificationPress,
  avatarLabel,
  gradient,
  metrics,
  overline,
}: PageHeaderProps) {
  const navigation = useNavigation<Nav>();

  return (
    <GradientBackground colors={gradient} style={styles.gradient}>
      {backLabel ? (
        <Pressable onPress={onBack ?? navigation.goBack} style={styles.backButton}>
          <ArrowLeft size={16} color={appTheme.palette.white} />
          <AppText variant="label" color={appTheme.palette.white}>
            {backLabel}
          </AppText>
        </Pressable>
      ) : null}

      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          {overline ? (
            <AppText variant="label" color="rgba(255,255,255,0.72)">
              {overline}
            </AppText>
          ) : null}
          <AppText variant="headline" weight="bold" color={appTheme.palette.white}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="label" color="rgba(255,255,255,0.68)">
              {subtitle}
            </AppText>
          ) : null}
        </View>
        <View style={styles.actions}>
          {showNotificationButton ? (
            <Pressable onPress={onNotificationPress} style={styles.circleButton}>
              <Bell size={18} color={appTheme.palette.white} />
            </Pressable>
          ) : null}
          {avatarLabel ? (
            <View style={styles.avatar}>
              <AppText variant="label" weight="bold" color={appTheme.palette.white}>
                {avatarLabel}
              </AppText>
            </View>
          ) : null}
        </View>
      </View>

      {metrics?.length ? (
        <View style={styles.metricStrip}>
          {metrics.map((metric, index) => (
            <React.Fragment key={metric.label}>
              <View style={styles.metricItem}>
                <AppText variant="headline" weight="bold" color={appTheme.palette.white}>
                  {metric.value}
                </AppText>
                <AppText variant="caption" color="rgba(255,255,255,0.68)">
                  {metric.label}
                </AppText>
              </View>
              {index < metrics.length - 1 ? <View style={styles.metricDivider} /> : null}
            </React.Fragment>
          ))}
        </View>
      ) : null}
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  gradient: {
    paddingHorizontal: appTheme.spacing.xl,
    paddingTop: 56,
    paddingBottom: appTheme.spacing.xxl,
    borderBottomLeftRadius: appTheme.radius.xxl,
    borderBottomRightRadius: appTheme.radius.xxl,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: appTheme.spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: appTheme.spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: appTheme.spacing.sm,
    alignItems: 'center',
  },
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: appTheme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: appTheme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  metricStrip: {
    marginTop: appTheme.spacing.lg,
    paddingHorizontal: appTheme.spacing.md,
    paddingVertical: appTheme.spacing.md,
    borderRadius: appTheme.radius.lg,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  metricDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
});
