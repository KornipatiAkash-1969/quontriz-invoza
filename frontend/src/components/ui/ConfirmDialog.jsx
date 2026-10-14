import React from 'react';
import Modal from './Modal';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onCancel,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText,
  confirmLabel = 'Confirm',
  cancelText,
  cancelLabel = 'Cancel',
  isDanger = false,
  isDestructive = false,
  loading = false,
}) {
  const handleClose = onClose || onCancel;
  const finalConfirmText = confirmText || confirmLabel;
  const finalCancelText = cancelText || cancelLabel;
  const finalIsDanger = isDanger || isDestructive;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      maxWidth="max-w-md"
      footer={
        <>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition disabled:opacity-50"
          >
            {finalCancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition disabled:opacity-50 ${
              isDanger
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
            }`}
          >
            {loading ? 'Processing...' : finalConfirmText}
          </button>
        </>
      }
    >
      <div className="flex items-start gap-4">
        {isDanger && (
          <div className="p-3 bg-red-100 text-red-600 rounded-full flex-shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
        )}
        <p className="text-sm text-slate-600 leading-relaxed pt-1">{message}</p>
      </div>
    </Modal>
  );
}
