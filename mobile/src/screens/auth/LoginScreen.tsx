import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight, Eye, EyeOff, ScanLine } from 'lucide-react-native';

import { demoAccounts } from '../../api/mockData';
import { useAuth } from '../../store/auth-store';
import { appTheme } from '../../theme/tokens';
import { clamp, useResponsiveLayout } from '../../theme/responsive';
import { GradientBackground } from '../../components/GradientBackground';
import { AppText } from '../../components/AppText';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen } from '../../components/Screen';
import { SurfaceCard } from '../../components/SurfaceCard';
import { TextInputField } from '../../components/TextInputField';

export function LoginScreen() {
  const { content, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const layout = useResponsiveLayout();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const heroSize = clamp(layout.width * 0.26, 86, 118);
  const heroBubbleSize = clamp(layout.width * 0.42, 136, 196);
  const topHeroMinHeight = clamp(height * 0.24, 160, 236);

  const demoRoleLabels = useMemo(
    () =>
      demoAccounts.map(account => ({
        ...account,
        label: content.roles[account.role],
      })),
    [content.roles],
  );

  const onSubmit = () => {
    setError(undefined);

    if (!email.trim() || !password.trim()) {
      setError(content.common.messages.loginEmpty);
      return;
    }

    if (password.trim().length < 6) {
      setError(content.common.messages.loginPasswordShort);
      return;
    }

    setLoading(true);
    setTimeout(() => {
      login(email.trim());
      setLoading(false);
    }, 900);
  };

  return (
    <Screen
      scrollable={false}
      withoutBottomInset
      bleedTop
      contentContainerStyle={styles.screenContent}
    >
      <GradientBackground
        colors={['#4338CA', '#6D28D9', '#7C3AED', '#8B5CF6']}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          styles.heroBubbleLeft,
          {
            width: heroBubbleSize * 0.86,
            height: heroBubbleSize * 0.86,
            borderRadius: heroBubbleSize * 0.43,
          },
        ]}
      />
      <View
        style={[
          styles.heroBubbleRight,
          {
            width: heroBubbleSize,
            height: heroBubbleSize,
            borderRadius: heroBubbleSize * 0.5,
          },
        ]}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View
          style={[
            styles.hero,
            {
              minHeight: topHeroMinHeight,
              paddingHorizontal: layout.horizontalPadding,
              paddingTop: insets.top + appTheme.spacing.sm,
              gap: layout.sectionGap,
            },
          ]}
        >
          <View
            style={[
              styles.logoWrap,
              {
                width: heroSize,
                height: heroSize,
                borderRadius: clamp(heroSize * 0.3, 28, 42),
              },
            ]}
          >
            <ScanLine size={40} color={appTheme.palette.white} />
          </View>
          <AppText variant="hero" weight="bold" color={appTheme.palette.white}>
            {content.meta.appName}
          </AppText>
          <AppText variant="body" color="rgba(255,255,255,0.75)" style={styles.center}>
            {content.meta.slogan}
          </AppText>
          <View style={styles.versionPill}>
            <AppText variant="caption" color="rgba(255,255,255,0.82)">
              {content.meta.version}
            </AppText>
          </View>
        </View>

        <SurfaceCard
          style={[
            styles.sheet,
            {
              borderTopLeftRadius: layout.heroRadius,
              borderTopRightRadius: layout.heroRadius,
              paddingBottom: layout.sectionGap + appTheme.spacing.xl,
              paddingTop: appTheme.spacing.lg,
            },
          ]}
        >
          <View style={styles.handle} />
          <AppText variant="title" weight="bold">
            {content.auth.title}
          </AppText>
          <AppText variant="body" color={appTheme.palette.mutedForeground}>
            {content.auth.welcome}
          </AppText>

          <View style={styles.form}>
            <TextInputField
              label={content.common.form.email}
              value={email}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder={content.common.placeholders.email}
              onChangeText={setEmail}
            />
            <TextInputField
              label={content.common.form.password}
              value={password}
              secureTextEntry={!showPassword}
              placeholder={content.common.placeholders.password}
              onChangeText={setPassword}
              onSubmitEditing={onSubmit}
              error={error}
              trailing={
                <Pressable onPress={() => setShowPassword(current => !current)}>
                  {showPassword ? (
                    <EyeOff size={18} color={appTheme.palette.mutedForeground} />
                  ) : (
                    <Eye size={18} color={appTheme.palette.mutedForeground} />
                  )}
                </Pressable>
              }
            />
            <PrimaryButton
              label={loading ? content.common.buttons.loggingIn : content.common.buttons.login}
              icon={!loading ? <ArrowRight size={18} color={appTheme.palette.white} /> : undefined}
              loading={loading}
              onPress={onSubmit}
            />
          </View>

          <View style={styles.demoBlock}>
            <AppText variant="caption" color={appTheme.palette.mutedForeground} style={styles.center}>
              {content.auth.demoTitle}
            </AppText>
            <View style={[styles.demoRow, layout.isCompact ? styles.demoRowStack : null]}>
              {demoRoleLabels.map(account => (
                <Pressable
                  key={account.email}
                  onPress={() => {
                    setEmail(account.email);
                    setPassword(account.password);
                    setError(undefined);
                  }}
                  style={styles.demoCard}
                >
                  <AppText variant="caption" weight="semibold" color={appTheme.palette.secondaryForeground}>
                    {account.label}
                  </AppText>
                </Pressable>
              ))}
            </View>
          </View>
        </SurfaceCard>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  screenContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: appTheme.spacing.md,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  versionPill: {
    paddingHorizontal: appTheme.spacing.lg,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  center: {
    textAlign: 'center',
  },
  sheet: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    gap: appTheme.spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: appTheme.palette.muted,
    marginBottom: appTheme.spacing.md,
  },
  form: {
    gap: appTheme.spacing.lg,
    marginTop: appTheme.spacing.lg,
  },
  demoBlock: {
    marginTop: appTheme.spacing.lg,
    gap: appTheme.spacing.md,
  },
  demoRow: {
    flexDirection: 'row',
    gap: appTheme.spacing.sm,
  },
  demoRowStack: {
    flexWrap: 'wrap',
  },
  demoCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    borderRadius: appTheme.radius.lg,
    backgroundColor: appTheme.palette.inputBackground,
  },
  heroBubbleLeft: {
    position: 'absolute',
    left: -70,
    top: 164,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  heroBubbleRight: {
    position: 'absolute',
    right: -32,
    top: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
});
