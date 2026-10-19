const unitNormalizationService = require('./UnitNormalizationService');
const invoiceReconciliationService = require('./InvoiceReconciliationService');

/**
 * Service 10: InvoiceReviewService
 * In-memory or session-based invoice staging and manipulation for the side-by-side review interface.
 * Allows adding, modifying, duplicating, and removing line items while maintaining dynamic units,
 * multi-unit pricing bases, and automatic tax/total reconciliation.
 */
class InvoiceReviewService {
  /**
   * Recalculate line-level financial amounts for an item
   * @param {Object} item 
   * @returns {Object} item with recalculated math
   */
  calculateItemFinancials(item, isTaxInclusive = false) {
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.unit_price) || 0;
    const basis = (Number(item.price_unit_quantity) > 0) ? Number(item.price_unit_quantity) : 1;
    const discount = Number(item.discount_amount) || 0;
    const gstRate = Number(item.gst_rate) || 0;

    // Unit Normalization check
    const rawUnit = item.unit_original || item.unit || 'pcs';
    const normResult = unitNormalizationService.normalizeUnit(rawUnit);
    item.unit_original = normResult.unit_original;
    item.unit_normalized = normResult.unit_normalized;
    item.unit_flagged = normResult.unit_flagged ? 1 : 0;
    item.unit = normResult.unit_normalized || rawUnit;

    let taxableValue = 0;
    let cgst = Number(item.cgst_amount) || 0;
    let sgst = Number(item.sgst_amount) || 0;
    let igst = Number(item.igst_amount) || 0;
    let totalTax = 0;
    let lineTotal = 0;

    if (isTaxInclusive) {
      // In tax-inclusive mode (e.g. MRP or retail rates), unit_price already includes GST
      const gross = Math.max(0, ((qty / basis) * rate) - discount);
      lineTotal = parseFloat(gross.toFixed(2));
      if (gstRate > 0) {
        taxableValue = parseFloat((gross / (1 + gstRate / 100)).toFixed(2));
        totalTax = parseFloat((gross - taxableValue).toFixed(2));
      } else {
        taxableValue = gross;
        totalTax = 0;
      }
    } else {
      // Pre-tax rate mode: GST is added on top of taxable value
      const grossPreTax = (qty / basis) * rate;
      taxableValue = Math.max(0, parseFloat((grossPreTax - discount).toFixed(2)));
      if (gstRate > 0) {
        totalTax = parseFloat((taxableValue * (gstRate / 100)).toFixed(2));
      } else {
        totalTax = cgst + sgst + igst;
      }
      lineTotal = parseFloat((taxableValue + totalTax).toFixed(2));
    }

    if (totalTax > 0 && cgst === 0 && sgst === 0 && igst === 0) {
      cgst = parseFloat((totalTax / 2).toFixed(2));
      sgst = parseFloat((totalTax / 2).toFixed(2));
    }

    item.taxable_value = taxableValue;
    item.cgst_amount = cgst;
    item.sgst_amount = sgst;
    item.igst_amount = igst;
    item.tax = parseFloat((cgst + sgst + igst).toFixed(2));
    item.line_total = lineTotal;
    item.total_price = lineTotal;
    item.calculation_valid = 1;

    return item;
  }

  /**
   * Recalculates document totals across all items
   * @param {Object} reviewData - { invoice, items, vendor, buyer, warnings }
   * @returns {Object} reviewData with updated header totals and reconciliation
   */
  recalculateTotals(reviewData) {
    if (!reviewData) return reviewData;

    const items = reviewData.items || [];
    let subtotal = 0;
    let itemsTaxable = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    let itemDiscounts = 0;
    let itemsTotal = 0;

    const isTaxInclusive = Boolean(reviewData.invoice?.is_tax_inclusive);

    items.forEach((it, idx) => {
      this.calculateItemFinancials(it, isTaxInclusive);
      it.line_number = idx + 1;

      const basis = Number(it.price_unit_quantity) > 0 ? Number(it.price_unit_quantity) : 1;
      const preTax = ((Number(it.quantity) || 0) / basis) * (Number(it.unit_price) || 0);
      subtotal += preTax;
      itemDiscounts += Number(it.discount_amount) || 0;
      itemsTaxable += Number(it.taxable_value) || 0;
      cgst += Number(it.cgst_amount) || 0;
      sgst += Number(it.sgst_amount) || 0;
      igst += Number(it.igst_amount) || 0;
      itemsTotal += Number(it.line_total) || 0;
    });

    if (items.length === 0 || subtotal === 0) {
      subtotal = Number(reviewData.invoice?.subtotal) || Number(reviewData.invoice?.taxable_amount) || 0;
    }

    // Support both line-level discount and header-level discount
    const headerDiscount = Number(reviewData.invoice?.discount) || 0;
    let effectiveDiscount = itemDiscounts > 0 ? itemDiscounts : headerDiscount;
    if (itemDiscounts > 0 && headerDiscount > itemDiscounts) {
      effectiveDiscount = headerDiscount;
    }

    // Taxable amount is subtotal reduced by discount
    let effectiveTaxable;
    if (isTaxInclusive) {
      const gross = Math.max(0, subtotal - effectiveDiscount);
      const taxSum = cgst + sgst + igst;
      effectiveTaxable = Math.max(0, parseFloat((gross - taxSum).toFixed(2)));
    } else {
      effectiveTaxable = Math.max(0, parseFloat((subtotal - effectiveDiscount).toFixed(2)));
    }

    // Total tax
    let totalTax = parseFloat((cgst + sgst + igst).toFixed(2));
    const headerGstRate = Number(reviewData.invoice?.gst_rate || reviewData.invoice?.gstRate) || 0;

    if (totalTax === 0) {
      if (headerGstRate > 0) {
        totalTax = parseFloat((effectiveTaxable * (headerGstRate / 100)).toFixed(2));
      } else if (Number(reviewData.invoice?.tax || reviewData.invoice?.total_gst) > 0) {
        totalTax = Number(reviewData.invoice?.tax || reviewData.invoice?.total_gst);
      }
    }

    if (totalTax > 0 && cgst === 0 && sgst === 0 && igst === 0) {
      cgst = parseFloat((totalTax / 2).toFixed(2));
      sgst = parseFloat((totalTax / 2).toFixed(2));
    }

    const otherCharges = Number(reviewData.invoice?.other_charges) || 0;
    const freightCharges = Number(reviewData.invoice?.freight_charges) || 0;
    const roundOff = Number(reviewData.invoice?.round_off) || 0;

    // Final Grand Total
    let finalGrandTotal;
    if (isTaxInclusive) {
      // In tax-inclusive invoices, subtotal already contains tax; do not add totalTax again!
      finalGrandTotal = Math.max(0, parseFloat((subtotal - effectiveDiscount + otherCharges + freightCharges + roundOff).toFixed(2)));
    } else {
      finalGrandTotal = Math.max(0, parseFloat((effectiveTaxable + totalTax + otherCharges + freightCharges + roundOff).toFixed(2)));
    }

    // Advance Paid & Amount Paid deduction to compute Balance Due (Outstanding Balance)
    const advancePaid = Number(reviewData.invoice?.advance_paid || reviewData.invoice?.advancePaid) || 0;
    const amountPaid = Number(reviewData.invoice?.amount_paid || reviewData.invoice?.paid || reviewData.invoice?.amountPaid) || 0;
    const isPaid = reviewData.invoice?.status === 'Paid';
    const outstandingBalance = isPaid ? 0 : Math.max(0, parseFloat((finalGrandTotal - advancePaid - amountPaid).toFixed(2)));

    reviewData.invoice = {
      ...(reviewData.invoice || {}),
      subtotal: parseFloat(subtotal.toFixed(2)),
      taxable_amount: effectiveTaxable,
      discount: parseFloat(effectiveDiscount.toFixed(2)),
      cgst: parseFloat(cgst.toFixed(2)),
      sgst: parseFloat(sgst.toFixed(2)),
      igst: parseFloat(igst.toFixed(2)),
      total_gst: totalTax,
      tax: totalTax,
      other_charges: otherCharges,
      freight_charges: freightCharges,
      round_off: roundOff,
      total: finalGrandTotal,
      grand_total: finalGrandTotal,
      advance_paid: advancePaid,
      paid: amountPaid,
      amount_paid: amountPaid,
      outstanding_balance: outstandingBalance,
      is_tax_inclusive: isTaxInclusive
    };

    // Run reconciliation check
    const recon = invoiceReconciliationService.reconcile(reviewData);
    reviewData.reconciliation = recon;
    reviewData.warnings = recon.warnings;

    return reviewData;
  }

  /**
   * Update line item at index with changes
   * @param {Object} reviewData 
   * @param {number} index 
   * @param {Object} updatedFields 
   * @returns {Object} updated reviewData
   */
  updateLineItem(reviewData, index, updatedFields) {
    if (!reviewData.items || index < 0 || index >= reviewData.items.length) {
      throw new Error(`Line item index ${index} is out of bounds.`);
    }

    const currentItem = reviewData.items[index];
    const updatedItem = {
      ...currentItem,
      ...updatedFields
    };

    reviewData.items[index] = updatedItem;
    return this.recalculateTotals(reviewData);
  }

  /**
   * Add a new line item to invoice
   * @param {Object} reviewData 
   * @param {Object} newItem 
   * @returns {Object} updated reviewData
   */
  addLineItem(reviewData, newItem = {}) {
    if (!reviewData.items) reviewData.items = [];

    const defaultItem = {
      line_number: reviewData.items.length + 1,
      item_name: newItem.item_name || newItem.itemName || 'New Line Item',
      item_description: newItem.item_description || newItem.description || '',
      sku: newItem.sku || '',
      hsn_code: newItem.hsn_code || '',
      quantity: Number(newItem.quantity) || 1,
      unit_original: newItem.unit_original || newItem.unit || 'pcs',
      unit_normalized: newItem.unit_normalized || 'pcs',
      unit_price: Number(newItem.unit_price || newItem.unitPrice) || 0,
      price_unit_quantity: Number(newItem.price_unit_quantity) || 1,
      price_unit_measure: newItem.price_unit_measure || null,
      discount_amount: Number(newItem.discount_amount || newItem.discount) || 0,
      taxable_value: 0,
      gst_rate: Number(newItem.gst_rate) || 0,
      cgst_amount: 0,
      sgst_amount: 0,
      igst_amount: 0,
      line_total: 0,
      calculation_valid: 1,
      unit_flagged: 0
    };

    this.calculateItemFinancials(defaultItem);
    reviewData.items.push(defaultItem);

    return this.recalculateTotals(reviewData);
  }

  /**
   * Duplicate line item at specified index
   * @param {Object} reviewData 
   * @param {number} index 
   * @returns {Object} updated reviewData
   */
  duplicateLineItem(reviewData, index) {
    if (!reviewData.items || index < 0 || index >= reviewData.items.length) {
      throw new Error(`Line item index ${index} is out of bounds.`);
    }

    const src = reviewData.items[index];
    const clone = {
      ...src,
      id: undefined, // remove DB id if any
      item_name: `${src.item_name} (Copy)`,
      line_number: reviewData.items.length + 1
    };

    reviewData.items.splice(index + 1, 0, clone);
    return this.recalculateTotals(reviewData);
  }

  /**
   * Remove line item at specified index
   * @param {Object} reviewData 
   * @param {number} index 
   * @returns {Object} updated reviewData
   */
  removeLineItem(reviewData, index) {
    if (!reviewData.items || index < 0 || index >= reviewData.items.length) {
      throw new Error(`Line item index ${index} is out of bounds.`);
    }

    reviewData.items.splice(index, 1);
    return this.recalculateTotals(reviewData);
  }
}

module.exports = new InvoiceReviewService();
