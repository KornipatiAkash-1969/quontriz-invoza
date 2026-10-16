import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';
import { vendorApi } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import { PageLoader } from '../components/ui';
import { useToast } from '../context/ToastContext';

export default function VendorDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { error: toastError } = useToast();

  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState(null);
  const [activeTab, setActiveTab] = useState('invoices'); // 'invoices' | 'items'

  useEffect(() => {
    async function fetchVendor() {
      setLoading(true);
      try {
        const res = await vendorApi.getById(id);
        setVendor(res.data);
      } catch (err) {
        toastError(err.message || 'Vendor not found.');
      } finally {
        setLoading(false);
      }
    }
    fetchVendor();
  }, [id]);

  if (loading) {
    return (
      <PageLoader message="Loading vendor details..." subtitle="Retrieving supplier account and purchase history" />
    );
  }

  if (!vendor) {
    return (
      <div className="py-16 text-center space-y-4">
        <h3 className="text-lg font-bold text-slate-800">Vendor not found</h3>
        <button
          onClick={() => navigate('/vendors')}
          className="text-xs font-semibold text-indigo-600 hover:underline"
        >
          ← Return to Vendors
        </button>
      </div>
    );
  }

  const invoices = vendor.invoices || [];
  const items = vendor.items || [];
  const stats = vendor.stats || {};

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Navigation */}
      <button
        onClick={() => navigate('/vendors')}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Vendors</span>
      </button>

      {/* Vendor Profile Header Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-lg flex-shrink-0">
              {vendor.vendor_name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  {vendor.vendor_name}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {vendor.vendor_type || 'General Supplier'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                GSTIN: <span className="font-bold text-slate-700">{vendor.gstin || 'Not provided'}</span>
              </p>
              {vendor.address && (
                <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span>{vendor.address}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Spend
            </span>
            <span className="text-lg sm:text-xl font-extrabold font-mono text-indigo-700">
              {formatCurrency(stats.totalSpent)}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              {stats.totalInvoices} Invoices recorded
            </span>
          </div>
        </div>

        {/* Contact and Notes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 text-xs">
          <div className="flex items-center gap-2.5 text-slate-700">
            <Phone className="w-4 h-4 text-slate-400" />
            <span>{vendor.contact || 'No phone number'}</span>
          </div>
          <div className="flex items-center gap-2.5 text-slate-700">
            <Mail className="w-4 h-4 text-slate-400" />
            <span>{vendor.email || 'No email registered'}</span>
          </div>
          <div className="text-slate-500 truncate">
            <span className="font-semibold text-slate-700">Notes:</span> {vendor.notes || '—'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`py-3 px-6 text-xs sm:text-sm font-bold border-b-2 transition ${
            activeTab === 'invoices'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Invoice History ({invoices.length})
        </button>
        <button
          onClick={() => setActiveTab('items')}
          className={`py-3 px-6 text-xs sm:text-sm font-bold border-b-2 transition ${
            activeTab === 'items'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Purchased Products ({items.length})
        </button>
      </div>

      {/* Tab 1: Invoices */}
      {activeTab === 'invoices' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          {invoices.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No invoices recorded for this vendor yet.
            </div>
          ) : (
            <>
              {/* Desktop / Tablet Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/70">
                      <th className="py-3 px-6">Invoice #</th>
                      <th className="py-3 px-6">Date</th>
                      <th className="py-3 px-6">Items</th>
                      <th className="py-3 px-6">Total Amount</th>
                      <th className="py-3 px-6">Status</th>
                      <th className="py-3 px-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-6 font-bold text-slate-900">
                          {inv.invoice_number}
                        </td>
                        <td className="py-3.5 px-6 text-slate-600">
                          {formatDate(inv.invoice_date || inv.created_at)}
                        </td>
                        <td className="py-3.5 px-6">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                            {inv.items_count || 0} items
                          </span>
                        </td>
                        <td className="py-3.5 px-6 font-extrabold text-slate-900">
                          <div>{formatCurrency(inv.total)}</div>
                          {Number(inv.total_gst || inv.tax) > 0 ? (
                            <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              GST: +{formatCurrency(inv.total_gst || inv.tax)}
                            </span>
                          ) : null}
                        </td>
                        <td className="py-3.5 px-6">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                              inv.status === 'Approved'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {inv.status || 'Approved'}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <button
                            onClick={() => navigate(`/invoices/${inv.id}`)}
                            className="px-3 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View (< md) */}
              <div className="md:hidden divide-y divide-slate-100 p-3 space-y-3">
                {invoices.map((inv) => (
                  <div key={inv.id} className="pt-3 first:pt-0 space-y-2 rounded-xl p-3 border border-slate-100 bg-white">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-slate-900 text-sm">{inv.invoice_number}</span>
                        <p className="text-[10px] text-slate-400">{formatDate(inv.invoice_date || inv.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-slate-900 text-sm">{formatCurrency(inv.total)}</p>
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {inv.status || 'Approved'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                      <span className="text-slate-500">{inv.items_count || 0} items</span>
                      <button
                        type="button"
                        onClick={() => navigate(`/invoices/${inv.id}`)}
                        className="text-xs font-bold text-indigo-600 hover:underline"
                      >
                        View Invoice →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab 2: Aggregated Items */}
      {activeTab === 'items' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          {items.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No product items purchased from this vendor yet.
            </div>
          ) : (
            <>
              {/* Desktop / Tablet Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/70">
                      <th className="py-3 px-6">Product / Item Name</th>
                      <th className="py-3 px-6">Category</th>
                      <th className="py-3 px-6">Total Quantity</th>
                      <th className="py-3 px-6">Avg Price</th>
                      <th className="py-3 px-6">Orders Count</th>
                      <th className="py-3 px-6 text-right">Total Spend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-6 font-bold text-slate-800">{it.item_name}</td>
                        <td className="py-3.5 px-6">
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium text-[11px]">
                            {it.category_name || 'Other'}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 font-semibold text-slate-700">
                          {it.total_quantity} {it.unit || 'pcs'}
                        </td>
                        <td className="py-3.5 px-6 text-slate-600">
                          {formatCurrency(it.avg_price)}
                        </td>
                        <td className="py-3.5 px-6 text-slate-500">
                          {it.order_frequency} orders
                        </td>
                        <td className="py-3.5 px-6 text-right font-extrabold text-slate-900">
                          {formatCurrency(it.total_spent)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View (< md) */}
              <div className="md:hidden divide-y divide-slate-100 p-3 space-y-3">
                {items.map((it, idx) => (
                  <div key={idx} className="pt-3 first:pt-0 space-y-2 rounded-xl p-3 border border-slate-100 bg-white">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-900 text-sm truncate">{it.item_name}</p>
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 mt-1">
                          {it.category_name || 'Other'}
                        </span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-black text-slate-900 text-sm">{formatCurrency(it.total_spent)}</p>
                        <span className="text-[10px] text-slate-400">{it.order_frequency} orders</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                      <span>Total: {it.total_quantity} {it.unit || 'pcs'}</span>
                      <span>Avg: {formatCurrency(it.avg_price)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
