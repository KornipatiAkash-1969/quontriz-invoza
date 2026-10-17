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
  const [cardPosition, setCardPosition] = useState({
    top: 0,
    left: 0,
    placement: 'center',
    arrowTop: 28
  });
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
  // 1. OWNER TOUR STEPS: In Strict Sidebar Top-to-Bottom Order
  // =========================================================================
  const ownerSteps = [
    {
      id: 'nav-dashboard',
      target: '[data-tour="nav-dashboard"]',
      route: '/',
      badge: '📊 1. Overview',
      title: 'Store Dashboard & KPI Metrics',
      icon: LayoutDashboard,
      iconBg: 'bg-indigo-600',
      explanation: 'View real-time supermarket spend, pending bill counts, monthly expense analytics, and automated GST tax breakdowns.',
      tip: 'KPI counters and expense charts update immediately as store invoices are uploaded.',
      preferredPlacement: 'right'
    },
    {
      id: 'nav-invoices',
      target: '[data-tour="nav-invoices"]',
      route: '/invoices',
      badge: '🧾 2. Invoices',
      title: 'Invoices Audit Directory & Vouchers',
      icon: FileText,
      iconBg: 'bg-indigo-600',
      explanation: 'Search, filter, audit, approve pending bills, and download PDF payment vouchers for all digitized supermarket invoices.',
      tip: 'Approve pending staff uploads with 1 tap via UPI, Bank Transfer, Card, or Cash.',
      preferredPlacement: 'right'
    },
    {
      id: 'nav-requirements',
      target: '[data-tour="nav-requirements"]',
      route: '/requirements',
      badge: '📦 3. Stock Control',
      title: 'Shelf Replenishment Requisitions',
      icon: ClipboardList,
      iconBg: 'bg-indigo-700',
      explanation: 'Manage supermarket shelf restocking requests submitted by floor staff in real time. Update statuses to Ordered or Completed.',
      tip: 'Export open purchase demands directly to Excel for bulk distributor orders.',
      preferredPlacement: 'right'
    },
    {
      id: 'nav-upload',
      target: '[data-tour="nav-upload"]',
      route: '/upload',
      badge: '📄 4. OCR Intake',
      title: 'AI OCR Intake & Manual Entry',
      icon: UploadCloud,
      iconBg: 'bg-violet-600',
      explanation: 'Upload supplier invoices as digital PDF or mobile photos (PNG, JPG, WebP). Multimodal AI extracts vendor names, items, quantities, and GST.',
      tip: 'You can also switch to manual entry to record hand-written bills directly into the database.',
      preferredPlacement: 'right'
    },
    {
      id: 'nav-users',
      target: '[data-tour="nav-users"]',
      route: '/users',
      badge: '👥 5. Team Access',
      title: 'Staff Accounts & RBAC Security',
      icon: Users,
      iconBg: 'bg-rose-600',
      explanation: 'Manage store staff accounts and co-owners with role-based access control. Daily midnight session resets protect account security.',
      tip: 'Staff accounts are upload-only and can never approve payments or view confidential owner credentials.',
      preferredPlacement: 'right'
    },
    {
      id: 'nav-vendors',
      target: '[data-tour="nav-vendors"]',
      route: '/vendors',
      badge: '🏢 6. Suppliers',
      title: 'Supermarket Supplier Registry',
      icon: Building2,
      iconBg: 'bg-indigo-600',
      explanation: 'Maintain your supplier directory with GSTIN numbers, contact details, payment terms, and total lifetime spend.',
      tip: 'Click any supplier to view their invoice payment history and purchased items.',
      preferredPlacement: 'right'
    },
    {
      id: 'nav-categories',
      target: '[data-tour="nav-categories"]',
      route: '/categories',
      badge: '🏷️ 7. Categories',
      title: 'Departmental Expense Classification',
      icon: Tags,
      iconBg: 'bg-amber-600',
      explanation: 'Organize store expenses across departments like Grocery, FMCG, Dairy, Beverages, Household, and Staples.',
      tip: 'Categorization feeds directly into your monthly spend charts and GST reports.',
      preferredPlacement: 'right'
    },
    {
      id: 'nav-vendor-types',
      target: '[data-tour="nav-vendor-types"]',
      route: '/vendor-types',
      badge: '📑 8. Supplier Tiers',
      title: 'Vendor Types & Distribution Channels',
      icon: Layers,
      iconBg: 'bg-cyan-600',
      explanation: 'Segment suppliers by business type such as Wholesaler, Direct Manufacturer, Local Farmer, or Distributor.',
      tip: 'Helps negotiate bulk volume discounts and analyze vendor tier expenditure.',
      preferredPlacement: 'right'
    },
    {
      id: 'nav-settings',
      target: '[data-tour="nav-settings"]',
      route: '/settings',
      badge: '⚙️ 9. Settings',
      title: 'Store Profile, OpenAI API & Security',
      icon: Settings,
      iconBg: 'bg-slate-700',
      explanation: 'Configure supermarket profile details, address, currency, OpenAI passkey, and security preferences.',
      tip: 'Owner passkeys are securely masked and protected with encrypted storage.',
      preferredPlacement: 'right'
    },
    {
      id: 'ai-support',
      target: '[data-tour="ai-support-btn"]',
      route: '/settings',
      badge: '🤖 10. Helpdesk',
      title: 'Interactive AI Support & Escalation',
      icon: Bot,
      iconBg: 'bg-indigo-700',
      explanation: 'Get instant answers about invoice OCR, payments, or stock requisitions. If your issue is unresolved, escalate directly to support@supermarket.com.',
      tip: 'Click the floating AI Support button anytime in the bottom right corner.',
      preferredPlacement: 'left'
    }
  ];

  // =========================================================================
  // 2. STAFF TOUR STEPS: In Strict Sidebar Top-to-Bottom Order
  // =========================================================================
  const staffSteps = [
    {
      id: 'nav-upload',
      target: '[data-tour="nav-upload"]',
      route: '/upload',
      badge: '⚡ 1. Upload',
      title: 'Upload Supplier Invoices & Receipts',
      icon: UploadCloud,
      iconBg: 'bg-emerald-600',
      explanation: 'Upload vendor bills and delivery receipts (PDF or mobile photos) for automated OCR data extraction.',
      tip: 'Supports PDF, PNG, JPG, and WebP files up to 15 MB.',
      preferredPlacement: 'right'
    },
    {
      id: 'nav-invoices',
      target: '[data-tour="nav-invoices"]',
      route: '/invoices',
      badge: '📋 2. My Invoices',
      title: 'Track Verification & Owner Approval',
      icon: FileText,
      iconBg: 'bg-teal-600',
      explanation: 'Track the status of all invoices you have uploaded as the store owner reviews and approves payments.',
      tip: 'Quickly find past bills when delivery agents or suppliers ask for updates.',
      preferredPlacement: 'right'
    },
    {
      id: 'nav-requirements',
      target: '[data-tour="nav-requirements"]',
      route: '/requirements',
      badge: '📦 3. Stock Demand',
      title: 'Request Store Shelf Restocking',
      icon: ClipboardList,
      iconBg: 'bg-emerald-700',
      explanation: 'Request urgent stock replenishments from the store owner when supermarket shelves run low on items.',
      tip: 'Set priority levels (Urgent, High, Normal) so the owner orders critical stock first.',
      preferredPlacement: 'right'
    },
    {
      id: 'staff-support',
      target: '[data-tour="ai-support-btn"]',
      route: '/requirements',
      badge: '🤖 4. Helpdesk',
      title: 'AI Assistant & Ticket Escalation',
      icon: Bot,
      iconBg: 'bg-teal-700',
      explanation: 'Ask questions about uploading invoices or stock requisitions. Unresolved questions can be escalated to support@supermarket.com.',
      tip: 'Click the AI Support button in the bottom right corner whenever you need assistance.',
      preferredPlacement: 'left'
    }
  ];

  const theme = isOwner
    ? {
        primary: 'indigo',
        hex: '#4f46e5',
        spotlightShadow: '0 0 0 4px rgba(99, 102, 241, 0.35), 0 10px 25px -4px rgba(79, 70, 229, 0.25)',
        spotlightBg: 'rgba(99, 102, 241, 0.03)',
        beaconPing: 'bg-indigo-400',
        beaconBadge: 'bg-indigo-600',
        badgeText: 'text-indigo-600',
        activeDot: 'bg-indigo-600',
        progressBar: 'from-indigo-600 to-indigo-500',
        tipBoxBg: 'bg-indigo-50/70 border-indigo-100/80',
        tipIcon: 'text-indigo-600',
        tipText: 'text-indigo-950',
        nextBtn: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200',
        finishBtn: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200',
      }
    : {
        primary: 'emerald',
        hex: '#059669',
        spotlightShadow: '0 0 0 4px rgba(16, 185, 129, 0.35), 0 10px 25px -4px rgba(5, 150, 105, 0.25)',
        spotlightBg: 'rgba(16, 185, 129, 0.03)',
        beaconPing: 'bg-emerald-400',
        beaconBadge: 'bg-emerald-600',
        badgeText: 'text-emerald-600',
        activeDot: 'bg-emerald-600',
        progressBar: 'from-emerald-600 to-emerald-500',
        tipBoxBg: 'bg-emerald-50/70 border-emerald-100/80',
        tipIcon: 'text-emerald-600',
        tipText: 'text-emerald-950',
        nextBtn: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200',
        finishBtn: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200',
      };

  const steps = isOwner ? ownerSteps : staffSteps;
  const step = steps[currentStep] || steps[0];
  const StepIcon = step?.icon || Sparkles;
  const isLast = currentStep === steps.length - 1;

  // Auto-open mobile sidebar when highlighting sidebar navigation item
  useEffect(() => {
    if (!isOpen) {
      window.dispatchEvent(new CustomEvent('set-mobile-sidebar-open', { detail: false }));
      return;
    }
    const isSidebarTarget = step?.target && step.target.includes('nav-');
    if (window.innerWidth < 1024 && isSidebarTarget) {
      window.dispatchEvent(new CustomEvent('set-mobile-sidebar-open', { detail: true }));
    }
  }, [isOpen, step]);

  // =========================================================================
  // 3. TARGET POSITIONING: ANCHORED BESIDE THE SIDEBAR WITH ARROW POINTER
  // =========================================================================
  const updateTargetPosition = useCallback(() => {
    if (!step || !isOpen) return;

    const el = document.querySelector(step.target);
    if (!el) {
      setIsTargetFound(false);
      setTargetRect(null);
      // Fallback: Centered card
      setCardPosition({
        top: Math.max(80, (window.innerHeight - 240) / 2),
        left: Math.max(16, (window.innerWidth - 360) / 2),
        placement: 'center',
        arrowTop: 28
      });
      return;
    }

    setIsTargetFound(true);

    const initialRect = el.getBoundingClientRect();
    const isSidebarTarget = step.target && step.target.includes('nav-');

    // Check if element is already comfortably in viewport before scrolling
    const isInView = initialRect.top >= 54 && initialRect.bottom <= window.innerHeight - 20;
    if (!isInView) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }

    const rect = el.getBoundingClientRect();
    const padding = 6;
    setTargetRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      bottom: rect.bottom,
      right: rect.right
    });

    // Real measured dimensions with fallback (card footprint: 360px width, ~220px height)
    const cardW = Math.min(360, window.innerWidth - 32);
    const cardH = tooltipRef.current?.offsetHeight || 220;
    const pref = step.preferredPlacement || (isSidebarTarget ? 'right' : 'bottom');

    let top = 0;
    let left = 0;
    let actualPlacement = pref;
    let arrowTop = 28;

    const targetCenterY = rect.top + (rect.height / 2);
    const targetCenterX = rect.left + (rect.width / 2);

    if (isSidebarTarget || pref === 'right') {
      const hasRoomOnRight = window.innerWidth - rect.right >= cardW + 20;
      if (hasRoomOnRight) {
        actualPlacement = 'right';
        // Anchor directly BESIDE the sidebar (at least 272px from screen edge on desktop)
        left = Math.max(rect.right + 18, 272);
        top = targetCenterY - (cardH / 2);
      } else {
        // Fallback for mobile screen
        actualPlacement = 'bottom';
        left = Math.max(16, (window.innerWidth - cardW) / 2);
        top = rect.bottom + 12;
      }
    } else if (pref === 'left') {
      const hasRoomOnLeft = rect.left >= cardW + 20;
      if (hasRoomOnLeft) {
        actualPlacement = 'left';
        left = rect.left - cardW - 18;
        top = targetCenterY - (cardH / 2);
      } else {
        actualPlacement = 'top';
        top = rect.top - cardH - 12;
        left = Math.max(16, targetCenterX - (cardW / 2));
      }
    } else if (pref === 'top') {
      top = rect.top - cardH - 12;
      left = targetCenterX - (cardW / 2);
      if (top < 16) {
        actualPlacement = 'bottom';
        top = rect.bottom + 12;
      }
    } else {
      // bottom
      top = rect.bottom + 12;
      left = targetCenterX - (cardW / 2);
      if (top + cardH > window.innerHeight - 20) {
        if (rect.top >= cardH + 24) {
          actualPlacement = 'top';
          top = rect.top - cardH - 12;
        } else {
          actualPlacement = 'center';
          top = Math.max(20, window.innerHeight - cardH - 24);
        }
      }
    }

    // STRICT VIEWPORT CLAMPING: Card always fully visible on all displays
    const minTop = 16;
    const maxTop = Math.max(minTop, window.innerHeight - cardH - 16);
    const clampedTop = Math.max(minTop, Math.min(top, maxTop));

    const minLeft = 16;
    const maxLeft = Math.max(minLeft, window.innerWidth - cardW - 16);
    const clampedLeft = Math.max(minLeft, Math.min(left, maxLeft));

    if (actualPlacement === 'right' || actualPlacement === 'left') {
      arrowTop = Math.max(18, Math.min(targetCenterY - clampedTop, cardH - 22));
    }

    setCardPosition({
      top: clampedTop,
      left: clampedLeft,
      placement: actualPlacement,
      arrowTop
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
    window.dispatchEvent(new CustomEvent('set-mobile-sidebar-open', { detail: false }));
    onClose();
  };

  if (!isOpen) return null;

  const padding = 6;

  return (
    <div className="fixed inset-0 z-[9990] overflow-hidden select-none">
      {/* 1. Backdrop Overlay (Completely transparent: Zero blur, Zero dark veil, 100% normal page visibility) */}
      <div
        className="fixed inset-0 bg-transparent transition-opacity duration-300 pointer-events-auto"
        onClick={handleClose}
      />

      {/* 2. Spotlight Highlight Frame around Target Element (Crisp, High-Contrast Focus Ring, Zero Darkness) */}
      {targetRect && isTargetFound && (
        <div
          className="fixed pointer-events-none transition-all duration-300 ease-out z-[9992]"
          style={{
            top: `${Math.max(0, targetRect.top - padding)}px`,
            left: `${Math.max(0, targetRect.left - padding)}px`,
            width: `${targetRect.width + padding * 2}px`,
            height: `${targetRect.height + padding * 2}px`,
            borderRadius: '14px',
            border: `2.5px solid ${theme.hex}`,
            boxShadow: theme.spotlightShadow,
            backgroundColor: theme.spotlightBg
          }}
        >
          {/* Pulsing Animated Step Beacon Badge */}
          <div className="absolute -top-3.5 -right-3.5 flex items-center justify-center">
            <span className={`animate-ping absolute inline-flex h-7 w-7 rounded-full ${theme.beaconPing} opacity-75`}></span>
            <span className={`relative inline-flex rounded-full h-6 w-6 ${theme.beaconBadge} text-white font-extrabold text-[11px] items-center justify-center shadow-lg border-2 border-white`}>
              {currentStep + 1}
            </span>
          </div>
        </div>
      )}

      {/* 3. Floating Tooltip Explanation Card (Anchored Beside Sidebar, Crystal Clear) */}
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
        {/* Dynamic Pointer Arrow Caret */}
        {isTargetFound && cardPosition.placement === 'right' && (
          <div
            className={`absolute -left-2 w-4 h-4 ${
              (cardPosition.arrowTop || 28) <= 40 ? 'bg-slate-50' : 'bg-white'
            } border-l border-b border-slate-200 rotate-45 pointer-events-none shadow-xs z-20`}
            style={{ top: `${cardPosition.arrowTop || 28}px` }}
          />
        )}
        {isTargetFound && cardPosition.placement === 'left' && (
          <div
            className={`absolute -right-2 w-4 h-4 ${
              (cardPosition.arrowTop || 28) <= 40 ? 'bg-slate-50' : 'bg-white'
            } border-r border-t border-slate-200 rotate-45 pointer-events-none shadow-xs z-20`}
            style={{ top: `${cardPosition.arrowTop || 28}px` }}
          />
        )}
        {isTargetFound && cardPosition.placement === 'bottom' && (
          <div
            className="absolute -top-2 left-8 w-4 h-4 bg-slate-50 border-l border-t border-slate-200 rotate-45 pointer-events-none shadow-xs z-20"
          />
        )}
        {isTargetFound && cardPosition.placement === 'top' && (
          <div
            className="absolute -bottom-2 right-8 w-4 h-4 bg-slate-50 border-r border-b border-slate-200 rotate-45 pointer-events-none shadow-xs z-20"
          />
        )}

        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
          {/* Header Bar */}
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-lg ${step.iconBg} text-white flex items-center justify-center shadow-2xs`}>
                <StepIcon className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className={`text-[10px] font-black uppercase tracking-wider ${theme.badgeText} block leading-tight`}>
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
                      idx === currentStep ? `w-3.5 ${theme.activeDot}` : 'w-1.5 bg-slate-200 hover:bg-slate-300'
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
              className={`h-0.5 bg-gradient-to-r ${theme.progressBar} transition-all duration-300`}
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
              <div className={`p-2.5 rounded-xl ${theme.tipBoxBg} flex items-start gap-2`}>
                <Sparkles className={`w-3.5 h-3.5 ${theme.tipIcon} flex-shrink-0 mt-0.5`} />
                <p className={`text-[11px] ${theme.tipText} font-medium leading-snug`}>
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
                  isLast ? theme.finishBtn : theme.nextBtn
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
