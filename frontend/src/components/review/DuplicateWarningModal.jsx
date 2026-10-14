import React from 'react';
import Modal from '../ui/Modal';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function DuplicateWarningModal({ isOpen, onClose, duplicateInfo, onSaveAnyway }) {
  const navigate = useNavigate();
  if (!duplicateInfo) return null;

  const existingId = duplicateInfo.existingId || duplicateInfo.existingInvoice?.id;
  const vendorName = duplicateInfo.vendorName || duplicateInfo.existingInvoice?.vendor_name || 'Selected Supplier';
  const invoiceNumber = duplicateInfo.invoiceNumber || duplicateInfo.existingInvoice?.invoice_number || '—';
  const date = duplicateInfo.date || duplicateInfo.existingInvoice?.invoice_date;
  const total = duplicateInfo.total !== undefined ? duplicateInfo.total : duplicateInfo.existingInvoice?.total;
  const message = duplicateInfo.message || 'An invoice with the same vendor and invoice number already exists in your database.';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Duplicate Invoice Alert"
      maxWidth="max-w-md"
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition cursor-pointer"
          >
            Cancel & Change Details
          </button>
          {existingId && (
            <button
              type="button"
              onClick={() => navigate(`/invoices/${existingId}`)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition cursor-pointer"
            >
              <span>View Invoice #{existingId}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onSaveAnyway}
            className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition cursor-pointer"
          >
            Save Anyway
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="leading-relaxed">
            {message}
          </p>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-500">Supplier:</span>
            <span className="font-semibold text-slate-800">{vendorName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Invoice Number:</span>
            <span className="font-semibold text-slate-800">{invoiceNumber}</span>
          </div>
          {date && (
            <div className="flex justify-between">
              <span className="text-slate-500">Registered Date:</span>
              <span className="text-slate-700">{formatDate(date)}</span>
            </div>
          )}
          {total !== undefined && total !== null && (
            <div className="flex justify-between">
              <span className="text-slate-500">Total Amount:</span>
              <span className="font-bold text-slate-900">{formatCurrency(total)}</span>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
