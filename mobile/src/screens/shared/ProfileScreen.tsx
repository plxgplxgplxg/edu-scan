import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  Bell,
  Globe,
  LogOut,
  Shield,
  User,
} from 'lucide-react-native';

import { BottomNav } from '../../components/BottomNav';
import { PageHeader } from '../../components/PageHeader';
import { ModalSheet } from '../../components/ModalSheet';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen } from '../../components/Screen';
import { SurfaceCard } from '../../components/SurfaceCard';
import { AppText } from '../../components/AppText';
import { useAuth } from '../../store/auth-store';
import { appTheme, palette } from '../../theme/tokens';
import { useResponsiveLayout } from '../../theme/responsive';
import { getInitials } from '../../utils/string';
import { omrBatches, studentResults, teacherClasses, teacherExams } from '../../api/mockData';

export function ProfileScreen() {
  const { content, email, language, logout, profileName, role, setLanguage } = useAuth();
  const layout = useResponsiveLayout();
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  const roleGradients = useMemo(
    () =>
      ({
        TEACHER: ['#5B5BD6', '#7C5CFC'],
        STUDENT: ['#3B82F6', '#60A5FA'],
        ADMIN: ['#10B981', '#34D399'],
      })[role ?? 'TEACHER'],
    [role],
  );

  const menuItems = [
    {
      key: 'personal',
      title: content.shared.profile.personalInfo,
      subtitle: content.shared.profile.personalInfoSubtitle,
      icon: <User size={18} color={palette.primary} />,
    },
    {
      key: 'notifications',
      title: content.shared.profile.notifications,
      subtitle: content.shared.profile.notificationSubtitle,
      icon: <Bell size={18} color={palette.warning} />,
    },
    {
      key: 'language',
      title: content.shared.profile.language,
      subtitle: content.language[language],
      icon: <Globe size={18} color={palette.info} />,
      onPress: () => setShowLanguagePicker(true),
    },
    {
      key: 'security',
      title: content.shared.profile.security,
      subtitle: content.shared.profile.securitySubtitle,
      icon: <Shield size={18} color={palette.success} />,
    },
  ];

  return (
    <Screen>
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
                  <MetricBlock label={content.teacher.dashboard.metrics.classes} value={String(teacherClasses.length)} light />
                  <MetricBlock label={content.teacher.dashboard.metrics.exams} value={String(teacherExams.length)} light />
                  <MetricBlock label={content.shared.profile.teacherOmrCount} value={String(omrBatches.length)} light />
                </>
              ) : null}
              {role === 'STUDENT' ? (
                <>
                  <MetricBlock
                    label={content.student.dashboard.metrics.average}
                    value={(
                      studentResults
                        .filter(item => item.status === 'GRADED')
                        .reduce((sum, item) => sum + item.score, 0) /
                      Math.max(studentResults.filter(item => item.status === 'GRADED').length, 1)
                    ).toFixed(1)}
                    light
                  />
                  <MetricBlock label={content.student.dashboard.metrics.exams} value={String(studentResults.length)} light />
                  <MetricBlock label={content.shared.profile.studentRank} value="Khá" light />
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
        {menuItems.map(item => (
          <Pressable key={item.key} onPress={item.onPress}>
            <SurfaceCard style={styles.menuCard}>
              <View style={styles.menuIcon}>{item.icon}</View>
              <View style={styles.flex}>
                <AppText variant="body" weight="medium">
                  {item.title}
                </AppText>
                <AppText variant="caption" color={palette.mutedForeground}>
                  {item.subtitle}
                </AppText>
              </View>
            </SurfaceCard>
          </Pressable>
        ))}
        <Pressable onPress={logout}>
          <SurfaceCard style={styles.logoutCard}>
            <View style={[styles.menuIcon, styles.logoutIcon]}>
              <LogOut size={18} color={palette.destructive} />
            </View>
            <View style={styles.flex}>
              <AppText variant="body" weight="medium" color={palette.destructive}>
                {content.common.buttons.logout}
              </AppText>
              <AppText variant="caption" color="#F87171">
                {content.shared.profile.logoutSubtitle}
              </AppText>
            </View>
          </SurfaceCard>
        </Pressable>
      </View>

      {role ? (
        <BottomNav role={role} currentScreen="SharedProfile" currentModule="home" />
      ) : null}

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
      <AppText variant="headline" weight="bold" color={light ? palette.white : palette.foreground}>
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
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  headerFooter: {
    gap: appTheme.spacing.lg,
  },
  rolePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: appTheme.spacing.lg,
    paddingVertical: 8,
    borderRadius: appTheme.radius.pill,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  metricsCard: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: appTheme.radius.lg,
    padding: appTheme.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
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
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.spacing.md,
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
    gap: appTheme.spacing.md,
    backgroundColor: '#FFF1F2',
  },
  logoutIcon: {
    backgroundColor: '#FFE5E7',
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
