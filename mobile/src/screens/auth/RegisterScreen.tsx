/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
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
import type { UserRole } from '../../types/app';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;
type RegisterRole = Exclude<UserRole, 'ADMIN'>;

const registerRoles: RegisterRole[] = ['STUDENT', 'TEACHER'];

export function RegisterScreen({ navigation }: Props) {
  const { content, register } = useAuth();
  const [role, setRole] = useState<RegisterRole>('STUDENT');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const layout = useResponsiveLayout();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const heroSize = clamp(layout.width * 0.22, 76, 104);
  const heroBubbleSize = clamp(layout.width * 0.42, 136, 196);
  const topHeroMinHeight = clamp(height * 0.18, 116, 176);

  React.useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const onSubmit = async () => {
    setError(undefined);

    if (!role || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError(content.common.messages.registerEmpty);
      return;
    }

    if (password.trim().length < 6) {
      setError(content.common.messages.loginPasswordShort);
      return;
    }

    if (password.trim() !== confirmPassword.trim()) {
      setError(content.common.messages.passwordMismatch);
      return;
    }

    setLoading(true);

    try {
      await register(email.trim(), password.trim(), confirmPassword.trim(), role);
    } catch (err) {
      setError(err instanceof Error ? err.message : content.common.messages.registerEmpty);
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          bounces={keyboardVisible}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={keyboardVisible}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            keyboardVisible
              ? { paddingBottom: Math.max(insets.bottom, appTheme.spacing.lg) }
              : null,
          ]}
        >
          <View
            style={[
              styles.hero,
              {
                minHeight: topHeroMinHeight,
                paddingHorizontal: layout.horizontalPadding,
                paddingTop: insets.top + appTheme.spacing.sm,
                gap: 12,
              },
            ]}
          >
            <View
              style={[
                styles.logoWrap,
                {
                  width: heroSize,
                  height: heroSize,
                  borderRadius: 28,
                },
              ]}
            >
              <ScanLine size={38} color={appTheme.palette.white} />
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
              {content.auth.registerTitle}
            </AppText>

            <View style={styles.form}>
              <View style={styles.roleGroup}>
                <AppText
                  variant="label"
                  weight="semibold"
                  style={{ color: appTheme.palette.foreground }}
                >
                  {content.common.form.role}
                </AppText>
                <View style={styles.roleSegment}>
                  {registerRoles.map(item => {
                    const selected = role === item;

                    return (
                      <Pressable
                        key={item}
                        onPress={() => setRole(item)}
                        style={[
                          styles.roleOption,
                          selected ? styles.roleOptionSelected : null,
                        ]}
                      >
                        <AppText
                          variant="label"
                          weight="semibold"
                          color={selected ? appTheme.palette.white : appTheme.palette.primary}
                        >
                          {content.roles[item]}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
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
              <TextInputField
                label={content.common.form.confirmPassword}
                value={confirmPassword}
                secureTextEntry={!showPassword}
                placeholder={content.common.placeholders.password}
                onChangeText={setConfirmPassword}
                onSubmitEditing={onSubmit}
                error={error}
              />
              <Pressable onPress={() => navigation.navigate('Login')} style={styles.authLink}>
                <AppText variant="label" color={appTheme.palette.primary}>
                  {content.auth.loginLink}
                </AppText>
              </Pressable>
              <PrimaryButton
                label={loading ? content.common.buttons.registering : content.common.buttons.register}
                icon={!loading ? <ArrowRight size={18} color={appTheme.palette.white} /> : undefined}
                loading={loading}
                onPress={onSubmit}
              />
            </View>
          </SurfaceCard>
        </ScrollView>
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
  scrollContent: {
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
    backgroundColor: appTheme.palette.glassFill,
    borderWidth: 1,
    borderColor: appTheme.palette.glassBorder,
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
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: appTheme.palette.muted,
    marginBottom: 12,
  },
  form: {
    gap: 16,
    marginTop: 16,
  },
  roleGroup: {
    gap: 8,
  },
  roleSegment: {
    flexDirection: 'row',
    gap: 8,
    padding: 4,
    borderRadius: 24,
    backgroundColor: appTheme.palette.inputBackground,
  },
  roleOption: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  roleOptionSelected: {
    backgroundColor: appTheme.palette.primary,
  },
  authLink: {
    alignSelf: 'flex-end',
    marginTop: -4,
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
