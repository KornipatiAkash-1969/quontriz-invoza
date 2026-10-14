/**
 * Utility functions for formatting currencies, dates, files, and confidence badges
 */

export function formatCurrency(amount, currency = 'INR') {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0.00';
  const num = Number(amount);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(num);
}

/**
 * Safely parse date strings from SQLite (UTC or IST) or ISO formats
 */
export function parseDateSafely(dateString) {
  if (!dateString) return null;
  if (dateString instanceof Date) return isNaN(dateString.getTime()) ? null : dateString;
  let str = String(dateString).trim();

  // If already an ISO string with offset (+05:30) or Z, standard Date parses cleanly
  if (str.includes('+') || str.endsWith('Z')) {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  // If SQLite format "YYYY-MM-DD HH:MM:SS", treat as UTC from server
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(str)) {
    const d = new Date(str.replace(' ', 'T') + 'Z');
    if (!isNaN(d.getTime())) return d;
  }

  // If date-only format "YYYY-MM-DD"
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, day] = str.split('-').map(Number);
    const d = new Date(y, m - 1, day, 12, 0, 0);
    if (!isNaN(d.getTime())) return d;
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

export function formatDate(dateString) {
  if (!dateString) return '—';
  try {
    const d = parseDateSafely(dateString);
    if (!d) return String(dateString);
    return d.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (_) {
    return String(dateString);
  }
}

export function formatDateTime(dateString) {
  if (!dateString) return '—';
  try {
    const d = parseDateSafely(dateString);
    if (!d) return String(dateString);
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (_) {
    return String(dateString);
  }
}

export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function truncateText(str, maxLength = 30) {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}

export function getConfidenceBadgeClass(confidence) {
  const conf = Number(confidence);
  if (conf >= 0.85) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (conf >= 0.70) {
    return 'bg-blue-50 text-blue-700 border-blue-200';
  } else {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }
}
