import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Calendar,
  CreditCard,
  FileText,
  Printer,
  Download,
  Trash2,
  FileCode,
  Tag,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
  UserCheck,
  Banknote,
  UploadCloud,
  Image as ImageIcon
} from 'lucide-react';
import { invoiceApi } from '../services/api';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters';
import { Spinner } from '../components/ui';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import RawOcrViewerModal from '../components/review/RawOcrViewerModal';
import PaymentApprovalModal from '../components/review/PaymentApprovalModal';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useUpdates } from '../context/UpdatesContext';

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isOwner } = useAuth();
  const { refreshUpdates, broadcastUpdate } = useUpdates();
  const { success: toastSuccess, error: toastError } = useToast();

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState(null);
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    if (!invoice) return;
    setDownloadingPdf(true);
    try {
      const cleanNum = (invoice.invoice_number || `invoice_${id}`).replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Invoice-${cleanNum}.pdf`;

      const token = localStorage.getItem('token') || '';
      const res = await fetch(`/api/invoices/${id}/pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toastSuccess(`Invoice ${invoice.invoice_number} downloaded successfully.`);
    } catch (err) {
      console.warn('[InvoiceDetailPage] Backend PDF download failed, falling back to print dialog:', err);
      toastError('Direct PDF download failed. Opening print/save dialog...');
      handlePrint();
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    const cleanNum = (invoice?.invoice_number || `invoice_${id}`).replace(/[^a-zA-Z0-9_-]/g, '_');
    document.title = `Invoice-${cleanNum}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1200);
  };

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const res = await invoiceApi.getById(id);
      setInvoice(res.data);
      if (refreshUpdates) {
        refreshUpdates();
      }
    } catch (err) {
      toastError(err.message || 'Invoice not found.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await invoiceApi.delete(id);
      toastSuccess('Invoice deleted successfully.');
      if (broadcastUpdate) broadcastUpdate();
      else if (refreshUpdates) refreshUpdates();
      navigate('/invoices');
    } catch (err) {
      toastError(err.message || 'Failed to delete invoice.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-2">
        <Spinner size="lg" />
        <p className="text-xs text-slate-500 font-medium">Loading invoice #{id}...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="py-16 text-center space-y-4">
        <h3 className="text-lg font-bold text-slate-800">Invoice not found</h3>
        <button
          onClick={() => navigate('/invoices')}
          className="text-xs font-semibold text-indigo-600 hover:underline"
        >
          ← Return to Invoices
        </button>
      </div>
    );
  }

  const items = invoice.items || [];
  const isPaid = invoice.status === 'Paid' || (Number(invoice.amount_paid || invoice.paid || 0) >= Number(invoice.total) && Number(invoice.total) > 0);
  const isPending = !isPaid && invoice.status !== 'Rejected';
  const isStaffUpload =
    invoice.created_by_role === 'staff' ||
    invoice.created_by_role === 'employee' ||
    (invoice.created_by_user_id && invoice.created_by_user_id !== 1);
  const ext = (invoice.pdf_path || '').split('.').pop().toLowerCase();
  const isPdf = ext === 'pdf';
  const isImage = ['png', 'jpg', 'jpeg', 'webp', 'bmp'].includes(ext);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <button
          onClick={() => navigate('/invoices')}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition self-start sm:self-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Invoices</span>
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate('/upload')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition active:scale-[0.98]"
            title="Upload another supplier invoice PDF or image"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload Another PDF</span>
          </button>

          {invoice.ocr_text && (
            <button
              onClick={() => setShowOcrModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition"
              title="View extracted OCR text"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>OCR Text</span>
            </button>
          )}

          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 shadow-2xs transition disabled:opacity-50"
            title="Download clean invoice document as PDF file"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            <span>{downloadingPdf ? 'Downloading PDF...' : 'Download PDF'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition"
            title="Print invoice or save as PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Invoice</span>
          </button>

          {isOwner && (
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 transition"
              title="Delete Invoice (Owner Only)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Staff Upload Item Indicator Banner */}
      {isStaffUpload && (
        <div
          className={`no-print rounded-2xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs ${
            isPending
              ? 'bg-amber-50/90 border-amber-300 text-amber-950'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-xs ${
                isPdf
                  ? 'bg-rose-100 text-rose-700 border border-rose-200'
                  : isImage
                  ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {isPdf ? (
                <FileText className="w-5 h-5 text-rose-600" />
              ) : isImage ? (
                <ImageIcon className="w-5 h-5 text-indigo-600" />
              ) : (
                <UploadCloud className="w-5 h-5 text-slate-600" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-sm text-slate-900">
                  {isPdf
                    ? 'Staff PDF Upload'
                    : isImage
                    ? 'Staff Image Upload'
                    : 'Staff Manual Entry'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    isPending
                      ? 'bg-amber-200/80 text-amber-900'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {isPending ? 'Pending Owner Review' : 'Verified by Owner'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Uploaded by{' '}
                <strong className="text-slate-800">
                  {invoice.created_by_name || 'Staff Employee'}
                </strong>{' '}
                on {formatDateTime(invoice.created_at)}
              </p>
            </div>
          </div>

          {isPending && isOwner && (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-500 text-white font-bold text-xs shadow-xs">
                Requires Owner Sign-off
              </span>
            </div>
          )}
        </div>
      )}

      {/* Owner Approval & Payment Callout Banner if Pending (interactive UI only, hidden on print) */}
      {isPending && isOwner && (
        <div className="no-print bg-gradient-to-r from-amber-500 to-amber-600 rounded-3xl p-6 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-200" />
              <h3 className="font-extrabold text-base sm:text-lg">
                Invoice Awaiting Owner Approval & Payment
              </h3>
            </div>
            <p className="text-xs text-amber-100 mt-1 max-w-xl">
              Submitted by <span className="font-bold text-white">{invoice.created_by_name || 'Staff Employee'}</span>.
              As store owner, you can review the total ({formatCurrency(invoice.total)}) and approve it by completing payment.
            </p>
          </div>

          <button
            onClick={() => setShowPaymentModal(true)}
            className="flex-shrink-0 flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white text-emerald-700 font-extrabold text-sm shadow-md hover:bg-emerald-50 transition active:scale-[0.98]"
          >
            <CreditCard className="w-5 h-5 text-emerald-600" />
            <span>Approve & Pay Invoice</span>
          </button>
        </div>
      )}

      {/* Payment Receipt Banner if Paid (interactive UI only, hidden on print) */}
      {isPaid && (
        <div className="no-print bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="font-extrabold text-emerald-950 text-sm">
                Approved & Paid by {invoice.approved_by_name || 'Store Owner'}
              </p>
              <p className="text-emerald-700 mt-0.5">
                Paid on: <span className="font-semibold">{formatDate(invoice.paid_at || invoice.updated_at)}</span>
                {invoice.payment_notes && <span> • {invoice.payment_notes}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white px-3.5 py-2 rounded-xl border border-emerald-200 font-mono text-[11px]">
            <span className="text-slate-500">{invoice.payment_method || 'Payment'}:</span>
            <span className="font-bold text-emerald-800">{invoice.payment_reference || 'REF-VERIFIED'}</span>
          </div>
        </div>
      )}

      {/* Invoice Document Box */}
      <div id="printable-invoice" className="bg-white rounded-2xl p-4 sm:p-6 md:p-8 border border-slate-200 shadow-sm space-y-6 print:shadow-none print:border-none print:p-0 print:m-0 print:rounded-none">
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Invoice {invoice.invoice_number}
              </h2>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  isPaid
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {isPaid ? 'Approved & Paid' : invoice.status === 'Rejected' ? 'Rejected' : 'Pending Approval & Payment'}
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap text-xs text-slate-400 mt-1.5">
              <span className="flex items-center gap-1">
                <UploadCloud className="w-3.5 h-3.5 text-indigo-500" />
                <span>Uploaded on <strong className="text-slate-600">{formatDateTime(invoice.created_at)}</strong></span>
              </span>
              {invoice.created_by_name && (
                <>
                  <span>•</span>
                  <span>Submitted by: <strong className="text-slate-600">{invoice.created_by_name}</strong> ({invoice.created_by_role || 'Staff'})</span>
                </>
              )}
            </div>
          </div>

          <div className="text-left sm:text-right">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {isPaid ? 'Total Paid' : 'Amount Due'}
            </p>
            <p className="text-2xl sm:text-3xl font-black text-indigo-700 mt-0.5">
              {formatCurrency(invoice.total)}
            </p>
            {Number(invoice.total_gst || invoice.tax) > 0 && (
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Includes GST: +{formatCurrency(invoice.total_gst || invoice.tax)}
              </span>
            )}
          </div>
        </div>

        {/* Vendor & Details Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Vendor Card */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Supplier Information
              </span>
              {invoice.vendor_id && (
                <Link
                  to={`/vendors/${invoice.vendor_id}`}
                  className="text-[11px] font-semibold text-indigo-600 hover:underline flex items-center gap-1 no-print"
                >
                  <span>Vendor Profile</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>

            <h3 className="font-bold text-slate-800 text-base">
              {invoice.vendor_name || 'Unassigned Vendor'}
            </h3>
            <p className="text-xs text-indigo-600 font-medium">
              {invoice.vendor_type || 'General Supplier'}
            </p>
            {invoice.vendor_address && (
              <p className="text-xs text-slate-600 leading-relaxed pt-1">
                {invoice.vendor_address}
              </p>
            )}
            {invoice.vendor_gstin && (
              <p className="text-xs font-mono font-medium text-slate-700 pt-1">
                GSTIN: <span className="font-bold">{invoice.vendor_gstin}</span>
              </p>
            )}
          </div>

          {/* Invoice Meta */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <p className="text-slate-400 font-medium">Invoice Document Date</p>
              <p className="font-bold text-slate-800 text-sm mt-0.5">
                {formatDate(invoice.invoice_date)}
              </p>
            </div>
            <div>
              <p className="text-slate-400 font-medium">System Uploaded Time & Date</p>
              <p className="font-bold text-indigo-700 text-xs mt-0.5">
                {formatDateTime(invoice.created_at)}
              </p>
            </div>
            <div>
              <p className="text-slate-400 font-medium">Payment Due Date</p>
              <p className="font-bold text-slate-800 text-sm mt-0.5">
                {formatDate(invoice.due_date)}
              </p>
            </div>
            <div>
              <p className="text-slate-400 font-medium">PO Number</p>
              <p className="font-semibold text-slate-800 mt-0.5">
                {invoice.po_number || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-slate-400 font-medium">Items Count</p>
              <p className="font-semibold text-slate-800 mt-0.5">{items.length} items</p>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Purchased Line Items ({items.length})
            </h4>
            <span className="text-[11px] text-slate-500 font-medium">Dynamic Measurement Units & Pricing Basis</span>
          </div>
          <div className="overflow-x-auto border border-slate-200 rounded-xl print:overflow-visible print:border-slate-300">
            <table className="w-full text-left border-collapse text-xs min-w-[850px] print:min-w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-4 min-w-[180px]">Item & Description</th>
                  <th className="py-2.5 px-4 min-w-[130px] bg-indigo-50/60 text-indigo-950 font-black border-x border-indigo-200/50">Quantity & Unit</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">HSN / SKU</th>
                  <th className="py-2.5 px-4 text-right">Unit Price / Basis</th>
                  <th className="py-2.5 px-3 text-right">Taxable</th>
                  <th className="py-2.5 px-3 text-right">GST</th>
                  <th className="py-2.5 px-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => {
                  const basisQty = Number(item.price_unit_quantity) > 0 ? Number(item.price_unit_quantity) : 1;
                  const displayUnit = item.unit_normalized || item.unit || 'pcs';
                  const itemQty = item.quantity !== undefined && item.quantity !== null ? item.quantity : (item.qty ?? 1);
                  return (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{item.item_name}</div>
                        {item.item_description && (
                          <div className="text-[11px] text-slate-500">{item.item_description}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 bg-indigo-50/20 border-x border-indigo-100/50">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-sm font-black text-indigo-900 bg-indigo-100/90 border border-indigo-200 px-2.5 py-0.5 rounded-md shadow-2xs">
                            {itemQty}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                            {displayUnit}
                          </span>
                        </div>
                        {item.unit_original && item.unit_original.toLowerCase() !== displayUnit.toLowerCase() && (
                          <span className="text-[10px] text-slate-400 block mt-1 font-normal">
                            as printed: {item.unit_original}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium text-[11px]">
                          {item.category_name || 'Other'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500">
                        {item.hsn_code || item.sku || '—'}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700">
                        <div className="font-medium">{formatCurrency(item.unit_price)}</div>
                        {basisQty > 1 && (
                          <div className="text-[10px] text-indigo-600 font-semibold">
                            per {basisQty} {displayUnit}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-600 font-mono">
                        {formatCurrency(item.taxable_value || item.total_price || 0)}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-600 font-mono">
                        {item.gst_rate > 0 ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {item.gst_rate}%
                          </span>
                        ) : (
                          <span className="text-slate-400">0%</span>
                        )}
                        {Number(item.tax || ((item.cgst_amount || 0) + (item.sgst_amount || 0) + (item.igst_amount || 0))) > 0 && (
                          <span className="block text-[10px] text-slate-500 font-semibold mt-0.5">
                            +{formatCurrency(Number(item.tax || ((item.cgst_amount || 0) + (item.sgst_amount || 0) + (item.igst_amount || 0))))}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">
                        {formatCurrency(item.line_total || item.total_price)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals Summary */}
        <div className="flex justify-end pt-4">
          <div className="w-full sm:w-80 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Items Subtotal</span>
              <span className="font-semibold">{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Discount</span>
                <span className="font-semibold text-emerald-600">
                  - {formatCurrency(invoice.discount)}
                </span>
              </div>
            )}
            {invoice.taxable_amount > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Taxable Amount</span>
                <span className="font-semibold">{formatCurrency(invoice.taxable_amount)}</span>
              </div>
            )}
            {invoice.freight_charges > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Freight Charges</span>
                <span className="font-semibold">{formatCurrency(invoice.freight_charges)}</span>
              </div>
            )}
            {Number(invoice.total_gst || invoice.tax) > 0 ? (
              <div className="flex justify-between items-center bg-indigo-50/80 px-2.5 py-1.5 rounded-lg border border-indigo-200 text-indigo-900 font-semibold">
                <span className="flex items-center gap-1.5">
                  <span>Total GST (Tax)</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 bg-indigo-200 text-indigo-800 rounded">GST</span>
                </span>
                <span className="font-bold text-indigo-800 font-mono">
                  + {formatCurrency(invoice.total_gst || invoice.tax)}
                </span>
              </div>
            ) : (
              <div className="flex justify-between text-slate-400">
                <span>Total Tax / GST</span>
                <span className="font-semibold">₹0.00 (0%)</span>
              </div>
            )}
            {(Number(invoice.cgst) > 0 || Number(invoice.sgst) > 0) && (
              <div className="flex justify-between text-[11px] text-slate-500 pl-2">
                <span>↳ CGST ({formatCurrency(invoice.cgst)}) + SGST ({formatCurrency(invoice.sgst)})</span>
                <span className="font-mono">{formatCurrency(Number(invoice.cgst) + Number(invoice.sgst))}</span>
              </div>
            )}
            {Number(invoice.igst) > 0 && (
              <div className="flex justify-between text-[11px] text-slate-500 pl-2">
                <span>↳ IGST</span>
                <span className="font-mono">{formatCurrency(invoice.igst)}</span>
              </div>
            )}
            {invoice.round_off !== 0 && invoice.round_off !== undefined && invoice.round_off !== null && (
              <div className="flex justify-between text-slate-600">
                <span>Round-off</span>
                <span className="font-semibold">{formatCurrency(invoice.round_off)}</span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-slate-900">
              <span>Grand Total</span>
              <span className="text-indigo-700 font-extrabold">{formatCurrency(invoice.total)}</span>
            </div>

            {/* Payment Settlement Breakdown */}
            {(invoice.amount_paid > 0 || invoice.outstanding_balance > 0 || invoice.advance_paid > 0) && (
              <div className="pt-2.5 mt-2 border-t border-dashed border-slate-200 space-y-1.5 text-xs">
                {invoice.advance_paid > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Advance Paid</span>
                    <span className="font-mono text-slate-700">{formatCurrency(invoice.advance_paid)}</span>
                  </div>
                )}
                {invoice.paid > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Paid</span>
                    <span className="font-mono text-slate-700">{formatCurrency(invoice.paid)}</span>
                  </div>
                )}
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Total Paid to Date</span>
                  <span className="font-mono">{formatCurrency(invoice.amount_paid)}</span>
                </div>
                <div className="flex justify-between bg-amber-50 p-2 rounded-lg border border-amber-200 font-bold text-amber-900">
                  <span>Balance Due / Pending</span>
                  <span className="font-mono">{formatCurrency(invoice.outstanding_balance)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Printable Authorized Signatory & Legal Footer (only visible when printed/downloaded) */}
        <div className="hidden print:flex justify-between items-end pt-10 mt-8 border-t border-slate-300 text-xs text-slate-600">
          <div>
            <p className="font-bold text-slate-800">
              Payment Status:{' '}
              <span className={isPaid ? 'text-emerald-700 font-extrabold' : 'text-amber-700 font-extrabold'}>
                {isPaid ? 'Settled in Full' : 'Pending Payment'}
              </span>
            </p>
            {isPaid && (invoice.paid_at || invoice.updated_at) && (
              <p className="text-[11px] text-slate-500 mt-0.5">
                Settled on: {formatDate(invoice.paid_at || invoice.updated_at)}{' '}
                {invoice.payment_method ? `• Via ${invoice.payment_method}` : ''}
              </p>
            )}
            <p className="text-[10px] text-slate-400 mt-2">
              Verified computer-generated tax invoice • OCR Invoice Management System
            </p>
          </div>
          <div className="text-right">
            <div className="border-b border-slate-400 w-48 mb-1.5"></div>
            <p className="text-[11px] font-bold text-slate-700">Authorized Signatory</p>
          </div>
        </div>
      </div>

      {/* Owner Payment Approval Modal */}
      <PaymentApprovalModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        invoice={invoice}
        onApproved={() => {
          setShowPaymentModal(false);
          fetchInvoice();
          if (refreshUpdates) refreshUpdates();
        }}
      />

      {/* Raw OCR Text Modal */}
      <RawOcrViewerModal
        isOpen={showOcrModal}
        onClose={() => setShowOcrModal(false)}
        ocrData={{
          rawText: invoice.ocr_text,
          pdfType: 'Stored Invoice',
          confidence: 100,
          extractionMethod: 'Database Record'
        }}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Invoice"
        message="Are you sure you want to permanently delete this invoice and all its items?"
        confirmText="Delete Invoice"
        isDanger={true}
        loading={deleting}
      />
    </div>
  );
}
