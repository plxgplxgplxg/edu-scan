import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { NotificationsProvider } from '../features/notifications/application/notifications-provider';
import { AuthProvider, useAuth } from '../store/auth-store';
import { AppNavigator } from '../navigation/AppNavigator';
import { ToastProvider } from './ToastProvider';

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
        <NotificationsProvider>
          <ToastProvider>
            <AppShell />
          </ToastProvider>
        </NotificationsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
