import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  Layers,
  Clock,
  Bell,
  ClipboardList,
  CreditCard,
  TrendingUp,
  FileSpreadsheet,
  Package
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ProductTourModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isOwner } = useAuth();

  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [cardPosition, setCardPosition] = useState({ top: 0, left: 0, placement: 'center' });
  const [isTargetFound, setIsTargetFound] = useState(false);
  const tooltipRef = useRef(null);
  const retryTimerRef = useRef(null);

  // =========================================================================
  // 1. OWNER TOUR STEPS: Comprehensive walkthrough of owner-specific features
  // =========================================================================
  const ownerSteps = [
    {
      id: 'brand-logo',
      target: '[data-tour="brand-logo"]',
      route: '/',
      badge: '👑 Store Owner Hub',
      title: 'Quontriz Invoza Supermarket System',
      icon: ScanText,
      iconBg: 'bg-indigo-600',
      explanation:
        'Your centralized supermarket invoice intake and financial command center. From real-time OCR bill extraction and supplier payment authorization to staff management and tax compliance, all store operations are orchestrated here.',
      tip: 'Current branch: City Supermarket Central (Owner mode enabled with unrestricted access).',
      preferredPlacement: 'right'
    },
    {
      id: 'dashboard-kpis',
      target: '[data-tour="dashboard-kpis"]',
      route: '/',
      badge: 'Executive Spend Analytics',
      title: 'Total Invoices, Spend & Tax Breakdown',
      icon: TrendingUp,
      iconBg: 'bg-emerald-600',
      explanation:
        'Instant financial health metrics: Live count of pending vs paid bills, gross store spending, and automated calculation of CGST, SGST, and IGST to ensure audit-ready GST filing for your supermarket.',
      tip: 'Values update instantaneously as staff upload bills and you authorize payments.',
      preferredPlacement: 'bottom'
    },
    {
      id: 'pending-approvals',
      target: '[data-tour="pending-approvals"]',
      route: '/',
      badge: 'Cashflow & Verification',
      title: 'Pending Staff Uploads & Payment Authorization',
      icon: Clock,
      iconBg: 'bg-amber-500',
      explanation:
        'Invoices digitized by store staff land here awaiting your owner review. Inspect extracted line items side-by-side with original receipts and record instant payments via UPI, Cash, Cheque, or NetBanking.',
      tip: 'Staff cannot authorize supplier disbursements — only owners hold payment privileges.',
      preferredPlacement: 'top'
    },
    {
      id: 'dashboard-charts',
      target: '[data-tour="dashboard-charts"]',
      route: '/',
      badge: 'Visual Intelligence',
      title: 'Monthly Spend Trends & Category Distribution',
      icon: Layers,
      iconBg: 'bg-purple-600',
      explanation:
        'Interactive financial graphs visualizing month-over-month expenses, supplier purchasing volume, and department budget allocations (Grocery, Dairy, FMCG, Electronics, Hamali, etc.).',
      tip: 'Hover over chart points and slices to inspect exact itemized expense sums.',
      preferredPlacement: 'top'
    },
    {
      id: 'nav-invoices',
      target: '[data-tour="nav-invoices"]',
      route: '/',
      badge: 'Audit & Records',
      title: 'Invoices & Audit Directory',
      icon: FileText,
      iconBg: 'bg-blue-600',
      explanation:
        'Master historical directory of every invoice uploaded. Filter by status (Pending, Approved, Paid), search by vendor, review OCR raw text side-by-side, and download audit-ready PDF archives.',
      tip: 'Includes full audit trail tracking the exact staff member who uploaded each bill.',
      preferredPlacement: 'right'
    },
    {
      id: 'nav-requirements',
      target: '[data-tour="nav-requirements"]',
      route: '/',
      badge: 'Procurement Control',
      title: 'Store Restock Requirements',
      icon: ClipboardList,
      iconBg: 'bg-teal-600',
      explanation:
        'When shelves run low on groceries or items, floor staff submit restock requirements here. As owner, you can approve, reject, or mark supplies as ordered with one click.',
      tip: 'Keep supermarket inventory healthy without relying on verbal messages or paper chits.',
      preferredPlacement: 'right'
    },
    {
      id: 'nav-users',
      target: '[data-tour="nav-users"]',
      route: '/',
      badge: 'Team & RBAC Security',
      title: 'Staff & Co-Owner Management (Dual OTP)',
      icon: Users,
      iconBg: 'bg-rose-600',
      explanation:
        'Create and manage store staff accounts (upload-only) and co-owners. Staff passwords remain strictly confidential from owners. Deleting a co-owner requires mandatory dual-owner OTP verification sent to both registered emails.',
      tip: 'New staff accounts default to staff123, and owner accounts default to owner123 on creation.',
      preferredPlacement: 'right'
    },
    {
      id: 'notifications-bell',
      target: '[data-tour="notifications-bell"]',
      route: '/',
      badge: 'Real-Time Alerts',
      title: 'Store Notification Center',
      icon: Bell,
      iconBg: 'bg-indigo-500',
      explanation:
        'Receive instant notifications the moment staff uploads an invoice or submits a stock shortage. Click any notification to jump directly into the bill verification screen.',
      tip: 'Unread badge counts highlight actionable store events requiring your attention.',
      preferredPlacement: 'bottom'
    },
    {
      id: 'user-profile',
      target: '[data-tour="user-profile"]',
      route: '/',
      badge: 'Credentials & Security',
      title: 'Owner Profile & Tour Relauncher',
      icon: KeyRound,
      iconBg: 'bg-slate-800',
      explanation:
        'Update your password anytime with bcrypt encryption. Active sessions reset every midnight for maximum store security. You can also click the arrow button here anytime to relaunch this interactive walkthrough!',
      tip: 'Use the arrow icon to trigger this tour whenever new store managers join.',
      preferredPlacement: 'right'
    }
  ];

  // =========================================================================
  // 2. STAFF TOUR STEPS: Tailored strictly to floor staff workflow
  // =========================================================================
  const staffSteps = [
    {
      id: 'brand-logo',
      target: '[data-tour="brand-logo"]',
      route: '/upload',
      badge: '📋 Store Staff Portal',
      title: 'Staff Invoice Intake Workstation',
      icon: ScanText,
      iconBg: 'bg-emerald-600',
      explanation:
        'Welcome to your dedicated invoice workstation! Designed for quick invoice scanning, paper receipt digitizing, and shelf shortage requests without financial or administrative complexity.',
      tip: 'Your portal focuses on fast document entry and tracking daily uploads.',
      preferredPlacement: 'right'
    },
    {
      id: 'upload-dropzone',
      target: '[data-tour="upload-dropzone"]',
      route: '/upload',
      badge: 'Fast Document Intake',
      title: 'Invoice & Bill Dropzone',
      icon: UploadCloud,
      iconBg: 'bg-indigo-600',
      explanation:
        'Drag and drop vendor bills, receipts, or cash memos here in PDF, PNG, or JPG formats (up to 15MB). You can also click "Browse File" to select documents directly from your device.',
      tip: 'Supports photos taken from your mobile camera as well as scanned multi-page PDFs.',
      preferredPlacement: 'bottom'
    },
    {
      id: 'sample-invoices',
      target: '[data-tour="sample-invoices"]',
      route: '/upload',
      badge: 'Instant Testing Presets',
      title: 'Sample Test Invoice Presets',
      icon: FileSpreadsheet,
      iconBg: 'bg-amber-500',
      explanation:
        'Test the OCR system immediately without searching for files! Click any preset — Kirana Store Chit, Chemist Prescription Bill, Mandi Wholesale Bilty, Thermal POS Receipt, or Digital Electronics Invoice — to test auto-extraction.',
      tip: 'Click any test card to see how handwritten shorthand and messy bills are parsed in seconds.',
      preferredPlacement: 'top'
    },
    {
      id: 'upload-tabs',
      target: '[data-tour="upload-tabs"]',
      route: '/upload',
      badge: 'AI Extraction & Manual Entry',
      title: 'Automated OCR & Manual Fallback',
      icon: Sparkles,
      iconBg: 'bg-blue-600',
      explanation:
        'The built-in AI automatically detects vendor names, dates, amounts, GSTIN, and individual line items. If a paper receipt is badly torn or faded, toggle to "Manual Invoice Entry" to type line items manually.',
      tip: 'After extraction, you can verify item descriptions before submitting to the store owner.',
      preferredPlacement: 'bottom'
    },
    {
      id: 'nav-invoices',
      target: '[data-tour="nav-invoices"]',
      route: '/upload',
      badge: 'Upload Tracking',
      title: 'My Invoices & Real-Time Status',
      icon: FileText,
      iconBg: 'bg-emerald-600',
      explanation:
        'Track every bill you have uploaded. Check real-time statuses to see which invoices are "Pending Owner Verification" versus "Approved & Paid" by the store owner.',
      tip: 'Search past bills by invoice number or vendor name whenever delivery drivers ask.',
      preferredPlacement: 'right'
    },
    {
      id: 'nav-requirements',
      target: '[data-tour="nav-requirements"]',
      route: '/upload',
      badge: 'Shelf Stock Requisitions',
      title: 'Request Out-of-Stock Items',
      icon: ClipboardList,
      iconBg: 'bg-purple-600',
      explanation:
        'Notice supermarket shelves running low on milk, pulses, snacks, or cleaning supplies? Submit an urgent requirement request directly to the store owner for purchase.',
      tip: 'You will receive an alert as soon as the owner marks the stock as purchased.',
      preferredPlacement: 'right'
    },
    {
      id: 'notifications-bell',
      target: '[data-tour="notifications-bell"]',
      route: '/upload',
      badge: 'Real-Time Alerts',
      title: 'Staff Notification Center',
      icon: Bell,
      iconBg: 'bg-indigo-500',
      explanation:
        'Get immediate notifications whenever the store owner verifies your uploaded bill, authorizes supplier payment, or responds to your supermarket shelf requests.',
      tip: 'Click any notification to open the updated invoice record.',
      preferredPlacement: 'bottom'
    },
    {
      id: 'user-profile',
      target: '[data-tour="user-profile"]',
      route: '/upload',
      badge: 'Staff Security',
      title: 'Staff Profile & Password Security',
      icon: KeyRound,
      iconBg: 'bg-slate-800',
      explanation:
        'Change your password securely anytime. Remember: store owners cannot see your password. You can also click the arrow button in this card anytime to replay this interactive walkthrough!',
      tip: 'Default password was staff123 — change it to your private password for security.',
      preferredPlacement: 'right'
    }
  ];

  const steps = isOwner ? ownerSteps : staffSteps;
  const step = steps[currentStep] || steps[0];
  const StepIcon = step?.icon || Sparkles;
  const isLast = currentStep === steps.length - 1;

  // =========================================================================
  // 3. TARGET POSITIONING & SMART VIEWPORT CLAMPING
  // =========================================================================
  const updateTargetPosition = useCallback(() => {
    if (!step || !isOpen) return;

    const el = document.querySelector(step.target);
    if (!el) {
      setIsTargetFound(false);
      setTargetRect(null);
      // Fallback: Centered card
      setCardPosition({
        top: Math.max(80, window.innerHeight / 2 - 160),
        left: Math.max(16, window.innerWidth / 2 - 192),
        placement: 'center'
      });
      return;
    }

    setIsTargetFound(true);

    // Scroll element into view smoothly if out of viewport
    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });

    const rect = el.getBoundingClientRect();
    const padding = 8;
    setTargetRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      bottom: rect.bottom,
      right: rect.right
    });

    // Tooltip card dimensions (standard width 380px, est height 300px)
    const cardW = Math.min(384, window.innerWidth - 32);
    const cardH = 290;
    const pref = step.preferredPlacement || 'bottom';

    let top = 0;
    let left = 0;
    let actualPlacement = pref;

    if (pref === 'right') {
      top = rect.top + rect.height / 2 - cardH / 2;
      left = rect.right + padding + 16;
      if (left + cardW > window.innerWidth - 16) {
        // Flip to bottom or left
        if (rect.bottom + cardH + 16 < window.innerHeight) {
          actualPlacement = 'bottom';
          top = rect.bottom + padding + 14;
          left = rect.left + rect.width / 2 - cardW / 2;
        } else {
          actualPlacement = 'left';
          left = rect.left - padding - cardW - 16;
        }
      }
    } else if (pref === 'top') {
      top = rect.top - padding - cardH - 14;
      left = rect.left + rect.width / 2 - cardW / 2;
      if (top < 16) {
        actualPlacement = 'bottom';
        top = rect.bottom + padding + 14;
      }
    } else if (pref === 'left') {
      top = rect.top + rect.height / 2 - cardH / 2;
      left = rect.left - padding - cardW - 16;
      if (left < 16) {
        actualPlacement = 'bottom';
        top = rect.bottom + padding + 14;
        left = rect.left + rect.width / 2 - cardW / 2;
      }
    } else {
      // Bottom
      top = rect.bottom + padding + 14;
      left = rect.left + rect.width / 2 - cardW / 2;
      if (top + cardH > window.innerHeight - 16) {
        actualPlacement = 'top';
        top = rect.top - padding - cardH - 14;
      }
    }

    // Clamp inside viewport
    const clampedLeft = Math.max(16, Math.min(left, window.innerWidth - cardW - 16));
    const clampedTop = Math.max(16, Math.min(top, window.innerHeight - cardH - 16));

    setCardPosition({
      top: clampedTop,
      left: clampedLeft,
      placement: actualPlacement
    });
  }, [step, isOpen]);

  // Synchronize route and find DOM element
  useEffect(() => {
    if (!isOpen || !step) return;

    if (step.route && location.pathname !== step.route) {
      navigate(step.route);
    }

    // Retry checking DOM element as route renders
    let attempts = 0;
    const checkDom = () => {
      attempts += 1;
      const el = document.querySelector(step.target);
      if (el) {
        updateTargetPosition();
      } else if (attempts < 6) {
        retryTimerRef.current = setTimeout(checkDom, 120);
      } else {
        updateTargetPosition();
      }
    };

    const timer = setTimeout(checkDom, 100);

    return () => {
      clearTimeout(timer);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [currentStep, isOpen, step, location.pathname, navigate, updateTargetPosition]);

  // Listen to window scroll & resize to adjust spotlight
  useEffect(() => {
    if (!isOpen) return;

    const handleWindowChange = () => {
      updateTargetPosition();
    };

    window.addEventListener('resize', handleWindowChange);
    window.addEventListener('scroll', handleWindowChange, true);

    return () => {
      window.removeEventListener('resize', handleWindowChange);
      window.removeEventListener('scroll', handleWindowChange, true);
    };
  }, [isOpen, updateTargetPosition]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        if (isLast) {
          handleClose();
        } else {
          setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentStep((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLast, steps.length]);

  const handleNext = () => {
    if (isLast) {
      handleClose();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  const padding = 8;

  return (
    <div className="fixed inset-0 z-[9990] overflow-hidden select-none">
      {/* 1. Dark Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-slate-950/65 backdrop-blur-[2px] transition-opacity duration-300 pointer-events-auto"
        onClick={handleClose}
      />

      {/* 2. Spotlight Highlight Frame around Target Element */}
      {targetRect && isTargetFound && (
        <div
          className="fixed pointer-events-none transition-all duration-300 ease-out z-[9992]"
          style={{
            top: `${Math.max(0, targetRect.top - padding)}px`,
            left: `${Math.max(0, targetRect.left - padding)}px`,
            width: `${targetRect.width + padding * 2}px`,
            height: `${targetRect.height + padding * 2}px`,
            borderRadius: '16px',
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.72), 0 0 30px rgba(99, 102, 241, 0.55)',
            border: '2px solid #6366f1'
          }}
        >
          {/* Pulsing Animated Step Beacon Badge */}
          <div className="absolute -top-3 -right-3 flex items-center justify-center">
            <span className="animate-ping absolute inline-flex h-7 w-7 rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-6 w-6 bg-indigo-600 text-white font-extrabold text-[11px] items-center justify-center shadow-lg border border-white">
              {currentStep + 1}
            </span>
          </div>
        </div>
      )}

      {/* 3. Floating Tooltip Explanation Card */}
      <div
        ref={tooltipRef}
        className="fixed z-[9999] w-96 max-w-[calc(100vw-32px)] transition-all duration-200 ease-out"
        style={{
          top: `${cardPosition.top}px`,
          left: `${cardPosition.left}px`
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header Bar */}
          <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-xl ${step.iconBg} text-white flex items-center justify-center shadow-xs`}>
                <StepIcon className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 block leading-tight">
                  {step.badge}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  Item {currentStep + 1} of {steps.length}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Step indicator dots */}
              <div className="flex items-center gap-1">
                {steps.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentStep(idx)}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === currentStep ? 'w-4 bg-indigo-600' : 'w-1.5 bg-slate-200 hover:bg-slate-300'
                    }`}
                    title={`Go to item ${idx + 1}`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition ml-1"
                title="Exit Tour (Esc)"
              >
                <X className="w-4 h-4" />
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

          {/* Card Body */}
          <div className="p-5 space-y-3.5">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight leading-snug">
                {step.title}
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed font-normal">
                {step.explanation}
              </p>
            </div>

            {/* Pro Tip Box */}
            {step.tip && (
              <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100/80 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-indigo-900 font-medium leading-relaxed">
                  {step.tip}
                </p>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="px-5 py-3.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleClose}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition"
            >
              Skip
            </button>

            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-100 transition active:scale-95"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                className={`flex items-center gap-1.5 px-4 py-1.5 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 ${
                  isLast
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                }`}
              >
                <span>{isLast ? 'Finish Tour' : 'Next Item'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
