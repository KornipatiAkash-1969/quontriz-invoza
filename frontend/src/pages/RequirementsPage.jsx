import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Plus,
  Download,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Truck,
  AlertCircle,
  Trash2,
  Edit2,
  X,
  FileSpreadsheet,
  Package,
  Layers,
  Building2,
  Sparkles,
  ArrowUpDown,
  RefreshCw,
  ExternalLink,
  Check
} from 'lucide-react';
import { requirementApi, vendorApi, categoryApi } from '../services/api';
import { Spinner, TableSkeleton } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useUpdates } from '../context/UpdatesContext';
import { formatDate, formatDateTime, formatCurrency } from '../utils/formatters';

const COMMON_SPEC_SUGGESTIONS = ['25 KG', '50 KG', '10 KG', '5 KG', '1 KG', '15 L Tin', '1 Litre', '500 ml', '1 Pack', '75 GSM'];
const COMMON_UNITS = ['bags', 'boxes', 'kg', 'pcs', 'packets', 'tins', 'cartons', 'reams', 'litres', 'bundles'];

export default function RequirementsPage() {
  const { user, isOwner, isStaff } = useAuth();
  const {
    refreshUpdates,
    broadcastUpdate,
    markRequirementViewed,
    markAllRequirementsViewed,
    pendingRequirementsCount
  } = useUpdates();
  const { success: toastSuccess, error: toastError } = useToast();

  const [loading, setLoading] = useState(true);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [requirements, setRequirements] = useState([]);
  const [counts, setCounts] = useState({ total: 0, pending: 0, approved: 0, ordered: 0, fulfilled: 0, urgent: 0 });
  const [vendors, setVendors] = useState([]);
  const [categories, setCategories] = useState([]);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    item_name: '',
    specification: '',
    quantity: 1,
    unit: 'bags',
    category_id: '',
    category_name: '',
    priority: 'Medium',
    estimated_price: '',
    preferred_vendor_id: '',
    preferred_vendor_name: '',
    notes: '',
    status: 'Pending'
  });

  // Custom Packaging/Weights state (persisted in localStorage)
  const [customSpecs, setCustomSpecs] = useState(() => {
    try {
      const saved = localStorage.getItem('custom_store_specs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showAddSpecInput, setShowAddSpecInput] = useState(false);
  const [newCustomSpec, setNewCustomSpec] = useState('');

  const allSpecs = Array.from(new Set([...COMMON_SPEC_SUGGESTIONS, ...customSpecs]));

  const handleAddNewSpec = (valToAdd) => {
    const val = (valToAdd !== undefined ? valToAdd : newCustomSpec).trim();
    if (!val) return;
    if (!customSpecs.includes(val) && !COMMON_SPEC_SUGGESTIONS.includes(val)) {
      const updated = [...customSpecs, val];
      setCustomSpecs(updated);
      try {
        localStorage.setItem('custom_store_specs', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
    }
    setFormData((prev) => ({ ...prev, specification: val }));
    setNewCustomSpec('');
    setShowAddSpecInput(false);
    toastSuccess(`Weight / Size "${val}" added.`);
  };

  // Load auxiliary data (vendors, categories)
  useEffect(() => {
    async function loadAux() {
      try {
        const [vRes, cRes] = await Promise.all([
          vendorApi.getAll({ limit: 100 }).catch(() => ({ data: [] })),
          categoryApi.getAll().catch(() => ({ data: [] }))
        ]);
        setVendors(vRes.data || []);
        setCategories(cRes.data || []);
      } catch (err) {
        console.error('Error loading vendors/categories:', err);
      }
    }
    loadAux();
  }, []);

  // Fetch requirements
  const fetchRequirements = async () => {
    setLoading(true);
    try {
      const res = await requirementApi.getAll({
        search,
        status: statusFilter,
        priority: priorityFilter
      });
      setRequirements(res.data || []);
      if (res.counts) setCounts(res.counts);
    } catch (err) {
      toastError(err.message || 'Failed to load requirements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequirements();
  }, [search, statusFilter, priorityFilter]);

  // Automatically mark all store requirements as viewed when viewing the requirements page so badges disappear
  useEffect(() => {
    if (markAllRequirementsViewed) {
      markAllRequirementsViewed();
    }
  }, [markAllRequirementsViewed]);

  // Lock background body scroll while modal is open & handle Escape key
  useEffect(() => {
    if (showModal) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          setShowModal(false);
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = prevOverflow || 'unset';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [showModal]);

  // Handle open Add Modal
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      item_name: '',
      specification: '',
      quantity: 1,
      unit: 'bags',
      category_id: '',
      category_name: '',
      priority: 'Medium',
      estimated_price: '',
      preferred_vendor_id: '',
      preferred_vendor_name: '',
      notes: '',
      status: 'Pending'
    });
    setShowModal(true);
  };

  // Handle open Edit Modal
  const handleOpenEdit = (item) => {
    const isItemUnviewed = isOwner
      ? (!item.viewed_by_owner || item.viewed_by_owner === 0)
      : (!item.viewed_by_staff || item.viewed_by_staff === 0);
    if (isItemUnviewed && markRequirementViewed) {
      markRequirementViewed(item.id);
    }
    setEditingItem(item);
    setFormData({
      item_name: item.item_name || '',
      specification: item.specification || '',
      quantity: item.quantity || 1,
      unit: item.unit || 'bags',
      category_id: item.category_id || '',
      category_name: item.category_name || '',
      priority: item.priority || 'Medium',
      estimated_price: item.estimated_price !== null && item.estimated_price !== undefined ? item.estimated_price : '',
      preferred_vendor_id: item.preferred_vendor_id || '',
      preferred_vendor_name: item.preferred_vendor_name || '',
      notes: item.notes || '',
      status: item.status || 'Pending'
    });
    setShowModal(true);
  };

  // Handle Save (Create or Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.item_name.trim()) {
      toastError('Please enter an item name (e.g. Rice).');
      return;
    }
    if (!formData.quantity || Number(formData.quantity) <= 0) {
      toastError('Please enter a valid quantity.');
      return;
    }

    setSubmitting(true);
    try {
      // Find selected vendor & category names
      const selectedVendor = vendors.find(v => String(v.id) === String(formData.preferred_vendor_id));
      const selectedCategory = categories.find(c => String(c.id) === String(formData.category_id));

      const payload = {
        ...formData,
        preferred_vendor_name: selectedVendor ? selectedVendor.vendor_name : formData.preferred_vendor_name,
        category_name: selectedCategory ? selectedCategory.category_name : formData.category_name,
        estimated_price: formData.estimated_price !== '' && !isNaN(Number(formData.estimated_price)) ? Number(formData.estimated_price) : 0,
        quantity: Number(formData.quantity) > 0 ? Number(formData.quantity) : 1
      };

      if (editingItem) {
        await requirementApi.update(editingItem.id, payload);
        toastSuccess(`Requirement "${formData.item_name}" updated.`);
      } else {
        await requirementApi.create(payload);
        toastSuccess(`Added requirement: ${formData.item_name} ${formData.specification ? `- ${formData.specification}` : ''} - ${formData.quantity} ${formData.unit}`);
      }
      setShowModal(false);
      fetchRequirements();
      if (broadcastUpdate) broadcastUpdate();
      else if (refreshUpdates) refreshUpdates();
    } catch (err) {
      toastError(err.message || 'Failed to save requirement.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Owner Quick Status Change
  const handleStatusChange = async (item, newStatus) => {
    try {
      await requirementApi.update(item.id, { status: newStatus });
      toastSuccess(`Marked "${item.item_name}" as ${newStatus}.`);
      fetchRequirements();
      if (broadcastUpdate) broadcastUpdate();
      else if (refreshUpdates) refreshUpdates();
    } catch (err) {
      toastError(err.message || 'Failed to update status.');
    }
  };

  // Handle Delete
  const handleDelete = async (item) => {
    if (!window.confirm(`Delete requirement "${item.item_name}"?`)) return;
    try {
      await requirementApi.delete(item.id);
      toastSuccess(`Requirement "${item.item_name}" deleted.`);
      fetchRequirements();
      if (refreshUpdates) refreshUpdates();
    } catch (err) {
      toastError(err.message || 'Failed to delete requirement.');
    }
  };

  // Handle Excel Export Download
  const handleDownloadExcel = async () => {
    setDownloadingExcel(true);
    try {
      const token = localStorage.getItem('token') || '';
      const params = new URLSearchParams({
        status: statusFilter,
        priority: priorityFilter,
        search
      }).toString();

      const url = `/api/requirements/export/excel?${params}`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (!res.ok) throw new Error('Failed to generate Excel sheet.');

      const blob = await res.blob();
      const today = new Date().toISOString().slice(0, 10);
      const filename = `Store_Requirements_${today}.xlsx`;

      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);

      toastSuccess('Excel spreadsheet downloaded successfully.');
    } catch (err) {
      console.error(err);
      toastError('Could not download Excel sheet.');
    } finally {
      setDownloadingExcel(false);
    }
  };

  // Formatted Full Display Text for Live Preview
  const previewText = `${formData.item_name || 'Rice'}${
    formData.specification ? ` - ${formData.specification}` : ' - 25 KG'
  } - ${formData.quantity || 10} ${formData.unit || 'bags'}`;

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-100">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Store Requirements</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {counts.total} Demands
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Staff & Owner purchase requisitions (e.g. <strong>Rice - 25 KG - 10 bags</strong>) with 1-click Excel export.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">


          <button
            onClick={handleDownloadExcel}
            disabled={downloadingExcel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition active:scale-[0.98] disabled:opacity-60"
            title="Download full store requirements as an Excel (.xlsx) file"
          >
            {downloadingExcel ? <Spinner size="sm" /> : <FileSpreadsheet className="w-4 h-4" />}
            <span>{downloadingExcel ? 'Generating Excel...' : 'Download Excel Sheet'}</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Required Item</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Items</p>
          <p className="text-lg sm:text-xl font-extrabold font-mono text-slate-800 mt-1">{counts.total}</p>
          <span className="text-[10px] text-slate-400">All registered demands</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Pending Review</p>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-lg sm:text-xl font-extrabold font-mono text-amber-800 mt-1">{counts.pending}</p>
          <span className="text-[10px] text-amber-600 font-medium">Awaiting Owner action</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-indigo-200 bg-indigo-50/20 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Approved</p>
            <CheckCircle2 className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-lg sm:text-xl font-extrabold font-mono text-indigo-900 mt-1">{counts.approved}</p>
          <span className="text-[10px] text-indigo-600 font-medium">Ready for supplier PO</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Ordered</p>
            <Truck className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-lg sm:text-xl font-extrabold font-mono text-blue-900 mt-1">{counts.ordered}</p>
          <span className="text-[10px] text-blue-600 font-medium">In transit / Placed</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Fulfilled</p>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-lg sm:text-xl font-extrabold font-mono text-emerald-900 mt-1">{counts.fulfilled}</p>
          <span className="text-[10px] text-emerald-700 font-medium">Restocked in store</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items, packaging (e.g. 25 KG), requester..."
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
          />
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {['All', 'Pending', 'Approved', 'Ordered', 'Fulfilled'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="All">All Priorities</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* Requirements Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <TableSkeleton rows={7} cols={6} />
        ) : requirements.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <ClipboardList className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">No Store Requirements Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No items matching your current filters. Add a requirement like <strong>Rice - 25 KG - 10 bags</strong> to track restocks.
            </p>
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add First Requirement</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4 min-w-[240px]">Required Item & Specification</th>
                  <th className="py-3 px-4 text-center">Quantity & Packaging</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Priority</th>
                  <th className="py-3 px-4">Preferred Vendor</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Requested By</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requirements.map((item, idx) => {
                  const fullDesc = `${item.item_name}${item.specification ? ` - ${item.specification}` : ''} - ${item.quantity} ${item.unit}`;
                  const isFulfilled = item.status === 'Fulfilled';
                  const isPending = item.status === 'Pending';
                  const isUnviewed = isOwner
                    ? (!item.viewed_by_owner || item.viewed_by_owner === 0)
                    : (!item.viewed_by_staff || item.viewed_by_staff === 0);

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        isUnviewed
                          ? 'bg-amber-50/40 hover:bg-amber-50/70 border-l-4 border-l-amber-500'
                          : 'hover:bg-slate-50/60'
                      }`}
                    >
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">{idx + 1}</td>

                      {/* Item & Specification */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-slate-900 text-sm">{item.item_name}</span>
                            {item.specification && (
                              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-[11px]">
                                {item.specification}
                              </span>
                            )}
                            {isUnviewed && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-500 text-white shadow-xs">
                                {isOwner ? '● Staff Update' : '● Update'}
                              </span>
                            )}
                          </div>
                          {/* User Example formatted demand representation */}
                          <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                            <span className="text-slate-400">Demand:</span>
                            <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                              {fullDesc}
                            </span>
                          </div>
                          {item.notes && (
                            <p className="text-[11px] text-slate-400 italic">“{item.notes}”</p>
                          )}
                        </div>
                      </td>

                      {/* Quantity & Packaging */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                          <span className="font-black text-slate-900 text-sm font-mono">{item.quantity}</span>
                          <span className="text-slate-600 font-bold text-xs">{item.unit || 'bags'}</span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-3">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium text-[11px]">
                          {item.category_name || 'General'}
                        </span>
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider inline-block ${
                            item.priority === 'Urgent'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : item.priority === 'High'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : item.priority === 'Medium'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.priority}
                        </span>
                      </td>

                      {/* Preferred Vendor */}
                      <td className="py-3.5 px-4">
                        <span className="text-slate-700 font-medium text-xs">
                          {item.preferred_vendor_name || '—'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {isOwner ? (
                          /* Owner Quick Status Toggle Dropdown */
                          <select
                            value={item.status}
                            onChange={(e) => handleStatusChange(item, e.target.value)}
                            className={`text-xs font-bold rounded-lg px-2.5 py-1 border transition focus:outline-none ${
                              item.status === 'Fulfilled'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : item.status === 'Ordered'
                                ? 'bg-blue-50 text-blue-800 border-blue-300'
                                : item.status === 'Approved'
                                ? 'bg-indigo-50 text-indigo-800 border-indigo-300'
                                : 'bg-amber-50 text-amber-800 border-amber-300'
                            }`}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Approved">Approved</option>
                            <option value="Ordered">Ordered</option>
                            <option value="Fulfilled">Fulfilled</option>
                          </select>
                        ) : (
                          /* Staff read-only status badge */
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border inline-block ${
                              item.status === 'Fulfilled'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : item.status === 'Ordered'
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : item.status === 'Approved'
                                ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {item.status}
                          </span>
                        )}
                      </td>

                      {/* Requested By */}
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-bold text-slate-800 text-xs">{item.requested_by_name || 'Staff'}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(item.created_at)}</p>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isUnviewed && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (markRequirementViewed) {
                                  await markRequirementViewed(item.id);
                                  fetchRequirements();
                                }
                              }}
                              className="p-1.5 text-amber-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                              title="Mark as viewed (dismiss indicator)"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {isOwner ? (
                            <>
                              <button
                                onClick={() => handleOpenEdit(item)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                title="Edit Requirement"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDelete(item)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Delete Requirement"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium px-2 py-0.5 rounded bg-slate-100">
                              View Only
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =========================================================================
          ADD / EDIT REQUIRED ITEM MODAL
          ========================================================================= */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/50 backdrop-blur-xs overscroll-contain"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div
            className="bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full max-h-[90vh] sm:max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 1. FIXED MODAL HEADER */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-100 bg-slate-50/70 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <ClipboardList className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {editingItem ? 'Edit Store Requirement' : 'Add Required Item'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {editingItem
                      ? 'Update specifications, quantity, or restock status'
                      : 'Add restock demands (e.g. Rice - 25 KG - 10 bags)'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition cursor-pointer"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 2. FORM WRAPPER WITH SCROLLABLE BODY AND FIXED FOOTER */}
            <form
              id="requirement-form"
              onSubmit={handleSubmit}
              className="flex flex-col flex-1 min-h-0 overflow-hidden"
            >
              {/* Scrollable Form Body */}
              <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto overscroll-contain flex-1 focus:outline-none">
                {/* Dynamic Live Preview Banner */}
                <div className="p-2.5 sm:p-3 rounded-xl bg-indigo-50/80 border border-indigo-200 flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] uppercase font-extrabold text-indigo-600 tracking-wider">
                        Store Requisition Format Preview
                      </p>
                      {editingItem && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                          Editing #{editingItem.id}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-black text-indigo-950 font-mono truncate mt-0.5">
                      {previewText}
                    </p>
                  </div>
                </div>

                {/* Item Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Item Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rice, Sunflower Oil, Sugar, A4 Paper..."
                    value={formData.item_name}
                    onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-900 transition"
                  />
                </div>

                {/* Packaging / Specification (Weight / Volume / Size) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span>Packaging / Specification (Weight / Volume / Size)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAddSpecInput((prev) => !prev)}
                      className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                      title="Add new custom weight or size if not present in the list"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Weight</span>
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. 25 KG, 15 L Tin, 500 ml, 75 GSM..."
                      value={formData.specification}
                      onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                      className="w-full text-xs pl-3 pr-20 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-900 transition"
                    />
                    {formData.specification && !allSpecs.includes(formData.specification.trim()) && (
                      <button
                        type="button"
                        onClick={() => handleAddNewSpec(formData.specification.trim())}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition cursor-pointer"
                        title="Save this weight into suggestions"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Save</span>
                      </button>
                    )}
                  </div>

                  {/* Inline Quick Add Input if toggled */}
                  {showAddSpecInput && (
                    <div className="flex items-center gap-1.5 mt-2 bg-indigo-50/90 p-2 rounded-xl border border-indigo-200 animate-in fade-in duration-100">
                      <span className="text-[11px] font-bold text-indigo-800 whitespace-nowrap">New Weight/Size:</span>
                      <input
                        type="text"
                        autoFocus
                        placeholder="e.g. 30 KG, 75 KG, 200 g, 2 L..."
                        value={newCustomSpec}
                        onChange={(e) => setNewCustomSpec(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddNewSpec();
                          }
                        }}
                        className="text-xs px-2.5 py-1.5 bg-white border border-indigo-200 rounded-lg flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddNewSpec()}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-2xs transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddSpecInput(false)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Quick suggestions pills with controlled max-height to avoid vertical bloat */}
                  <div className="mt-2 p-2 bg-slate-50/80 rounded-xl border border-slate-200/60">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        Quick Weight Suggestions:
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAddSpecInput(true)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                        title="Add custom weight or size if not present in the list"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ Custom Weight</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap max-h-20 overflow-y-auto pr-1">
                      {allSpecs.map((spec) => {
                        const isSelected = formData.specification === spec;
                        return (
                          <button
                            type="button"
                            key={spec}
                            onClick={() => setFormData({ ...formData, specification: spec })}
                            className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                                : 'bg-white hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border-slate-200'
                            }`}
                          >
                            {spec}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Quantity & Unit Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Quantity Needed <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      required
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold font-mono text-slate-900 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Unit / Measure <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 transition"
                    >
                      {COMMON_UNITS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Priority & Category Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Priority / Urgency</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800 transition"
                    >
                      <option value="Urgent">Urgent (Immediate restock)</option>
                      <option value="High">High (Low stock in store)</option>
                      <option value="Medium">Medium (Regular replenishment)</option>
                      <option value="Low">Low (Future reserve)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Store Category</label>
                    <select
                      value={formData.category_id}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 transition"
                    >
                      <option value="">-- Select Category --</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.category_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Preferred Vendor & Estimated Price */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Preferred Supplier / Vendor</label>
                    <select
                      value={formData.preferred_vendor_id}
                      onChange={(e) => setFormData({ ...formData, preferred_vendor_id: e.target.value })}
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 transition"
                    >
                      <option value="">-- Any / Unassigned --</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>{v.vendor_name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Est. Unit Price (Optional)</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Rs. 0.00"
                      value={formData.estimated_price}
                      onChange={(e) => setFormData({ ...formData, estimated_price: e.target.value })}
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium font-mono text-slate-900 transition"
                    />
                  </div>
                </div>

                {/* Status (if editing) */}
                {editingItem && isOwner && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Requirement Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 transition"
                    >
                      <option value="Pending">Pending (Awaiting Review)</option>
                      <option value="Approved">Approved (Create PO)</option>
                      <option value="Ordered">Ordered (In Transit)</option>
                      <option value="Fulfilled">Fulfilled (Restocked)</option>
                    </select>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Reason for Restock</label>
                  <textarea
                    rows="2"
                    placeholder="e.g. Fast selling item, customer demand, low stock in storage room..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 transition resize-none"
                  />
                </div>
              </div>

              {/* 3. FIXED PINNED FOOTER - ALWAYS 100% VISIBLE, NEVER CUT OFF */}
              <div className="flex-shrink-0 bg-slate-50 border-t border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 z-10 shadow-xs">
                <div className="min-w-0 hidden sm:block">
                  <span className="text-[11px] text-slate-500 font-medium">Requisition: </span>
                  <span className="text-[11px] font-mono font-bold text-slate-800 truncate">
                    {formData.item_name
                      ? `${formData.item_name} ${formData.specification ? `(${formData.specification})` : ''} - ${formData.quantity} ${formData.unit}`
                      : 'Enter item details'}
                  </span>
                </div>
                <div className="flex items-center gap-2 sm:gap-2.5 ml-auto">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition disabled:opacity-50 cursor-pointer active:scale-95"
                  >
                    {submitting && <Spinner size="sm" />}
                    <span>{editingItem ? 'Save Changes' : 'Add to Requisition'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
