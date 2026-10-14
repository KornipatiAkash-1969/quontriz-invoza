import React, { useState } from 'react';
import {
  FileCheck,
  Sparkles,
  Scan,
  ArrowRight,
  PenLine,
  Pill,
  Wrench,
  Wheat,
  Receipt,
  FileText,
  ExternalLink
} from 'lucide-react';

const MESSY_SAMPLES = [
  {
    key: 'handwritten-grocery',
    title: 'Kirana Store Kacha Chit',
    vendor: 'Shree Ganesh Provision Store',
    desc: 'Lined paper scribble with shorthand "@ 42/- = 210/-", Vernacular discount (Chhoot), Jama & Baki.',
    badge: 'Ruled Notepad Chit',
    badgeColor: 'bg-amber-100 text-amber-800 border border-amber-200',
    fileUrl: '/uploads/samples/sample-handwritten-grocery-chit.pdf',
    icon: PenLine
  },
  {
    key: 'handwritten-chemist',
    title: 'Chemist Prescription Bill',
    vendor: 'Apollo Healthcare & Pharma Chemist',
    desc: 'Doctor prescription chit with dosage (500mg, 650), strips, syrup bottle, and 12% GST calculation.',
    badge: 'Chemist Rx Note',
    badgeColor: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    fileUrl: '/uploads/samples/sample-handwritten-chemist-rx.pdf',
    icon: Pill
  },
  {
    key: 'handwritten-hardware',
    title: 'Hardware & Electrical Chit',
    vendor: 'Kumar Electricals & Hardware Store',
    desc: 'Quantity-first informal format (10 pcs LED Bulbs 9W @ 70 = 700), labor charges (Hamali), Advance & Balance.',
    badge: 'Quantity-First Chit',
    badgeColor: 'bg-blue-100 text-blue-800 border border-blue-200',
    fileUrl: '/uploads/samples/sample-handwritten-hardware-chit.pdf',
    icon: Wrench
  },
  {
    key: 'handwritten-mandi',
    title: 'Grain Mandi Wholesale Bilty',
    vendor: 'Kisan Mandi Vyapar Depot',
    desc: 'Bilty note with Hindi vernaculars: Bhada (Freight), Hamali (Labor), Peshgi (Adv), Baaki, and Kul Yog.',
    badge: 'Mandi Bilty',
    badgeColor: 'bg-orange-100 text-orange-800 border border-orange-200',
    fileUrl: '/uploads/samples/sample-handwritten-mandi-bilty.pdf',
    icon: Wheat
  },
  {
    key: 'handwritten-receipt',
    title: 'Supermarket Cash Receipt',
    vendor: 'Freshmart Supermarket Retail',
    desc: 'Raster thermal paper cash memo with itemized barcodes, multi-items, taxes, and change math.',
    badge: 'PNG Image Receipt',
    badgeColor: 'bg-purple-100 text-purple-800 border border-purple-200',
    fileUrl: '/uploads/samples/sample-handwritten-thermal-receipt.png',
    icon: Receipt
  },
  {
    key: 'handwritten-pharma',
    title: 'Pharma Healthcare Bill',
    vendor: 'Medilife Pharma Distributors',
    desc: 'Scanned image bill with complex table rows, batch numbers, item-level GST%, and totals.',
    badge: 'JPG Image Bill',
    badgeColor: 'bg-rose-100 text-rose-800 border border-rose-200',
    fileUrl: '/uploads/samples/sample-handwritten-pharma-bill.jpg',
    icon: FileText
  }
];

const STANDARD_SAMPLES = [
  {
    key: 'electronics',
    title: 'Digital Electronics Invoice',
    vendor: 'ABC Electronics Pvt Ltd',
    desc: 'Direct text extraction with Samsung TV, HDMI cable, PO & GSTIN',
    badge: 'Digital Text PDF',
    badgeColor: 'bg-blue-100 text-blue-700 border border-blue-200',
    fileUrl: '/uploads/samples/sample-digital-electronics-invoice.pdf',
    icon: FileCheck
  },
  {
    key: 'grocery',
    title: 'Supermarket Grocery Invoice',
    vendor: 'Metro Supermarket Wholesalers',
    desc: 'Multi-category items: Coca Cola, Lays Chips, Amul Milk, Atta, Bread, etc.',
    badge: 'Multi-Category Test',
    badgeColor: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    fileUrl: '/uploads/samples/sample-grocery-supermart-invoice.pdf',
    icon: Sparkles
  },
  {
    key: 'scanned',
    title: 'Scanned Image Invoice',
    vendor: 'Sunrise Agro Farms Pvt Ltd',
    desc: 'Pure raster page with zero selectable text, processed via Tesseract OCR',
    badge: 'Tesseract OCR Test',
    badgeColor: 'bg-amber-100 text-amber-700 border border-amber-200',
    fileUrl: '/uploads/samples/sample-scanned-invoice.pdf',
    icon: Scan
  }
];

export default function SampleInvoicesSelector({ onSelectSample, disabled = false }) {
  const [activeTab, setActiveTab] = useState('messy'); // 'messy' | 'standard'

  const currentList = activeTab === 'messy' ? MESSY_SAMPLES : STANDARD_SAMPLES;

  return (
    <div className="mt-8 pt-8 border-t border-slate-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-indigo-100 text-indigo-700">
              <Sparkles className="w-4 h-4" />
            </span>
            <h4 className="text-base font-bold text-slate-900 tracking-tight">
              Free One-Click Invoice Testing Presets
            </h4>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Test messy handwriting, doctor prescriptions, grocery chits, and scanned bills instantly with zero setup
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl border border-slate-300/70 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('messy')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'messy'
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>✍️ Messy & Handwritten</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-700">
              {MESSY_SAMPLES.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('standard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'standard'
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>📄 Standard Presets</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700">
              {STANDARD_SAMPLES.length}
            </span>
          </button>
        </div>
      </div>

      {/* Grid of Samples */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {currentList.map((sample) => {
          const Icon = sample.icon;
          return (
            <div
              key={sample.key}
              className="group text-left p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-400 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${sample.badgeColor}`}>
                    {sample.badge}
                  </span>
                  <div className="flex items-center gap-1">
                    {sample.fileUrl && (
                      <a
                        href={sample.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="View & Download Sample File"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <Icon className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                  </div>
                </div>

                <h5 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                  {sample.title}
                </h5>
                <p className="text-xs font-semibold text-slate-600 mt-0.5">{sample.vendor}</p>
                <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">{sample.desc}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                {sample.fileUrl ? (
                  <a
                    href={sample.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-medium text-slate-500 hover:text-indigo-600 flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span>View File</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : <div />}

                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelectSample(sample.key)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 group-hover:translate-x-0.5 disabled:opacity-50 disabled:pointer-events-none shadow-xs"
                >
                  <span>Free Test</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
