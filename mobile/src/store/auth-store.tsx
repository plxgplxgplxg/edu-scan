import React, { createContext, useContext, useMemo, useState } from 'react';

import { contentByLanguage } from '../content';
import { demoAccounts } from '../api/mockData';
import type { AppContent } from '../content';
import type { LanguageCode, UserRole } from '../types/app';
import { login as loginRequest } from '../api/edu-scan';

interface AuthState {
  userId: string | null;
  role: UserRole | null;
  profileName: string;
  email: string;
  studentCode: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  language: LanguageCode;
}

interface AuthContextValue extends AuthState {
  content: AppContent;
  login: (email: string, password: string) => Promise<UserRole>;
  loginAs: (role: UserRole) => void;
  logout: () => void;
  setLanguage: (language: LanguageCode) => void;
}

const defaultAccount = demoAccounts[0];

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    userId: null,
    role: null,
    profileName: defaultAccount.profileName,
    email: defaultAccount.email,
    studentCode: null,
    accessToken: null,
    refreshToken: null,
    language: 'vi',
  });

  const content = contentByLanguage[state.language];

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      content,
      login: async (email, password) => {
        const session = await loginRequest(email, password);

        setState(current => ({
          ...current,
          userId: session.user.id,
          role: session.user.role,
          profileName: session.user.name,
          email: session.user.email,
          studentCode: session.user.studentCode,
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
        }));

        return session.user.role;
      },
      loginAs: role => {
        const account =
          demoAccounts.find(item => item.role === role) ?? demoAccounts[0];
        setState(current => ({
          ...current,
          userId: null,
          role,
          profileName: account.profileName,
          email: account.email,
          studentCode: null,
          accessToken: null,
          refreshToken: null,
        }));
      },
      logout: () => {
        setState(current => ({
          ...current,
          userId: null,
          role: null,
          studentCode: null,
          accessToken: null,
          refreshToken: null,
        }));
      },
      setLanguage: language => {
        setState(current => ({
          ...current,
          language,
        }));
      },
    }),
    [content, state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
