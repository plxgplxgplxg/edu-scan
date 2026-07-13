/* eslint-disable react/no-unstable-nested-components, no-void, react-native/no-inline-styles */
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import {
  Bell,
  ChevronRight,
  Globe,
  LogOut,
  Moon,
  Shield,
  User,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { PageHeader } from '../../components/PageHeader';
import { ModalSheet } from '../../components/ModalSheet';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ErrorState, LoadingState } from '../../components/RequestState';
import { Screen } from '../../components/Screen';
import { SurfaceCard } from '../../components/SurfaceCard';
import { AppText } from '../../components/AppText';
import { useAuth } from '../../store/auth-store';
import { appTheme, palette } from '../../theme/tokens';
import { useResponsiveLayout } from '../../theme/responsive';
import { primaryHeroGradient } from '../../theme/header';
import { getInitials } from '../../utils/string';
import {
  listAssignments,
  listClasses,
  listExams,
  listOmrBatches,
} from '../../api/edu-scan';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface ProfileMenuItem {
  key: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onPress?: () => void;
  rightElement?: React.ReactNode;
}

export function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { accessToken, content, email, language, logout, profileName, role, setLanguage } = useAuth();
  const layout = useResponsiveLayout();
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false); // Thêm state demo cho Dark Mode toggle

  const { data, loading, error, reload } = useAsyncResource(
    async () => {
      if (!accessToken || !role) {
        return null;
      }

      if (role === 'TEACHER') {
        const [classes, exams, omrBatches] = await Promise.all([
          listClasses(accessToken),
          listExams(accessToken),
          listOmrBatches(accessToken),
        ]);

        return {
          classes: classes.length,
          exams: exams.length,
          omrBatches: omrBatches.length,
        };
      }

      if (role === 'STUDENT') {
        const [classes, assignments] = await Promise.all([
          listClasses(accessToken),
          listAssignments(accessToken),
        ]);

        return {
          classes: classes.length,
          assignments: assignments.filter((item) => !item.submits?.[0]).length,
        };
      }

      return null;
    },
    [accessToken, role],
  );

  const roleGradients = useMemo(
    () =>
      ({
        TEACHER: primaryHeroGradient,
        STUDENT: [appTheme.palette.info, '#5CB6FF'],
        ADMIN: [appTheme.palette.success, appTheme.palette.quaternary],
      })[role ?? 'TEACHER'],
    [role],
  );

  const menuItems: ProfileMenuItem[] = [
    {
      key: 'personal',
      title: content.shared.profile.personalInfo,
      subtitle: content.shared.profile.personalInfoSubtitle,
      icon: <User size={18} color={palette.primary} />,
      rightElement: <ChevronRight size={18} color={palette.mutedForeground} />,
    },
    {
      key: 'notifications',
      title: content.shared.profile.notifications,
      subtitle: content.shared.profile.notificationSubtitle,
      icon: <Bell size={18} color={palette.warning} />,
      onPress: () => navigation.navigate('SharedNotifications'),
      rightElement: <ChevronRight size={18} color={palette.mutedForeground} />,
    },
    {
      key: 'language',
      title: content.shared.profile.language,
      subtitle: content.language[language],
      icon: <Globe size={18} color={palette.info} />,
      onPress: () => setShowLanguagePicker(true),
      rightElement: <ChevronRight size={18} color={palette.mutedForeground} />,
    },
    {
      key: 'darkmode',
      title: 'Giao diện tối',
      subtitle: isDarkMode ? 'Đang bật' : 'Đang tắt',
      icon: <Moon size={18} color={palette.foregroundSoft} />,
      onPress: () => setIsDarkMode(!isDarkMode),
      rightElement: (
        <Switch
          value={isDarkMode}
          onValueChange={setIsDarkMode}
          trackColor={{ false: palette.muted, true: palette.primary }}
        />
      ),
    },
    {
      key: 'security',
      title: content.shared.profile.security,
      subtitle: content.shared.profile.securitySubtitle,
      icon: <Shield size={18} color={palette.success} />,
      rightElement: <ChevronRight size={18} color={palette.mutedForeground} />,
    },
  ];

  return (
    <Screen refreshing={loading} onRefresh={() => { void reload(); }}>
      <PageHeader
        title={profileName}
        subtitle={email}
        overline={content.shared.profile.title}
        gradient={roleGradients}
        leadingVisual={
          <View
            style={[
              styles.initialsCard,
              {
                width: '100%',
                height: '100%',
                borderRadius: layout.heroRadius - 6,
              },
            ]}
          >
            <AppText variant="title" weight="bold" color={palette.white}>
              {getInitials(profileName)}
            </AppText>
          </View>
        }
        footer={(
          <View style={styles.headerFooter}>
            <View style={styles.rolePill}>
              <AppText variant="label" weight="semibold" color={palette.white}>
                {role ? content.roles[role] : content.roles.TEACHER}
              </AppText>
            </View>
            <View style={[styles.metricsCard, layout.isCompact ? styles.metricsCardStack : null]}>
                {role === 'TEACHER' ? (
                <>
                  <MetricBlock label={content.teacher.dashboard.metrics.classes} value={String((data as { classes?: number } | null)?.classes ?? 0)} light />
                  <MetricBlock label={content.teacher.dashboard.metrics.exams} value={String((data as { exams?: number } | null)?.exams ?? 0)} light />
                  <MetricBlock label={content.shared.profile.teacherOmrCount} value={String((data as { omrBatches?: number } | null)?.omrBatches ?? 0)} light />
                </>
              ) : null}
              {role === 'STUDENT' ? (
                <>
                  <MetricBlock
                    label={content.student.dashboard.metrics.classes}
                    value={String((data as { classes?: number } | null)?.classes ?? 0)}
                    light
                  />
                  <MetricBlock
                    label={content.student.dashboard.metrics.assignments}
                    value={String((data as { assignments?: number } | null)?.assignments ?? 0)}
                    light
                  />
                </>
              ) : null}
            </View>
          </View>
        )}
      />

      <View
        style={[
          styles.menu,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingTop: layout.sectionGap,
            maxWidth: layout.contentMaxWidth,
            alignSelf: 'center',
            width: '100%',
            gap: layout.sectionGap,
          },
        ]}
      >
        {loading ? <LoadingState label={content.common.labels.loading} /> : null}
        {error ? (
          <ErrorState
            message={error}
            retryLabel={content.common.buttons.retry}
            onRetry={reload}
          />
        ) : null}
        {menuItems.map(item => (
          <Pressable key={item.key} onPress={item.onPress}>
            <SurfaceCard style={styles.menuCard}>
              <View style={styles.menuIcon}>{item.icon}</View>
              <View style={styles.flex}>
                <AppText variant="bodyStrong" color={palette.foreground}>
                  {item.title}
                </AppText>
                <AppText variant="caption" color={palette.foregroundSoft}>
                  {item.subtitle}
                </AppText>
              </View>
              {item.rightElement}
            </SurfaceCard>
          </Pressable>
        ))}
        <Pressable onPress={logout}>
          <SurfaceCard style={styles.logoutCard}>
            <View style={[styles.menuIcon, styles.logoutIcon]}>
              <LogOut size={18} color={palette.destructive} />
            </View>
            <View style={styles.flex}>
              <AppText variant="bodyStrong" color={palette.destructive}>
                {content.common.buttons.logout}
              </AppText>
              <AppText variant="caption" color={palette.destructive} style={{ opacity: 0.75 }}>
                {content.shared.profile.logoutSubtitle}
              </AppText>
            </View>
          </SurfaceCard>
        </Pressable>
      </View>
      <ModalSheet visible={showLanguagePicker} onClose={() => setShowLanguagePicker(false)}>
        <AppText variant="headline" weight="bold" style={styles.sheetTitle}>
          {content.common.buttons.switchLanguage}
        </AppText>
        <View style={styles.sheetBody}>
          <PrimaryButton
            variant={language === 'vi' ? 'solid' : 'outline'}
            label={content.language.vi}
            onPress={() => {
              setLanguage('vi');
              setShowLanguagePicker(false);
            }}
          />
          <PrimaryButton
            variant={language === 'en' ? 'solid' : 'outline'}
            label={content.language.en}
            onPress={() => {
              setLanguage('en');
              setShowLanguagePicker(false);
            }}
          />
        </View>
      </ModalSheet>
    </Screen>
  );
}

function MetricBlock({
  label,
  value,
  light = false,
}: {
  label: string;
  value: string;
  light?: boolean;
}) {
  return (
    <View style={styles.metricBlock}>
      <AppText 
        variant="headline" 
        weight="bold" 
        color={light ? palette.white : palette.foreground}
        style={{ fontFamily: appTheme.typography.displayFamily }}
      >
        {value}
      </AppText>
      <AppText variant="label" color={light ? 'rgba(255,255,255,0.7)' : palette.mutedForeground}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  initialsCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: appTheme.palette.glassFill,
  },
  headerFooter: {
    gap: appTheme.spacing.lg,
  },
  rolePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: appTheme.radius.pill,
    backgroundColor: appTheme.palette.glassFill,
    borderWidth: 1,
    borderColor: appTheme.palette.glassBorder,
  },
  metricsCard: {
    backgroundColor: appTheme.palette.glassFill,
    borderRadius: appTheme.radius.lg,
    padding: appTheme.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: appTheme.palette.glassBorder,
  },
  metricsCardStack: {
    flexWrap: 'wrap',
    rowGap: appTheme.spacing.md,
  },
  metricBlock: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
    minWidth: 90,
  },
  menu: {
    gap: appTheme.spacing.lg,
    paddingBottom: 40,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 76,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: appTheme.radius.md,
    backgroundColor: palette.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: palette.destructiveSoft,
    minHeight: 76,
  },
  logoutIcon: {
    backgroundColor: 'rgba(255,59,92,0.12)', // destructive darker
  },
  flex: {
    flex: 1,
  },
  sheetTitle: {
    marginBottom: appTheme.spacing.lg,
  },
  sheetBody: {
    gap: appTheme.spacing.md,
  },
});
