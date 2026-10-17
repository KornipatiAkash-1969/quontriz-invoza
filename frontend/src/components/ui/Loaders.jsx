import React, { useState, useEffect, useContext } from 'react';
import { ScanText, Sparkles, Crown, ClipboardList } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';

/**
 * Universal Hook to detect whether active theme is Owner (Indigo) or Staff (Emerald).
 * Fallback to localStorage when rendered outside an AuthProvider.
 */
export function useThemeRole(overrideRole) {
  const auth = useContext(AuthContext);

  if (overrideRole === 'owner') return true;
  if (overrideRole === 'staff') return false;

  if (auth && auth.isOwner !== undefined) {
    return auth.isOwner;
  }

  try {
    const saved = localStorage.getItem('user');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed?.role === 'owner';
    }
  } catch {
    // ignore
  }

  return true; // Default to owner indigo
}

/**
 * Enhanced Spinner with automatic role-based theme adaptation (Indigo for Owner, Emerald for Staff)
 */
export function Spinner({ size = 'md', variant = 'theme', role, className = '' }) {
  const isOwner = useThemeRole(role);

  const sizes = {
    xs: 'w-3 h-3 border',
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
    xl: 'w-12 h-12 border-4',
  };

  const themeVariant = isOwner
    ? 'border-indigo-200 border-t-indigo-600'
    : 'border-emerald-200 border-t-emerald-600';

  const variants = {
    theme: themeVariant,
    primary: themeVariant,
    owner: 'border-indigo-200 border-t-indigo-600',
    staff: 'border-emerald-200 border-t-emerald-600',
    indigo: 'border-indigo-200 border-t-indigo-600',
    emerald: 'border-emerald-200 border-t-emerald-600',
    white: 'border-white/30 border-t-white',
    amber: 'border-amber-200 border-t-amber-600',
    rose: 'border-rose-200 border-t-rose-600',
    slate: 'border-slate-200 border-t-slate-700',
  };

  return (
    <div
      className={`animate-spin rounded-full ${sizes[size] || sizes.md} ${
        variants[variant] || themeVariant
      } ${className}`}
    />
  );
}

/**
 * Base shimmering skeleton block
 */
export function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse bg-slate-200/70 rounded-xl ${className}`} />
  );
}

/**
 * Realistic Table Skeleton with role-based themed top progress indicator
 */
export function TableSkeleton({ rows = 6, cols = 5, role, className = '' }) {
  const isOwner = useThemeRole(role);

  return (
    <div className={`w-full overflow-hidden ${className}`}>
      {/* Dynamic Themed Header Accent Bar */}
      <div
        className={`h-0.5 w-full bg-gradient-to-r ${
          isOwner
            ? 'from-indigo-600 via-indigo-400 to-slate-200'
            : 'from-emerald-600 via-emerald-400 to-slate-200'
        }`}
      />

      {/* Table Header Placeholder */}
      <div className="bg-slate-50/80 border-b border-slate-200/80 px-4 py-3 flex gap-4 items-center">
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={i}
            className={`h-3.5 bg-slate-200 rounded-md animate-pulse ${
              i === 0 ? 'w-24' : i === cols - 1 ? 'w-20 ml-auto' : 'flex-1'
            }`}
          />
        ))}
      </div>

      {/* Rows Placeholder */}
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="px-4 py-3.5 flex gap-4 items-center">
            {Array.from({ length: cols }).map((_, c) => (
              <div
                key={c}
                className={`h-4 bg-slate-100 rounded-md animate-pulse ${
                  c === 0 ? 'w-28' : c === cols - 1 ? 'w-16 ml-auto' : 'flex-1'
                }`}
                style={{
                  animationDelay: `${(r * cols + c) * 40}ms`,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Stat Card Skeleton with theme-tinted icon accents
 */
export function CardSkeleton({ count = 5, role, className = '' }) {
  const isOwner = useThemeRole(role);

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-3 relative overflow-hidden"
        >
          {/* Subtle themed top indicator line */}
          <div
            className={`absolute top-0 left-0 right-0 h-0.5 ${
              isOwner ? 'bg-indigo-600/40' : 'bg-emerald-600/40'
            }`}
          />

          <div className="flex items-center justify-between">
            <div className="h-3 w-20 bg-slate-200 rounded-md animate-pulse" />
            <div
              className={`w-8 h-8 rounded-xl animate-pulse ${
                isOwner ? 'bg-indigo-50 border border-indigo-100/60' : 'bg-emerald-50 border border-emerald-100/60'
              }`}
            />
          </div>
          <div className="h-6 w-28 bg-slate-200 rounded-md animate-pulse" />
          <div className="h-3 w-16 bg-slate-100 rounded-md animate-pulse" />
        </div>
      ))}
    </div>
  );
}

/**
 * High-Precision Multi-Ring Orbital Rotating Loader themed dynamically for Owner (Indigo/Violet) vs Staff (Emerald/Teal)
 */
export function RotatingLoader({
  size = 'md',
  role,
  variant = 'theme',
  text,
  subtitle,
  showBadge = false,
  showIcon,
  className = '',
}) {
  const isOwner = variant === 'owner' ? true : variant === 'staff' ? false : useThemeRole(role);
  const shouldShowIcon = showIcon !== undefined ? showIcon : size !== 'xs';

  // Size specifications
  const sizeMap = {
    xs: {
      wrapper: 'w-4 h-4',
      outer: 'border-1.5',
      inner: 'border',
      core: 'w-1.5 h-1.5',
      iconSize: 'w-1.5 h-1.5',
      gap: 'mt-1',
    },
    sm: {
      wrapper: 'w-7 h-7',
      outer: 'border-2',
      inner: 'border-1.5',
      core: 'w-3.5 h-3.5',
      iconSize: 'w-2 h-2',
      gap: 'mt-1.5',
    },
    md: {
      wrapper: 'w-12 h-12',
      outer: 'border-2.5',
      inner: 'border-2',
      core: 'w-6 h-6',
      iconSize: 'w-3.5 h-3.5',
      gap: 'mt-3',
    },
    lg: {
      wrapper: 'w-16 h-16',
      outer: 'border-3',
      inner: 'border-2',
      core: 'w-8 h-8',
      iconSize: 'w-4.5 h-4.5',
      gap: 'mt-3.5',
    },
    xl: {
      wrapper: 'w-24 h-24',
      outer: 'border-4',
      inner: 'border-2.5',
      core: 'w-12 h-12',
      iconSize: 'w-6 h-6',
      gap: 'mt-4',
    },
  };

  const s = sizeMap[size] || sizeMap.md;

  // Themed rings
  const outerBorder = isOwner
    ? 'border-indigo-600 border-r-indigo-400 border-b-violet-500 border-l-transparent'
    : 'border-emerald-600 border-r-emerald-400 border-b-teal-500 border-l-transparent';

  const innerBorder = isOwner
    ? 'border-indigo-300 border-t-violet-400 border-b-transparent border-r-transparent'
    : 'border-emerald-300 border-t-teal-400 border-b-transparent border-r-transparent';

  const glowBg = isOwner ? 'bg-indigo-400/25' : 'bg-emerald-400/25';

  const coreBg = isOwner
    ? 'bg-gradient-to-tr from-indigo-50 to-indigo-100 border-indigo-200 text-indigo-600 shadow-indigo-100'
    : 'bg-gradient-to-tr from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-600 shadow-emerald-100';

  return (
    <div className={`flex flex-col items-center justify-center text-center ${className}`}>
      <div className={`relative flex items-center justify-center ${s.wrapper}`}>
        {/* Ambient Pulsing Glow Halo */}
        <div className={`absolute -inset-1.5 rounded-full blur-sm opacity-60 animate-pulse ${glowBg}`} />

        {/* Outer Orbital Rotating Ring (Clockwise) */}
        <div
          className={`absolute inset-0 rounded-full animate-spin ${s.outer} ${outerBorder}`}
          style={{ animationDuration: '1.1s' }}
        />

        {/* Middle Counter-Rotating Orbital Ring (Counter-Clockwise) */}
        <div
          className={`absolute inset-1.5 rounded-full ${s.inner} ${innerBorder}`}
          style={{ animation: 'counterSpinRing 1.6s linear infinite' }}
        />

        {/* Core Emblem / Icon */}
        {shouldShowIcon && (
          <div
            className={`relative rounded-full border shadow-2xs flex items-center justify-center transition-all duration-300 ${s.core} ${coreBg}`}
          >
            {isOwner ? (
              <Crown className={`${s.iconSize} text-indigo-600 animate-pulse`} />
            ) : (
              <ClipboardList className={`${s.iconSize} text-emerald-600 animate-pulse`} />
            )}
          </div>
        )}
      </div>

      {/* Optional Text / Subtitle */}
      {(text || subtitle || showBadge) && (
        <div className={`${s.gap} space-y-1 max-w-xs`}>
          {text && <p className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight leading-snug">{text}</p>}
          {subtitle && <p className="text-[11px] sm:text-xs text-slate-400 font-medium leading-relaxed">{subtitle}</p>}
          {showBadge && (
            <div className="pt-0.5">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-2xs ${
                  isOwner
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {isOwner ? '👑 Owner Workspace' : '📋 Staff Workspace'}
              </span>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes counterSpinRing {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  );
}

/**
 * Full Page / Main Content Branded Loader powered by RotatingLoader
 */
export function PageLoader({
  message = 'Loading data...',
  subtitle = 'Fetching the latest store records',
  role,
  compact = false
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 gap-4 animate-in fade-in duration-200 ${
        compact ? 'min-h-[260px]' : 'min-h-[50vh]'
      }`}
    >
      <RotatingLoader
        size={compact ? 'md' : 'lg'}
        role={role}
        text={message}
        subtitle={subtitle}
        showBadge
      />
    </div>
  );
}

/**
 * Full-screen Modal Backdrop Rotating Loader with glassmorphic blur
 */
export function FullscreenRotatingLoader({
  message = 'Loading workspace...',
  subtitle = 'Synchronizing real-time store records',
  role,
}) {
  return (
    <div className="fixed inset-0 z-[9999] bg-white/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
      <RotatingLoader
        size="xl"
        role={role}
        text={message}
        subtitle={subtitle}
        showBadge
      />
    </div>
  );
}

/**
 * Top Progress Bar (GitHub / Vercel style) for Global Route & API Transitions
 */
export function TopProgressBar({ role }) {
  const isOwner = useThemeRole(role);
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let timer1;
    let timer2;

    const handleApiLoading = (e) => {
      const isLoading = e.detail?.loading;
      if (isLoading) {
        setActive(true);
        setProgress(30);
        timer1 = setTimeout(() => {
          setProgress((prev) => (prev < 80 ? 75 : prev));
        }, 150);
      } else {
        setProgress(100);
        timer2 = setTimeout(() => {
          setActive(false);
          setProgress(0);
        }, 300);
      }
    };

    window.addEventListener('api:loading', handleApiLoading);
    return () => {
      window.removeEventListener('api:loading', handleApiLoading);
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  if (!active && progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[10000] h-1 bg-transparent overflow-hidden pointer-events-none">
      <div
        className={`h-full transition-all duration-300 ease-out shadow-sm ${
          isOwner
            ? 'bg-gradient-to-r from-indigo-600 via-violet-500 to-indigo-400 shadow-indigo-500/50'
            : 'bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400 shadow-emerald-500/50'
        }`}
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
          transition: 'width 0.3s ease, opacity 0.3s ease 0.1s'
        }}
      />
    </div>
  );
}

/**
 * Bouncing Dots Loader for compact buttons and inline indicators
 */
export function DotsLoader({ size = 'md', role, className = '' }) {
  const isOwner = useThemeRole(role);

  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  };

  const bg = isOwner ? 'bg-indigo-600' : 'bg-emerald-600';

  return (
    <div className={`flex items-center gap-1.5 py-1 ${className}`}>
      <span className={`${dotSizes[size] || dotSizes.md} ${bg} rounded-full animate-bounce [animation-delay:-0.3s]`} />
      <span className={`${dotSizes[size] || dotSizes.md} ${bg} rounded-full animate-bounce [animation-delay:-0.15s]`} />
      <span className={`${dotSizes[size] || dotSizes.md} ${bg} rounded-full animate-bounce`} />
    </div>
  );
}

export const PulseDotsLoader = DotsLoader;

/**
 * High-Tech Document Scanner Loader for OCR & File Processing
 */
export function OcrScannerLoader({
  title = 'Scanning Invoice Document...',
  subtitle = 'Extracting line items, vendor details & tax breakdown',
  role,
  className = ''
}) {
  const isOwner = useThemeRole(role);

  return (
    <div className={`flex flex-col items-center justify-center p-6 text-center space-y-4 ${className}`}>
      {/* Animated Document with Laser Beam */}
      <div
        className={`relative w-40 h-52 rounded-2xl bg-white border-2 p-4 shadow-xl overflow-hidden flex flex-col justify-between ${
          isOwner
            ? 'border-indigo-300 shadow-indigo-100'
            : 'border-emerald-300 shadow-emerald-100'
        }`}
      >
        {/* Animated Laser Scan Beam */}
        <div
          className={`absolute left-0 right-0 h-1 z-20 ${
            isOwner
              ? 'bg-indigo-500 shadow-lg shadow-indigo-500 ring-2 ring-indigo-400/40'
              : 'bg-emerald-500 shadow-lg shadow-emerald-500 ring-2 ring-emerald-400/40'
          }`}
          style={{
            animation: 'scanLaser 2.4s ease-in-out infinite'
          }}
        />

        {/* Ambient Laser Glow Plane */}
        <div
          className={`absolute inset-0 pointer-events-none opacity-20 bg-gradient-to-b ${
            isOwner
              ? 'from-indigo-500/25 via-indigo-500/10 to-transparent'
              : 'from-emerald-500/25 via-emerald-500/10 to-transparent'
          }`}
        />

        {/* Simulated Document Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className={`h-3 w-14 rounded-md ${isOwner ? 'bg-indigo-200' : 'bg-emerald-200'}`} />
            <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
          </div>
          <div className="h-2 w-full bg-slate-100 rounded" />
          <div className="h-2 w-4/5 bg-slate-100 rounded" />
          <div className="h-2 w-3/4 bg-slate-100 rounded" />
        </div>

        {/* Simulated Table Lines */}
        <div className="space-y-1.5 py-2 border-y border-slate-100">
          <div className="flex justify-between">
            <div className="h-2 w-12 bg-slate-200 rounded" />
            <div className="h-2 w-6 bg-slate-200 rounded" />
          </div>
          <div className="flex justify-between">
            <div className="h-2 w-16 bg-slate-100 rounded" />
            <div className="h-2 w-8 bg-slate-100 rounded" />
          </div>
          <div className="flex justify-between">
            <div className="h-2 w-10 bg-slate-100 rounded" />
            <div className="h-2 w-7 bg-slate-100 rounded" />
          </div>
        </div>

        {/* Simulated Document Bottom Total */}
        <div className="flex justify-between items-center pt-1">
          <div className="h-2.5 w-10 bg-slate-200 rounded" />
          <div className={`h-3 w-12 rounded ${isOwner ? 'bg-indigo-600' : 'bg-emerald-600'}`} />
        </div>
      </div>

      {/* Text Info */}
      <div className="space-y-1">
        <h4 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center justify-center gap-1.5">
          <Sparkles className={`w-4 h-4 ${isOwner ? 'text-indigo-600' : 'text-emerald-600'}`} />
          <span>{title}</span>
        </h4>
        <p className="text-xs text-slate-500 max-w-xs">{subtitle}</p>
      </div>

      <style>{`
        @keyframes scanLaser {
          0% { top: 0%; opacity: 0.8; }
          50% { top: 96%; opacity: 1; }
          100% { top: 0%; opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}

/**
 * Compact Inline Loader with themed spinner and label
 */
export function InlineLoader({
  text = 'Loading...',
  size = 'sm',
  role,
  className = ''
}) {
  const isOwner = useThemeRole(role);

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <Spinner size={size} variant={isOwner ? 'owner' : 'staff'} />
      {text && (
        <span
          className={`text-xs font-semibold ${
            isOwner ? 'text-indigo-900' : 'text-emerald-900'
          }`}
        >
          {text}
        </span>
      )}
    </div>
  );
}
