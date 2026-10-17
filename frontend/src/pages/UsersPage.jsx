import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  UserCheck,
  Trash2,
  Mail,
  Lock,
  User,
  Clock,
  AlertCircle,
  AlertTriangle,
  KeyRound,
  CheckCircle2,
  Eye,
  EyeOff
} from 'lucide-react';
import { userApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Spinner, Modal, TableSkeleton } from '../components/ui';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ChangePasswordModal from '../components/auth/ChangePasswordModal';
import { formatDate, formatDateTime } from '../utils/formatters';

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Duplicate popup modal state
  const [duplicatePopup, setDuplicatePopup] = useState({
    isOpen: false,
    conflicts: [],
    name: '',
    email: '',
    message: '',
  });

  // Form state - Default password based on role (staff@123 / owner@123)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('staff');
  const [password, setPassword] = useState('staff@123');
  const [showModalPassword, setShowModalPassword] = useState(false);

  // Password change state (Self only)
  const [showSelfChangePassword, setShowSelfChangePassword] = useState(false);

  // Admin Reset Password state (Owner can reset password for any staff or owner)
  const [resetPasswordTarget, setResetPasswordTarget] = useState(null);
  const [newResetPassword, setNewResetPassword] = useState('');
  const [showResetEye, setShowResetEye] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await userApi.getAll();
      setUsers(res.data || []);
    } catch (err) {
      toastError(err.message || 'Failed to load team members.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setFormError(null);
    setShowModalPassword(false);
    if (password === 'staff@123' || password === 'owner@123' || !password) {
      setPassword(newRole === 'owner' ? 'owner@123' : 'staff@123');
    }
  };

  const openCreateModal = () => {
    setName('');
    setEmail('');
    setRole('staff');
    setPassword('staff@123');
    setShowModalPassword(false);
    setFormError(null);
    setDuplicatePopup({
      isOpen: false,
      conflicts: [],
      name: '',
      email: '',
      message: '',
    });
    setShowCreateModal(true);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const finalPassword = password.trim() || (role === 'owner' ? 'owner@123' : 'staff@123');

    if (!trimmedName || !trimmedEmail) {
      toastError('Please fill in all required fields.');
      return;
    }

    // Client-side pre-validation against existing team members
    const nameMatch = users.some((u) => u.name.trim().toLowerCase() === trimmedName.toLowerCase());
    const emailMatch = users.some((u) => u.email.trim().toLowerCase() === trimmedEmail.toLowerCase());

    if (nameMatch || emailMatch) {
      const conflicts = [];
      if (nameMatch) conflicts.push('name');
      if (emailMatch) conflicts.push('email');

      const msg =
        nameMatch && emailMatch
          ? `Both user name "${trimmedName}" and email "${trimmedEmail}" already exist in the system.`
          : nameMatch
          ? `User name "${trimmedName}" is already taken by an existing team member.`
          : `Email address "${trimmedEmail}" is already registered in the system.`;

      setFormError(msg);
      setDuplicatePopup({
        isOpen: true,
        conflicts,
        name: trimmedName,
        email: trimmedEmail,
        message: msg,
      });
      toastError(msg);
      return;
    }

    setSubmitting(true);
    try {
      const res = await userApi.create({
        name: trimmedName,
        email: trimmedEmail,
        password: finalPassword,
        role,
      });

      toastSuccess(res.message || `${role === 'owner' ? 'Store Owner' : 'Store Staff'} created successfully!`);
      setShowCreateModal(false);
      setName('');
      setEmail('');
      setPassword('staff@123');
      setRole('staff');
      setShowModalPassword(false);
      setFormError(null);
      fetchUsers();
    } catch (err) {
      const conflicts = [];
      if (err.conflicts && Array.isArray(err.conflicts)) {
        conflicts.push(...err.conflicts);
      } else if (err.conflict) {
        if (err.conflict === 'both') conflicts.push('name', 'email');
        else conflicts.push(err.conflict);
      } else {
        const lowerMsg = (err.message || '').toLowerCase();
        if (lowerMsg.includes('name')) conflicts.push('name');
        if (lowerMsg.includes('email')) conflicts.push('email');
      }

      const msg = err.message || 'Failed to create user account.';
      setFormError(msg);
      setDuplicatePopup({
        isOpen: true,
        conflicts: conflicts.length > 0 ? conflicts : ['name', 'email'],
        name: trimmedName,
        email: trimmedEmail,
        message: msg,
      });
      toastError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDelete = (u) => {
    if (u.email?.toLowerCase() === 'developer@supermarket.com') {
      toastError('Primary Developer Administrator account cannot be deleted.');
      return;
    }
    setDeleteTarget(u);
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const res = await userApi.delete(deleteTarget.id);
      const data = res?.data || res;
      toastSuccess(data?.message || res?.message || `${deleteTarget.role === 'owner' ? 'Store Owner' : 'Staff member'} "${deleteTarget.name}" deleted successfully.`);
      setDeleteTarget(null);
      fetchUsers();
    } catch (err) {
      toastError(err.message || 'Failed to delete user.');
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenResetPassword = (u) => {
    setResetPasswordTarget(u);
    setNewResetPassword('');
    setShowResetEye(false);
  };

  const handleAdminResetPassword = async (e) => {
    if (e) e.preventDefault();
    if (!resetPasswordTarget) return;

    if (!newResetPassword || newResetPassword.length < 4) {
      toastError('New password must be at least 4 characters.');
      return;
    }

    setResettingPassword(true);
    try {
      const res = await userApi.resetPassword(resetPasswordTarget.id, newResetPassword);
      const data = res?.data || res;
      toastSuccess(
        data?.message ||
          `Password for ${resetPasswordTarget.role === 'owner' ? 'Store Owner' : 'Staff member'} "${resetPasswordTarget.name}" has been reset successfully.`
      );
      setResetPasswordTarget(null);
      setNewResetPassword('');
    } catch (err) {
      toastError(err.message || 'Failed to reset password.');
    } finally {
      setResettingPassword(false);
    }
  };

  const ownerCount = users.filter((u) => u.role === 'owner').length;
  const staffCount = users.filter((u) => u.role === 'staff' || u.role === 'employee').length;

  const isNameDuplicate = Boolean(
    name.trim() && users.some((u) => u.name.trim().toLowerCase() === name.trim().toLowerCase())
  );
  const isEmailDuplicate = Boolean(
    email.trim() && users.some((u) => u.email.trim().toLowerCase() === email.trim().toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div data-tour="users-header" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Team &amp; Staff Access</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Role-Based Access Control
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200/80 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Auto-logout: Daily 12:00 AM</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Store Owners can create Staff accounts (upload-only) or additional Owner accounts (payment &amp; full management).
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm transition active:scale-[0.98]"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Staff or Owner</span>
        </button>
      </div>

      {/* Role Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Users</p>
            <p className="text-lg sm:text-xl font-extrabold font-mono text-slate-900">{users.length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Store Owners</p>
            <p className="text-lg sm:text-xl font-extrabold font-mono text-indigo-950">{ownerCount}</p>
            <p className="text-[10px] text-indigo-500 font-medium">Approve, Pay, Delete, Manage</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Store Staff</p>
            <p className="text-lg sm:text-xl font-extrabold font-mono text-emerald-950">{staffCount}</p>
            <p className="text-[10px] text-emerald-500 font-medium">Invoice PDF Upload Only</p>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm">Active Accounts ({users.length})</h3>
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Auto-logout: Daily 12:00 AM</span>
          </span>
        </div>

        {loading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700">No users found.</p>
          </div>
        ) : (
          <>
            {/* Desktop / Tablet Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/70">
                    <th className="py-3 px-6">Name &amp; Account</th>
                    <th className="py-3 px-6">Email Address</th>
                    <th className="py-3 px-6">Role &amp; Permissions</th>
                    <th className="py-3 px-6">Last Login</th>
                    <th className="py-3 px-6">Created On</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {users.map((u) => {
                    const isUserOwner = u.role === 'owner';
                    const isCurrent = currentUser?.id === u.id;

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-6 font-bold text-slate-900">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                                isUserOwner ? 'bg-indigo-600' : 'bg-emerald-600'
                              }`}
                            >
                              {isUserOwner ? 'OW' : 'ST'}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{u.name}</span>
                                {isCurrent && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-600 font-medium">
                                    You
                                  </span>
                                )}
                              </p>
                              <p className="text-[10px] text-slate-400 font-medium">ID #{u.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-6 font-medium text-slate-700">
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span>{u.email}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-6">
                          {isUserOwner ? (
                            <div className="flex items-center gap-1.5">
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Store Owner</span>
                              </span>
                              <span className="text-[10px] text-slate-400 hidden sm:inline">
                                Full Access &amp; Pay
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Store Staff</span>
                              </span>
                              <span className="text-[10px] text-slate-400 hidden sm:inline">
                                Upload Only
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-6">
                          {u.last_login_at ? (
                            <div className="space-y-0.5">
                              <p className="font-bold text-slate-800 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                                <span>{formatDateTime(u.last_login_at)}</span>
                              </p>
                              {isCurrent && (
                                <span className="inline-block px-1.5 py-0.2 rounded text-[9px] bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                                  Active Current Session
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium italic">Never logged in</span>
                          )}
                        </td>
                        <td className="py-3.5 px-6 text-slate-500 font-medium">
                          {formatDate(u.created_at)}
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isCurrent ? (
                              <button
                                type="button"
                                onClick={() => setShowSelfChangePassword(true)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-indigo-700 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-lg text-xs font-semibold transition"
                                title="Change Your Password"
                              >
                                <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Password</span>
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenResetPassword(u)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-indigo-700 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-lg text-xs font-semibold transition"
                                  title={`Reset password for ${u.name} (${u.role === 'owner' ? 'Store Owner' : 'Staff'})`}
                                >
                                  <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>Reset</span>
                                </button>
                                {u.email?.toLowerCase() === 'developer@supermarket.com' ? (
                                  <span
                                    className="p-1.5 text-slate-300 cursor-not-allowed inline-flex items-center"
                                    title="Primary Developer Administrator cannot be deleted"
                                  >
                                    <Lock className="w-3.5 h-3.5" />
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenDelete(u)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                    title={u.role === 'owner' ? `Delete Store Owner ${u.name}` : `Delete ${u.name}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View (< md) */}
            <div className="md:hidden divide-y divide-slate-100 p-3 space-y-3.5">
              {users.map((u) => {
                const isUserOwner = u.role === 'owner';
                const isCurrent = currentUser?.id === u.id;

                return (
                  <div
                    key={u.id}
                    className="pt-3.5 first:pt-0 space-y-3 rounded-2xl p-3 border border-slate-200/80 bg-white shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${
                            isUserOwner ? 'bg-indigo-600' : 'bg-emerald-600'
                          }`}
                        >
                          {isUserOwner ? 'OW' : 'ST'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-sm flex items-center gap-1.5 truncate">
                            <span>{u.name}</span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-600 font-medium">
                                You
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1 flex-shrink-0 ${
                          isUserOwner
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {isUserOwner ? <ShieldCheck className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                        <span>{isUserOwner ? 'Owner' : 'Staff'}</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex-wrap gap-2">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {u.last_login_at ? formatDateTime(u.last_login_at) : 'Never logged in'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">Created: {formatDate(u.created_at)}</span>
                    </div>

                    <div className="pt-1 flex items-center justify-end gap-2">
                      {isCurrent ? (
                        <button
                          type="button"
                          onClick={() => setShowSelfChangePassword(true)}
                          className="w-full py-2 px-3 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 min-touch-target"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Change My Password</span>
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenResetPassword(u)}
                            className="flex-1 py-2 px-3 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 min-touch-target"
                          >
                            <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Reset Password</span>
                          </button>
                          {u.email?.toLowerCase() !== 'developer@supermarket.com' && (
                            <button
                              type="button"
                              onClick={() => handleOpenDelete(u)}
                              className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 min-touch-target"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create New Team Member"
        >
          <form onSubmit={handleCreateUser} className="space-y-4">
            {/* Duplicate / Form Error Banner */}
            {formError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">Duplicate Credentials Detected</p>
                  <p className="text-rose-700 mt-0.5">{formError}</p>
                </div>
              </div>
            )}

            {/* Role Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Select Account Role <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* Staff Option */}
                <button
                  type="button"
                  onClick={() => handleRoleChange('staff')}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                    role === 'staff'
                      ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-slate-900 flex items-center gap-1">
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                      Store Staff
                    </span>
                    {role === 'staff' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Upload &amp; view invoices only. Cannot pay or delete.
                  </p>
                </button>

                {/* Owner Option */}
                <button
                  type="button"
                  onClick={() => handleRoleChange('owner')}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                    role === 'owner'
                      ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-slate-900 flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4 text-indigo-600" />
                      Store Owner
                    </span>
                    {role === 'owner' && (
                      <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Full permissions: approve &amp; pay invoices, delete, manage team.
                  </p>
                </button>
              </div>
            </div>

            {/* Name */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                {isNameDuplicate && (
                  <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Name Already Exists
                  </span>
                )}
              </div>
              <div className="relative">
                <User className={`w-4 h-4 absolute left-3 top-3 ${isNameDuplicate ? 'text-rose-400' : 'text-slate-400'}`} />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  placeholder="e.g. Ramesh Patel"
                  className={`w-full pl-9 pr-3 py-2 text-xs border rounded-xl outline-none transition ${
                    isNameDuplicate
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 bg-rose-50/20 text-slate-900'
                      : 'border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600'
                  }`}
                />
              </div>
              {isNameDuplicate && (
                <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  <span>User name &ldquo;{name.trim()}&rdquo; is already taken by an existing team member.</span>
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Work Email <span className="text-rose-500">*</span>
                </label>
                {isEmailDuplicate && (
                  <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Email Already Registered
                  </span>
                )}
              </div>
              <div className="relative">
                <Mail className={`w-4 h-4 absolute left-3 top-3 ${isEmailDuplicate ? 'text-rose-400' : 'text-slate-400'}`} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  placeholder="Enter team member email"
                  className={`w-full pl-9 pr-3 py-2 text-xs border rounded-xl outline-none transition ${
                    isEmailDuplicate
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 bg-rose-50/20 text-slate-900'
                      : 'border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600'
                  }`}
                />
              </div>
              {isEmailDuplicate && (
                <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  <span>Email address &ldquo;{email.trim()}&rdquo; is already registered in the system.</span>
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Account Password <span className="text-rose-500">*</span>
                </label>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg border flex items-center gap-1 ${
                    role === 'owner'
                      ? 'text-indigo-700 bg-indigo-50 border-indigo-200'
                      : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                  }`}
                >
                  <KeyRound className="w-3 h-3" />
                  <span>
                    Default:{' '}
                    <strong className="font-mono">
                      {role === 'owner' ? 'owner@123' : 'staff@123'}
                    </strong>
                  </span>
                </span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type={showModalPassword ? 'text' : 'password'}
                  required
                  minLength={4}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={role === 'owner' ? 'owner@123' : 'staff@123'}
                  className="w-full pl-9 pr-10 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none text-slate-900 font-medium font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowModalPassword(!showModalPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 p-0.5 transition"
                  title={showModalPassword ? 'Hide password' : 'Show password'}
                  aria-label={showModalPassword ? 'Hide password' : 'Show password'}
                >
                  {showModalPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                <span>
                  Default password is set automatically to{' '}
                  <strong className="font-mono">{role === 'owner' ? 'owner@123' : 'staff@123'}</strong>. The team member can change it after logging in.
                </span>
              </p>
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold text-xs rounded-xl hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !name.trim() || !email.trim()}
                className={`px-5 py-2 text-white font-semibold text-xs rounded-xl shadow-xs transition active:scale-[0.98] disabled:opacity-50 flex items-center gap-1.5 ${
                  role === 'staff' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {submitting ? (
                  <>
                    <Spinner size="sm" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <span>{role === 'staff' ? 'Create Staff' : 'Create Store Owner'}</span>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Duplicate Conflict Alert Popup Modal */}
      {duplicatePopup.isOpen && (
        <Modal
          isOpen={duplicatePopup.isOpen}
          onClose={() => setDuplicatePopup({ ...duplicatePopup, isOpen: false })}
          title="Duplicate Team Member Detected"
          maxWidth="max-w-md"
          footer={
            <button
              type="button"
              onClick={() => setDuplicatePopup({ ...duplicatePopup, isOpen: false })}
              className="w-full sm:w-auto px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm transition active:scale-[0.98]"
            >
              Change Conflicting Details
            </button>
          }
        >
          <div className="space-y-4 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto sm:mx-0 shadow-xs border border-rose-200">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h4 className="text-base font-extrabold text-slate-900">
                Account Cannot Be Created
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Both the user name and work email address must be strictly unique for every team member.
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              {duplicatePopup.conflicts.includes('name') && (
                <div className="p-3 bg-rose-50/90 border border-rose-200 rounded-xl text-left flex items-start gap-2.5">
                  <User className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs">
                    <p className="font-bold text-rose-900">Conflicting User Name</p>
                    <p className="text-rose-700 mt-0.5">
                      The name <strong className="font-semibold text-rose-950">&ldquo;{duplicatePopup.name}&rdquo;</strong> is already assigned to an existing team member. Please choose a different display name.
                    </p>
                  </div>
                </div>
              )}

              {duplicatePopup.conflicts.includes('email') && (
                <div className="p-3 bg-rose-50/90 border border-rose-200 rounded-xl text-left flex items-start gap-2.5">
                  <Mail className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs">
                    <p className="font-bold text-rose-900">Conflicting Email Address</p>
                    <p className="text-rose-700 mt-0.5">
                      The email <strong className="font-semibold text-rose-950">&ldquo;{duplicatePopup.email}&rdquo;</strong> is already registered. Please provide an unused work email address.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <span>Unique credentials protect role-based access control and system integrity.</span>
            </div>
          </div>
        </Modal>
      )}

      {/* Self Change Password Modal */}
      <ChangePasswordModal
        isOpen={showSelfChangePassword}
        onClose={() => setShowSelfChangePassword(false)}
      />

      {/* Admin Reset Team Member Password Modal (Available for any Staff or Owner account) */}
      {resetPasswordTarget && (
        <Modal
          isOpen={!!resetPasswordTarget}
          onClose={() => {
            setResetPasswordTarget(null);
            setNewResetPassword('');
          }}
          title={
            resetPasswordTarget.role === 'owner'
              ? 'Reset Store Owner Password'
              : 'Reset Staff Password'
          }
          maxWidth="max-w-md"
        >
          <form onSubmit={handleAdminResetPassword} className="space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
              <p className="font-bold text-slate-800">
                Resetting password for: <span className="text-indigo-600">{resetPasswordTarget.name}</span>
              </p>
              <p className="text-slate-500 font-medium">Email: {resetPasswordTarget.email}</p>
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="text-slate-500 font-medium">Account Role:</span>
                <span
                  className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                    resetPasswordTarget.role === 'owner'
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {resetPasswordTarget.role === 'owner' ? '👑 Store Owner' : '📋 Store Staff'}
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setNewResetPassword(
                      resetPasswordTarget.role === 'owner' ? 'owner@123' : 'staff@123'
                    )
                  }
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition"
                  title="Fill with default password"
                >
                  Fill Default ({resetPasswordTarget.role === 'owner' ? 'owner@123' : 'staff@123'})
                </button>
              </div>

              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type={showResetEye ? 'text' : 'password'}
                  required
                  minLength={4}
                  value={newResetPassword}
                  onChange={(e) => setNewResetPassword(e.target.value)}
                  placeholder="Enter new password (min. 4 characters)"
                  className="w-full pl-9 pr-10 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none text-slate-900 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowResetEye(!showResetEye)}
                  className="absolute right-3 top-2 text-slate-400 hover:text-slate-700 p-0.5 transition"
                  title={showResetEye ? 'Hide password' : 'Show password'}
                  aria-label={showResetEye ? 'Hide password' : 'Show password'}
                >
                  {showResetEye ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                <span>
                  Passwords are encrypted with bcrypt hashing. Passwords cannot be viewed in plain text.
                </span>
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setResetPasswordTarget(null);
                  setNewResetPassword('');
                }}
                className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold text-xs rounded-xl hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={resettingPassword || !newResetPassword || newResetPassword.length < 4}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition active:scale-[0.98] disabled:opacity-50 flex items-center gap-1.5"
              >
                {resettingPassword ? (
                  <>
                    <Spinner size="sm" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Reset Password</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Dialog (Unified for Staff and Owner) */}
      {deleteTarget && (
        <ConfirmDialog
          isOpen={true}
          title={deleteTarget.role === 'owner' ? 'Delete Store Owner' : 'Delete Staff Member'}
          message={
            deleteTarget.role === 'owner'
              ? `Are you sure you want to delete Store Owner ${deleteTarget.name} (${deleteTarget.email})? This will permanently revoke administrative access.`
              : `Are you sure you want to delete staff member ${deleteTarget.name} (${deleteTarget.email})? This staff account will immediately lose access.`
          }
          confirmLabel={deleting ? 'Deleting...' : (deleteTarget.role === 'owner' ? 'Delete Store Owner' : 'Delete Staff Member')}
          isDestructive={true}
          loading={deleting}
          onConfirm={handleDeleteUser}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
