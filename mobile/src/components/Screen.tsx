import React from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type ViewStyle,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { appTheme } from '../theme/tokens';

interface ScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
  contentContainerStyle?: ViewStyle;
  style?: ViewStyle;
  scrollViewProps?: ScrollViewProps;
}

export function Screen({
  children,
  scrollable = true,
  contentContainerStyle,
  style,
  scrollViewProps,
}: ScreenProps) {
  const content = scrollable ? (
    <ScrollView
      bounces={false}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.content, contentContainerStyle]}
      {...scrollViewProps}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, contentContainerStyle]}>{children}</View>
  );

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.safeArea, style]}>
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: appTheme.palette.background,
  },
  content: {
    paddingBottom: 120,
  },
});
