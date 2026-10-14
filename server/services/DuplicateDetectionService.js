const db = require('../database/db');

/**
 * Service 9: DuplicateDetectionService
 * Identifies possible duplicate invoices before confirmation.
 * Checks for:
 * 1. Exact invoice number match for the same vendor.
 * 2. Invoice number match across database.
 * 3. Same vendor, invoice date, and grand total.
 */
class DuplicateDetectionService {
  /**
   * Check if invoice exists in the database
   * @param {Object} invoiceDetails - { invoiceNumber, vendorId, vendorName, invoiceDate, grandTotal }
   * @returns {Object}
   */
  checkDuplicate({ invoiceNumber, vendorId, vendorName, invoiceDate, grandTotal }) {
    if (!invoiceNumber && !grandTotal) {
      return { isDuplicate: false };
    }

    const cleanInvNo = (invoiceNumber || '').trim();
    const cleanVendorName = (vendorName || '').trim();

    // 1. Exact match by invoice number and vendor_id
    if (cleanInvNo && vendorId) {
      const match = db.get(`
        SELECT i.id, i.invoice_number, i.invoice_date, i.total, i.vendor_id, v.vendor_name, i.status
        FROM invoices i
        LEFT JOIN vendors v ON i.vendor_id = v.id
        WHERE LOWER(i.invoice_number) = LOWER(?) AND i.vendor_id = ?
      `, [cleanInvNo, Number(vendorId)]);

      if (match) {
        return {
          isDuplicate: true,
          matchType: 'exact_vendor_invoice_number',
          existingId: match.id,
          invoiceNumber: match.invoice_number,
          vendorName: match.vendor_name || 'Selected Supplier',
          date: match.invoice_date,
          total: match.total,
          existingInvoice: match,
          message: `Invoice #${match.invoice_number} from supplier "${match.vendor_name || 'Supplier'}" already exists in the system (Invoice #${match.id}, Total ₹${match.total}).`
        };
      }
    }

    // 2. Exact match by invoice number and same vendor name (if vendorId is unassigned/new)
    if (cleanInvNo && cleanVendorName) {
      const match = db.get(`
        SELECT i.id, i.invoice_number, i.invoice_date, i.total, i.vendor_id, v.vendor_name, i.status
        FROM invoices i
        LEFT JOIN vendors v ON i.vendor_id = v.id
        WHERE LOWER(i.invoice_number) = LOWER(?) AND LOWER(v.vendor_name) = LOWER(?)
      `, [cleanInvNo, cleanVendorName]);

      if (match) {
        return {
          isDuplicate: true,
          matchType: 'exact_vendor_name_invoice_number',
          existingId: match.id,
          invoiceNumber: match.invoice_number,
          vendorName: match.vendor_name || cleanVendorName,
          date: match.invoice_date,
          total: match.total,
          existingInvoice: match,
          message: `Invoice #${match.invoice_number} from supplier "${cleanVendorName}" already exists in the system (Invoice #${match.id}, Total ₹${match.total}).`
        };
      }
    }

    // 3. Match by vendor name, date, and exact total
    if (cleanVendorName && invoiceDate && Number(grandTotal) > 0) {
      const match = db.get(`
        SELECT i.id, i.invoice_number, i.invoice_date, i.total, i.vendor_id, v.vendor_name, i.status
        FROM invoices i
        LEFT JOIN vendors v ON i.vendor_id = v.id
        WHERE LOWER(v.vendor_name) = LOWER(?) AND i.invoice_date = ? AND ABS(i.total - ?) < 0.5
      `, [cleanVendorName, invoiceDate, Number(grandTotal)]);

      if (match) {
        return {
          isDuplicate: true,
          matchType: 'vendor_date_total_match',
          existingId: match.id,
          invoiceNumber: match.invoice_number,
          vendorName: match.vendor_name || cleanVendorName,
          date: match.invoice_date,
          total: match.total,
          existingInvoice: match,
          message: `Possible duplicate: Found invoice #${match.id} for "${cleanVendorName}" on date ${invoiceDate} with matching total ₹${grandTotal}.`
        };
      }
    }

    return { isDuplicate: false };
  }
}

module.exports = new DuplicateDetectionService();
