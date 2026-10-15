import React, { useState, useEffect } from 'react';
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
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useUpdates } from '../context/UpdatesContext';
import { authApi } from '../services/api';
import { Spinner } from '../components/ui';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { error: toastError, success: toastSuccess } = useToast();
  const { refreshUpdates } = useUpdates();

  // --- Login State (Credentials + Mandatory OTP Step) ---
  const [portalRole, setPortalRole] = useState('owner'); // 'owner' | 'staff'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Step 2 OTP for Login
  const [loginStep, setLoginStep] = useState(1); // 1 = credentials, 2 = enter otp
  const [loginOtpCode, setLoginOtpCode] = useState('');
  const [loginCountdown, setLoginCountdown] = useState(0);
  const [verifyingLoginOtp, setVerifyingLoginOtp] = useState(false);
  const [loginOtpHelper, setLoginOtpHelper] = useState(null);

  const from = location.state?.from?.pathname;

  // Countdown timer for Login OTP resend
  useEffect(() => {
    let timer;
    if (loginCountdown > 0) {
      timer = setTimeout(() => setLoginCountdown(loginCountdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [loginCountdown]);

  const handlePortalSwitch = (newRole) => {
    setPortalRole(newRole);
    setErrorMessage('');
    setLoginStep(1);
    setLoginOtpCode('');
    setLoginOtpHelper(null);
  };

  const handleAuthRedirect = () => {
    if (refreshUpdates) refreshUpdates();
    const targetPath = from && from !== '/login' ? from : '/';
    navigate(targetPath, { replace: true });
  };

  // Step 1: Validate Credentials & Send Login OTP
  const handleInitiateLogin = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    if (!email || !password) {
      toastError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await login(email.trim(), password, portalRole);
      if (res && res.requiresOtp) {
        setLoginStep(2);
        setLoginCountdown(60);
        if (res.emailConfigured) {
          setLoginOtpHelper(null);
          toastSuccess(`Live 6-digit OTP sent to ${email.trim()}! Please check your inbox.`);
        } else {
          setLoginOtpHelper(res.debugOtp);
          toastSuccess(`6-Digit OTP generated for ${email.trim()}.`);
        }
      } else {
        // Direct login if already verified or bypassed
        handleAuthRedirect();
      }
    } catch (err) {
      const msg = err.message || 'Login failed. Please check credentials.';
      setErrorMessage(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify Login OTP & Complete Sign In
  const handleVerifyLoginOtp = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    if (!loginOtpCode || loginOtpCode.trim().length !== 6) {
      toastError('Please enter the 6-digit OTP code.');
      return;
    }

    setVerifyingLoginOtp(true);
    try {
      await login(email.trim(), password, portalRole, loginOtpCode.trim());
      handleAuthRedirect();
    } catch (err) {
      const msg = err.message || 'Invalid or expired OTP code.';
      setErrorMessage(msg);
      toastError(msg);
    } finally {
      setVerifyingLoginOtp(false);
    }
  };

  // Resend Login OTP
  const handleResendLoginOtp = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await authApi.sendLoginOtp({
        email: email.trim(),
        portalRole,
      });
      setLoginCountdown(60);
      if (res && res.emailConfigured) {
        setLoginOtpHelper(null);
        toastSuccess('New 6-digit OTP sent to your inbox!');
      } else {
        setLoginOtpHelper(res?.debugOtp);
        toastSuccess('New 6-digit OTP generated.');
      }
    } catch (err) {
      toastError(err.message || 'Failed to resend OTP.');
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
            Intelligent Invoice Processing • Mandatory 6-Digit OTP Security
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
                {loginStep === 2
                  ? `${portalRole === 'staff' ? 'Store Staff' : 'Store Owner'} OTP Verification`
                  : `${portalRole === 'staff' ? 'Store Staff' : 'Store Owner'} Sign In`}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {loginStep === 2
                  ? `Enter the 6-digit OTP code sent to ${email}`
                  : `Enter credentials to receive your mandatory 6-digit login OTP`}
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
                    <span>Switch to Store Staff Portal & Try Again</span>
                  </button>
                )}
                {errorMessage.includes('Store Owner') && portalRole === 'staff' && (
                  <button
                    type="button"
                    onClick={() => handlePortalSwitch('owner')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[11px] transition shadow-xs"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Switch to Store Owner Portal & Try Again</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* LOGIN FLOW (Credentials Step -> Mandatory OTP Step)           */}
          {/* ============================================================== */}
          {loginStep === 1 && (
            <form onSubmit={handleInitiateLogin} className="space-y-4" autoComplete="off">
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
                    placeholder=""
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
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder=""
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
                    <span>Send OTP</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 2: MANDATORY OTP INPUT */}
          {loginStep === 2 && (
            <form onSubmit={handleVerifyLoginOtp} className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-slate-500">Signing in as:</p>
                  <p className="text-xs font-bold text-slate-900 truncate">{email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLoginStep(1);
                    setLoginOtpCode('');
                    setLoginOtpHelper(null);
                  }}
                  className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Change</span>
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">Enter Mandatory 6-Digit OTP</label>
                  {loginCountdown > 0 ? (
                    <span className="text-[11px] font-medium text-slate-400">Resend in {loginCountdown}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendLoginOtp}
                      disabled={loading}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Resend OTP</span>
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  maxLength={6}
                  autoFocus
                  value={loginOtpCode}
                  onChange={(e) => setLoginOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (!verifyingLoginOtp && loginOtpCode.trim().length === 6) {
                        handleVerifyLoginOtp(e);
                      }
                    }
                  }}
                  placeholder="••••••"
                  className="w-full text-center text-2xl font-mono font-black tracking-[0.5em] py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-900"
                />
              </div>

              <button
                type="submit"
                disabled={verifyingLoginOtp || loginOtpCode.length !== 6}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-md transition disabled:opacity-50"
              >
                {verifyingLoginOtp ? (
                  <Spinner size="sm" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verify OTP & Complete Sign In</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Security / System Footer Note */}
        <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
          <span>Role-Guarded Access Portal • Mandatory 6-Digit OTP • Daily Midnight Session</span>
        </div>
      </div>
    </div>
  );
}
