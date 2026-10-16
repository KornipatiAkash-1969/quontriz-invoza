import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Building2,
  Search,
  Plus,
  Eye,
  Edit2,
  Trash2,
  Phone,
  Mail,
  Receipt,
  TrendingUp,
  MapPin,
  X,
  Layers
} from 'lucide-react';
import { vendorApi, vendorTypeApi } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import { TableSkeleton } from '../components/ui';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Modal from '../components/ui/Modal';
import { useToast } from '../context/ToastContext';

export default function VendorsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { success: toastSuccess, error: toastError } = useToast();

  const typeFromUrl = searchParams.get('type') || '';

  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState([]);
  const [vendorTypes, setVendorTypes] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState(typeFromUrl);

  // Sync selectedType when URL changes
  useEffect(() => {
    setSelectedType(typeFromUrl);
  }, [typeFromUrl]);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [formData, setFormData] = useState({
    vendor_name: '',
    vendor_type: 'General Supplier',
    contact: '',
    email: '',
    address: '',
    gstin: '',
    notes: '',
  });

  // Delete state
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const [vRes, vtRes] = await Promise.all([
        vendorApi.getAll({ search, type: selectedType || undefined }),
        vendorTypeApi.getAll(),
      ]);
      setVendors(vRes.data || []);
      setVendorTypes(vtRes.data || []);
    } catch (err) {
      toastError(err.message || 'Failed to fetch vendors.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [search, selectedType]);

  const handleOpenCreate = () => {
    setEditingVendor(null);
    setFormData({
      vendor_name: '',
      vendor_type: vendorTypes[0]?.type_name || 'General Supplier',
      contact: '',
      email: '',
      address: '',
      gstin: '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (vendor) => {
    setEditingVendor(vendor);
    setFormData({
      vendor_name: vendor.vendor_name,
      vendor_type: vendor.vendor_type || 'General Supplier',
      contact: vendor.contact || '',
      email: vendor.email || '',
      address: vendor.address || '',
      gstin: vendor.gstin || '',
      notes: vendor.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.vendor_name.trim()) {
      toastError('Vendor name is required.');
      return;
    }

    try {
      if (editingVendor) {
        await vendorApi.update(editingVendor.id, formData);
        toastSuccess('Vendor updated successfully.');
      } else {
        await vendorApi.create(formData);
        toastSuccess('Vendor created successfully.');
      }
      setIsModalOpen(false);
      fetchVendors();
    } catch (err) {
      toastError(err.message || 'Operation failed.');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await vendorApi.delete(deleteId);
      toastSuccess('Vendor deleted.');
      setDeleteId(null);
      fetchVendors();
    } catch (err) {
      toastError(err.message || 'Failed to delete vendor.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div data-tour="vendors-header" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Vendor Management</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your supermarket suppliers, track purchasing volume, and review vendor orders.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm transition active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Vendor</span>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          {/* Search Box */}
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search vendor by name, GSTIN, or supplier type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
            />
          </div>

          {/* Vendor Type Filter Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={selectedType}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedType(val);
                if (val) {
                  setSearchParams({ type: val });
                } else {
                  setSearchParams({});
                }
              }}
              className="px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none bg-white font-medium text-slate-700"
            >
              <option value="">All Vendor Types</option>
              {vendorTypes.map((vt) => (
                <option key={vt.id} value={vt.type_name}>
                  {vt.type_name} ({vt.vendor_count || 0})
                </option>
              ))}
            </select>
          </div>

          {/* Active Filter Pill */}
          {selectedType && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-semibold">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span>Type: {selectedType}</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedType('');
                  setSearchParams({});
                }}
                className="hover:text-indigo-900 p-0.5 rounded-full hover:bg-indigo-100 transition"
                title="Clear filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
          {vendors.length} {vendors.length === 1 ? 'vendor' : 'vendors'} found
        </span>
      </div>

      {/* Vendors Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        {loading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : vendors.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            No vendors found. Add your first vendor or upload an invoice to detect automatically.
          </div>
        ) : (
          <>
            {/* Desktop / Tablet Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/70">
                    <th className="py-2.5 px-3 sm:px-4">Vendor Name</th>
                    <th className="py-2.5 px-3 sm:px-4">Vendor Type</th>
                    <th className="py-2.5 px-3 sm:px-4">GSTIN</th>
                    <th className="py-2.5 px-3 sm:px-4">Total Invoices</th>
                    <th className="py-2.5 px-3 sm:px-4">Total Purchase Amount</th>
                    <th className="py-2.5 px-3 sm:px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vendors.map((vendor) => (
                    <tr key={vendor.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 sm:px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">
                            {vendor.vendor_name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-xs sm:text-sm">{vendor.vendor_name}</p>
                            {vendor.contact && (
                              <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{vendor.contact}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 sm:px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {vendor.vendor_type || 'General Supplier'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 sm:px-4 font-mono text-slate-700 font-medium">
                        {vendor.gstin || '—'}
                      </td>
                      <td className="py-2.5 px-3 sm:px-4">
                        <span className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[11px]">
                          {vendor.total_invoices || 0} invoices
                        </span>
                      </td>
                      <td className="py-2.5 px-3 sm:px-4 font-extrabold text-slate-900 text-xs sm:text-sm">
                        {formatCurrency(vendor.total_purchase_amount)}
                      </td>
                      <td className="py-2.5 px-3 sm:px-4 text-right space-x-1">
                        <button
                          onClick={() => navigate(`/vendors/${vendor.id}`)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="View Vendor Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(vendor)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit Vendor"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(vendor.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Delete Vendor"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View (< md) */}
            <div className="md:hidden divide-y divide-slate-100 p-3 space-y-3.5">
              {vendors.map((vendor) => (
                <div
                  key={vendor.id}
                  className="pt-3.5 first:pt-0 space-y-3 rounded-2xl p-3 border border-slate-200/80 bg-white shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {vendor.vendor_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 text-sm truncate">{vendor.vendor_name}</p>
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 mt-0.5">
                          {vendor.vendor_type || 'General Supplier'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="font-black text-slate-900 text-sm">
                        {formatCurrency(vendor.total_purchase_amount)}
                      </p>
                      <span className="text-[10px] text-indigo-600 font-bold">
                        {vendor.total_invoices || 0} invoices
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex-wrap gap-2">
                    <span className="font-mono text-slate-600 text-[10px]">
                      GSTIN: {vendor.gstin || 'None'}
                    </span>
                    {vendor.contact && (
                      <span className="flex items-center gap-1 text-[11px]">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{vendor.contact}</span>
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => navigate(`/vendors/${vendor.id}`)}
                      className="py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 min-touch-target"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Profile</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(vendor)}
                      className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1 min-touch-target"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteId(vendor.id)}
                      className="py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1 min-touch-target"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Vendor Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingVendor ? 'Edit Vendor Profile' : 'Add New Vendor'}
        maxWidth="max-w-lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
            >
              {editingVendor ? 'Update Vendor' : 'Create Vendor'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Vendor Name *
            </label>
            <input
              type="text"
              required
              value={formData.vendor_name}
              onChange={(e) => setFormData((p) => ({ ...p, vendor_name: e.target.value }))}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
              placeholder="Vendor Business Name"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Vendor Type
              </label>
              <select
                value={formData.vendor_type}
                onChange={(e) => setFormData((p) => ({ ...p, vendor_type: e.target.value }))}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none bg-white"
              >
                {vendorTypes.map((vt) => (
                  <option key={vt.id || vt.type_name} value={vt.type_name}>
                    {vt.type_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN</label>
              <input
                type="text"
                value={formData.gstin}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, gstin: e.target.value.toUpperCase() }))
                }
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none font-mono uppercase"
                placeholder="15-character GSTIN"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contact Phone
              </label>
              <input
                type="text"
                value={formData.contact}
                onChange={(e) => setFormData((p) => ({ ...p, contact: e.target.value }))}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
                placeholder="+91..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
                placeholder="orders@supplier.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
            <textarea
              rows="2"
              value={formData.address}
              onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
              placeholder="Warehouse / Office address"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
              placeholder="Payment terms, delivery days, etc."
            />
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Vendor"
        message="Are you sure you want to delete this vendor? Invoices from this vendor will remain in the database."
        confirmText="Delete Vendor"
        isDanger={true}
        loading={deleting}
      />
    </div>
  );
}
