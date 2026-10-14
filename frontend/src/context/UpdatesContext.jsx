import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { notificationApi } from '../services/api';
import { useAuth } from './AuthContext';

const UpdatesContext = createContext(null);

export function UpdatesProvider({ children }) {
  const { isAuthenticated, isOwner } = useAuth();

  const [updates, setUpdates] = useState({
    totalUpdatesCount: 0,
    invoicesRouteBadge: 0,
    requirementsRouteBadge: 0,
    staffInvoicesCount: 0,
    staffPdfUploadsCount: 0,
    staffImageUploadsCount: 0,
    staffManualUploadsCount: 0,
    totalPendingInvoicesCount: 0,
    totalPendingAmount: 0,
    pendingRequirementsCount: 0,
    recentStaffInvoices: [],
    recentRequirements: [],
    notifications: [],
    unreadCount: 0,
    hasNewUpdates: false,
  });
  const [loading, setLoading] = useState(false);

  const fetchUpdates = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await notificationApi.getUpdates();
      if (res.data) {
        setUpdates(res.data);
      }
    } catch (err) {
      console.warn('[UpdatesContext] Failed to fetch updates:', err.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Cross-tab broadcast channel
  const broadcastUpdate = useCallback(() => {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('quontriz_invoza_channel');
        bc.postMessage({ type: 'DATA_UPDATED', timestamp: Date.now() });
        bc.close();
      }
    } catch (e) {
      console.warn(e);
    }
    fetchUpdates();
  }, [fetchUpdates]);

  // Initial fetch, fast 4-second background polling, window focus listener & BroadcastChannel listener
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchUpdates();

    // Fast polling every 4 seconds for immediate responsiveness
    const interval = setInterval(() => {
      fetchUpdates();
    }, 4000);

    // Refresh immediately on window/tab focus (e.g. switching between Staff and Owner tabs)
    const handleFocus = () => {
      fetchUpdates();
    };
    window.addEventListener('focus', handleFocus);

    // Listen to cross-tab updates from BroadcastChannel
    let bc = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('quontriz_invoza_channel');
        bc.onmessage = (event) => {
          if (event.data?.type === 'DATA_UPDATED') {
            fetchUpdates();
          }
        };
      }
    } catch (e) {
      console.warn(e);
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      if (bc) bc.close();
    };
  }, [isAuthenticated, fetchUpdates]);

  const markInvoiceViewed = useCallback(async (id) => {
    try {
      await notificationApi.markInvoiceViewed(id);
      broadcastUpdate();
    } catch (e) {
      console.warn(e);
    }
  }, [broadcastUpdate]);

  const markAllInvoicesViewed = useCallback(async () => {
    try {
      await notificationApi.markAllInvoicesViewed();
      broadcastUpdate();
    } catch (e) {
      console.warn(e);
    }
  }, [broadcastUpdate]);

  const markRequirementViewed = useCallback(async (id) => {
    try {
      await notificationApi.markRequirementViewed(id);
      broadcastUpdate();
    } catch (e) {
      console.warn(e);
    }
  }, [broadcastUpdate]);

  const markAllRequirementsViewed = useCallback(async () => {
    try {
      await notificationApi.markAllRequirementsViewed();
      broadcastUpdate();
    } catch (e) {
      console.warn(e);
    }
  }, [broadcastUpdate]);

  const markAllViewed = useCallback(async () => {
    try {
      await notificationApi.markAllViewed();
      broadcastUpdate();
    } catch (e) {
      console.warn(e);
    }
  }, [broadcastUpdate]);

  const markNotificationAsRead = useCallback(async (id) => {
    try {
      await notificationApi.markAsRead(id);
      broadcastUpdate();
    } catch (e) {
      console.warn(e);
    }
  }, [broadcastUpdate]);

  const markAllNotificationsAsRead = useCallback(async () => {
    try {
      await notificationApi.markAllAsRead();
      broadcastUpdate();
    } catch (e) {
      console.warn(e);
    }
  }, [broadcastUpdate]);

  const clearAllNotifications = useCallback(async () => {
    try {
      await notificationApi.clearAll();
      broadcastUpdate();
    } catch (e) {
      console.warn(e);
    }
  }, [broadcastUpdate]);

  const deleteNotification = useCallback(async (id) => {
    try {
      await notificationApi.delete(id);
      broadcastUpdate();
    } catch (e) {
      console.warn(e);
    }
  }, [broadcastUpdate]);

  return (
    <UpdatesContext.Provider
      value={{
        ...updates,
        loading,
        refreshUpdates: fetchUpdates,
        broadcastUpdate,
        markInvoiceViewed,
        markAllInvoicesViewed,
        markRequirementViewed,
        markAllRequirementsViewed,
        markAllViewed,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        clearAllNotifications,
        deleteNotification,
      }}
    >
      {children}
    </UpdatesContext.Provider>
  );
}

export function useUpdates() {
  const context = useContext(UpdatesContext);
  if (!context) {
    return {
      totalUpdatesCount: 0,
      invoicesRouteBadge: 0,
      requirementsRouteBadge: 0,
      staffInvoicesCount: 0,
      staffPdfUploadsCount: 0,
      staffImageUploadsCount: 0,
      staffManualUploadsCount: 0,
      totalPendingInvoicesCount: 0,
      totalPendingAmount: 0,
      pendingRequirementsCount: 0,
      recentStaffInvoices: [],
      recentRequirements: [],
      notifications: [],
      unreadCount: 0,
      hasNewUpdates: false,
      loading: false,
      refreshUpdates: () => {},
      broadcastUpdate: () => {},
      markInvoiceViewed: () => {},
      markAllInvoicesViewed: () => {},
      markRequirementViewed: () => {},
      markAllRequirementsViewed: () => {},
      markAllViewed: () => {},
      markNotificationAsRead: () => {},
      markAllNotificationsAsRead: () => {},
      clearAllNotifications: () => {},
      deleteNotification: () => {},
    };
  }
  return context;
}
