import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { listNotifications, markNotificationRead } from '../../../api/edu-scan';
import type { NotificationItem } from '../../../types/domain';
import type { UserRole } from '../../../types/app';
import { useAuth } from '../../../store/auth-store';

interface NotificationsContextValue {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

async function loadNotificationsFeed(
  token: string,
  _role: UserRole,
): Promise<NotificationItem[]> {
  return listNotifications(token);
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

    if (accessToken) {
      await markNotificationRead(accessToken, notificationId);
    }
  }, [accessToken]);

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
