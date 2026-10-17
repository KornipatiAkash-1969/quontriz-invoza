import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  Plus,
  Building2,
  ArrowRight,
  Search,
  ExternalLink,
  Phone,
  Mail
} from 'lucide-react';
import { vendorTypeApi } from '../services/api';
import { Spinner, CardSkeleton, RotatingLoader } from '../components/ui';
import Modal from '../components/ui/Modal';
import { useToast } from '../context/ToastContext';
import { formatCurrency } from '../utils/formatters';

export default function VendorTypesPage() {
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError } = useToast();

  const [loading, setLoading] = useState(true);
  const [types, setTypes] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [typeName, setTypeName] = useState('');

  // Selected Vendor Type Details State
  const [selectedType, setSelectedType] = useState(null);
  const [typeVendors, setTypeVendors] = useState([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [showVendorsModal, setShowVendorsModal] = useState(false);
  const [vendorSearch, setVendorSearch] = useState('');

  const fetchTypes = async () => {
    setLoading(true);
    try {
      const res = await vendorTypeApi.getAll();
      setTypes(res.data || []);
    } catch (err) {
      toastError(err.message || 'Failed to fetch vendor types.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!typeName.trim()) {
      toastError('Vendor type name is required.');
      return;
    }

    try {
      await vendorTypeApi.create({ type_name: typeName.trim() });
      toastSuccess('Vendor type created successfully.');
      setTypeName('');
      setIsModalOpen(false);
      fetchTypes();
    } catch (err) {
      toastError(err.message || 'Failed to create vendor type.');
    }
  };

  // When owner clicks on a particular vendor type card
  const handleSelectType = async (vt) => {
    setSelectedType(vt);
    setShowVendorsModal(true);
    setLoadingVendors(true);
    setVendorSearch('');
    try {
      const res = await vendorTypeApi.getVendorsByType(vt.type_name);
      setTypeVendors(res.data?.vendors || []);
    } catch (err) {
      toastError(err.message || 'Failed to load vendors for this type.');
      setTypeVendors([]);
    } finally {
      setLoadingVendors(false);
    }
  };

  // Filter vendors in modal
  const filteredVendors = typeVendors.filter((v) => {
    if (!vendorSearch.trim()) return true;
    const q = vendorSearch.toLowerCase();
    return (
      (v.vendor_name && v.vendor_name.toLowerCase().includes(q)) ||
      (v.gstin && v.gstin.toLowerCase().includes(q)) ||
      (v.email && v.email.toLowerCase().includes(q)) ||
      (v.contact && v.contact.toLowerCase().includes(q)) ||
      (v.address && v.address.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Vendor Types</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {types.length} Classifications
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Supplier industry classifications. Click on any type to view all associated supermarket suppliers.
          </p>
        </div>

        <button
          onClick={() => {
            setTypeName('');
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm transition active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>Add Vendor Type</span>
        </button>
      </div>

      {/* Grid of Vendor Types */}
      {loading ? (
        <CardSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {types.map((vt) => {
            const count = vt.vendor_count || 0;
            return (
              <div
                key={vt.id}
                onClick={() => handleSelectType(vt)}
                className="group bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:border-indigo-400 hover:shadow-md hover:-translate-y-0.5 cursor-pointer transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      <Layers className="w-5 h-5" />
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border transition ${
                        count > 0
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      {count} {count === 1 ? 'vendor' : 'vendors'}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base group-hover:text-indigo-600 transition">
                    {vt.type_name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Supplier category classification</p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600 group-hover:text-indigo-700">
                  <span>View All Vendors</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View All Vendors in Selected Type Modal */}
      {showVendorsModal && selectedType && (
        <Modal
          isOpen={showVendorsModal}
          onClose={() => setShowVendorsModal(false)}
          title={
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-base">{selectedType.type_name}</h3>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {typeVendors.length} {typeVendors.length === 1 ? 'supplier' : 'suppliers'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-normal">
                  All vendors registered under this supplier classification
                </p>
              </div>
            </div>
          }
          maxWidth="max-w-4xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={() => {
                  setShowVendorsModal(false);
                  navigate(`/vendors?type=${encodeURIComponent(selectedType.type_name)}`);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open in Vendors Directory</span>
              </button>

              <button
                type="button"
                onClick={() => setShowVendorsModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition"
              >
                Close
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Search within this vendor type */}
            {typeVendors.length > 2 && (
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder={`Search among ${typeVendors.length} ${selectedType.type_name} vendors...`}
                  value={vendorSearch}
                  onChange={(e) => setVendorSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
                />
              </div>
            )}

            {loadingVendors ? (
              <div className="py-12 flex flex-col items-center justify-center">
                <RotatingLoader size="md" text="Loading suppliers..." subtitle="Retrieving supplier accounts for this tier" />
              </div>
            ) : filteredVendors.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <Building2 className="w-10 h-10 mx-auto text-slate-300" />
                <div>
                  <h4 className="text-sm font-bold text-slate-800">No suppliers found</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {vendorSearch
                      ? 'No vendors match your search keywords.'
                      : `No vendors have been assigned to "${selectedType.type_name}" yet.`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowVendorsModal(false);
                    navigate('/vendors');
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register New Supplier</span>
                </button>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto border border-slate-200/80 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Supplier Name</th>
                        <th className="py-3 px-4">Contact Info</th>
                        <th className="py-3 px-4">GSTIN & Address</th>
                        <th className="py-3 px-4">Invoices</th>
                        <th className="py-3 px-4">Total Purchases</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredVendors.map((vendor) => (
                        <tr key={vendor.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                {vendor.vendor_name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 hover:text-indigo-600 cursor-pointer" onClick={() => {
                                  setShowVendorsModal(false);
                                  navigate(`/vendors/${vendor.id}`);
                                }}>
                                  {vendor.vendor_name}
                                </p>
                                <span className="text-[10px] text-slate-400">ID #{vendor.id}</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-slate-600">
                            <div className="space-y-0.5">
                              {vendor.contact && (
                                <div className="flex items-center gap-1 text-[11px]">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  <span>{vendor.contact}</span>
                                </div>
                              )}
                              {vendor.email && (
                                <div className="flex items-center gap-1 text-[11px]">
                                  <Mail className="w-3 h-3 text-slate-400" />
                                  <span>{vendor.email}</span>
                                </div>
                              )}
                              {!vendor.contact && !vendor.email && (
                                <span className="text-slate-400 italic text-[11px]">No contact details</span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <p className="font-mono text-[11px] font-semibold text-slate-700">
                              {vendor.gstin || '—'}
                            </p>
                            {vendor.address && (
                              <p className="text-[10px] text-slate-400 truncate max-w-[180px]" title={vendor.address}>
                                {vendor.address}
                              </p>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                              {vendor.total_invoices || 0} bills
                            </span>
                          </td>

                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {formatCurrency(vendor.total_purchase_amount || 0)}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setShowVendorsModal(false);
                                  navigate(`/vendors/${vendor.id}`);
                                }}
                                className="px-2.5 py-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition"
                                title="View vendor details and purchase analytics"
                              >
                                Profile
                              </button>
                              <button
                                onClick={() => {
                                  setShowVendorsModal(false);
                                  navigate(`/invoices?search=${encodeURIComponent(vendor.vendor_name)}`);
                                }}
                                className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                                title="View invoices from this vendor"
                              >
                                Invoices
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div className="md:hidden space-y-3">
                  {filteredVendors.map((vendor) => (
                    <div
                      key={vendor.id}
                      className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {vendor.vendor_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p
                              className="font-bold text-slate-900 text-sm truncate hover:text-indigo-600 cursor-pointer"
                              onClick={() => {
                                setShowVendorsModal(false);
                                navigate(`/vendors/${vendor.id}`);
                              }}
                            >
                              {vendor.vendor_name}
                            </p>
                            <span className="text-[10px] text-slate-400">ID #{vendor.id}</span>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-700 font-semibold text-[10px] flex-shrink-0">
                          {vendor.total_invoices || 0} bills
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200/70">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Total Spend</span>
                          <span className="font-extrabold text-slate-900 text-xs">
                            {formatCurrency(vendor.total_purchase_amount || 0)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">GSTIN</span>
                          <span className="font-mono text-[11px] font-semibold text-slate-700 truncate block">
                            {vendor.gstin || '—'}
                          </span>
                        </div>
                      </div>

                      {(vendor.contact || vendor.email) && (
                        <div className="text-[11px] text-slate-600 space-y-1 bg-white p-2 rounded-xl border border-slate-200/60">
                          {vendor.contact && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{vendor.contact}</span>
                            </div>
                          )}
                          {vendor.email && (
                            <div className="flex items-center gap-1.5 truncate">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span className="truncate">{vendor.email}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setShowVendorsModal(false);
                            navigate(`/vendors/${vendor.id}`);
                          }}
                          className="flex-1 py-2 text-center text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition"
                        >
                          View Profile
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowVendorsModal(false);
                            navigate(`/invoices?search=${encodeURIComponent(vendor.vendor_name)}`);
                          }}
                          className="flex-1 py-2 text-center text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition"
                        >
                          View Invoices
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* Add Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Vendor Type"
        maxWidth="max-w-md"
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
              onClick={handleCreate}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
            >
              Save Vendor Type
            </button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Vendor Type Name *
            </label>
            <input
              type="text"
              required
              value={typeName}
              onChange={(e) => setTypeName(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
              placeholder="e.g. Meat & Poultry Supplier, Packaging Supplier"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
