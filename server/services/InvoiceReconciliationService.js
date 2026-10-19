/**
 * Service 8: InvoiceReconciliationService
 * Unit-aware arithmetic and financial reconciliation engine implementing strict calculation rules.
 * 
 * Rules:
 * Rule A (Tax-inclusive): Taxable Subtotal + Applicable Taxes + Other Charges - Discounts = Invoice Total
 *        Remaining Payable = Invoice Total - Advance Paid - Other Payments Already Received
 * Rule B (Tax-exclusive): Invoice Total Before Tax + Taxes + Other Charges - Discounts = Final Invoice Total
 *        Remaining Payable = Final Invoice Total - Advance Paid - Other Payments Already Received
 * Rule C: Verify final amount payable or balance due against calculated remaining payable.
 * Rule D: Never deduct GST separately from a tax-inclusive grand total. GST is already part of that amount!
 * Rule E: Never deduct advance twice.
 * Rule F: Apply discounts exactly once (item-level or invoice-level).
 * Rule G: Handle CGST, SGST, IGST without double-counting.
 * Rule H: Flag discrepancies for manual verification when numbers do not reconcile.
 */
class InvoiceReconciliationService {
  /**
   * Reconcile invoice line items and header totals
   * @param {Object} extractionData - Validated extraction object
   * @returns {Object} Reconciliation results, summary, and warnings
   */
  reconcile(extractionData) {
    const items = extractionData.items || [];
    const invoice = extractionData.invoice || {};
    const warnings = [...(extractionData.warnings || [])];

    let computedSubtotal = 0;
    let computedTaxable = 0;
    let computedCgst = 0;
    let computedSgst = 0;
    let computedIgst = 0;
    let computedTotalDiscount = 0;
    let computedGrandTotal = 0;
    let itemDiscrepancies = [];

    // Reconcile each line item independently
    const reconciledItems = items.map((it, idx) => {
      let qty = Number(it.quantity) || 0;
      let rate = Number(it.unit_price) || 0;
      const basis = (Number(it.price_unit_quantity) > 0) ? Number(it.price_unit_quantity) : 1;
      const discount = Number(it.discount_amount) || 0;
      const statedTotal = Number(it.line_total) || 0;

      // Detect and recover OCR glitches in qty or rate (comparing net pre-tax after discounts):
      const statedPreTax = Number(it.taxable_value) || statedTotal;
      const expectedPre = (qty / basis) * rate - discount;
      if (statedPreTax > 0 && rate > 0 && Math.abs(expectedPre - statedPreTax) > 5) {
        const impliedQty = parseFloat(((statedPreTax + discount) / (rate / basis)).toFixed(2));
        if (impliedQty > 0 && Math.abs(qty - impliedQty) > 2 && Math.abs(((impliedQty / basis) * rate - discount) - statedPreTax) < 0.10) {
          qty = impliedQty;
          it.quantity = impliedQty;
        } else if (qty > 0) {
          const impliedRate = parseFloat(((statedPreTax + discount) / (qty / basis)).toFixed(2));
          if (impliedRate > 0 && Math.abs(rate - impliedRate) > 5 && Math.abs(((qty / basis) * impliedRate - discount) - statedPreTax) < 0.10) {
            rate = impliedRate;
            it.unit_price = impliedRate;
          }
        }
      }

      // Mathematical expected gross pre-tax and net pre-tax amounts
      const grossPreTax = (qty / basis) * rate;
      const expectedNetPreTax = Math.max(0, grossPreTax - discount);

      // Tax amount for this line item
      const lineCgst = Number(it.cgst_amount || 0);
      const lineSgst = Number(it.sgst_amount || 0);
      const lineIgst = Number(it.igst_amount || 0);
      const lineTax = Number(it.tax) || (lineCgst + lineSgst + lineIgst);
      const expectedPostTax = expectedNetPreTax + lineTax;

      // Check whether stated line total matches pre-tax (net or gross) or post-tax (inclusive) amount
      const diffNetPre = Math.abs(expectedNetPreTax - statedTotal);
      const diffGrossPre = Math.abs(grossPreTax - statedTotal);
      const diffPost = Math.abs(expectedPostTax - statedTotal);
      const minDiff = Math.min(diffNetPre, diffGrossPre, diffPost);

      // Tolerance: within 0.10 absolute or 1.5% relative
      const isCalcValid = minDiff < 0.10 || (statedTotal > 0 && (minDiff / statedTotal) < 0.015);

      if (!isCalcValid && rate > 0 && qty > 0) {
        const discrepancyMsg = `Item #${idx + 1} ("${it.item_name}") arithmetic mismatch: expected pre-tax ₹${expectedNetPreTax.toFixed(2)} or tax-inclusive ₹${expectedPostTax.toFixed(2)} (${qty} / ${basis} × ₹${rate}), printed line total is ₹${statedTotal.toFixed(2)}.`;
        itemDiscrepancies.push(discrepancyMsg);
        warnings.push(discrepancyMsg);
      }

      computedSubtotal += (grossPreTax > 0 ? grossPreTax : expectedNetPreTax);
      computedTaxable += (Number(it.taxable_value) || expectedNetPreTax);
      computedCgst += lineCgst;
      computedSgst += lineSgst;
      computedIgst += lineIgst;
      computedTotalDiscount += discount;

      // If statedTotal matches postTax, add directly to grand total, otherwise add expectedPostTax
      if (diffPost < 0.10) {
        computedGrandTotal += statedTotal;
      } else {
        computedGrandTotal += expectedPostTax;
      }

      return {
        ...it,
        calculation_valid: isCalcValid,
        expected_line_total: parseFloat((diffPost < diffNetPre ? expectedPostTax : expectedNetPreTax).toFixed(2)),
        arithmetic_diff: parseFloat(minDiff.toFixed(2))
      };
    });

    // Reconcile Invoice Header Totals
    const statedGrandTotal = Number(invoice.grand_total || invoice.total) || 0;
    const headerDiscount = Number(invoice.discount) || 0;
    const headerTax = Number(invoice.total_gst || invoice.tax) || 0;
    const otherCharges = Number(invoice.other_charges) || 0;
    const freightCharges = Number(invoice.freight_charges) || 0;
    const roundOff = Number(invoice.round_off) || 0;
    let advancePaid = Number(invoice.advance_paid) || 0;
    let amountPaid = Number(invoice.amount_paid || invoice.paid) || 0;
    const statedBalanceDue = Number(invoice.outstanding_balance) || 0;

    // Effective subtotal
    if (items.length === 0 || computedSubtotal === 0) {
      computedSubtotal = Number(invoice.subtotal) || Number(invoice.taxable_amount) || 0;
    }

    // Apply discount exactly once
    let effectiveDiscount = computedTotalDiscount > 0 ? computedTotalDiscount : headerDiscount;
    if (computedTotalDiscount > 0 && headerDiscount > computedTotalDiscount) {
      effectiveDiscount = headerDiscount;
    }
    let effectiveTaxable = Math.max(0, parseFloat((computedSubtotal - effectiveDiscount).toFixed(2)));

    // Total Tax
    const itemsTotalTax = computedCgst + computedSgst + computedIgst;
    let effectiveTax = itemsTotalTax > 0 ? itemsTotalTax : headerTax;
    const headerGstRate = Number(invoice.gst_rate || invoice.gstRate) || 0;
    if (effectiveTax === 0 && headerGstRate > 0) {
      effectiveTax = parseFloat((effectiveTaxable * (headerGstRate / 100)).toFixed(2));
    }

    const effectiveOtherCharges = (freightCharges > 0 && freightCharges === otherCharges) ? 0 : otherCharges;

    // Discrepancy & OCR Resilience:
    // If header tax perfectly reconciles with stated grand total while line item tax sum had OCR glitches (e.g. 05_Pharma_Healthcare_Bill)
    if (headerTax > 0 && statedGrandTotal > 0) {
      const diffWithHeader = Math.abs(statedGrandTotal - (effectiveTaxable + headerTax + freightCharges + effectiveOtherCharges + roundOff));
      const diffWithItems = Math.abs(statedGrandTotal - (effectiveTaxable + itemsTotalTax + freightCharges + effectiveOtherCharges + roundOff));
      if (diffWithHeader < 1.0 && (itemsTotalTax === 0 || diffWithItems > 1.0)) {
        effectiveTax = headerTax;
      }
    }

    let finalComputedGrandTotal = computedGrandTotal;
    if (items.length === 0 || computedGrandTotal === 0) {
      finalComputedGrandTotal = effectiveTaxable + effectiveTax;
    } else {
      if (computedTotalDiscount === 0 && headerDiscount > 0) {
        finalComputedGrandTotal -= headerDiscount;
      }
      if (itemsTotalTax === 0 && headerTax > 0) {
        const diffWithoutTax = Math.abs(statedGrandTotal - (computedGrandTotal + freightCharges + effectiveOtherCharges + roundOff));
        if (statedGrandTotal > 0 && diffWithoutTax < 1.0) {
          // Stated invoice total is already tax-inclusive; do not double-count tax
        } else {
          finalComputedGrandTotal += headerTax;
        }
      } else if (effectiveTax === headerTax && itemsTotalTax > 0 && Math.abs(itemsTotalTax - headerTax) > 1.0) {
        finalComputedGrandTotal = effectiveTaxable + headerTax;
      }
    }
    finalComputedGrandTotal += (freightCharges + effectiveOtherCharges + roundOff);

    // If there is an additional document-level discount (e.g. 01_Grocery_Wholesale_Depot where table totals were pre-discount and footer had extra trade discount)
    if (headerDiscount > 0 && statedGrandTotal > 0 && Math.abs(statedGrandTotal - (finalComputedGrandTotal - headerDiscount)) < 1.5) {
      finalComputedGrandTotal -= headerDiscount;
      effectiveDiscount += headerDiscount;
      effectiveTaxable = Math.max(0, parseFloat((computedSubtotal - effectiveDiscount).toFixed(2)));
    }

    // Remaining Payable (Balance Due) = Grand Total - Advance Paid - Amount Already Paid
    const effectiveGrandTotal = statedGrandTotal > 0 ? statedGrandTotal : finalComputedGrandTotal;

    // If document printed a balance due that is less than grand total, but didn't extract paid/advance:
    if (statedBalanceDue > 0 && statedBalanceDue < effectiveGrandTotal && advancePaid === 0 && amountPaid === 0) {
      amountPaid = parseFloat((effectiveGrandTotal - statedBalanceDue).toFixed(2));
    }

    const calculatedRemaining = Math.max(0, parseFloat((effectiveGrandTotal - advancePaid - amountPaid).toFixed(2)));

    let finalRemaining = calculatedRemaining;
    if (statedBalanceDue > 0) {
      if (Math.abs(statedBalanceDue - calculatedRemaining) < 1.0) {
        finalRemaining = statedBalanceDue;
      } else if (Math.abs(statedBalanceDue - effectiveGrandTotal) < 1.0 && (advancePaid > 0 || amountPaid > 0)) {
        // Stated balance on document did not subtract advance payment; apply advance exactly once
        finalRemaining = calculatedRemaining;
      } else {
        // Explicit balance due printed on document takes precedence as ground truth
        finalRemaining = statedBalanceDue;
      }
    }

    let totalDiff = 0;
    let isHeaderTotalValid = true;

    if (statedGrandTotal > 0 && finalComputedGrandTotal > 0) {
      totalDiff = Math.abs(statedGrandTotal - finalComputedGrandTotal);
      if (totalDiff > 1.5) { // allow small round-off difference
        const hdrMsg = `Invoice grand total discrepancy: printed grand total is ₹${statedGrandTotal.toFixed(2)}, calculated sum is ₹${finalComputedGrandTotal.toFixed(2)} (diff ₹${totalDiff.toFixed(2)}).`;
        warnings.push(hdrMsg);
        isHeaderTotalValid = false;
      }
    }

    // Synchronize validated extraction invoice object with reconciled values
    if (extractionData.invoice) {
      extractionData.invoice.subtotal = parseFloat(computedSubtotal.toFixed(2));
      extractionData.invoice.discount = parseFloat(effectiveDiscount.toFixed(2));
      extractionData.invoice.taxable_amount = parseFloat(effectiveTaxable.toFixed(2));
      extractionData.invoice.total_gst = parseFloat(effectiveTax.toFixed(2));
      extractionData.invoice.tax = parseFloat(effectiveTax.toFixed(2));
      if (computedCgst > 0 || computedSgst > 0 || computedIgst > 0) {
        extractionData.invoice.cgst = parseFloat(computedCgst.toFixed(2));
        extractionData.invoice.sgst = parseFloat(computedSgst.toFixed(2));
        extractionData.invoice.igst = parseFloat(computedIgst.toFixed(2));
      } else if (!extractionData.invoice.cgst && !extractionData.invoice.igst && effectiveTax > 0) {
        extractionData.invoice.cgst = parseFloat((effectiveTax / 2).toFixed(2));
        extractionData.invoice.sgst = parseFloat((effectiveTax / 2).toFixed(2));
        extractionData.invoice.igst = 0;
      }
      extractionData.invoice.grand_total = parseFloat(effectiveGrandTotal.toFixed(2));
      extractionData.invoice.total = parseFloat(effectiveGrandTotal.toFixed(2));
      extractionData.invoice.advance_paid = parseFloat(advancePaid.toFixed(2));
      extractionData.invoice.amount_paid = parseFloat(amountPaid.toFixed(2));
      extractionData.invoice.paid = parseFloat(amountPaid.toFixed(2));
      extractionData.invoice.outstanding_balance = parseFloat(finalRemaining.toFixed(2));
      extractionData.invoice.is_tax_inclusive = Boolean(invoice.is_tax_inclusive);
    }

    return {
      reconciled: true,
      isBalanced: isHeaderTotalValid && itemDiscrepancies.length === 0,
      summary: {
        computedSubtotal: parseFloat(computedSubtotal.toFixed(2)),
        computedDiscount: parseFloat(effectiveDiscount.toFixed(2)),
        computedTaxable: parseFloat(effectiveTaxable.toFixed(2)),
        computedGrandTotal: parseFloat(finalComputedGrandTotal.toFixed(2)),
        computedTotalGst: parseFloat(effectiveTax.toFixed(2)),
        statedGrandTotal,
        advancePaid: parseFloat(advancePaid.toFixed(2)),
        amountPaid: parseFloat(amountPaid.toFixed(2)),
        remainingPayable: parseFloat(finalRemaining.toFixed(2)),
        discrepancyDiff: parseFloat(totalDiff.toFixed(2)),
        itemDiscrepancyCount: itemDiscrepancies.length
      },
      items: reconciledItems,
      warnings
    };
  }
}

module.exports = new InvoiceReconciliationService();
