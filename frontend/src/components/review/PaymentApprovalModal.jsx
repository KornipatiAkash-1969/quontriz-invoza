import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { CreditCard, CheckCircle2, ShieldCheck, Banknote, QrCode } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { invoiceApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function PaymentApprovalModal({ isOpen, onClose, invoice, onApproved }) {
  const { success: toastSuccess, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentReference, setPaymentReference] = useState(
    `TXN-${Date.now().toString().slice(-6)}`
  );
  const [paymentNotes, setPaymentNotes] = useState('Approved and paid from store operating account');

  if (!invoice) return null;

  const handleApproveAndPay = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await invoiceApi.approveAndPay(invoice.id, {
        paymentMethod,
        paymentReference: paymentReference.trim(),
        paymentNotes: paymentNotes.trim(),
      });

      toastSuccess(`Invoice #${invoice.invoice_number} approved and marked as Paid!`);
      if (onApproved) onApproved(res.data);
      onClose();
    } catch (err) {
      toastError(err.message || 'Payment approval failed.');
    } finally {
      setLoading(false);
    }
  };

  const paymentOptions = [
    { id: 'UPI', label: 'UPI (GPay / PhonePe / Paytm)', icon: QrCode },
    { id: 'Bank Transfer', label: 'Bank Transfer (NEFT / RTGS)', icon: CreditCard },
    { id: 'Cash', label: 'Cash from Store Register', icon: Banknote },
    { id: 'Cheque', label: 'Bank Cheque', icon: CreditCard },
    { id: 'Company Card', label: 'Corporate Debit/Credit Card', icon: CreditCard },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Approve & Pay Invoice (Store Owner)"
      maxWidth="max-w-lg"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApproveAndPay}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-100 transition active:scale-[0.98] disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{loading ? 'Processing Payment...' : 'Confirm Payment & Approve'}</span>
          </button>
        </div>
      }
    >
      <form onSubmit={handleApproveAndPay} className="space-y-4">
        {/* Invoice Summary Box */}
        {(() => {
          const totalAmount = Number(invoice.total) || 0;
          const advancePaid = Number(invoice.advance_paid) || 0;
          const gstAmount = Number(invoice.total_gst || invoice.tax) || 0;
          const subtotalAmount = Number(invoice.subtotal) || 0;
          const settlementPayable = Math.max(0, parseFloat((totalAmount - advancePaid).toFixed(2)));
          return (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Invoice Number:</span>
                <span className="font-extrabold text-slate-900">{invoice.invoice_number}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Vendor:</span>
                <span className="font-bold text-slate-800">{invoice.vendor_name || 'Vendor'}</span>
              </div>
              {subtotalAmount > 0 && gstAmount > 0 && (
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Subtotal (Pre-tax):</span>
                  <span className="font-semibold text-slate-700">{formatCurrency(subtotalAmount)}</span>
                </div>
              )}
              {gstAmount > 0 && (
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 text-indigo-700 bg-indigo-50/70 -mx-2 px-2 py-1 rounded-lg">
                  <span className="font-bold flex items-center gap-1.5">
                    <span>GST (Tax):</span>
                    <span className="text-[10px] bg-indigo-200 text-indigo-800 px-1.5 py-0.2 rounded font-bold">GST</span>
                  </span>
                  <span className="font-bold font-mono">+ {formatCurrency(gstAmount)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Invoice Total:</span>
                <span className="font-bold text-slate-800">{formatCurrency(totalAmount)}</span>
              </div>
              {advancePaid > 0 && (
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 text-emerald-700">
                  <span className="font-medium">Less Advance Paid:</span>
                  <span className="font-bold">- {formatCurrency(advancePaid)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-1 text-sm">
                <span className="font-bold text-slate-800">Final Settlement Payable:</span>
                <span className="font-black text-indigo-700 text-base">
                  {formatCurrency(settlementPayable)}
                </span>
              </div>
            </div>
          );
        })()}

        {/* Payment Method Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Select Payment Method *
          </label>
          <div className="space-y-2">
            {paymentOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = paymentMethod === opt.id;
              return (
                <label
                  key={opt.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/60 shadow-2xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="payMethod"
                    value={opt.id}
                    checked={isSelected}
                    onChange={() => setPaymentMethod(opt.id)}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span className={`text-xs font-semibold ${isSelected ? 'text-emerald-950' : 'text-slate-700'}`}>
                    {opt.label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Transaction Reference Number */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Payment / Transaction Reference #
          </label>
          <input
            type="text"
            required
            value={paymentReference}
            onChange={(e) => setPaymentReference(e.target.value)}
            placeholder="UPI-123456 / NEFT-Ref..."
            className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none font-mono"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Payment Notes / Remarks
          </label>
          <input
            type="text"
            value={paymentNotes}
            onChange={(e) => setPaymentNotes(e.target.value)}
            placeholder="e.g. Paid via store operating account"
            className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
          />
        </div>
      </form>
    </Modal>
  );
}
