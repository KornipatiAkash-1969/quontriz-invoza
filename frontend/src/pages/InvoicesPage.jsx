import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Search,
  Filter,
  Eye,
  Trash2,
  Download,
  Plus,
  CreditCard,
  CheckCircle2,
  Clock,
  UploadCloud,
  Image as ImageIcon,
  Check,
  UserCheck
} from 'lucide-react';
import { invoiceApi, vendorApi, categoryApi } from '../services/api';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters';
import { Pagination, TableSkeleton } from '../components/ui';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import PaymentApprovalModal from '../components/review/PaymentApprovalModal';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useUpdates } from '../context/UpdatesContext';

export default function InvoicesPage() {
  const navigate = useNavigate();
  const { user, isOwner } = useAuth();
  const {
    refreshUpdates,
    markInvoiceViewed,
    markAllInvoicesViewed
  } = useUpdates();
  const { success: toastSuccess, error: toastError } = useToast();
  const [filterStaffOnly, setFilterStaffOnly] = useState(false);

  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [categories, setCategories] = useState([]);

  // Filter & Search states - default to newest uploaded first
  const [search, setSearch] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 10 });
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Delete modal state
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Payment approval modal state
  const [approvingInvoice, setApprovingInvoice] = useState(null);

  useEffect(() => {
    async function loadFilters() {
      try {
        const [vRes, cRes] = await Promise.all([vendorApi.getAll(), categoryApi.getAll()]);
        setVendors(vRes.data || []);
        setCategories(cRes.data || []);
      } catch (e) {
        console.error(e);
      }
    }
    loadFilters();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await invoiceApi.getAll({
        search,
        vendorId: vendorId || undefined,
        categoryId: categoryId || undefined,
        status: status || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        sortBy,
        sortOrder,
        page,
        limit: 10,
        userId: (!isOwner && user?.id) ? user.id : undefined
      });

      setInvoices(res.data || []);
      setPagination(res.pagination || { total: 0, totalPages: 1, limit: 10 });
    } catch (err) {
      toastError(err.message || 'Failed to fetch invoices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [search, vendorId, categoryId, status, startDate, endDate, sortBy, sortOrder, page]);

  // Automatically mark all invoices as viewed when viewing invoice history so badges disappear
  useEffect(() => {
    if (markAllInvoicesViewed) {
      markAllInvoicesViewed();
    }
  }, [markAllInvoicesViewed]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await invoiceApi.delete(deleteId);
      toastSuccess('Invoice deleted successfully.');
      setDeleteId(null);
      fetchInvoices();
    } catch (err) {
      toastError(err.message || 'Failed to delete invoice.');
    } finally {
      setDeleting(false);
    }
  };

  const handleDownloadInvoicePdf = async (e, inv) => {
    e.stopPropagation();
    try {
      const cleanNum = (inv.invoice_number || `invoice_${inv.id}`).replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Invoice-${cleanNum}.pdf`;
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`/api/invoices/${inv.id}/pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error('Failed to download PDF');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toastSuccess(`Invoice ${inv.invoice_number} PDF downloaded.`);
    } catch (err) {
      toastError('Failed to download invoice PDF.');
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setVendorId('');
    setCategoryId('');
    setStatus('');
    setStartDate('');
    setEndDate('');
    setSortBy('created_at');
    setSortOrder('DESC');
    setPage(1);
  };

  const roleFilteredInvoices = (!isOwner && user?.id)
    ? invoices.filter((inv) => !inv.created_by_user_id || inv.created_by_user_id === user.id)
    : invoices;

  const displayedInvoices = filterStaffOnly
    ? roleFilteredInvoices.filter((inv) => {
        const isStaff =
          inv.created_by_role === 'staff' ||
          inv.created_by_role === 'employee' ||
          (inv.created_by_user_id && inv.created_by_user_id !== 1);
        const isPaid =
          inv.status === 'Paid' ||
          (Number(inv.amount_paid || inv.paid || 0) >= Number(inv.total) && Number(inv.total) > 0);
        return isStaff && !isPaid;
      })
    : roleFilteredInvoices;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div data-tour="invoices-header" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Invoice History</h2>
            {isOwner ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                👑 Owner Mode (Pay & Delete)
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                📋 Staff Mode (Upload Only)
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isOwner
              ? 'Search, filter, approve payments, and manage invoices. Store Owners have full payment and deletion authority.'
              : `View your uploaded invoices and their review status. Showing invoices uploaded by ${user?.name || 'you'}.`}
          </p>
        </div>

        <button
          onClick={() => navigate('/upload')}
          className={`flex items-center gap-2 px-4 py-2.5 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm transition active:scale-[0.98] ${
            isOwner
              ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
              : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Upload / Entry</span>
        </button>
      </div>



      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm space-y-4">
        {/* Mobile Search & Filter Header (< sm) */}
        <div className="flex sm:hidden items-center justify-between gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search invoice #, vendor..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowMobileFilters((prev) => !prev)}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
              showMobileFilters || [vendorId, categoryId, status, startDate, endDate, filterStaffOnly].filter(Boolean).length > 0
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : 'bg-white border-slate-300 text-slate-700'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filters</span>
            {[vendorId, categoryId, status, startDate, endDate, filterStaffOnly].filter(Boolean).length > 0 && (
              <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">
                {[vendorId, categoryId, status, startDate, endDate, filterStaffOnly].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {/* Filters Grid: Always visible on sm+, toggled on mobile */}
        <div className={`${showMobileFilters ? 'grid' : 'hidden sm:grid'} grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3`}>
          {/* Search Input (visible on sm+) */}
          <div className="hidden sm:block relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search invoice #, vendor..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
            />
          </div>

          {/* Filter by Status */}
          <div>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none bg-white font-medium"
            >
              <option value="">All Statuses</option>
              <option value="Approved">Approved / Paid</option>
              <option value="Pending Approval">Pending Approval</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Filter by Vendor */}
          <div>
            <select
              value={vendorId}
              onChange={(e) => {
                setVendorId(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none bg-white font-medium"
            >
              <option value="">All Vendors</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vendor_name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Category */}
          <div>
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none bg-white font-medium"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.category_name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [col, ord] = e.target.value.split('-');
                setSortBy(col);
                setSortOrder(ord);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none bg-white font-medium"
            >
              <option value="created_at-DESC">Upload Date (Newest First)</option>
              <option value="created_at-ASC">Upload Date (Oldest First)</option>
              <option value="invoice_date-DESC">Bill Date (Newest First)</option>
              <option value="invoice_date-ASC">Bill Date (Oldest First)</option>
              <option value="total-DESC">Amount (Highest First)</option>
              <option value="total-ASC">Amount (Lowest First)</option>
              <option value="invoice_number-ASC">Invoice Number (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Date Range & Reset Filters */}
        <div className={`${showMobileFilters ? 'flex' : 'hidden sm:flex'} flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500 font-medium">Date Range:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1 border border-slate-200 rounded-lg text-xs"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div className="flex items-center gap-3">
            {isOwner && (
              <button
                type="button"
                onClick={() => setFilterStaffOnly((prev) => !prev)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  filterStaffOnly
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              >
                {filterStaffOnly ? 'Showing Staff Uploads' : 'Filter Staff Uploads'}
              </button>
            )}

            <button
              onClick={handleResetFilters}
              className="text-indigo-600 hover:text-indigo-800 font-semibold hover:underline"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        {loading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : displayedInvoices.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs space-y-2">
            <FileText className="w-8 h-8 mx-auto text-slate-300" />
            <p className="font-semibold text-slate-700">No invoices matched your filters.</p>
            <p className="text-slate-400">
              {filterStaffOnly ? 'No pending staff uploads found.' : 'Try modifying search parameters or clear filters.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop / Tablet Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/70">
                    <th className="py-2.5 px-3 sm:px-4">Invoice #</th>
                    <th className="py-2.5 px-3 sm:px-4">Vendor</th>
                    <th className="py-2.5 px-3 sm:px-4">Invoice & Upload Date</th>
                    <th className="py-2.5 px-3 sm:px-4">Items</th>
                    <th className="py-2.5 px-3 sm:px-4">Total & GST</th>
                    <th className="py-2.5 px-3 sm:px-4">Status</th>
                    <th className="py-2.5 px-3 sm:px-4">Uploaded By</th>
                    <th className="py-2.5 px-3 sm:px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {displayedInvoices.map((inv) => {
                    const isPaid =
                      inv.status === 'Paid' ||
                      (Number(inv.amount_paid || inv.paid || 0) >= Number(inv.total) && Number(inv.total) > 0);
                    const isPending = !isPaid && inv.status !== 'Rejected';
                    const isStaffUpload =
                      inv.created_by_role === 'staff' ||
                      inv.created_by_role === 'employee' ||
                      (inv.created_by_user_id && inv.created_by_user_id !== 1) ||
                      (!inv.created_by_user_id) ||
                      inv.viewed_by_owner === 0;
                    const isUnviewed = isOwner
                      ? (!inv.viewed_by_owner || inv.viewed_by_owner === 0)
                      : (!inv.viewed_by_staff || inv.viewed_by_staff === 0);
                    const ext = (inv.pdf_path || '').split('.').pop().toLowerCase();
                    const isPdf = ext === 'pdf';
                    const isImage = ['png', 'jpg', 'jpeg', 'webp', 'bmp'].includes(ext);

                    return (
                      <tr
                        key={inv.id}
                        className={`transition-colors ${
                          isUnviewed
                            ? 'bg-amber-50/40 hover:bg-amber-50/70 border-l-4 border-l-amber-500'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="py-2.5 px-3 sm:px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-slate-900">{inv.invoice_number}</span>
                            {isUnviewed && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-500 text-white shadow-xs">
                                {isOwner ? '● Staff Update' : '● Status Update'}
                              </span>
                            )}
                          </div>
                          {isStaffUpload && (
                            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                              {isPdf ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  <FileText className="w-3 h-3 text-rose-600" />
                                  <span>Staff PDF Upload</span>
                                </span>
                              ) : isImage ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  <ImageIcon className="w-3 h-3 text-indigo-600" />
                                  <span>Staff Image Upload</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                  <span>Staff Manual Entry</span>
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 sm:px-4">
                          <p className="font-semibold text-slate-800">{inv.vendor_name || '—'}</p>
                          <p className="text-[10px] text-slate-400">{inv.vendor_type || 'General'}</p>
                        </td>
                        <td className="py-2.5 px-3 sm:px-4">
                          <p className="font-bold text-slate-800">{formatDate(inv.invoice_date)}</p>
                          {inv.created_at && (
                            <div
                              className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5"
                              title="Uploaded timestamp"
                            >
                              <UploadCloud className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                              <span>Uploaded: {formatDateTime(inv.created_at)}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 sm:px-4">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                            {inv.items_count || 0} items
                          </span>
                        </td>
                        <td className="py-3.5 px-3.5 sm:px-6 font-extrabold text-slate-900">
                          <div>{formatCurrency(inv.total)}</div>
                          {Number(inv.total_gst || inv.tax) > 0 ? (
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono text-[10px] font-bold">
                                GST: +{formatCurrency(inv.total_gst || inv.tax)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium">No GST</span>
                          )}
                          {Number(inv.advance_paid) > 0 && (
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                              Adv: {formatCurrency(inv.advance_paid)}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 sm:px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border inline-flex items-center gap-1 ${
                              isPaid
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : inv.status === 'Rejected'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : isStaffUpload
                                ? 'bg-amber-100 text-amber-900 border-amber-300 font-extrabold shadow-xs'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {isPaid ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Approved & Paid</span>
                              </>
                            ) : inv.status === 'Rejected' ? (
                              <span>Rejected</span>
                            ) : isStaffUpload ? (
                              <>
                                <Clock className="w-3 h-3 text-amber-700" />
                                <span>Pending Owner Approval</span>
                              </>
                            ) : (
                              <span>Pending Approval & Payment</span>
                            )}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 sm:px-4">
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50/80 border border-indigo-200 text-indigo-900 text-xs font-bold w-fit">
                              <UserCheck className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                              <span>{inv.created_by_name || 'Staff Member'}</span>
                            </span>
                            <span className="text-[10px] text-slate-400 capitalize pl-1">
                              Role: {inv.created_by_role || 'Staff'}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Quick Dismiss/Mark Viewed Action */}
                            {isUnviewed && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (markInvoiceViewed) {
                                    await markInvoiceViewed(inv.id);
                                    fetchInvoices();
                                  }
                                }}
                                className="p-1.5 text-amber-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                                title="Mark as viewed (dismiss notification number)"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}

                            {/* Owner Approve & Pay Action */}
                            {isOwner && isPending && (
                              <button
                                onClick={() => setApprovingInvoice(inv)}
                                className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs transition"
                                title="Approve invoice and make payment"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>Approve & Pay</span>
                              </button>
                            )}

                            <button
                              onClick={async () => {
                                if (isUnviewed && markInvoiceViewed) {
                                  await markInvoiceViewed(inv.id);
                                }
                                navigate(`/invoices/${inv.id}`);
                              }}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              title="View Invoice Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            <button
                              onClick={(e) => handleDownloadInvoicePdf(e, inv)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              title="Download Invoice PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>

                            {/* Owner Only Delete Action */}
                            {isOwner && (
                              <button
                                onClick={() => setDeleteId(inv.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Delete Invoice (Owner Only)"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
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
              {displayedInvoices.map((inv) => {
                const isPaid =
                  inv.status === 'Paid' ||
                  (Number(inv.amount_paid || inv.paid || 0) >= Number(inv.total) && Number(inv.total) > 0);
                const isPending = !isPaid && inv.status !== 'Rejected';
                const isStaffUpload =
                  inv.created_by_role === 'staff' ||
                  inv.created_by_role === 'employee' ||
                  (inv.created_by_user_id && inv.created_by_user_id !== 1) ||
                  (!inv.created_by_user_id) ||
                  inv.viewed_by_owner === 0;
                const isUnviewed = isOwner
                  ? (!inv.viewed_by_owner || inv.viewed_by_owner === 0)
                  : (!inv.viewed_by_staff || inv.viewed_by_staff === 0);
                return (
                  <div
                    key={inv.id}
                    className={`pt-3.5 first:pt-0 space-y-3 rounded-2xl p-3 border transition-colors ${
                      isUnviewed
                        ? 'bg-amber-50/50 border-amber-300'
                        : 'bg-white border-slate-200/80 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-slate-900 text-sm">
                            {inv.invoice_number}
                          </span>
                          {isUnviewed && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-500 text-white shadow-xs">
                              {isOwner ? '● Staff Update' : '● Status Update'}
                            </span>
                          )}
                        </div>
                        <p className="font-semibold text-slate-800 text-xs mt-1 truncate">
                          {inv.vendor_name || '—'}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {inv.vendor_type || 'General'} • Date: {formatDate(inv.invoice_date)}
                        </p>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="font-black text-slate-950 text-base">
                          {formatCurrency(inv.total)}
                        </p>
                        <span
                          className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isPaid
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : inv.status === 'Rejected'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : isStaffUpload
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {isPaid ? (
                            <>
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>Paid</span>
                            </>
                          ) : inv.status === 'Rejected' ? (
                            <span>Rejected</span>
                          ) : isStaffUpload ? (
                            <>
                              <Clock className="w-2.5 h-2.5" />
                              <span>Pending Pay</span>
                            </>
                          ) : (
                            <span>Pending</span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100/80 flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 font-medium text-slate-700">
                          {inv.items_count || 0} items
                        </span>
                        {Number(inv.total_gst || inv.tax) > 0 ? (
                          <span className="px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-[10px]">
                            GST: +{formatCurrency(inv.total_gst || inv.tax)}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">No GST</span>
                        )}
                        {Number(inv.advance_paid) > 0 && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            Adv: {formatCurrency(inv.advance_paid)}
                          </span>
                        )}
                      </div>

                      <div className="text-[10px] text-slate-400">
                        By <span className="font-semibold text-slate-700">{inv.created_by_name || 'Staff'}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {isOwner && isPending && (
                        <button
                          type="button"
                          onClick={() => setApprovingInvoice(inv)}
                          className="col-span-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 min-touch-target"
                        >
                          <CreditCard className="w-4 h-4" />
                          <span>Approve & Pay</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={async () => {
                          if (isUnviewed && markInvoiceViewed) {
                            await markInvoiceViewed(inv.id);
                          }
                          navigate(`/invoices/${inv.id}`);
                        }}
                        className="py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1 min-touch-target"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Details</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDownloadInvoicePdf(e, inv)}
                        className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1 min-touch-target"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                      </button>

                      {isOwner && (
                        <button
                          type="button"
                          onClick={() => setDeleteId(inv.id)}
                          className="col-span-2 py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-semibold text-xs transition flex items-center justify-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Invoice</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Pagination */}
        <Pagination
          currentPage={page}
          totalPages={pagination.totalPages}
          onPageChange={(newPage) => setPage(newPage)}
        />
      </div>

      {/* Owner Payment Approval Modal */}
      {approvingInvoice && (
        <PaymentApprovalModal
          isOpen={!!approvingInvoice}
          onClose={() => setApprovingInvoice(null)}
          invoice={approvingInvoice}
          onApproved={() => {
            setApprovingInvoice(null);
            fetchInvoices();
            if (refreshUpdates) refreshUpdates();
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          await handleDelete();
          if (refreshUpdates) refreshUpdates();
        }}
        title="Delete Invoice"
        message="Are you sure you want to delete this invoice and all associated line items?"
        confirmText="Delete Invoice"
        isDanger={true}
        loading={deleting}
      />
    </div>
  );
}
