import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { Copy, Check, FileText } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export default function RawOcrViewerModal({ isOpen, onClose, ocrData }) {
  const { success } = useToast();
  const [copied, setCopied] = useState(false);

  if (!ocrData) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(ocrData.rawText || '');
    setCopied(true);
    success('OCR text copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Extracted OCR Raw Text"
      maxWidth="max-w-3xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-500">
            Extraction Method:{' '}
            <span className="font-semibold text-slate-700">
              {ocrData.extractionMethod || 'OCR Engine'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied' : 'Copy Text'}</span>
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center gap-3 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div>
            <span className="text-slate-400">PDF Type:</span>{' '}
            <span className="font-semibold uppercase">{ocrData.pdfType || 'Text'}</span>
          </div>
          <div>•</div>
          <div>
            <span className="text-slate-400">Pages:</span>{' '}
            <span className="font-semibold">{ocrData.pageCount || 1}</span>
          </div>
          <div>•</div>
          <div>
            <span className="text-slate-400">Confidence:</span>{' '}
            <span className="font-semibold text-emerald-600">{ocrData.confidence || 100}%</span>
          </div>
        </div>

        <div className="relative">
          <pre className="p-4 bg-slate-900 text-slate-100 font-mono text-xs rounded-xl overflow-x-auto max-h-[50vh] whitespace-pre-wrap leading-relaxed">
            {ocrData.rawText || 'No text extracted.'}
          </pre>
        </div>
      </div>
    </Modal>
  );
}
