import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  Bell,
  Camera,
  Globe,
  LogOut,
  Shield,
  Star,
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
import { getInitials } from '../../utils/string';
import { omrBatches, studentResults, teacherClasses, teacherExams } from '../../api/mockData';

export function ProfileScreen() {
  const { content, email, language, logout, profileName, role, setLanguage } = useAuth();
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
        title={content.shared.profile.title}
        subtitle={email}
        overline={profileName}
        gradient={roleGradients}
        avatarLabel={getInitials(profileName)}
      />

      <View style={styles.avatarButton}>
        <Camera size={14} color={palette.primary} />
      </View>

      <View style={styles.metricsCard}>
        {role === 'TEACHER' ? (
          <>
            <MetricBlock label={content.teacher.dashboard.metrics.classes} value={String(teacherClasses.length)} />
            <MetricBlock label={content.teacher.dashboard.metrics.exams} value={String(teacherExams.length)} />
            <MetricBlock label={content.shared.profile.teacherOmrCount} value={String(omrBatches.length)} />
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
            />
            <MetricBlock label={content.student.dashboard.metrics.exams} value={String(studentResults.length)} />
            <View style={styles.metricBlock}>
              <Star size={14} color={palette.warning} />
              <AppText variant="caption" color={palette.mutedForeground}>
                {content.shared.profile.studentRank}
              </AppText>
            </View>
          </>
        ) : null}
      </View>

      <View style={styles.menu}>
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

function MetricBlock({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricBlock}>
      <AppText variant="body" weight="bold">
        {value}
      </AppText>
      <AppText variant="caption" color={palette.mutedForeground}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarButton: {
    position: 'absolute',
    top: 136,
    right: appTheme.spacing.xl + 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsCard: {
    marginHorizontal: appTheme.spacing.xl,
    marginTop: appTheme.spacing.lg,
    backgroundColor: palette.card,
    borderRadius: appTheme.radius.lg,
    padding: appTheme.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-around',
    ...appTheme.shadows.card,
  },
  metricBlock: {
    alignItems: 'center',
    gap: 4,
  },
  menu: {
    paddingHorizontal: appTheme.spacing.xl,
    paddingTop: appTheme.spacing.lg,
    gap: appTheme.spacing.md,
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
    backgroundColor: '#FEF2F2',
  },
  logoutIcon: {
    backgroundColor: '#FEE2E2',
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
