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
  Tags,
  Layers,
  Settings,
  KeyRound,
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

  // Reset to step 0 whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  // =========================================================================
  // 1. OWNER TOUR STEPS: The 9 Sidebar Navigation Items (Short & Sweet)
  // =========================================================================
  const ownerSteps = [
    {
      id: 'nav-dashboard',
      target: '[data-tour="nav-dashboard"]',
      route: '/',
      badge: '📊 Spend & KPIs',
      title: 'Dashboard Overview',
      icon: LayoutDashboard,
      iconBg: 'bg-indigo-600',
      explanation: 'View real-time supermarket spend, pending bill counts, and automated GST tax breakdowns.',
      tip: 'KPIs and monthly expense charts update automatically as invoices arrive.',
      preferredPlacement: 'right'
    },
    {
      id: 'nav-invoices',
      target: '[data-tour="nav-invoices"]',
      route: '/invoices',
      badge: '🧾 Invoices & Audit',
      title: 'Invoices Directory',
      icon: FileText,
      iconBg: 'bg-blue-600',
      explanation: 'Inspect, verify, and approve all supplier bills digitized by your store staff.',
      tip: 'Record instant payments via UPI, Cash, Cheque, or NetBanking.',
      preferredPlacement: 'right'
    },
    {
      id: 'nav-requirements',
      target: '[data-tour="nav-requirements"]',
      route: '/requirements',
      badge: '📦 Stock Control',
      title: 'Required Items',
      icon: ClipboardList,
      iconBg: 'bg-teal-600',
      explanation: 'Manage supermarket shelf restocking requests submitted by floor staff in real time.',
      tip: 'Approve or mark items ordered with one click to keep inventory full.',
      preferredPlacement: 'right'
    },
    {
      id: 'nav-upload',
      target: '[data-tour="nav-upload"]',
      route: '/upload',
      badge: '⚡ Bill Intake',
      title: 'Upload / Manual Entry',
      icon: UploadCloud,
      iconBg: 'bg-violet-600',
      explanation: 'Scan supplier invoices with AI OCR or manually enter itemized bills directly.',
      tip: 'Test sample presets to see instant line-item and GST extraction.',
      preferredPlacement: 'right'
    },
    {
      id: 'nav-users',
      target: '[data-tour="nav-users"]',
      route: '/users',
      badge: '👥 Team & Security',
      title: 'Team & Staff',
      icon: Users,
      iconBg: 'bg-rose-600',
      explanation: 'Manage store staff accounts and co-owners with role-based access control.',
      tip: 'Staff passwords remain confidential and are never visible to store owners.',
      preferredPlacement: 'right'
    },
    {
      id: 'nav-vendors',
      target: '[data-tour="nav-vendors"]',
      route: '/vendors',
      badge: '🏢 Supplier Hub',
      title: 'Vendors Directory',
      icon: Building2,
      iconBg: 'bg-emerald-600',
      explanation: 'Maintain your supplier directory with GSTIN numbers, contact details, and payment terms.',
      tip: 'Automatically links to invoices when matching vendor names or GSTIN.',
      preferredPlacement: 'right'
    },
    {
      id: 'nav-categories',
      target: '[data-tour="nav-categories"]',
      route: '/categories',
      badge: '🏷️ Expense Tagging',
      title: 'Categories',
      icon: Tags,
      iconBg: 'bg-amber-500',
      explanation: 'Classify store purchases into departments like Grocery, FMCG, Dairy, and Hamali.',
      tip: 'Powers itemized spending distribution analytics on your dashboard.',
      preferredPlacement: 'right'
    },
    {
      id: 'nav-vendor-types',
      target: '[data-tour="nav-vendor-types"]',
      route: '/vendor-types',
      badge: '📑 Supplier Tiers',
      title: 'Vendor Types',
      icon: Layers,
      iconBg: 'bg-cyan-600',
      explanation: 'Group suppliers into Wholesale, Distributor, Local Vendor, and Direct Manufacturer.',
      tip: 'Helps track purchase volume across different distributor channels.',
      preferredPlacement: 'right'
    },
    {
      id: 'nav-settings',
      target: '[data-tour="nav-settings"]',
      route: '/settings',
      badge: '⚙️ Store Config',
      title: 'Store Settings',
      icon: Settings,
      iconBg: 'bg-slate-700',
      explanation: 'Configure supermarket profile, tax calculation preferences, and default options.',
      tip: 'Ensure your store profile matches your official GST registration.',
      preferredPlacement: 'right'
    }
  ];

  // =========================================================================
  // 2. STAFF TOUR STEPS: The 3 Navigation Items (Short & Sweet)
  // =========================================================================
  const staffSteps = [
    {
      id: 'nav-upload',
      target: '[data-tour="nav-upload"]',
      route: '/upload',
      badge: '⚡ Invoice Intake',
      title: 'Upload Invoice PDF',
      icon: UploadCloud,
      iconBg: 'bg-indigo-600',
      explanation: 'Upload vendor bills and paper receipts for automatic OCR extraction or manual entry.',
      tip: 'Drag and drop PDF files or mobile photos up to 15 MB.',
      preferredPlacement: 'right'
    },
    {
      id: 'nav-invoices',
      target: '[data-tour="nav-invoices"]',
      route: '/invoices',
      badge: '📋 My Uploads',
      title: 'My Invoices',
      icon: FileText,
      iconBg: 'bg-emerald-600',
      explanation: 'Track verification and payment statuses for every invoice you have uploaded.',
      tip: 'Search past bills anytime delivery agents or suppliers ask for updates.',
      preferredPlacement: 'right'
    },
    {
      id: 'nav-requirements',
      target: '[data-tour="nav-requirements"]',
      route: '/requirements',
      badge: '📦 Stock Requisitions',
      title: 'Required Items',
      icon: ClipboardList,
      iconBg: 'bg-purple-600',
      explanation: 'Request urgent stock replenishments from the store owner when supermarket shelves run low.',
      tip: 'Receive an instant notification once the owner orders the supplies.',
      preferredPlacement: 'right'
    }
  ];

  const steps = isOwner ? ownerSteps : staffSteps;
  const step = steps[currentStep] || steps[0];
  const StepIcon = step?.icon || Sparkles;
  const isLast = currentStep === steps.length - 1;

  // =========================================================================
  // 3. TARGET POSITIONING & SMART VIEWPORT CLAMPING (NO OVERFLOW)
  // =========================================================================
  const updateTargetPosition = useCallback(() => {
    if (!step || !isOpen) return;

    const el = document.querySelector(step.target);
    if (!el) {
      setIsTargetFound(false);
      setTargetRect(null);
      // Fallback: Centered card
      setCardPosition({
        top: Math.max(80, (window.innerHeight - 210) / 2),
        left: Math.max(16, (window.innerWidth - 350) / 2),
        placement: 'center'
      });
      return;
    }

    setIsTargetFound(true);

    const initialRect = el.getBoundingClientRect();
    const isLarge = initialRect.height > 250 || initialRect.height > window.innerHeight * 0.42;

    // Check if element is already comfortably in viewport before scrolling
    const isInView = initialRect.top >= 48 && initialRect.bottom <= window.innerHeight - 16;
    if (!isInView) {
      if (isLarge) {
        // For oversized targets, align to start so top is visible
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

    // Real measured dimensions with fallback (compact footprint: 350px width, ~200px height)
    const cardW = Math.min(350, window.innerWidth - 32);
    const cardH = tooltipRef.current?.offsetHeight || 205;
    const pref = step.preferredPlacement || 'right';

    let top = 0;
    let left = 0;
    let actualPlacement = pref;

    if (isLarge) {
      // OVERSIZED ELEMENT STRATEGY (Prevents card overflowing below viewport):
      // Priority 1: Place to the right if there is ample margin
      if (window.innerWidth - rect.right >= cardW + 24) {
        actualPlacement = 'right';
        top = Math.max(20, rect.top + 16);
        left = rect.right + padding + 14;
      }
      // Priority 2: Place above the element if headroom exists
      else if (rect.top >= cardH + 24) {
        actualPlacement = 'top';
        top = rect.top - padding - cardH - 12;
        left = Math.max(16, rect.left + (rect.width - cardW) / 2);
      }
      // Priority 3: Place to the left if space exists
      else if (rect.left >= cardW + 24) {
        actualPlacement = 'left';
        top = Math.max(20, rect.top + 16);
        left = rect.left - padding - cardW - 14;
      }
      // Priority 4: Dock inside visible viewport bottom (pinned with safe margins)
      else {
        actualPlacement = 'center';
        top = Math.max(20, window.innerHeight - cardH - 24);
        left = Math.max(16, (window.innerWidth - cardW) / 2);
      }
    } else if (pref === 'right') {
      top = rect.top + rect.height / 2 - cardH / 2;
      left = rect.right + padding + 14;
      if (left + cardW > window.innerWidth - 16) {
        if (rect.left - padding - cardW - 14 >= 16) {
          actualPlacement = 'left';
          left = rect.left - padding - cardW - 14;
        } else {
          actualPlacement = 'bottom';
          top = rect.bottom + padding + 12;
          left = rect.left + rect.width / 2 - cardW / 2;
        }
      }
    } else if (pref === 'top') {
      top = rect.top - padding - cardH - 12;
      left = rect.left + rect.width / 2 - cardW / 2;
      if (top < 16) {
        actualPlacement = 'bottom';
        top = rect.bottom + padding + 12;
      }
    } else if (pref === 'left') {
      top = rect.top + rect.height / 2 - cardH / 2;
      left = rect.left - padding - cardW - 14;
      if (left < 16) {
        actualPlacement = 'bottom';
        top = rect.bottom + padding + 12;
        left = rect.left + rect.width / 2 - cardW / 2;
      }
    } else {
      // Bottom
      top = rect.bottom + padding + 12;
      left = rect.left + rect.width / 2 - cardW / 2;
      if (top + cardH > window.innerHeight - 20) {
        actualPlacement = 'top';
        top = rect.top - padding - cardH - 12;
      }
    }

    // STRICT VIEWPORT CLAMPING:
    // Guarantees the card and its Next button NEVER exceed visible screen bounds!
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
      {/* 1. Backdrop Overlay (No blur effect, transparent when spotlight is active) */}
      <div
        className={`fixed inset-0 transition-opacity duration-300 pointer-events-auto ${
          targetRect && isTargetFound ? 'bg-transparent' : 'bg-slate-950/60'
        }`}
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
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.55)',
            border: '2px solid #6366f1'
          }}
        >
          {/* Pulsing Animated Step Beacon Badge */}
          <div className="absolute -top-3 -right-3 flex items-center justify-center">
            <span className="animate-ping absolute inline-flex h-6 w-6 rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-5.5 w-5.5 bg-indigo-600 text-white font-extrabold text-[10px] items-center justify-center shadow-lg border border-white">
              {currentStep + 1}
            </span>
          </div>
        </div>
      )}

      {/* 3. Floating Tooltip Explanation Card (Strictly Viewport-Clamped, Short & Sweet) */}
      <div
        ref={tooltipRef}
        className="fixed z-[9999] w-[350px] max-w-[calc(100vw-32px)] transition-all duration-200 ease-out pointer-events-auto"
        style={{
          top: `${cardPosition.top}px`,
          left: `${cardPosition.left}px`,
          maxHeight: 'calc(100vh - 32px)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
          {/* Header Bar */}
          <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-lg ${step.iconBg} text-white flex items-center justify-center shadow-2xs`}>
                <StepIcon className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 block leading-tight">
                  {step.badge}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
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
                      idx === currentStep ? 'w-3.5 bg-indigo-600' : 'w-1.5 bg-slate-200 hover:bg-slate-300'
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

          {/* Card Body (Short and Sweet) */}
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
                <p className="text-[11px] text-indigo-900 font-medium leading-snug">
                  {step.tip}
                </p>
              </div>
            )}
          </div>

          {/* Footer Controls (Always Visible, Pinned) */}
          <div className="px-4 py-2.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between flex-shrink-0">
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
