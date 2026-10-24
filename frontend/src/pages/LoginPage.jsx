import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  User,
  AlertCircle,
  FileText,
  TrendingUp,
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useUpdates } from '../context/UpdatesContext';
import { Spinner, Modal } from '../components/ui';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { error: toastError } = useToast();
  const { refreshUpdates } = useUpdates();

  // Initially set to 'staff' as default portal
  const [portalRole, setPortalRole] = useState(() => {
    const queryRole = new URLSearchParams(location.search).get('role');
    if (queryRole === 'owner' || location.state?.role === 'owner') return 'owner';
    return 'staff';
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);

  const isOwner = portalRole === 'owner';
  const from = location.state?.from?.pathname;

  // Ensure fields are clean on mount
  React.useEffect(() => {
    setEmail('');
    setPassword('');
    setErrorMessage('');
  }, []);

  const handlePortalSwitch = (newRole) => {
    setPortalRole(newRole);
    setEmail('');
    setPassword('');
    setErrorMessage('');
  };

  const handleAuthRedirect = () => {
    if (refreshUpdates) refreshUpdates();
    const targetPath = from && from !== '/login' ? from : '/';
    navigate(targetPath, { replace: true });
  };

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    if (!email || !password) {
      toastError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password, portalRole);
      handleAuthRedirect();
    } catch (err) {
      const msg = err.message || 'Login failed. Please check credentials.';
      setErrorMessage(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: FileText,
      title: 'Automate Invoices',
      desc: 'Upload, extract and manage supplier invoices with AI.',
    },
    {
      icon: TrendingUp,
      title: 'Track Payments',
      desc: 'Monitor supplier dues and payments in real-time.',
    },
    {
      icon: ShieldCheck,
      title: 'Secure Access',
      desc: 'Role-based access for store staff and owners.',
    },
    {
      icon: Users,
      title: 'Better Management',
      desc: 'Simplify operations and improve efficiency.',
    },
  ];

  return (
    <div
      className={`min-h-screen relative overflow-hidden flex items-center justify-center p-4 sm:p-8 transition-colors duration-500 ${
        isOwner ? 'bg-[#f5f3ff]' : 'bg-[#f0fdf6]'
      }`}
    >
      {/* Dynamic Background Wavy SVG Gradients */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        {/* Top-Right Ambient Glow */}
        <div
          className={`absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl opacity-60 transition-colors duration-500 ${
            isOwner ? 'bg-indigo-200/50' : 'bg-emerald-200/50'
          }`}
        />

        {/* Bottom-Left Swooping Waves */}
        <svg
          className="absolute -left-24 sm:-left-12 -bottom-24 w-[550px] sm:w-[850px] h-[550px] sm:h-[850px] transition-all duration-700 pointer-events-none"
          viewBox="0 0 800 800"
          fill="none"
        >
          {/* Outer Layer */}
          <path
            d="M-50,450 C120,380 200,680 480,520 C680,410 760,700 850,620 L850,850 L-50,850 Z"
            fill={isOwner ? 'url(#ownerWaveOuter)' : 'url(#staffWaveOuter)'}
            opacity="0.5"
          />
          {/* Inner Accent Layer */}
          <path
            d="M-50,580 C150,510 280,720 520,590 C660,510 750,710 850,670 L850,850 L-50,850 Z"
            fill={isOwner ? 'url(#ownerWaveInner)' : 'url(#staffWaveInner)'}
            opacity="0.85"
          />
          <defs>
            <linearGradient id="ownerWaveOuter" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#c7d2fe" />
              <stop offset="50%" stopColor="#a5b4fc" />
              <stop offset="100%" stopColor="#818cf8" />
            </linearGradient>
            <linearGradient id="ownerWaveInner" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="60%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#4f46e5" />
            </linearGradient>
            <linearGradient id="staffWaveOuter" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a7f3d0" />
              <stop offset="50%" stopColor="#6ee7b7" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
            <linearGradient id="staffWaveInner" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="60%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>
        </svg>

        {/* Floating Watermark Invoice & Dotted Matrix on Right */}
        <div className="absolute right-4 xl:right-16 top-1/2 -translate-y-1/2 pointer-events-none select-none hidden lg:block opacity-30 transition-all duration-500">
          {/* Dotted Grid Matrix */}
          <div className="absolute -top-24 -right-10 w-36 h-36 grid grid-cols-6 gap-2.5 opacity-40">
            {Array.from({ length: 36 }).map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${
                  isOwner ? 'bg-indigo-500' : 'bg-emerald-500'
                }`}
              />
            ))}
          </div>

          {/* Slanted Invoice Document Watermark */}
          <div
            className={`w-64 h-84 rounded-3xl p-6 border-2 shadow-2xl transform rotate-12 transition-all duration-500 ${
              isOwner
                ? 'bg-white/70 border-indigo-200/60 shadow-indigo-200/40'
                : 'bg-white/70 border-emerald-200/60 shadow-emerald-200/40'
            }`}
          >
            <div className="flex items-center justify-between mb-5">
              <span
                className={`font-mono font-black text-sm tracking-wider transition-colors duration-500 ${
                  isOwner ? 'text-indigo-400' : 'text-emerald-400'
                }`}
              >
                INVOICE
              </span>
              <div
                className={`w-3.5 h-3.5 rounded-full transition-colors duration-500 ${
                  isOwner ? 'bg-indigo-300' : 'bg-emerald-300'
                }`}
              />
            </div>
            <div className="space-y-3">
              <div
                className={`h-2.5 rounded-full w-full transition-colors duration-500 ${
                  isOwner ? 'bg-indigo-100' : 'bg-emerald-100'
                }`}
              />
              <div
                className={`h-2.5 rounded-full w-4/5 transition-colors duration-500 ${
                  isOwner ? 'bg-indigo-100' : 'bg-emerald-100'
                }`}
              />
              <div
                className={`h-2.5 rounded-full w-3/4 transition-colors duration-500 ${
                  isOwner ? 'bg-indigo-100' : 'bg-emerald-100'
                }`}
              />
              <div
                className={`h-2.5 rounded-full w-5/6 transition-colors duration-500 ${
                  isOwner ? 'bg-indigo-100' : 'bg-emerald-100'
                }`}
              />
              <div className="pt-6 border-t border-slate-100/90 flex justify-between items-center">
                <div
                  className={`h-3 rounded-full w-14 transition-colors duration-500 ${
                    isOwner ? 'bg-indigo-200' : 'bg-emerald-200'
                  }`}
                />
                <div
                  className={`h-3 rounded-full w-20 transition-colors duration-500 ${
                    isOwner ? 'bg-indigo-300' : 'bg-emerald-300'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dual-Column Content */}
      <div className="max-w-6xl w-full mx-auto flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-14 relative z-10 py-4">
        {/* Left Column: Branding & Feature List */}
        <div className="flex-1 max-w-xl w-full space-y-8">
          {/* Brand Header */}
          <div className="flex items-center gap-4">
            <div
              className={`w-16 h-16 rounded-3xl flex items-center justify-center text-white shadow-xl transition-all duration-500 ${
                isOwner
                  ? 'bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 shadow-indigo-300/40'
                  : 'bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600 shadow-emerald-300/40'
              }`}
            >
              <svg
                className="w-8 h-8 text-white"
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
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">
                Quontriz{' '}
                <span
                  className={`transition-colors duration-300 ${
                    isOwner ? 'text-indigo-600' : 'text-emerald-600'
                  }`}
                >
                  Invoza
                </span>
              </h1>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                Intelligent Invoice Processing
              </p>
              <p className="text-xs font-semibold text-slate-500">
                Secure Staff &amp; Owner Portals
              </p>
            </div>
          </div>

          {/* 4 Features List */}
          <div className="space-y-4 pt-1">
            {features.map((f) => (
              <div key={f.title} className="flex items-start gap-3.5">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                    isOwner
                      ? 'bg-indigo-100/70 text-indigo-600'
                      : 'bg-emerald-100/70 text-emerald-600'
                  }`}
                >
                  <f.icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 leading-snug">
                    {f.title}
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Sign In Card */}
        <div className="w-full lg:max-w-md flex-shrink-0">
          <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-white/90 shadow-2xl shadow-slate-200/80 space-y-5">
            {/* Card Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Store{' '}
                  <span
                    className={`font-bold italic transition-colors duration-300 ${
                      isOwner ? 'text-indigo-600' : 'text-emerald-600'
                    }`}
                  >
                    {isOwner ? 'Owner' : 'Staff'}
                  </span>{' '}
                  Sign In
                </h2>
                <p className="text-xs text-slate-500 mt-1 leading-snug">
                  {isOwner
                    ? 'Sign in with your owner credentials to access your store dashboard.'
                    : 'Sign in to upload and verify store invoices using your staff credentials.'}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider flex-shrink-0 transition-colors duration-300 ${
                  isOwner
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {isOwner ? 'OWNER' : 'STAFF'}
              </span>
            </div>

            {/* Portal Switcher Tabs */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handlePortalSwitch('staff')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition duration-150 ${
                  !isOwner
                    ? 'bg-white text-emerald-700 border-2 border-emerald-500 shadow-sm ring-2 ring-emerald-500/10'
                    : 'bg-slate-50/80 text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <User
                  className={`w-4 h-4 ${!isOwner ? 'text-emerald-600' : 'text-slate-400'}`}
                />
                <span>Store Staff Portal</span>
              </button>

              <button
                type="button"
                onClick={() => handlePortalSwitch('owner')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition duration-150 ${
                  isOwner
                    ? 'bg-white text-indigo-700 border-2 border-indigo-600 shadow-sm ring-2 ring-indigo-500/10'
                    : 'bg-slate-50/80 text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <ShieldCheck
                  className={`w-4 h-4 ${isOwner ? 'text-indigo-600' : 'text-slate-400'}`}
                />
                <span>Store Owner Portal</span>
              </button>
            </div>

            {/* Error Alert */}
            {errorMessage && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-2xl text-xs flex items-start gap-2.5 shadow-xs animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1.5">
                  <p className="font-bold leading-snug">{errorMessage}</p>
                  {errorMessage.includes('Store Staff') && isOwner && (
                    <button
                      type="button"
                      onClick={() => handlePortalSwitch('staff')}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] transition shadow-xs"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Switch to Store Staff Portal &amp; Try Again</span>
                    </button>
                  )}
                  {errorMessage.includes('Store Owner') && !isOwner && (
                    <button
                      type="button"
                      onClick={() => handlePortalSwitch('owner')}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[11px] transition shadow-xs"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Switch to Store Owner Portal &amp; Try Again</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
              {/* Dummy fields against aggressive browser autofill heuristics */}
              <input type="text" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
              <input type="password" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />

              {/* Work Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Work Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    name="user_work_email"
                    required
                    autoComplete="off"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder="Enter your email address"
                    className={`w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm border rounded-xl outline-none font-medium text-slate-900 transition bg-white ${
                      isOwner
                        ? 'border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600'
                        : 'border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600'
                    }`}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="user_secret_password"
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder="Enter your password"
                    className={`w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm border rounded-xl outline-none font-medium text-slate-900 transition bg-white ${
                      isOwner
                        ? 'border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600'
                        : 'border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-700 p-0.5 transition"
                    title={showPassword ? 'Hide password' : 'Show password'}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Options Row: Checkbox + Forgot Password */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600 select-none font-medium">
                  <input
                    type="checkbox"
                    checked={keepSignedIn}
                    onChange={(e) => setKeepSignedIn(e.target.checked)}
                    className={`w-4 h-4 rounded border-slate-300 transition ${
                      isOwner
                        ? 'text-indigo-600 focus:ring-indigo-500'
                        : 'text-emerald-600 focus:ring-emerald-500'
                    }`}
                  />
                  <span>Keep me signed in</span>
                </label>

                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className={`font-semibold transition ${
                    isOwner
                      ? 'text-indigo-600 hover:text-indigo-700'
                      : 'text-emerald-600 hover:text-emerald-700'
                  }`}
                >
                  Forgot Password?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex items-center justify-center gap-2 py-3 px-4 text-white font-bold text-sm rounded-xl shadow-md transition active:scale-[0.98] disabled:opacity-50 ${
                  isOwner
                    ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                }`}
              >
                {loading ? (
                  <Spinner size="sm" />
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Security Footer Notice */}
            <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>Role-Guarded Access Portal • Daily Midnight Session Reset</span>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Guidance Modal */}
      {showForgotModal && (
        <Modal
          isOpen={showForgotModal}
          onClose={() => setShowForgotModal(false)}
          title="Account Password Assistance"
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs text-slate-600">
            <p>
              For security compliance, user passwords cannot be retrieved in plain text.
            </p>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <p className="font-bold text-slate-900">Need your password reset?</p>
              <p className="text-slate-600 leading-relaxed">
                Please contact your Store Administrator or Developer account to assist:
              </p>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 font-mono text-[11px] text-indigo-700 font-bold">
                developer@supermarket.com
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className={`px-5 py-2 text-white font-semibold rounded-xl text-xs transition ${
                  isOwner ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                Understood
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
