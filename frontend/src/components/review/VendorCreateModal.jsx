import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { vendorApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

export default function VendorCreateModal({ isOpen, onClose, initialData, vendorTypes = [], onVendorCreated }) {
  const { isOwner } = useAuth();
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    vendor_name: initialData?.vendor_name || '',
    vendor_type: initialData?.vendor_type || 'General Supplier',
    contact: initialData?.contact || '',
    email: initialData?.email || '',
    address: initialData?.address || '',
    gstin: initialData?.gstin || '',
    notes: initialData?.notes || 'Created during invoice OCR review',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.vendor_name.trim()) {
      toastError('Vendor name is required.');
      return;
    }

    setLoading(true);
    try {
      const res = await vendorApi.create(formData);
      success('Vendor created successfully!');
      if (onVendorCreated) onVendorCreated(res.data);
      onClose();
    } catch (err) {
      toastError(err.message || 'Failed to create vendor.');
    } finally {
      setLoading(false);
    }
  };

  const focusClass = isOwner
    ? 'focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600'
    : 'focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Vendor"
      maxWidth="max-w-lg"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className={`px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-xs transition disabled:opacity-50 ${
              isOwner
                ? 'bg-indigo-600 hover:bg-indigo-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {loading ? 'Creating...' : 'Create Vendor'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Vendor Name *</label>
          <input
            type="text"
            name="vendor_name"
            required
            value={formData.vendor_name}
            onChange={handleChange}
            className={`w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none ${focusClass}`}
            placeholder="e.g. ABC Electronics Pvt Ltd"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Vendor Type</label>
            <select
              name="vendor_type"
              value={formData.vendor_type}
              onChange={handleChange}
              className={`w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white ${focusClass}`}
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
              name="gstin"
              value={formData.gstin}
              onChange={handleChange}
              className={`w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none uppercase ${focusClass}`}
              placeholder="15-character GSTIN"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone</label>
            <input
              type="text"
              name="contact"
              value={formData.contact}
              onChange={handleChange}
              className={`w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none ${focusClass}`}
              placeholder="+91..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none ${focusClass}`}
              placeholder="orders@vendor.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
          <textarea
            name="address"
            rows="2"
            value={formData.address}
            onChange={handleChange}
            className={`w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none ${focusClass}`}
            placeholder="Office / Warehouse address"
          />
        </div>
      </form>
    </Modal>
  );
}
