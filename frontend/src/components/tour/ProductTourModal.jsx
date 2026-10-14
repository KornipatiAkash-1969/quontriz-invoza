import React, { useState, useEffect } from 'react';
import {
  ScanText,
  LayoutDashboard,
  FileCheck2,
  UploadCloud,
  FileText,
  Users,
  Building2,
  KeyRound,
  ShieldCheck,
  UserCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  Layers,
  Clock,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../ui';

export default function ProductTourModal({ isOpen, onClose }) {
  const { user, isOwner } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    setCurrentStep(0);
  }, [isOpen]);

  if (!isOpen) return null;

  // Tour steps tailored specifically to role
  const ownerSteps = [
    {
      badge: 'Store Owner Walkthrough',
      title: `Welcome to Quontriz Invoza, ${user?.name || 'Owner'}!`,
      subtitle: 'Intelligent invoice processing, OCR verification, and complete store management.',
      icon: ScanText,
      iconBg: 'bg-indigo-600',
      highlights: [
        {
          title: 'Automated Invoice Processing',
          desc: 'High-speed OCR document extraction captures vendor details, line items, quantities, and GST rates.',
          icon: Sparkles,
          color: 'text-indigo-600',
        },
        {
          title: 'Full Financial Control',
          desc: 'Owners approve line items, record payments (Cash, UPI, NetBanking, Cheque), and download audit-ready PDFs.',
          icon: ShieldCheck,
          color: 'text-emerald-600',
        },
        {
          title: 'Role-Based Team Access',
          desc: 'Create and manage Store Staff (upload-only) and Store Owners with strict unique identity validation.',
          icon: Users,
          color: 'text-purple-600',
        },
      ],
    },
    {
      badge: 'Spend & Analytics',
      title: 'Executive Financial Dashboard',
      subtitle: 'Real-time visibility into supermarket expenses, taxes, and vendor performance.',
      icon: LayoutDashboard,
      iconBg: 'bg-blue-600',
      highlights: [
        {
          title: 'Live Expenditure Metrics',
          desc: 'Track total invoices, gross spending, total CGST/SGST/IGST paid, and pending balance at a glance.',
          icon: LayoutDashboard,
          color: 'text-blue-600',
        },
        {
          title: 'Pending vs Approved Status',
          desc: 'Easily filter invoices pending owner approval versus fully verified and paid transactions.',
          icon: Clock,
          color: 'text-amber-600',
        },
        {
          title: 'Interactive Spend Charts',
          desc: 'Visualize monthly expense distributions and supplier transaction volumes.',
          icon: Layers,
          color: 'text-indigo-600',
        },
      ],
    },
    {
      badge: 'Invoices & Payments',
      title: 'Invoice Review & Payment Approval',
      subtitle: 'Verify extracted line items and authorize supplier payments with full accounting records.',
      icon: FileCheck2,
      iconBg: 'bg-emerald-600',
      highlights: [
        {
          title: 'Side-by-Side OCR Verification',
          desc: 'Compare the original PDF receipt directly with AI-extracted line items, units, and rates.',
          icon: FileText,
          color: 'text-emerald-600',
        },
        {
          title: 'One-Click Payment Authorization',
          desc: 'Mark invoices as Paid and record payment reference, payment method, and transaction notes.',
          icon: CheckCircle2,
          color: 'text-teal-600',
        },
        {
          title: 'Safe Data Management',
          desc: 'Disassociate foreign key constraints automatically when deleting or modifying records.',
          icon: ShieldCheck,
          color: 'text-indigo-600',
        },
      ],
    },
    {
      badge: 'Team & RBAC',
      title: 'Team Management & Security',
      subtitle: 'Delegate invoice entry to staff while maintaining total security of payment approvals.',
      icon: Users,
      iconBg: 'bg-purple-600',
      highlights: [
        {
          title: 'Distinct Portal Logins',
          desc: 'Strict role verification blocks staff credentials on Owner portal and vice-versa.',
          icon: UserCheck,
          color: 'text-purple-600',
        },
        {
          title: 'Strict Identity Uniqueness',
          desc: 'Both User Name and Work Email must be completely unique; duplicate detection warns immediately.',
          icon: Users,
          color: 'text-rose-600',
        },
        {
          title: 'Automated 12:00 AM Reset',
          desc: 'Daily midnight sessions ensure tight compliance with fresh morning tokens for all users.',
          icon: Clock,
          color: 'text-amber-600',
        },
      ],
    },
    {
      badge: 'Suppliers & Configuration',
      title: 'Vendors, Types & Password Change',
      subtitle: 'Manage supplier relationships and keep your credentials secure.',
      icon: Building2,
      iconBg: 'bg-indigo-700',
      highlights: [
        {
          title: 'Vendor Types Directory',
          desc: 'Group suppliers by category (e.g. FMCG, Dairy, Beverages, Electronics) with vendor-level invoice history.',
          icon: Building2,
          color: 'text-indigo-600',
        },
        {
          title: 'Change Password Anytime',
          desc: 'Update your password directly from the Sidebar or Top Navigation bar with bcrypt encryption.',
          icon: KeyRound,
          color: 'text-emerald-600',
        },
        {
          title: 'Revisit Product Tour',
          desc: 'Click the "Product Tour" bubble in your sidebar anytime to review these features.',
          icon: Sparkles,
          color: 'text-blue-600',
        },
      ],
    },
  ];

  const staffSteps = [
    {
      badge: 'Store Staff Walkthrough',
      title: `Welcome to Quontriz Invoza, ${user?.name || 'Staff'}!`,
      subtitle: 'Fast invoice scanning, document uploads, and receipt processing for store team members.',
      icon: ScanText,
      iconBg: 'bg-emerald-600',
      highlights: [
        {
          title: 'Fast Invoice Scanning',
          desc: 'Upload vendor bills and invoices directly. AI automatically reads supplier and item details.',
          icon: UploadCloud,
          color: 'text-emerald-600',
        },
        {
          title: 'Focus on Operations',
          desc: 'Your portal is streamlined for rapid upload and line-item review without financial approval complexity.',
          icon: FileCheck2,
          color: 'text-indigo-600',
        },
        {
          title: 'Daily Auto Security',
          desc: 'Automated session refresh keeps all scans tracked and audited under your staff profile.',
          icon: ShieldCheck,
          color: 'text-purple-600',
        },
      ],
    },
    {
      badge: 'Scanning & Uploads',
      title: 'Upload Invoice PDF / Images',
      subtitle: 'Drag and drop vendor bills or choose manual entry for physical paper receipts.',
      icon: UploadCloud,
      iconBg: 'bg-indigo-600',
      highlights: [
        {
          title: 'Multi-Format Support',
          desc: 'Supports PDF, PNG, JPG, and multi-page supplier invoices up to 15MB.',
          icon: UploadCloud,
          color: 'text-indigo-600',
        },
        {
          title: 'Automatic Field Detection',
          desc: 'Extracts invoice numbers, dates, vendor GSTIN, quantities, HSN codes, and totals in seconds.',
          icon: Sparkles,
          color: 'text-emerald-600',
        },
        {
          title: 'Review Line Items',
          desc: 'Edit or verify item descriptions and prices before submitting for Store Owner approval.',
          icon: FileText,
          color: 'text-blue-600',
        },
      ],
    },
    {
      badge: 'Invoice Tracking',
      title: 'My Invoices & Status Tracking',
      subtitle: 'Track the status of all invoices you uploaded in real time.',
      icon: FileText,
      iconBg: 'bg-blue-600',
      highlights: [
        {
          title: 'Status Indicators',
          desc: 'See which invoices are Pending Owner Verification versus Approved and Paid.',
          icon: Clock,
          color: 'text-amber-600',
        },
        {
          title: 'Audit Trail',
          desc: 'Every invoice records upload time and date, along with the staff member who processed it.',
          icon: CheckCircle2,
          color: 'text-emerald-600',
        },
        {
          title: 'Filter & Search',
          desc: 'Find any past invoice by invoice number, vendor name, or date range instantly.',
          icon: Layers,
          color: 'text-indigo-600',
        },
      ],
    },
    {
      badge: 'Security & Profile',
      title: 'Password Change & Daily Access',
      subtitle: 'Manage your credentials and access the product tour whenever you need a refresher.',
      icon: KeyRound,
      iconBg: 'bg-emerald-700',
      highlights: [
        {
          title: 'Change Password Anytime',
          desc: 'Click "Password" in your sidebar or "Change Password" in the top bar to update your credentials.',
          icon: KeyRound,
          color: 'text-emerald-600',
        },
        {
          title: 'Midnight 12:00 AM Reset',
          desc: 'Automated daily logout ensures fresh authentication each workday.',
          icon: Clock,
          color: 'text-indigo-600',
        },
        {
          title: 'Revisit Product Tour',
          desc: 'Click the "Product Tour" bubble next to your profile in the sidebar anytime to view this guide again.',
          icon: Sparkles,
          color: 'text-purple-600',
        },
      ],
    },
  ];

  const steps = isOwner ? ownerSteps : staffSteps;
  const step = steps[currentStep];
  const StepIcon = step.icon;
  const isLast = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      onClose();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-xl overflow-hidden transform transition-all z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl ${step.iconBg} text-white flex items-center justify-center shadow-xs`}>
              <StepIcon className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600">
                {step.badge}
              </span>
              <p className="text-xs text-slate-400 font-medium">
                Step {currentStep + 1} of {steps.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Step Dots */}
            <div className="flex items-center gap-1.5 mr-2">
              {steps.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentStep(idx)}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentStep
                      ? 'w-6 bg-indigo-600'
                      : 'w-1.5 bg-slate-200 hover:bg-slate-300'
                  }`}
                  title={`Go to step ${idx + 1}`}
                />
              ))}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
              title="Close Tour"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 h-1">
          <div
            className="h-1 bg-gradient-to-r from-indigo-600 to-indigo-500 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Tour Body */}
        <div className="p-6 sm:p-7 space-y-5">
          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-snug">
              {step.title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
              {step.subtitle}
            </p>
          </div>

          {/* Highlights List */}
          <div className="space-y-2.5">
            {step.highlights.map((h, i) => {
              const HIcon = h.icon;
              return (
                <div
                  key={i}
                  className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100 hover:border-slate-200/90 transition flex items-start gap-3"
                >
                  <div className={`p-2 rounded-xl bg-white shadow-2xs ${h.color} flex-shrink-0 mt-0.5`}>
                    <HIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-900 leading-tight">
                      {h.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      {h.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tour Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-slate-400 hover:text-slate-600 transition"
          >
            Skip Tour
          </button>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-100 transition active:scale-[0.98]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className={`flex items-center gap-1.5 px-5 py-2 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-[0.98] ${
                isLast
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100'
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'
              }`}
            >
              <span>{isLast ? "Done, Let's Get Started!" : 'Next Step'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
