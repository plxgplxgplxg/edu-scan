/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight, Eye, EyeOff, ScanLine } from 'lucide-react-native';


import { useAuth } from '../../store/auth-store';
import { appTheme } from '../../theme/tokens';
import { clamp, useResponsiveLayout } from '../../theme/responsive';
import { primaryHeroGradient } from '../../theme/header';
import { GradientBackground } from '../../components/GradientBackground';
import { AppText } from '../../components/AppText';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen } from '../../components/Screen';
import { SurfaceCard } from '../../components/SurfaceCard';
import { TextInputField } from '../../components/TextInputField';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
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

  const onSubmit = async () => {
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

    try {
      await login(email.trim(), password.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : content.common.messages.loginEmpty);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      scrollable={false}
      withoutBottomInset
      bleedTop
      contentContainerStyle={styles.screenContent}
    >
      <GradientBackground colors={primaryHeroGradient} style={StyleSheet.absoluteFill} />
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
              gap: 14, // design: gap 14
            },
          ]}
        >
          <View
            style={[
              styles.logoWrap,
              {
                width: heroSize,
                height: heroSize,
                borderRadius: 30, // design: squircle radius 30
              },
            ]}
          >
            <ScanLine size={42} color={appTheme.palette.white} />
          </View>
          <AppText 
            variant="hero" 
            weight="bold" 
            color={appTheme.palette.white}
            style={{ fontFamily: appTheme.typography.displayFamily }}
          >
            {content.meta.appName}
          </AppText>
          <AppText variant="body" color="rgba(255,255,255,0.80)" style={styles.center}>
            {content.meta.slogan}
          </AppText>
        </View>

        <SurfaceCard
          style={[
            styles.sheet,
            {
              borderTopLeftRadius: layout.heroRadius,
              borderTopRightRadius: layout.heroRadius,
              paddingBottom: layout.sectionGap + 20,
              paddingTop: 16,
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
                <Pressable onPress={() => setShowPassword(current => !current)} hitSlop={8}>
                  {showPassword ? (
                    <EyeOff size={18} color={appTheme.palette.mutedForeground} />
                  ) : (
                    <Eye size={18} color={appTheme.palette.mutedForeground} />
                  )}
                </Pressable>
              }
            />
            
            <Pressable onPress={() => navigation.navigate('Register')} style={styles.authLink}>
              <AppText variant="label" color={appTheme.palette.primary}>
                {content.auth.registerLink}
              </AppText>
            </Pressable>
            <PrimaryButton
              label={loading ? content.common.buttons.loggingIn : content.common.buttons.login}
              icon={!loading ? <ArrowRight size={18} color={appTheme.palette.white} /> : undefined}
              loading={loading}
              onPress={onSubmit}
            />
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
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: appTheme.palette.glassFill, // design: glassFill
    borderWidth: 1,
    borderColor: appTheme.palette.glassBorder, // design: glassBorder
  },
  center: {
    textAlign: 'center',
  },
  sheet: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    gap: 8,
  },
  handle: {
    alignSelf: 'center',
    width: 36, // design: 36x4
    height: 4,
    borderRadius: 999,
    backgroundColor: appTheme.palette.muted,
    marginBottom: 12, // design: marginBottom 12
  },
  form: {
    gap: 16,
    marginTop: 16,
  },
  authLink: {
    alignSelf: 'flex-end',
    marginTop: -12,
  },
  heroBubbleLeft: {
    position: 'absolute',
    left: -96,
    top: 156,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  heroBubbleRight: {
    position: 'absolute',
    right: -72,
    top: -24,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
});
