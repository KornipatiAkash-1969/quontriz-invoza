import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ScanText,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useUpdates } from '../context/UpdatesContext';
import { Spinner } from '../components/ui';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { error: toastError } = useToast();
  const { refreshUpdates } = useUpdates();

  const [portalRole, setPortalRole] = useState('owner'); // 'owner' | 'staff'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const from = location.state?.from?.pathname;

  const handlePortalSwitch = (newRole) => {
    setPortalRole(newRole);
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

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-5">
        {/* Logo & Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
            <ScanText className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Quontriz Invoza</h2>
          <p className="text-xs font-semibold text-slate-500 max-w-xs mx-auto">
            Intelligent Invoice Processing • Secure Staff &amp; Owner Portals
          </p>
        </div>

        {/* Portal Selection Tabs (Store Staff vs Store Owner) */}
        <div className="bg-slate-200/70 p-1 rounded-2xl flex items-center gap-1 border border-slate-300/80 shadow-xs">
          <button
            type="button"
            onClick={() => handlePortalSwitch('staff')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition duration-150 ${
              portalRole === 'staff'
                ? 'bg-white text-emerald-700 shadow-sm border border-emerald-200 ring-2 ring-emerald-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <UserCheck className={`w-4 h-4 ${portalRole === 'staff' ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>Store Staff Portal</span>
          </button>

          <button
            type="button"
            onClick={() => handlePortalSwitch('owner')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition duration-150 ${
              portalRole === 'owner'
                ? 'bg-white text-indigo-700 shadow-sm border border-indigo-200 ring-2 ring-indigo-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className={`w-4 h-4 ${portalRole === 'owner' ? 'text-indigo-600' : 'text-slate-400'}`} />
            <span>Store Owner Portal</span>
          </button>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xl shadow-slate-100 space-y-5">
          {/* Card Header */}
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                {portalRole === 'staff' ? 'Store Staff Sign In' : 'Store Owner Sign In'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {portalRole === 'staff'
                  ? 'Sign in to upload and verify store invoices'
                  : 'Sign in with your owner credentials'}
              </p>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                portalRole === 'staff'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-indigo-100 text-indigo-700'
              }`}
            >
              {portalRole === 'staff' ? 'Staff' : 'Owner'}
            </span>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-2xl text-xs flex items-start gap-2.5 shadow-xs animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="font-bold leading-snug">{errorMessage}</p>
                {errorMessage.includes('Store Staff') && portalRole === 'owner' && (
                  <button
                    type="button"
                    onClick={() => handlePortalSwitch('staff')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] transition shadow-xs"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Switch to Store Staff Portal &amp; Try Again</span>
                  </button>
                )}
                {errorMessage.includes('Store Owner') && portalRole === 'staff' && (
                  <button
                    type="button"
                    onClick={() => handlePortalSwitch('owner')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[11px] transition shadow-xs"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Switch to Store Owner Portal &amp; Try Again</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Direct Sign-In Form */}
          <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Work Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  autoComplete="off"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="name@supermarket.com"
                  className={`w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm border rounded-xl outline-none font-medium text-slate-900 transition ${
                    portalRole === 'staff'
                      ? 'border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600'
                      : 'border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="Enter your password"
                  className={`w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm border rounded-xl outline-none font-medium text-slate-900 transition ${
                    portalRole === 'staff'
                      ? 'border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600'
                      : 'border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-700 p-0.5 transition"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 py-3 px-4 text-white font-semibold text-sm rounded-xl shadow-md transition active:scale-[0.98] disabled:opacity-50 ${
                portalRole === 'staff'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100'
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'
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
        </div>

        {/* Security / System Footer Note */}
        <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
          <span>Role-Guarded Access Portal • Daily Midnight Session Reset</span>
        </div>
      </div>
    </div>
  );
}
