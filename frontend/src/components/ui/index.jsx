import { useThemeRole } from './Loaders';

export function Badge({ children, variant = 'default', role, className = '' }) {
  const isOwner = useThemeRole(role);
  const themeClass = isOwner
    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
    : 'bg-emerald-50 text-emerald-700 border-emerald-200';

  const variants = {
    default: 'bg-slate-100 text-slate-800 border-slate-200',
    primary: themeClass,
    theme: themeClass,
    owner: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    staff: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
        variants[variant] || variants.default
      } ${className}`}
    >
      {children}
    </span>
  );
}

export {
  Spinner,
  RotatingLoader,
  FullscreenRotatingLoader,
  Skeleton,
  TableSkeleton,
  CardSkeleton,
  PageLoader,
  TopProgressBar,
  DotsLoader,
  PulseDotsLoader,
  OcrScannerLoader,
  InlineLoader,
  useThemeRole,
} from './Loaders';

export function Card({ title, subtitle, action, children, className = '', headerClassName = '' }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden ${className}`}>
      {(title || action) && (
        <div
          className={`px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between ${headerClassName}`}
        >
          <div>
            {title && <h3 className="font-semibold text-slate-800 text-sm sm:text-base">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-4 sm:p-6">{children}</div>
    </div>
  );
}

export function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-slate-200 sm:px-6 rounded-b-xl">
      <div className="text-sm text-slate-600">
        Page <span className="font-medium text-slate-900">{currentPage}</span> of{' '}
        <span className="font-medium text-slate-900">{totalPages}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export { default as Modal } from './Modal';
export { default as ConfirmDialog } from './ConfirmDialog';
export { default as ErrorBoundary } from './ErrorBoundary';

