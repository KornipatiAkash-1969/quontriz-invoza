import React, { useState, useEffect } from 'react';
import { ScanText, Sparkles } from 'lucide-react';

/**
 * Enhanced Spinner with sizes and color variants
 */
export function Spinner({ size = 'md', variant = 'primary', className = '' }) {
  const sizes = {
    xs: 'w-3 h-3 border',
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
    xl: 'w-12 h-12 border-4',
  };

  const variants = {
    primary: 'border-indigo-200 border-t-indigo-600',
    emerald: 'border-emerald-200 border-t-emerald-600',
    white: 'border-white/30 border-t-white',
    amber: 'border-amber-200 border-t-amber-600',
    rose: 'border-rose-200 border-t-rose-600',
    slate: 'border-slate-200 border-t-slate-700',
  };

  return (
    <div
      className={`animate-spin rounded-full ${sizes[size] || sizes.md} ${
        variants[variant] || variants.primary
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
 * Realistic Table Skeleton for Invoices, Users, Requirements, etc.
 */
export function TableSkeleton({ rows = 6, cols = 5, className = '' }) {
  return (
    <div className={`w-full overflow-hidden ${className}`}>
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
 * Stat Card Skeleton for Dashboard KPI Cards
 */
export function CardSkeleton({ count = 5, className = '' }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="h-3 w-20 bg-slate-200 rounded-md animate-pulse" />
            <div className="w-8 h-8 rounded-xl bg-slate-100 animate-pulse" />
          </div>
          <div className="h-6 w-28 bg-slate-200 rounded-md animate-pulse" />
          <div className="h-3 w-16 bg-slate-100 rounded-md animate-pulse" />
        </div>
      ))}
    </div>
  );
}

/**
 * Full Page / Main Content Branded Loader with Pulse Ring
 */
export function PageLoader({
  message = 'Loading data...',
  subtitle = 'Fetching the latest store records'
}) {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 gap-4 animate-in fade-in duration-200">
      <div className="relative flex items-center justify-center">
        {/* Core Icon Box */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-50 to-indigo-100 border border-indigo-200/80 flex items-center justify-center text-indigo-600 shadow-sm">
          <ScanText className="w-7 h-7 text-indigo-600 animate-pulse" />
        </div>
        {/* Outer Rotating Gradient Ring */}
        <div className="absolute -inset-2.5 border-2 border-indigo-600 border-t-transparent border-r-indigo-400 rounded-3xl animate-spin" />
      </div>

      <div className="text-center space-y-1">
        <h4 className="text-sm font-bold text-slate-800 tracking-tight">{message}</h4>
        {subtitle && <p className="text-xs text-slate-400 font-medium">{subtitle}</p>}
      </div>
    </div>
  );
}

/**
 * Top Progress Bar (GitHub / Vercel style) for Global Route & API Transitions
 */
export function TopProgressBar() {
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
        className="h-full bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-500 transition-all duration-300 ease-out shadow-xs"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
          transition: 'width 0.3s ease, opacity 0.3s ease 0.1s'
        }}
      />
    </div>
  );
}
