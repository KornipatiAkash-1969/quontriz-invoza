import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  UploadCloud,
  FileText,
  Users,
  Building2,
  Tags,
  Layers,
  Settings,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  Clock,
  Bell,
  ClipboardList,
  CreditCard,
  TrendingUp,
  Package,
  Bot
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

  // Reset to step 0 whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  // =========================================================================
  // 1. OWNER TOUR STEPS: Real Feature Highlights Across the Application
  // =========================================================================
  const ownerSteps = [
    {
      id: 'dashboard-kpis',
      target: '[data-tour="dashboard-kpis"], [data-tour="nav-dashboard"]',
      route: '/',
      badge: '📊 Live Overview',
      title: 'Supermarket Spend & Key Metrics',
      icon: LayoutDashboard,
      iconBg: 'bg-indigo-600',
      explanation: 'View real-time supermarket spend, pending bill counts, and automated GST tax breakdowns.',
      tip: 'KPIs and status counters update automatically as invoices are uploaded.',
      preferredPlacement: 'bottom'
    },
    {
      id: 'pending-approvals',
      target: '[data-tour="pending-approvals"]',
      route: '/',
      badge: '⚡ 1-Tap Approvals',
      title: 'Pending Invoices & Instant Payments',
      icon: CreditCard,
      iconBg: 'bg-amber-500',
      explanation: 'Inspect bills uploaded by staff awaiting owner approval. Approve and settle payments with 1 tap via UPI, Bank Transfer, Card, or Cash.',
      tip: 'Settling payments records an instant audit timestamp and updates store ledger balances.',
      preferredPlacement: 'top'
    },
    {
      id: 'dashboard-charts',
      target: '[data-tour="dashboard-charts"]',
      route: '/',
      badge: '📈 Expense Insights',
      title: 'Monthly Expense & Category Analytics',
      icon: TrendingUp,
      iconBg: 'bg-blue-600',
      explanation: 'Visualize supermarket spending trends and departmental breakdowns across Grocery, FMCG, Dairy, and Staples.',
      tip: 'Helps identify vendor price fluctuations and manage monthly supermarket cash flow.',
      preferredPlacement: 'top'
    },
    {
      id: 'upload-dropzone',
      target: '[data-tour="upload-dropzone"], [data-tour="nav-upload"]',
      route: '/upload',
      badge: '📄 Multimodal OCR',
      title: 'AI OCR Intake & Manual Entry',
      icon: UploadCloud,
      iconBg: 'bg-violet-600',
      explanation: 'Upload supplier invoices as digital PDF or mobile photos (PNG, JPG, WebP). Multimodal AI extracts vendor names, items, quantities, and GST.',
      tip: 'You can also switch to manual entry to record hand-written bills directly into the database.',
      preferredPlacement: 'bottom'
    },
    {
      id: 'invoices-directory',
      target: '[data-tour="invoices-header"], [data-tour="nav-invoices"]',
      route: '/invoices',
      badge: '🧾 Full Audit Trail',
      title: 'Invoices Audit Directory & Vouchers',
      icon: FileText,
      iconBg: 'bg-emerald-600',
      explanation: 'Search, filter, audit, and download PDF payment vouchers for all digitized supermarket invoices.',
      tip: 'On mobile screens, invoices automatically transform into responsive high-density touch cards.',
      preferredPlacement: 'bottom'
    },
    {
      id: 'requirements-stock',
      target: '[data-tour="requirements-header"], [data-tour="nav-requirements"]',
      route: '/requirements',
      badge: '📦 Stock Control',
      title: 'Shelf Replenishment Requisitions',
      icon: ClipboardList,
      iconBg: 'bg-teal-600',
      explanation: 'Manage supermarket shelf restocking requests submitted by floor staff in real time. Update statuses to Ordered or Completed with 1 click.',
      tip: 'Export all open purchase demands directly to Excel for bulk ordering from distributors.',
      preferredPlacement: 'bottom'
    },
    {
      id: 'users-rbac',
      target: '[data-tour="users-header"], [data-tour="nav-users"]',
      route: '/users',
      badge: '👥 Role Guarded (RBAC)',
      title: 'Staff Accounts & Access Security',
      icon: Users,
      iconBg: 'bg-rose-600',
      explanation: 'Manage store staff accounts and co-owners with role-based access control. Daily midnight session resets protect account security.',
      tip: 'Staff accounts are upload-only and can never approve payments or view confidential owner credentials.',
      preferredPlacement: 'bottom'
    },
    {
      id: 'vendors-hub',
      target: '[data-tour="vendors-header"], [data-tour="nav-vendors"]',
      route: '/vendors',
      badge: '🏢 GSTIN & Ledger',
      title: 'Supermarket Supplier Registry',
      icon: Building2,
      iconBg: 'bg-indigo-600',
      explanation: 'Maintain your supplier directory with GSTIN numbers, contact details, payment terms, and total lifetime spend.',
      tip: 'Click any supplier to view their invoice payment history and purchased items.',
      preferredPlacement: 'bottom'
    },
    {
      id: 'ai-support',
      target: '[data-tour="ai-support-btn"]',
      route: '/',
      badge: '🤖 24/7 Helpdesk',
      title: 'Interactive AI Support & Escalation',
      icon: Bot,
      iconBg: 'bg-indigo-700',
      explanation: 'Get instant answers about invoice OCR, payments, or stock requisitions. If your issue is unresolved, escalate directly to support@supermarket.com.',
      tip: 'Click the floating AI Support button anytime in the bottom right corner.',
      preferredPlacement: 'top'
    }
  ];

  // =========================================================================
  // 2. STAFF TOUR STEPS: Streamlined, Action-Oriented Steps
  // =========================================================================
  const staffSteps = [
    {
      id: 'upload-dropzone',
      target: '[data-tour="upload-dropzone"], [data-tour="nav-upload"]',
      route: '/upload',
      badge: '⚡ Quick Upload',
      title: 'Upload Supplier Invoices & Receipts',
      icon: UploadCloud,
      iconBg: 'bg-indigo-600',
      explanation: 'Upload vendor bills and delivery receipts (PDF or mobile photos) for automated OCR data extraction.',
      tip: 'Supports PDF, PNG, JPG, and WebP files up to 15 MB.',
      preferredPlacement: 'bottom'
    },
    {
      id: 'my-invoices',
      target: '[data-tour="invoices-header"], [data-tour="nav-invoices"]',
      route: '/invoices',
      badge: '📋 My Uploads',
      title: 'Track Verification & Owner Approval',
      icon: FileText,
      iconBg: 'bg-emerald-600',
      explanation: 'Track the status of all invoices you have uploaded as the store owner reviews and approves payments.',
      tip: 'Quickly find past bills when delivery agents or suppliers ask for updates.',
      preferredPlacement: 'bottom'
    },
    {
      id: 'stock-requisitions',
      target: '[data-tour="requirements-header"], [data-tour="nav-requirements"]',
      route: '/requirements',
      badge: '📦 Stock Demand',
      title: 'Request Store Shelf Restocking',
      icon: ClipboardList,
      iconBg: 'bg-purple-600',
      explanation: 'Request urgent stock replenishments from the store owner when supermarket shelves run low on items.',
      tip: 'Set priority levels (Urgent, High, Normal) so the owner orders critical stock first.',
      preferredPlacement: 'bottom'
    },
    {
      id: 'staff-support',
      target: '[data-tour="ai-support-btn"]',
      route: '/upload',
      badge: '🤖 Staff Helpdesk',
      title: 'AI Assistant & Ticket Escalation',
      icon: Bot,
      iconBg: 'bg-indigo-700',
      explanation: 'Ask questions about uploading invoices or stock requisitions. Unresolved questions can be escalated to support@supermarket.com.',
      tip: 'Click the AI Support button in the bottom right corner whenever you need assistance.',
      preferredPlacement: 'top'
    }
  ];

  const steps = isOwner ? ownerSteps : staffSteps;
  const step = steps[currentStep] || steps[0];
  const StepIcon = step?.icon || Sparkles;
  const isLast = currentStep === steps.length - 1;

  // =========================================================================
  // 3. TARGET POSITIONING & SMART VIEWPORT CLAMPING (ZERO BLUR, FULL NORMAL DISPLAY)
  // =========================================================================
  const updateTargetPosition = useCallback(() => {
    if (!step || !isOpen) return;

    const el = document.querySelector(step.target);
    if (!el) {
      setIsTargetFound(false);
      setTargetRect(null);
      // Fallback: Centered card
      setCardPosition({
        top: Math.max(80, (window.innerHeight - 220) / 2),
        left: Math.max(16, (window.innerWidth - 360) / 2),
        placement: 'center'
      });
      return;
    }

    setIsTargetFound(true);

    const initialRect = el.getBoundingClientRect();
    const isLarge = initialRect.height > 260 || initialRect.height > window.innerHeight * 0.45;

    // Check if element is already comfortably in viewport before scrolling
    const isInView = initialRect.top >= 54 && initialRect.bottom <= window.innerHeight - 20;
    if (!isInView) {
      if (isLarge) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
      } else {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    }

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

    // Real measured dimensions with fallback (card footprint: 360px width, ~210px height)
    const cardW = Math.min(360, window.innerWidth - 32);
    const cardH = tooltipRef.current?.offsetHeight || 210;
    const pref = step.preferredPlacement || 'bottom';

    let top = 0;
    let left = 0;
    let actualPlacement = pref;

    if (isLarge) {
      // OVERSIZED ELEMENT STRATEGY (Prevents card overflowing below viewport)
      if (window.innerWidth - rect.right >= cardW + 24) {
        actualPlacement = 'right';
        top = Math.max(20, rect.top + 16);
        left = rect.right + padding + 14;
      } else if (rect.top >= cardH + 24) {
        actualPlacement = 'top';
        top = rect.top - padding - cardH - 12;
        left = Math.max(16, rect.left + (rect.width - cardW) / 2);
      } else if (rect.left >= cardW + 24) {
        actualPlacement = 'left';
        top = Math.max(20, rect.top + 16);
        left = rect.left - padding - cardW - 14;
      } else {
        actualPlacement = 'center';
        top = Math.max(20, window.innerHeight - cardH - 24);
        left = Math.max(16, (window.innerWidth - cardW) / 2);
      }
    } else if (pref === 'bottom') {
      top = rect.bottom + padding + 12;
      left = rect.left + rect.width / 2 - cardW / 2;
      if (top + cardH > window.innerHeight - 20) {
        if (rect.top >= cardH + 24) {
          actualPlacement = 'top';
          top = rect.top - padding - cardH - 12;
        } else {
          actualPlacement = 'center';
          top = Math.max(20, window.innerHeight - cardH - 24);
        }
      }
    } else if (pref === 'top') {
      top = rect.top - padding - cardH - 12;
      left = rect.left + rect.width / 2 - cardW / 2;
      if (top < 16) {
        actualPlacement = 'bottom';
        top = rect.bottom + padding + 12;
      }
    } else if (pref === 'right') {
      top = rect.top + rect.height / 2 - cardH / 2;
      left = rect.right + padding + 14;
      if (left + cardW > window.innerWidth - 16) {
        actualPlacement = 'bottom';
        top = rect.bottom + padding + 12;
        left = rect.left + rect.width / 2 - cardW / 2;
      }
    } else {
      top = rect.bottom + padding + 12;
      left = rect.left + rect.width / 2 - cardW / 2;
    }

    // STRICT VIEWPORT CLAMPING: Card always fully visible on all mobile/desktop displays
    const minTop = 16;
    const maxTop = Math.max(minTop, window.innerHeight - cardH - 20);
    const clampedTop = Math.max(minTop, Math.min(top, maxTop));

    const minLeft = 16;
    const maxLeft = Math.max(minLeft, window.innerWidth - cardW - 16);
    const clampedLeft = Math.max(minLeft, Math.min(left, maxLeft));

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

    const timer = setTimeout(checkDom, 80);

    return () => {
      clearTimeout(timer);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [currentStep, isOpen, step, location.pathname, navigate, updateTargetPosition]);

  // Re-measure after component layout to ensure clamp accuracy
  useEffect(() => {
    if (!isOpen) return;
    const raf = requestAnimationFrame(() => {
      updateTargetPosition();
    });
    return () => cancelAnimationFrame(raf);
  }, [currentStep, isOpen, updateTargetPosition]);

  // Listen to window scroll & resize to adjust spotlight and card position
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
      {/* 1. Backdrop Overlay (Completely transparent: Zero blur, Zero dark veil, 100% normal page visibility) */}
      <div
        className="fixed inset-0 bg-transparent transition-opacity duration-300 pointer-events-auto"
        onClick={handleClose}
      />

      {/* 2. Spotlight Highlight Frame around Target Element (Crisp, High-Contrast Indigo Focus Ring, Zero Darkness) */}
      {targetRect && isTargetFound && (
        <div
          className="fixed pointer-events-none transition-all duration-300 ease-out z-[9992]"
          style={{
            top: `${Math.max(0, targetRect.top - padding)}px`,
            left: `${Math.max(0, targetRect.left - padding)}px`,
            width: `${targetRect.width + padding * 2}px`,
            height: `${targetRect.height + padding * 2}px`,
            borderRadius: '16px',
            border: '2.5px solid #4f46e5',
            boxShadow: '0 0 0 4px rgba(99, 102, 241, 0.35), 0 10px 25px -4px rgba(79, 70, 229, 0.25)',
            backgroundColor: 'rgba(99, 102, 241, 0.02)'
          }}
        >
          {/* Pulsing Animated Step Beacon Badge */}
          <div className="absolute -top-3.5 -right-3.5 flex items-center justify-center">
            <span className="animate-ping absolute inline-flex h-7 w-7 rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-6 w-6 bg-indigo-600 text-white font-extrabold text-[11px] items-center justify-center shadow-lg border-2 border-white">
              {currentStep + 1}
            </span>
          </div>
        </div>
      )}

      {/* 3. Floating Tooltip Explanation Card (Strictly Viewport-Clamped, Crystal Clear) */}
      <div
        ref={tooltipRef}
        className="fixed z-[9999] w-[360px] max-w-[calc(100vw-32px)] transition-all duration-200 ease-out pointer-events-auto"
        style={{
          top: `${cardPosition.top}px`,
          left: `${cardPosition.left}px`,
          maxHeight: 'calc(100vh - 32px)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
          {/* Header Bar */}
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-lg ${step.iconBg} text-white flex items-center justify-center shadow-2xs`}>
                <StepIcon className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 block leading-tight">
                  {step.badge}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  Step {currentStep + 1} of {steps.length}
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
                      idx === currentStep ? 'w-3.5 bg-indigo-600' : 'w-1.5 bg-slate-200 hover:bg-slate-300'
                    }`}
                    title={`Jump to step ${idx + 1}`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition ml-1"
                title="Exit Tour (Esc)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Progress Line */}
          <div className="w-full bg-slate-100 h-0.5 flex-shrink-0">
            <div
              className="h-0.5 bg-gradient-to-r from-indigo-600 to-indigo-500 transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>

          {/* Card Body */}
          <div className="p-4 space-y-2.5 overflow-y-auto">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight leading-snug">
                {step.title}
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed font-normal">
                {step.explanation}
              </p>
            </div>

            {/* Pro Tip Box */}
            {step.tip && (
              <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100/80 flex items-start gap-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-indigo-950 font-medium leading-snug">
                  {step.tip}
                </p>
              </div>
            )}
          </div>

          {/* Footer Controls (Always Visible, Pinned) */}
          <div className="px-4 py-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between flex-shrink-0">
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
                  className="flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-100 transition active:scale-95"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Back</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 ${
                  isLast
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                }`}
              >
                <span>{isLast ? 'Finish Tour' : 'Next Item'}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
