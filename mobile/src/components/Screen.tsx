import React from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { appTheme } from '../theme/tokens';
import { useResponsiveLayout } from '../theme/responsive';

interface ScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  scrollViewProps?: ScrollViewProps;
  withoutBottomInset?: boolean;
  bleedTop?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export function Screen({
  children,
  scrollable = true,
  contentContainerStyle,
  style,
  scrollViewProps,
  withoutBottomInset = false,
  bleedTop = false,
  refreshing = false,
  onRefresh,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const layout = useResponsiveLayout();
  const childArray = React.Children.toArray(children);
  const headerChild = childArray.find(
    child =>
      React.isValidElement(child) &&
      typeof child.type !== 'string' &&
      'name' in child.type &&
      child.type.name === 'PageHeader',
  );
  const overlayChildren = childArray.filter(
    child =>
      React.isValidElement(child) &&
      typeof child.type !== 'string' &&
      'name' in child.type &&
      child.type.name === 'BottomNav',
  );
  const contentChildren = childArray.filter(
    child => !overlayChildren.includes(child) && child !== headerChild,
  );
  const omitTopInset = bleedTop || !!headerChild;
  const bottomInset = !withoutBottomInset
    ? layout.navHeight + Math.max(insets.bottom, layout.bottomOffset) + layout.sectionGap
    : 0;
  const { refreshControl: customRefreshControl, ...restScrollViewProps } = scrollViewProps ?? {};

  const content = scrollable ? (
    <ScrollView
      bounces
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="never"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        styles.content,
        !withoutBottomInset ? { paddingBottom: bottomInset } : null,
        contentContainerStyle,
      ]}
      refreshControl={
        customRefreshControl ??
        (onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={appTheme.palette.primary}
          />
        ) : undefined)
      }
      {...restScrollViewProps}
    >
      {contentChildren}
    </ScrollView>
  ) : (
    <View
      style={[
        styles.content,
        !withoutBottomInset ? { paddingBottom: bottomInset } : null,
        contentContainerStyle,
      ]}
    >
      {contentChildren}
    </View>
  );

  return (
    <SafeAreaView
      edges={omitTopInset ? ['left', 'right'] : ['top', 'left', 'right']}
      style={[styles.safeArea, style]}
    >
      {headerChild}
      {content}
      {overlayChildren}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: appTheme.palette.background,
  },
  content: {
    flexGrow: 1,
  },
});
