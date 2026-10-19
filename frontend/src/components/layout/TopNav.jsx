import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  UploadCloud,
  LogOut,
  LogIn,
  Bell,
  FileText,
  ClipboardList,
  ChevronRight,
  Check,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Package,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUpdates } from '../../context/UpdatesContext';
import { formatDateTime } from '../../utils/formatters';

export default function TopNav({ onToggleSidebar }) {
  const navigate = useNavigate();
  const { user, isOwner, logout, isAuthenticated } = useAuth();
  const {
    notifications = [],
    unreadCount = 0,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearAllNotifications,
    deleteNotification
  } = useUpdates();

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifFilter, setNotifFilter] = useState('all'); // 'all' | 'unread' | 'invoices' | 'requirements'
  const notifRef = useRef(null);

  // Close notifications dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showNotifications]);

  // Filtered notifications list
  const filteredNotifications = (notifications || []).filter((n) => {
    if (notifFilter === 'unread') return !n.is_read || n.is_read === 0;
    if (notifFilter === 'invoices') return n.related_type === 'invoice' || n.type?.includes('invoice');
    if (notifFilter === 'requirements') return n.related_type === 'requirement' || n.type?.includes('requirement');
    return true;
  });

  const unreadInvoicesCount = (notifications || []).filter(
    (n) => (!n.is_read || n.is_read === 0) && (n.related_type === 'invoice' || n.type?.includes('invoice'))
  ).length;

  const unreadRequirementsCount = (notifications || []).filter(
    (n) => (!n.is_read || n.is_read === 0) && (n.related_type === 'requirement' || n.type?.includes('requirement'))
  ).length;

  const handleNotificationClick = (n) => {
    // 1. Instantly close dropdown
    setShowNotifications(false);

    // 2. Mark as read in background without blocking navigation
    if (markNotificationAsRead && (!n.is_read || n.is_read === 0)) {
      markNotificationAsRead(n.id).catch((e) => console.warn('[TopNav] markRead warning:', e));
    }

    // 3. Navigate directly to target invoice or requirement
    if (n.link) {
      navigate(n.link);
    } else if (n.related_type === 'invoice' && n.related_id) {
      navigate(`/invoices/${n.related_id}`);
    } else if (n.related_type === 'requirement') {
      navigate('/requirements');
    } else {
      navigate('/invoices');
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation sidebar"
          className="w-10 h-10 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl lg:hidden transition active:scale-95"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Real-Time Notifications Bell */}
        {isAuthenticated && (
          <div ref={notifRef} data-tour="notifications-bell" className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              aria-label="Toggle notifications panel"
              className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition active:scale-95 ${
                showNotifications
                  ? isOwner
                    ? 'bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/20'
                    : 'bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
              title={
                unreadCount > 0
                  ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
                  : 'No unread notifications'
              }
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute 1.5 top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white font-black text-[10px] flex items-center justify-center shadow-xs ring-2 ring-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Panel (Clamped to viewport on mobile) */}
            {showNotifications && (
              <div className="fixed sm:absolute left-2 right-2 sm:left-auto sm:right-0 top-16 sm:top-full mt-1.5 w-auto sm:w-96 max-w-[calc(100vw-1rem)] bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Header */}
                <div className="p-3.5 px-4 bg-white border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                        isOwner
                          ? 'bg-indigo-50 text-indigo-600'
                          : 'bg-emerald-50 text-emerald-600'
                      }`}
                    >
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 leading-tight">
                        Notifications
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {unreadCount > 0
                          ? `${unreadCount} unread update${unreadCount === 1 ? '' : 's'}`
                          : 'All caught up'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {unreadCount > 0 && (
                      <button
                        onClick={async () => {
                          if (markAllNotificationsAsRead) {
                            await markAllNotificationsAsRead();
                          }
                        }}
                        className={`text-[11px] font-bold px-2 py-1 rounded-lg transition flex items-center gap-1 ${
                          isOwner
                            ? 'text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50'
                            : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                        }`}
                        title="Mark all notifications as read"
                      >
                        <Check
                          className={`w-3.5 h-3.5 ${
                            isOwner ? 'text-indigo-600' : 'text-emerald-600'
                          }`}
                        />
                        <span>Mark all read</span>
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button
                        onClick={async () => {
                          if (clearAllNotifications) {
                            await clearAllNotifications();
                          }
                        }}
                        className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded-lg transition flex items-center gap-1 border border-rose-200/70 shadow-2xs"
                        title="Clear all notifications completely"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        <span>Clear</span>
                      </button>
                    )}
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                      title="Close"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1 px-3 py-2 bg-slate-50/80 border-b border-slate-100 text-xs font-semibold overflow-x-auto">
                  <button
                    onClick={() => setNotifFilter('all')}
                    className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                      notifFilter === 'all'
                        ? isOwner
                          ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80 font-bold'
                          : 'bg-white text-emerald-700 shadow-xs border border-slate-200/80 font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setNotifFilter('unread')}
                    className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap ${
                      notifFilter === 'unread'
                        ? isOwner
                          ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80 font-bold'
                          : 'bg-white text-emerald-700 shadow-xs border border-slate-200/80 font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Unread</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-bold">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setNotifFilter('invoices')}
                    className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap ${
                      notifFilter === 'invoices'
                        ? isOwner
                          ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80 font-bold'
                          : 'bg-white text-emerald-700 shadow-xs border border-slate-200/80 font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Invoices</span>
                    {unreadInvoicesCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200/80 text-slate-700 font-bold">
                        {unreadInvoicesCount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setNotifFilter('requirements')}
                    className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap ${
                      notifFilter === 'requirements'
                        ? isOwner
                          ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80 font-bold'
                          : 'bg-white text-emerald-700 shadow-xs border border-slate-200/80 font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Required Items</span>
                    {unreadRequirementsCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200/80 text-slate-700 font-bold">
                        {unreadRequirementsCount}
                      </span>
                    )}
                  </button>
                </div>

                {/* Notifications Feed */}
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs">
                  {filteredNotifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 space-y-2">
                      <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                        <Bell className="w-5 h-5" />
                      </div>
                      <p className="font-bold text-slate-700 text-xs">No notifications found</p>
                      <p className="text-[11px] text-slate-400">
                        {notifFilter === 'unread'
                          ? 'You have read all your notifications.'
                          : notifFilter === 'invoices'
                          ? 'No invoice notifications found.'
                          : notifFilter === 'requirements'
                          ? 'No store requirement notifications found.'
                          : "You're all caught up with your store updates."}
                      </p>
                    </div>
                  ) : (
                    filteredNotifications.map((notif) => {
                      const isUnread = !notif.is_read || notif.is_read === 0;
                      const isInv = notif.related_type === 'invoice' || notif.type?.includes('invoice');
                      const isPaid = notif.type?.includes('paid') || notif.title?.toLowerCase().includes('paid');
                      const isApproved = notif.type?.includes('approved') || notif.title?.toLowerCase().includes('approved');
                      const isOrdered = notif.type?.includes('ordered') || notif.title?.toLowerCase().includes('ordered');
                      const isFulfilled = notif.type?.includes('fulfilled') || notif.title?.toLowerCase().includes('fulfilled');
                      const isRejected = notif.type?.includes('reject') || notif.title?.toLowerCase().includes('reject');

                      return (
                        <div
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          className={`p-3 transition cursor-pointer flex items-start gap-3 group border-l-2 ${
                            isUnread
                              ? isOwner
                                ? 'bg-indigo-50/40 hover:bg-indigo-50/80 border-l-indigo-600'
                                : 'bg-emerald-50/40 hover:bg-emerald-50/80 border-l-emerald-600'
                              : 'bg-white hover:bg-slate-50 border-l-transparent'
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5 shadow-2xs ${
                              isPaid || isFulfilled
                                ? 'bg-emerald-100 text-emerald-700'
                                : isApproved
                                ? 'bg-indigo-100 text-indigo-700'
                                : isOrdered
                                ? 'bg-blue-100 text-blue-700'
                                : isRejected
                                ? 'bg-rose-100 text-rose-700'
                                : isInv
                                ? isOwner
                                  ? 'bg-indigo-100 text-indigo-700'
                                  : 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isPaid || isFulfilled ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : isApproved ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : isOrdered ? (
                              <Package className="w-4 h-4" />
                            ) : isRejected ? (
                              <AlertCircle className="w-4 h-4" />
                            ) : isInv ? (
                              <FileText className="w-4 h-4" />
                            ) : (
                              <ClipboardList className="w-4 h-4" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <p
                                className={`truncate text-xs transition ${
                                  isUnread
                                    ? 'font-bold text-slate-900'
                                    : 'font-semibold text-slate-700'
                                } ${
                                  isOwner
                                    ? 'group-hover:text-indigo-600'
                                    : 'group-hover:text-emerald-600'
                                }`}
                              >
                                {notif.title}
                              </p>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {isUnread && (
                                  <span
                                    className={`w-2 h-2 rounded-full ${
                                      isOwner ? 'bg-indigo-600' : 'bg-emerald-600'
                                    }`}
                                  />
                                )}
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (deleteNotification) {
                                      await deleteNotification(notif.id);
                                    }
                                  }}
                                  className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-md transition opacity-0 group-hover:opacity-100"
                                  title="Dismiss / remove notification"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 leading-relaxed">
                              {notif.message}
                            </p>
                            <div className="flex items-center justify-between gap-2 mt-1.5 text-[10px] text-slate-400 font-medium">
                              <div className="flex items-center gap-1.5 truncate">
                                {notif.created_by_name && (
                                  <span className="text-slate-500 font-semibold">{notif.created_by_name}</span>
                                )}
                                {notif.created_at && (
                                  <span>• {formatDateTime(notif.created_at)}</span>
                                )}
                              </div>
                              <span
                                className={`text-[10px] font-bold opacity-0 group-hover:opacity-100 transition whitespace-nowrap flex items-center gap-0.5 ${
                                  isOwner ? 'text-indigo-600' : 'text-emerald-600'
                                }`}
                              >
                                {isInv ? 'Open Invoice →' : 'View →'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                <div className="p-2.5 px-4 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                  <button
                    onClick={() => {
                      setShowNotifications(false);
                      navigate('/invoices');
                    }}
                    className={`flex items-center gap-1 transition ${
                      isOwner
                        ? 'text-indigo-600 hover:text-indigo-800'
                        : 'text-emerald-600 hover:text-emerald-800'
                    }`}
                  >
                    <span>Invoice History</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setShowNotifications(false);
                      navigate('/requirements');
                    }}
                    className={`flex items-center gap-1 transition ${
                      isOwner
                        ? 'text-indigo-600 hover:text-indigo-800'
                        : 'text-emerald-600 hover:text-emerald-800'
                    }`}
                  >
                    <span>Store Requirements</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* User Account / Role Badge */}
        {isAuthenticated ? (
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100/80 border border-slate-200/70 text-xs">
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-white font-bold text-[10px] ${
                  isOwner ? 'bg-indigo-600' : 'bg-emerald-600'
                }`}
              >
                {isOwner ? 'OW' : 'ST'}
              </div>
              <div className="hidden md:block text-left">
                <p className="font-bold text-slate-800 leading-tight">{user.name}</p>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold">
                  <span>{isOwner ? '👑 Store Owner' : '📋 Store Staff'}</span>
                  {user.last_login_at && (
                    <span className="text-slate-400 font-medium">
                      • Logged in: {formatDateTime(user.last_login_at)}
                    </span>
                  )}
                </div>
              </div>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase ${
                  isOwner
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {user.role}
              </span>
            </div>

            {/* Logout button (Mobile only; hidden on large width devices where sidebar has Sign Out) */}
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition lg:hidden"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}

        {/* Upload Button */}
        <button
          onClick={() => navigate('/upload')}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-semibold text-white rounded-xl shadow-sm transition-all active:scale-[0.98] flex-shrink-0 ${
            isOwner
              ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
              : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span className="hidden sm:inline">Upload / Entry</span>
          <span className="sm:hidden">Upload</span>
        </button>
      </div>
    </header>
  );
}
