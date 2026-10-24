import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  UploadCloud,
  Building2,
  Tags,
  Layers,
  Settings,
  Clock,
  LogOut,
  Users,
  KeyRound,
  ChevronRight,
  ClipboardList,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatDateTime } from '../../utils/formatters';
import ChangePasswordModal from '../auth/ChangePasswordModal';
import { useProductTour } from '../../context/ProductTourContext';
import { useUpdates } from '../../context/UpdatesContext';

export default function Sidebar({ isOpen, setIsOpen }) {
  const navigate = useNavigate();
  const { user, isOwner, logout, isAuthenticated } = useAuth();
  const { openTour } = useProductTour();
  const { invoicesRouteBadge, requirementsRouteBadge, staffInvoicesCount } = useUpdates();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showTourBubble, setShowTourBubble] = useState(false);
  const userCardRef = useRef(null);

  // Close tour bubble on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userCardRef.current && !userCardRef.current.contains(e.target)) {
        setShowTourBubble(false);
      }
    };
    if (showTourBubble) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showTourBubble]);

  // Role-Based Navigation: Staff has upload-only focus, Owner has full access
  const NAV_ITEMS = isOwner
    ? [
        { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true, dataTour: 'nav-dashboard' },
        {
          to: '/invoices',
          label: 'Invoices',
          icon: FileText,
          badge: invoicesRouteBadge > 0 ? invoicesRouteBadge : null,
          badgeVariant: 'warning',
          badgeTitle: `${staffInvoicesCount || invoicesRouteBadge} staff uploads awaiting owner payment & approval`,
          dataTour: 'nav-invoices'
        },
        {
          to: '/requirements',
          label: 'Required Items',
          icon: ClipboardList,
          badge: requirementsRouteBadge > 0 ? requirementsRouteBadge : null,
          badgeVariant: 'primary',
          badgeTitle: `${requirementsRouteBadge} store requirements pending owner review`,
          dataTour: 'nav-requirements'
        },
        { to: '/upload', label: 'Upload / Manual Entry', icon: UploadCloud, dataTour: 'nav-upload' },
        { to: '/users', label: 'Team & Staff', icon: Users, badge: 'RBAC', badgeVariant: 'default', dataTour: 'nav-users' },
        { to: '/vendors', label: 'Vendors', icon: Building2, dataTour: 'nav-vendors' },
        { to: '/categories', label: 'Categories', icon: Tags, dataTour: 'nav-categories' },
        { to: '/vendor-types', label: 'Vendor Types', icon: Layers, dataTour: 'nav-vendor-types' },
        { to: '/settings', label: 'Settings', icon: Settings, dataTour: 'nav-settings' },
      ]
    : [
        { to: '/upload', label: 'Upload Invoice PDF', icon: UploadCloud, dataTour: 'nav-upload' },
        {
          to: '/invoices',
          label: 'My Invoices',
          icon: FileText,
          badge: invoicesRouteBadge > 0 ? invoicesRouteBadge : null,
          badgeVariant: 'warning',
          badgeTitle: `${invoicesRouteBadge} invoice updates from owner`,
          dataTour: 'nav-invoices'
        },
        {
          to: '/requirements',
          label: 'Required Items',
          icon: ClipboardList,
          badge: requirementsRouteBadge > 0 ? requirementsRouteBadge : null,
          badgeVariant: 'warning',
          badgeTitle: `${requirementsRouteBadge} requirement updates from owner`,
          dataTour: 'nav-requirements'
        },
      ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 transition-opacity lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 sm:w-72 lg:w-64 bg-white border-r border-slate-200/90 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 overflow-visible ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Logo / Header */}
        <div data-tour="brand-logo" className="h-16 flex items-center justify-between px-5 border-b border-slate-100">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md flex-shrink-0 transition-all duration-300 ${
                isOwner
                  ? 'bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 shadow-indigo-100'
                  : 'bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600 shadow-emerald-100'
              }`}
            >
              <svg
                className="w-5 h-5 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 8V6a2 2 0 0 1 2-2h2" />
                <path d="M16 4h2a2 2 0 0 1 2 2v2" />
                <path d="M20 16v2a2 2 0 0 1-2 2h-2" />
                <path d="M8 20H6a2 2 0 0 1-2-2v-2" />
                <line x1="8" y1="9" x2="16" y2="9" />
                <line x1="8" y1="12" x2="16" y2="12" />
                <line x1="8" y1="15" x2="13" y2="15" />
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-slate-900 text-base leading-tight tracking-tight truncate">
                Quontriz{' '}
                <span className={isOwner ? 'text-indigo-600' : 'text-emerald-600'}>
                  Invoza
                </span>
              </h1>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                {isOwner ? '👑 Owner Portal' : '📋 Staff Portal'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-2 -mr-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition min-touch-target"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto no-scrollbar">
          <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Navigation</span>
            {user && (
              <span
                className={`text-[10px] font-bold uppercase ${
                  isOwner ? 'text-indigo-600' : 'text-emerald-600'
                }`}
              >
                {user.role} mode
              </span>
            )}
          </div>

          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                data-tour={item.dataTour}
                end={item.end || item.to === '/'}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                    isActive
                      ? isOwner
                        ? 'bg-indigo-50/90 text-indigo-700 font-semibold shadow-xs'
                        : 'bg-emerald-50/90 text-emerald-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  } ${
                    item.highlight && !isActive
                      ? isOwner
                        ? 'text-indigo-600 bg-indigo-50/40 hover:bg-indigo-50'
                        : 'text-emerald-600 bg-emerald-50/40 hover:bg-emerald-50'
                      : ''
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        isActive
                          ? isOwner
                            ? 'text-indigo-600'
                            : 'text-emerald-600'
                          : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span
                        title={item.badgeTitle || ''}
                        className={`ml-auto text-[11px] font-black px-2 py-0.5 rounded-full shadow-2xs flex items-center gap-1 ${
                          item.badgeVariant === 'warning'
                            ? 'bg-amber-500 text-slate-950 animate-pulse ring-2 ring-amber-400/40'
                            : item.badgeVariant === 'primary'
                            ? isOwner
                              ? 'bg-indigo-600 text-white'
                              : 'bg-emerald-600 text-white'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Card */}
        <div
          ref={userCardRef}
          data-tour="user-profile"
          className="relative p-3 border-t border-slate-100 bg-slate-50/80 m-3 rounded-2xl border space-y-2 overflow-visible flex-shrink-0"
        >
          {isAuthenticated ? (
            <div>
              {/* User Profile Row with Arrow Mark Button */}
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white ${
                    isOwner ? 'bg-indigo-600' : 'bg-emerald-600'
                  }`}
                >
                  {isOwner ? 'OW' : 'ST'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800 truncate">{user.name}</p>
                  <p className="text-[10px] font-semibold text-slate-500">
                    {isOwner ? '👑 Owner (Full Access)' : '📋 Staff (Upload Only)'}
                  </p>
                </div>

                {/* Arrow Mark Button to toggle Product Tour */}
                <button
                  type="button"
                  data-tour="tour-button"
                  onClick={() => setShowTourBubble((prev) => !prev)}
                  className={`p-1.5 rounded-xl transition-all ${
                    showTourBubble
                      ? isOwner
                        ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'text-slate-400 hover:text-slate-800 hover:bg-slate-200/70'
                  }`}
                  title="Click to view Product Tour"
                  aria-label="Toggle Product Tour"
                >
                  <ChevronRight
                    className={`w-4 h-4 transition-transform duration-200 ${
                      showTourBubble
                        ? isOwner
                          ? 'rotate-90 text-indigo-600'
                          : 'rotate-90 text-emerald-600'
                        : ''
                    }`}
                  />
                </button>
              </div>

              {/* Floating Product Tour Speech Bubble (visible when arrow mark is clicked) */}
              {showTourBubble && (
                <div
                  className="absolute left-full ml-3 top-2 z-50 hidden lg:block animate-in fade-in zoom-in-95 duration-150"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => {
                      openTour();
                      setShowTourBubble(false);
                    }}
                    className={`flex items-center gap-2.5 bg-white text-slate-800 px-4 py-2.5 rounded-2xl shadow-xl border border-slate-200/90 transition-all duration-150 cursor-pointer group whitespace-nowrap hover:scale-105 ${
                      isOwner
                        ? 'hover:border-indigo-300 hover:shadow-indigo-100/50'
                        : 'hover:border-emerald-300 hover:shadow-emerald-100/50'
                    }`}
                    title="Launch Product Tour"
                  >
                    {/* Speech-bubble pointer arrow on the left pointing directly toward the arrow mark */}
                    <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-0 h-0 border-y-[6px] border-y-transparent border-r-[8px] border-r-white drop-shadow-[-1px_0_1px_rgba(0,0,0,0.06)]" />

                    <div
                      className={`w-5 h-5 rounded-md bg-slate-900 text-white flex items-center justify-center flex-shrink-0 transition shadow-2xs ${
                        isOwner
                          ? 'group-hover:bg-indigo-600'
                          : 'group-hover:bg-emerald-600'
                      }`}
                    >
                      <svg
                        className="w-3 h-3 text-white"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>

                    <span
                      className={`text-xs font-bold text-slate-800 transition tracking-tight ${
                        isOwner
                          ? 'group-hover:text-indigo-600'
                          : 'group-hover:text-emerald-600'
                      }`}
                    >
                      Product Tour
                    </span>
                  </button>
                </div>
              )}

              {/* Mobile Product Tour Banner (visible on mobile when arrow mark is clicked) */}
              {showTourBubble && (
                <div className="lg:hidden pt-2 animate-in fade-in duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      openTour();
                      setShowTourBubble(false);
                    }}
                    className={`w-full flex items-center justify-center gap-2 py-2 px-3 bg-white border rounded-xl text-xs font-bold text-slate-800 shadow-xs transition ${
                      isOwner
                        ? 'border-indigo-200 hover:text-indigo-600'
                        : 'border-emerald-200 hover:text-emerald-600'
                    }`}
                  >
                    <div className="w-4 h-4 rounded-md bg-slate-900 text-white flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-2.5 h-2.5 text-white"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                    <span>Launch Product Tour</span>
                  </button>
                </div>
              )}

              {/* Login Time & Date */}
              {user.last_login_at && (
                <div className="mt-2 pt-1.5 border-t border-slate-200/60 text-[10px] text-slate-500 flex items-center gap-1.5 font-medium">
                  <Clock className="w-3 h-3 text-slate-400 flex-shrink-0" />
                  <span className="truncate">Login: {formatDateTime(user.last_login_at)}</span>
                </div>
              )}

              {/* Action Buttons: Password & Sign Out */}
              <div className="pt-2 mt-2 border-t border-slate-200/60 grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(true)}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-white border border-slate-200 text-xs font-bold transition shadow-2xs ${
                    isOwner
                      ? 'hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 hover:border-indigo-200'
                      : 'hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 hover:border-emerald-200'
                  }`}
                  title="Change Password"
                >
                  <KeyRound
                    className={`w-3.5 h-3.5 ${
                      isOwner ? 'text-indigo-600' : 'text-emerald-600'
                    }`}
                  />
                  <span>Password</span>
                </button>
                <button
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-200 text-xs font-bold transition shadow-2xs"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-1">
              <button
                onClick={() => navigate('/login')}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition"
              >
                Sign In to Portal
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </>
  );
}
