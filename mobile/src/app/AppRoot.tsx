import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '../store/auth-store';
import { AppNavigator } from '../navigation/AppNavigator';

function AppShell() {
  const { role } = useAuth();

  return (
    <>
      <StatusBar
        barStyle={role ? 'light-content' : 'light-content'}
        backgroundColor="transparent"
        translucent
      />
      <AppNavigator />
    </>
  );
}

export default function AppRoot() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
