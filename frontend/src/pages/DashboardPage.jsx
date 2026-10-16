import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Building2,
  Package,
  TrendingUp,
  Clock,
  CheckCircle2,
  UploadCloud,
  ChevronRight,
  CreditCard,
  ClipboardList,
  PieChart as PieChartIcon,
  BarChart3,
  Calendar
} from 'lucide-react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Filler,
} from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';
import { dashboardApi } from '../services/api';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters';
import { CardSkeleton } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useUpdates } from '../context/UpdatesContext';
import PaymentApprovalModal from '../components/review/PaymentApprovalModal';

// Register Chart.js components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Filler
);

export default function DashboardPage() {
  const navigate = useNavigate();
  const { isOwner, loading: authLoading } = useAuth();
  const {
    staffInvoicesCount,
    pendingRequirementsCount,
  } = useUpdates();

  // Guard: Dashboard is strictly for Store Owner (wait for authLoading to resolve)
  useEffect(() => {
    if (!authLoading && !isOwner) {
      navigate('/upload', { replace: true });
    }
  }, [authLoading, isOwner, navigate]);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  // Owner approval modal state
  const [selectedInvoiceForApproval, setSelectedInvoiceForApproval] = useState(null);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);

  const loadDashboard = async () => {
    try {
      const res = await dashboardApi.getStats();
      setData(res.data || res);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && isOwner) {
      loadDashboard();
    }
  }, [authLoading, isOwner]);

  if (authLoading || loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
          <div className="space-y-2">
            <div className="h-6 w-48 bg-slate-200 rounded-lg animate-pulse" />
            <div className="h-4 w-72 bg-slate-100 rounded-md animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-24 bg-slate-200 rounded-xl animate-pulse" />
            <div className="h-9 w-28 bg-slate-200 rounded-xl animate-pulse" />
          </div>
        </div>

        {/* Shimmering KPI Metric Cards */}
        <CardSkeleton count={5} />

        {/* Shimmering Charts & Queue Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
            <div className="h-5 w-36 bg-slate-200 rounded-md animate-pulse" />
            <div className="h-48 bg-slate-100 rounded-2xl animate-pulse" />
          </div>
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
            <div className="h-5 w-48 bg-slate-200 rounded-md animate-pulse" />
            <div className="h-48 bg-slate-100 rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return null;
  }

  const metrics = data?.metrics || {};
  const recentInvoices = data?.recentInvoices || [];
  const pendingInvoicesList = data?.pendingInvoicesList || [];
  const categoryBreakdown = data?.charts?.categoryBreakdown || [];
  const vendorBreakdown = data?.charts?.vendorBreakdown || [];
  const monthlyPurchases = data?.charts?.monthlyPurchases || [];
  const paymentMethods = data?.paymentMethods || [];
  const classificationStats = data?.classificationStats || { avgConfidence: 96 };

  // Chart 1: Category Breakdown (Doughnut/Pie)
  const categoryColors = [
    '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6',
    '#8b5cf6', '#14b8a6', '#f97316', '#06b6d4', '#84cc16', '#64748b'
  ];

  const categoryChartData = {
    labels: categoryBreakdown.map((c) => c.category_name),
    datasets: [
      {
        data: categoryBreakdown.map((c) => c.total_amount),
        backgroundColor: categoryColors.slice(0, categoryBreakdown.length),
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    ],
  };

  // Chart 2: Vendor Breakdown (Horizontal Bar)
  const vendorChartData = {
    labels: vendorBreakdown.map((v) => v.vendor_name),
    datasets: [
      {
        label: 'Purchase Value (₹)',
        data: vendorBreakdown.map((v) => v.total_amount),
        backgroundColor: '#4f46e5',
        borderRadius: 8,
      },
    ],
  };

  // Chart 3: Monthly Spend Trend
  const monthlyChartData = {
    labels: monthlyPurchases.map((m) => m.month),
    datasets: [
      {
        label: 'Monthly Spend (₹)',
        data: monthlyPurchases.map((m) => m.total_amount),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#10b981',
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* ======================================================== */}
      {/* 1. STORE OWNER PAGE HEADER */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Store Dashboard
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              👑 Store Owner
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Financial oversight, supplier expenditures, and invoice approvals.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => navigate('/invoices')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200/90 shadow-2xs transition active:scale-[0.98]"
            title="View Invoices"
          >
            <FileText className="w-4 h-4 text-slate-500" />
            <span>Invoices</span>
            {staffInvoicesCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black">
                {staffInvoicesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => navigate('/requirements')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200/90 shadow-2xs transition active:scale-[0.98]"
            title="Store restock demands and purchase requisitions"
          >
            <ClipboardList className="w-4 h-4 text-slate-500" />
            <span>Required Items</span>
            {pendingRequirementsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black">
                {pendingRequirementsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => navigate('/upload')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition active:scale-[0.98]"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload / Entry</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. OWNER EXECUTIVE KPI METRICS */}
      {/* ======================================================== */}
      <div data-tour="dashboard-kpis" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Pending Invoices (Urgent Action Card) */}
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-5 text-white shadow-md shadow-amber-100 col-span-1 sm:col-span-2 md:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-100 uppercase tracking-wider">
              Pending Approval
            </span>
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Clock className="w-4 h-4 text-white" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-extrabold font-mono mt-2">
            {metrics.pendingInvoices || 0}
          </p>
          <p className="text-xs font-semibold text-amber-100 mt-1">
            {formatCurrency(metrics.pendingAmount || 0)} awaiting pay
          </p>
        </div>

        {/* Paid / Cleared Invoices */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Paid & Cleared
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-extrabold font-mono text-slate-900 mt-2">
            {metrics.approvedInvoices || 0}
          </p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1">
            {formatCurrency(metrics.approvedAmount || 0)} disbursed
          </p>
        </div>

        {/* Total Purchase Spend */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Spend
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-extrabold font-mono text-slate-900 mt-2 truncate">
            {formatCurrency(metrics.totalPurchaseValue || 0)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">All processed invoices</p>
        </div>

        {/* Active Suppliers */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Suppliers
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-extrabold font-mono text-slate-900 mt-2">
            {metrics.totalVendors || 0}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Active vendor partners</p>
        </div>

        {/* Items Classified */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Classified Items
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-extrabold font-mono text-slate-900 mt-2">
            {metrics.totalItems || 0}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            AI Accuracy: {classificationStats.avgConfidence}%
          </p>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. OWNER SECTION: ACTIONABLE PENDING APPROVALS QUEUE */}
      {/* ======================================================== */}
      <div id="pending-approvals" data-tour="pending-approvals" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <span>Pending Invoices Awaiting Owner Payment</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Staff have digitized these invoices. Review item prices and confirm payment method to finalize.
            </p>
          </div>
          {pendingInvoicesList.length > 0 && (
            <span className="px-2.5 py-1 bg-amber-100 text-amber-800 font-bold text-xs rounded-full">
              {pendingInvoicesList.length} Action Needed
            </span>
          )}
        </div>

        {pendingInvoicesList.length === 0 ? (
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-6 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-emerald-950">All Invoices Cleared!</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              There are no pending invoices awaiting payment right now. Great job keeping the ledger updated.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop / Tablet Table View */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-amber-50/60 border-b border-amber-100 text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                      <th className="py-3 px-5">Invoice #</th>
                      <th className="py-3 px-5">Vendor</th>
                      <th className="py-3 px-5">Submitted By</th>
                      <th className="py-3 px-5">Invoice Date</th>
                      <th className="py-3 px-5">Items</th>
                      <th className="py-3 px-5">Amount Due</th>
                      <th className="py-3 px-5 text-right">Approval Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingInvoicesList.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-5 font-bold text-slate-900">
                          {inv.invoice_number}
                        </td>
                        <td className="py-3.5 px-5">
                          <p className="font-semibold text-slate-800">{inv.vendor_name || 'Vendor'}</p>
                          <p className="text-[10px] text-slate-400">{inv.vendor_type || 'General'}</p>
                        </td>
                        <td className="py-3.5 px-5 text-slate-600 font-medium">
                          {inv.created_by_name || 'Store Staff'}
                        </td>
                        <td className="py-3.5 px-5 text-slate-600">
                          {formatDate(inv.invoice_date || inv.created_at)}
                        </td>
                        <td className="py-3.5 px-5">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                            {inv.items_count || 0} items
                          </span>
                        </td>
                        <td className="py-3.5 px-5">
                          <p className="font-black text-slate-950 text-sm">
                            {formatCurrency(inv.total)}
                          </p>
                          {Number(inv.total_gst || inv.tax) > 0 ? (
                            <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              GST: +{formatCurrency(inv.total_gst || inv.tax)}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 block mt-0.5">No GST</span>
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-right space-x-2">
                          <button
                            onClick={() => navigate(`/invoices/${inv.id}`)}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                          >
                            Review
                          </button>
                          <button
                            onClick={() => {
                              setSelectedInvoiceForApproval(inv);
                              setApprovalModalOpen(true);
                            }}
                            className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition active:scale-[0.98] inline-flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve & Pay</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card List View (< md) */}
            <div className="md:hidden space-y-3">
              {pendingInvoicesList.map((inv) => (
                <div
                  key={inv.id}
                  className="bg-white rounded-2xl border border-amber-200/90 p-4 shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">{inv.invoice_number}</span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                          Pending Pay
                        </span>
                      </div>
                      <p className="font-semibold text-slate-800 text-xs mt-1 truncate">{inv.vendor_name || 'Vendor'}</p>
                      <p className="text-[11px] text-slate-400">
                        {inv.vendor_type || 'General'} • By {inv.created_by_name || 'Store Staff'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-black text-slate-950 text-base">{formatCurrency(inv.total)}</p>
                      <p className="text-[10px] text-slate-400">{formatDate(inv.invoice_date || inv.created_at)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold">
                      {inv.items_count || 0} items
                    </span>
                    {Number(inv.total_gst || inv.tax) > 0 ? (
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                        GST: +{formatCurrency(inv.total_gst || inv.tax)}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[10px]">No GST</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => navigate(`/invoices/${inv.id}`)}
                      className="w-full py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition text-center min-touch-target flex items-center justify-center"
                    >
                      Review
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedInvoiceForApproval(inv);
                        setApprovalModalOpen(true);
                      }}
                      className="w-full py-2 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition text-center min-touch-target flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve & Pay</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ======================================================== */}
      {/* 4. OWNER SECTION: PAYMENT METHODS BREAKDOWN */}
      {/* ======================================================== */}
      {paymentMethods.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs">
          <h3 className="font-semibold text-slate-900 text-sm mb-1 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-indigo-600" />
            <span>Disbursement by Payment Mode</span>
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Total vendor payments executed across different banking and cash channels
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {paymentMethods.map((pm) => (
              <div
                key={pm.method}
                className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/70"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-slate-600">{pm.method}</span>
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded font-semibold">
                    {pm.count} paid
                  </span>
                </div>
                <p className="text-base font-black text-slate-900">
                  {formatCurrency(pm.amount)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. CHARTS ROW (Visible to both, key for Owner & Employee) */}
      {/* ======================================================== */}
      <div data-tour="dashboard-charts" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Purchases by Category */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-indigo-600" />
                <span>Purchases by Category</span>
              </h3>
              <span className="text-xs text-slate-400 font-medium">
                {categoryBreakdown.length} Categories
              </span>
            </div>

            {categoryBreakdown.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-12">No category data yet.</p>
            ) : (
              <div className="h-60 flex items-center justify-center relative">
                <Pie
                  data={categoryChartData}
                  options={{
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } },
                    },
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Purchases by Vendor */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                <span>Top Vendors by Spend</span>
              </h3>
              <span className="text-xs text-slate-400 font-medium">Top {vendorBreakdown.length}</span>
            </div>

            {vendorBreakdown.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-12">No vendor data yet.</p>
            ) : (
              <div className="h-60">
                <Bar
                  data={vendorChartData}
                  options={{
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { ticks: { font: { size: 9 } } },
                      y: { ticks: { font: { size: 10 } } },
                    },
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Chart 3: Monthly Purchases Trend */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>Monthly Purchases Trend</span>
              </h3>
              <span className="text-xs text-slate-400 font-medium">Timeline</span>
            </div>

            {monthlyPurchases.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-12">No trend data yet.</p>
            ) : (
              <div className="h-60">
                <Line
                  data={monthlyChartData}
                  options={{
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { ticks: { font: { size: 10 } } },
                      y: { ticks: { font: { size: 10 } } },
                    },
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 6. RECENT INVOICES TABLE */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">
              Recent Invoices & Transactions
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Latest vendor invoices with payment methods & approvals
            </p>
          </div>
          <button
            onClick={() => navigate('/invoices')}
            className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition self-start sm:self-auto"
          >
            <span>View All Invoices</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentInvoices.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No invoices uploaded yet. Click "Upload / Entry" to get started.
          </div>
        ) : (
          <>
            {/* Desktop / Tablet Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                    <th className="py-2.5 px-3 sm:px-4">Invoice #</th>
                    <th className="py-2.5 px-3 sm:px-4">Vendor</th>
                    <th className="py-2.5 px-3 sm:px-4">Date</th>
                    <th className="py-2.5 px-3 sm:px-4">Items</th>
                    <th className="py-2.5 px-3 sm:px-4">Total Amount</th>
                    <th className="py-2.5 px-3 sm:px-4">Status / Payment</th>
                    <th className="py-2.5 px-3 sm:px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {recentInvoices.map((inv) => {
                    const isPending = (inv.status || '').toLowerCase().includes('pending');
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 sm:px-4 font-bold text-slate-900">
                          {inv.invoice_number}
                        </td>
                        <td className="py-2.5 px-3 sm:px-4">
                          <p className="font-semibold text-slate-800">{inv.vendor_name || '—'}</p>
                          <p className="text-[10px] text-slate-400">{inv.vendor_type || 'General'}</p>
                        </td>
                        <td className="py-2.5 px-3 sm:px-4">
                          <p className="font-semibold text-slate-800">{formatDate(inv.invoice_date)}</p>
                          {inv.created_at && (
                            <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5" title="Uploaded timestamp">
                              <UploadCloud className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                              <span>Uploaded: {formatDateTime(inv.created_at)}</span>
                            </p>
                          )}
                        </td>
                        <td className="py-2.5 px-3 sm:px-4">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                            {inv.items_count || 0} items
                          </span>
                        </td>
                        <td className="py-2.5 px-3 sm:px-4">
                          <p className="font-bold text-slate-900">{formatCurrency(inv.total)}</p>
                          {Number(inv.total_gst || inv.tax) > 0 ? (
                            <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              GST: +{formatCurrency(inv.total_gst || inv.tax)}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 block mt-0.5">No GST</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 sm:px-4">
                          {isPending ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3" />
                              <span>Pending Owner Pay</span>
                            </span>
                          ) : (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Paid & Approved</span>
                              </span>
                              {inv.payment_method && (
                                <p className="text-[10px] text-slate-400 font-mono">
                                  via {inv.payment_method}
                                </p>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 text-right space-x-1.5">
                          {isPending && (
                            <button
                              onClick={() => {
                                setSelectedInvoiceForApproval(inv);
                                setApprovalModalOpen(true);
                              }}
                              className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition"
                            >
                              Pay
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/invoices/${inv.id}`)}
                            className="px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View (< md) */}
            <div className="md:hidden divide-y divide-slate-100 p-3 space-y-3">
              {recentInvoices.map((inv) => {
                const isPending = (inv.status || '').toLowerCase().includes('pending');
                return (
                  <div key={inv.id} className="pt-3 first:pt-0 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">{inv.invoice_number}</span>
                          {isPending ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Pending Pay
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Paid
                            </span>
                          )}
                        </div>
                        <p className="font-semibold text-slate-800 text-xs mt-0.5 truncate">{inv.vendor_name || '—'}</p>
                        <p className="text-[10px] text-slate-400">{formatDate(inv.invoice_date)}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-black text-slate-900 text-sm">{formatCurrency(inv.total)}</p>
                        {inv.payment_method && (
                          <span className="text-[10px] text-slate-400 font-mono">via {inv.payment_method}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span>{inv.items_count || 0} items</span>
                      {Number(inv.total_gst || inv.tax) > 0 && (
                        <span className="text-indigo-600 font-semibold text-[10px]">
                          GST: +{formatCurrency(inv.total_gst || inv.tax)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      {isPending && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedInvoiceForApproval(inv);
                            setApprovalModalOpen(true);
                          }}
                          className="flex-1 py-1.5 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition text-center min-touch-target flex items-center justify-center gap-1 shadow-2xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve & Pay</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => navigate(`/invoices/${inv.id}`)}
                        className={`py-1.5 px-3 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition text-center min-touch-target flex items-center justify-center ${
                          isPending ? 'flex-1' : 'w-full'
                        }`}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ======================================================== */}
      {/* 8. OWNER PAYMENT APPROVAL MODAL */}
      {/* ======================================================== */}
      {approvalModalOpen && selectedInvoiceForApproval && (
        <PaymentApprovalModal
          isOpen={approvalModalOpen}
          onClose={() => {
            setApprovalModalOpen(false);
            setSelectedInvoiceForApproval(null);
          }}
          invoice={selectedInvoiceForApproval}
          onApproved={() => {
            loadDashboard();
          }}
        />
      )}
    </div>
  );
}
