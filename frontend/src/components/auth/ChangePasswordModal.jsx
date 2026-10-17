import React, { useState } from 'react';
import {
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { authApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Modal, Spinner } from '../ui';

export default function ChangePasswordModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isOwner = user?.role === 'owner';

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setErrorMsg('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;
  const passwordsMismatch = confirmPassword && newPassword !== confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!currentPassword) {
      setErrorMsg('Please enter your current password.');
      return;
    }

    if (!newPassword || newPassword.length < 4) {
      setErrorMsg('New password must be at least 4 characters long.');
      return;
    }

    if (newPassword === currentPassword) {
      setErrorMsg('New password cannot be the same as your current password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirmation password do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      toastSuccess(res.message || 'Password updated successfully!');
      handleClose();
    } catch (err) {
      const msg = err.message || 'Failed to change password. Please check your current password.';
      setErrorMsg(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Change Account Password"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* User Identity Context Card */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-xs ${
                isOwner ? 'bg-indigo-600' : 'bg-emerald-600'
              }`}
            >
              {isOwner ? <ShieldCheck className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 leading-tight">{user?.name}</p>
              <p className="text-[11px] text-slate-500 font-medium">{user?.email}</p>
            </div>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
              isOwner
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {isOwner ? 'Store Owner' : 'Store Staff'}
          </span>
        </div>

        {/* Error Alert Box */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Password Change Error</p>
              <p className="text-rose-700 mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Current Password Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Current Password <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type={showCurrentPassword ? 'text' : 'password'}
              required
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="Enter current password"
              className={`w-full pl-9 pr-10 py-2 text-xs border border-slate-300 rounded-xl outline-none text-slate-900 font-medium ${
                isOwner
                  ? 'focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600'
                  : 'focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute right-3 top-2 text-slate-400 hover:text-slate-700 p-0.5 transition"
              title={showCurrentPassword ? 'Hide password' : 'Show password'}
              aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
            >
              {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* New Password Field */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700">
              New Password <span className="text-rose-500">*</span>
            </label>
            <span className="text-[10px] text-slate-400 font-medium">Minimum 4 characters</span>
          </div>
          <div className="relative">
            <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type={showNewPassword ? 'text' : 'password'}
              required
              minLength={4}
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="Enter new password"
              className={`w-full pl-9 pr-10 py-2 text-xs border border-slate-300 rounded-xl outline-none text-slate-900 font-medium ${
                isOwner
                  ? 'focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600'
                  : 'focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-2 text-slate-400 hover:text-slate-700 p-0.5 transition"
              title={showNewPassword ? 'Hide password' : 'Show password'}
              aria-label={showNewPassword ? 'Hide password' : 'Show password'}
            >
              {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Confirm New Password Field */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700">
              Confirm New Password <span className="text-rose-500">*</span>
            </label>
            {passwordsMatch && (
              <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Passwords match
              </span>
            )}
            {passwordsMismatch && (
              <span className="text-[11px] font-bold text-amber-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Passwords do not match
              </span>
            )}
          </div>
          <div className="relative">
            <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              required
              minLength={4}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="Re-enter new password"
              className={`w-full pl-9 pr-10 py-2 text-xs border rounded-xl outline-none font-medium transition ${
                passwordsMismatch
                  ? 'border-amber-400 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-amber-50/20'
                  : passwordsMatch
                  ? 'border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-emerald-50/20'
                  : isOwner
                  ? 'border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600'
                  : 'border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-2 text-slate-400 hover:text-slate-700 p-0.5 transition"
              title={showConfirmPassword ? 'Hide password' : 'Show password'}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Security Info */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-[11px] text-slate-600 flex items-center gap-2">
          <ShieldCheck
            className={`w-4 h-4 flex-shrink-0 ${
              isOwner ? 'text-indigo-600' : 'text-emerald-600'
            }`}
          />
          <span>Your password is encrypted with enterprise-grade bcrypt hashing.</span>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold text-xs rounded-xl hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`px-5 py-2 font-semibold text-xs rounded-xl text-white shadow-xs transition active:scale-[0.98] disabled:opacity-50 flex items-center gap-1.5 ${
              isOwner
                ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100'
            }`}
          >
            {loading ? (
              <>
                <Spinner size="sm" />
                <span>Updating...</span>
              </>
            ) : (
              <>
                <KeyRound className="w-3.5 h-3.5" />
                <span>Update Password</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
