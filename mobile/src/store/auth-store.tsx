import React, { createContext, useContext, useMemo, useState } from 'react';

import { contentByLanguage } from '../content';
import { demoAccounts } from '../api/mockData';
import type { AppContent } from '../content';
import type { LanguageCode, UserRole } from '../types/app';

interface AuthState {
  role: UserRole | null;
  profileName: string;
  email: string;
  language: LanguageCode;
}

interface AuthContextValue extends AuthState {
  content: AppContent;
  login: (email: string) => UserRole;
  loginAs: (role: UserRole) => void;
  logout: () => void;
  setLanguage: (language: LanguageCode) => void;
}

const defaultAccount = demoAccounts[0];

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    role: null,
    profileName: defaultAccount.profileName,
    email: defaultAccount.email,
    language: 'vi',
  });

  const content = contentByLanguage[state.language];

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      content,
      login: email => {
        const normalized = email.toLowerCase();
        const account =
          demoAccounts.find(item => normalized.includes(item.role.toLowerCase())) ??
          demoAccounts[0];

        setState(current => ({
          ...current,
          role: account.role,
          profileName: account.profileName,
          email: email || account.email,
        }));

        return account.role;
      },
      loginAs: role => {
        const account =
          demoAccounts.find(item => item.role === role) ?? demoAccounts[0];
        setState(current => ({
          ...current,
          role,
          profileName: account.profileName,
          email: account.email,
        }));
      },
      logout: () => {
        setState(current => ({
          ...current,
          role: null,
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
