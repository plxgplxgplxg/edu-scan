import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { buildNotifications } from '../../../api/edu-scan';
import type { NotificationItem } from '../../../types/domain';
import type { UserRole } from '../../../types/app';
import { useAuth } from '../../../store/auth-store';
import {
  loadJsonValue,
  saveJsonValue,
} from '../../shared/infrastructure/storage/json-storage';

const STORAGE_KEY = '@eduscan/notifications/read-state';

type ReadState = Record<string, true>;

interface NotificationsContextValue {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

function buildNotificationIdSet(items: NotificationItem[]) {
  return new Set(items.map((item) => item.id));
}

function mergeReadState(items: NotificationItem[], readState: ReadState) {
  return items.map((item) => ({
    ...item,
    read: item.read || !!readState[item.id],
  }));
}

async function loadNotificationsFeed(
  token: string,
  role: UserRole,
): Promise<NotificationItem[]> {
  const [readState, remoteItems] = await Promise.all([
    loadJsonValue<ReadState>(STORAGE_KEY, {}),
    buildNotifications(token, role),
  ]);

  const hydratedItems = mergeReadState(remoteItems, readState);
  const currentIds = buildNotificationIdSet(hydratedItems);
  const nextReadState = Object.fromEntries(
    Object.entries(readState).filter(([id]) => currentIds.has(id)),
  ) as ReadState;

  if (Object.keys(nextReadState).length !== Object.keys(readState).length) {
    await saveJsonValue(STORAGE_KEY, nextReadState);
  }

  return hydratedItems;
}

export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { accessToken, role } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!accessToken || !role) {
      setNotifications([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const nextItems = await loadNotificationsFeed(accessToken, role);
      setNotifications(nextItems);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  }, [accessToken, role]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const markAsRead = useCallback(async (notificationId: string) => {
    setNotifications((current) =>
      current.map((item) =>
        item.id === notificationId ? { ...item, read: true } : item,
      ),
    );

    const readState = await loadJsonValue<ReadState>(STORAGE_KEY, {});
    readState[notificationId] = true;
    await saveJsonValue(STORAGE_KEY, readState);
  }, []);

  const value = useMemo<NotificationsContextValue>(
    () => ({
      notifications,
      unreadCount: notifications.filter((item) => !item.read).length,
      loading,
      error,
      reload,
      markAsRead,
    }),
    [error, loading, markAsRead, notifications, reload],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);

  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }

  return context;
}
