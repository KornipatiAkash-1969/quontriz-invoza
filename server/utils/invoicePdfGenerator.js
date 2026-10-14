const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

/**
 * Generates an official, clean A4 PDF for an invoice
 * @param {Object} invoice - Invoice object with joined vendor, buyer, and items
 * @returns {Promise<Uint8Array>} PDF bytes
 */
async function generateInvoicePdf(invoice) {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595, 842]); // A4: 595.28 x 841.89 points
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const primaryColor = rgb(0.12, 0.23, 0.54); // Deep Indigo
  const slateDark = rgb(0.1, 0.13, 0.2); // Slate 900
  const slateMuted = rgb(0.4, 0.45, 0.55); // Slate 500
  const borderGray = rgb(0.85, 0.88, 0.92); // Slate 200
  const headerBg = rgb(0.95, 0.96, 0.98); // Slate 50

  const isPaid = invoice.status === 'Paid' || (Number(invoice.amount_paid || invoice.paid || 0) >= Number(invoice.total) && Number(invoice.total) > 0);

  function drawHeader(p) {
    // Top Brand / Document Type Bar
    p.drawRectangle({
      x: 40,
      y: 790,
      width: 515,
      height: 3,
      color: primaryColor
    });

    // Header Title
    p.drawText('TAX INVOICE', {
      x: 40,
      y: 760,
      size: 20,
      font: fontBold,
      color: primaryColor
    });

    // Invoice Number
    p.drawText(`Invoice #: ${invoice.invoice_number || 'N/A'}`, {
      x: 40,
      y: 742,
      size: 11,
      font: fontBold,
      color: slateDark
    });

    // Status Badge text
    const statusText = isPaid ? 'APPROVED & PAID' : invoice.status === 'Rejected' ? 'REJECTED' : 'PENDING APPROVAL';
    const statusColor = isPaid ? rgb(0.05, 0.55, 0.25) : rgb(0.85, 0.45, 0.05);
    p.drawText(`Status: ${statusText}`, {
      x: 40,
      y: 728,
      size: 9,
      font: fontBold,
      color: statusColor
    });

    // Right Column: Grand Total Summary Box
    p.drawRectangle({
      x: 375,
      y: 720,
      width: 180,
      height: 48,
      color: headerBg,
      borderColor: borderGray,
      borderWidth: 1
    });

    p.drawText(isPaid ? 'TOTAL PAID' : 'AMOUNT DUE', {
      x: 387,
      y: 752,
      size: 8,
      font: fontBold,
      color: slateMuted
    });

    const formattedTotal = Number(invoice.total || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    p.drawText(`Rs. ${formattedTotal}`, {
      x: 387,
      y: 732,
      size: 15,
      font: fontBold,
      color: primaryColor
    });
  }

  // Draw initial header
  drawHeader(page);

  // Supplier & Bill-To Section
  let y = 690;

  // Supplier Card
  page.drawRectangle({
    x: 40,
    y: y - 75,
    width: 250,
    height: 75,
    borderColor: borderGray,
    borderWidth: 1
  });
  page.drawText('SUPPLIER / VENDOR DETAILS', {
    x: 48,
    y: y - 12,
    size: 8,
    font: fontBold,
    color: slateMuted
  });
  const vendorName = (invoice.vendor_name || 'Unassigned Vendor').slice(0, 36);
  page.drawText(vendorName, {
    x: 48,
    y: y - 26,
    size: 10,
    font: fontBold,
    color: slateDark
  });
  if (invoice.vendor_type) {
    page.drawText(String(invoice.vendor_type).slice(0, 38), {
      x: 48,
      y: y - 38,
      size: 8,
      font: fontRegular,
      color: primaryColor
    });
  }
  if (invoice.vendor_address) {
    page.drawText(String(invoice.vendor_address).slice(0, 45), {
      x: 48,
      y: y - 50,
      size: 8,
      font: fontRegular,
      color: slateMuted
    });
  }
  if (invoice.vendor_gstin) {
    page.drawText(`GSTIN: ${invoice.vendor_gstin}`, {
      x: 48,
      y: y - 64,
      size: 8,
      font: fontBold,
      color: slateDark
    });
  }

  // Bill-To / Buyer Card
  page.drawRectangle({
    x: 305,
    y: y - 75,
    width: 250,
    height: 75,
    borderColor: borderGray,
    borderWidth: 1
  });
  page.drawText('INVOICE META & BUYER', {
    x: 313,
    y: y - 12,
    size: 8,
    font: fontBold,
    color: slateMuted
  });
  page.drawText(`Date: ${invoice.invoice_date || 'N/A'}`, {
    x: 313,
    y: y - 26,
    size: 8.5,
    font: fontRegular,
    color: slateDark
  });
  if (invoice.due_date) {
    page.drawText(`Due Date: ${invoice.due_date}`, {
      x: 313,
      y: y - 38,
      size: 8.5,
      font: fontRegular,
      color: slateDark
    });
  }
  if (invoice.po_number) {
    page.drawText(`PO Ref: ${invoice.po_number}`, {
      x: 313,
      y: y - 50,
      size: 8.5,
      font: fontBold,
      color: slateDark
    });
  }
  if (invoice.buyer_name) {
    page.drawText(`Buyer: ${String(invoice.buyer_name).slice(0, 35)}`, {
      x: 313,
      y: y - 64,
      size: 8.5,
      font: fontRegular,
      color: slateMuted
    });
  } else if (invoice.created_by_name) {
    page.drawText(`Submitted by: ${invoice.created_by_name}`, {
      x: 313,
      y: y - 64,
      size: 8,
      font: fontRegular,
      color: slateMuted
    });
  }

  // Table Setup
  y -= 95;

  function drawTableHeader(p, curY) {
    p.drawRectangle({
      x: 40,
      y: curY - 18,
      width: 515,
      height: 20,
      color: primaryColor
    });

    const white = rgb(1, 1, 1);
    p.drawText('#', { x: 46, y: curY - 13, size: 8, font: fontBold, color: white });
    p.drawText('Item Description', { x: 65, y: curY - 13, size: 8, font: fontBold, color: white });
    p.drawText('Qty / Unit', { x: 265, y: curY - 13, size: 8, font: fontBold, color: white });
    p.drawText('HSN / SKU', { x: 340, y: curY - 13, size: 8, font: fontBold, color: white });
    p.drawText('Rate (Rs)', { x: 410, y: curY - 13, size: 8, font: fontBold, color: white });
    p.drawText('GST %', { x: 470, y: curY - 13, size: 8, font: fontBold, color: white });
    p.drawText('Total (Rs)', { x: 512, y: curY - 13, size: 8, font: fontBold, color: white });
    return curY - 22;
  }

  y = drawTableHeader(page, y);

  const items = invoice.items || [];
  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];

    // Check if we need a new page
    if (y < 120) {
      page = pdfDoc.addPage([595, 842]);
      drawHeader(page);
      y = drawTableHeader(page, 680);
    }

    // Row zebra or line
    if (idx % 2 === 1) {
      page.drawRectangle({
        x: 40,
        y: y - 16,
        width: 515,
        height: 18,
        color: headerBg
      });
    }

    // Bottom row separator line
    page.drawLine({
      start: { x: 40, y: y - 16 },
      end: { x: 555, y: y - 16 },
      thickness: 0.5,
      color: borderGray
    });

    const qty = item.quantity !== undefined && item.quantity !== null ? item.quantity : (item.qty ?? 1);
    const unit = item.unit_normalized || item.unit || 'pcs';
    const hsn = item.hsn_code || item.sku || '—';
    const rate = Number(item.unit_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const gstRate = item.gst_rate ? `${item.gst_rate}%` : '0%';
    const lineTot = Number(item.line_total || item.total_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

    page.drawText(String(idx + 1), { x: 46, y: y - 11, size: 8, font: fontRegular, color: slateMuted });

    const itemName = String(item.item_name || 'Item').slice(0, 36);
    page.drawText(itemName, { x: 65, y: y - 11, size: 8, font: fontBold, color: slateDark });

    page.drawText(`${qty} ${unit}`, { x: 265, y: y - 11, size: 8, font: fontRegular, color: slateDark });
    page.drawText(String(hsn).slice(0, 10), { x: 340, y: y - 11, size: 7.5, font: fontRegular, color: slateMuted });
    page.drawText(rate, { x: 410, y: y - 11, size: 8, font: fontRegular, color: slateDark });
    page.drawText(gstRate, { x: 470, y: y - 11, size: 8, font: fontRegular, color: slateMuted });
    page.drawText(lineTot, { x: 512, y: y - 11, size: 8, font: fontBold, color: slateDark });

    y -= 18;
  }

  // Totals & Payment Section
  if (y < 160) {
    page = pdfDoc.addPage([595, 842]);
    y = 780;
  }

  y -= 15;

  // Left Box: Payment Details
  if (isPaid || invoice.payment_method || invoice.amount_paid > 0) {
    page.drawRectangle({
      x: 40,
      y: y - 75,
      width: 250,
      height: 75,
      color: headerBg,
      borderColor: borderGray,
      borderWidth: 1
    });

    page.drawText('PAYMENT & SETTLEMENT RECORD', {
      x: 48,
      y: y - 14,
      size: 8,
      font: fontBold,
      color: isPaid ? rgb(0.05, 0.55, 0.25) : slateMuted
    });

    page.drawText(`Status: ${isPaid ? 'Settled in Full' : 'Partial / Pending'}`, {
      x: 48,
      y: y - 28,
      size: 8.5,
      font: fontBold,
      color: slateDark
    });

    if (invoice.paid_at || invoice.updated_at) {
      page.drawText(`Settlement Date: ${invoice.paid_at || invoice.updated_at}`, {
        x: 48,
        y: y - 40,
        size: 8,
        font: fontRegular,
        color: slateMuted
      });
    }

    if (invoice.payment_method) {
      page.drawText(`Method: ${invoice.payment_method}`, {
        x: 48,
        y: y - 52,
        size: 8,
        font: fontRegular,
        color: slateDark
      });
    }

    if (invoice.payment_reference) {
      page.drawText(`Ref: ${invoice.payment_reference}`, {
        x: 48,
        y: y - 64,
        size: 8,
        font: fontBold,
        color: primaryColor
      });
    }
  }

  // Right Box: Totals breakdown
  const totalsX = 330;
  const valX = 490;
  let totY = y;

  const drawTotLine = (label, val, bold = false, color = slateDark) => {
    page.drawText(label, { x: totalsX, y: totY - 10, size: 8.5, font: bold ? fontBold : fontRegular, color: slateMuted });
    const formattedVal = Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    page.drawText(`Rs. ${formattedVal}`, { x: valX, y: totY - 10, size: 8.5, font: bold ? fontBold : fontRegular, color });
    totY -= 14;
  };

  drawTotLine('Subtotal:', invoice.subtotal);
  if (invoice.discount > 0) {
    drawTotLine('Discount:', -invoice.discount, false, rgb(0.05, 0.55, 0.25));
  }
  if (invoice.taxable_amount > 0) {
    drawTotLine('Taxable Value:', invoice.taxable_amount);
  }
  if (invoice.cgst > 0 || invoice.sgst > 0) {
    drawTotLine('CGST + SGST:', (invoice.cgst || 0) + (invoice.sgst || 0));
  }
  if (invoice.igst > 0) {
    drawTotLine('IGST:', invoice.igst);
  }
  if (invoice.freight_charges > 0) {
    drawTotLine('Freight / Shipping:', invoice.freight_charges);
  }
  if (invoice.round_off !== 0 && invoice.round_off !== undefined && invoice.round_off !== null) {
    drawTotLine('Round Off:', invoice.round_off);
  }

  // Line above Grand Total
  page.drawLine({
    start: { x: totalsX, y: totY - 4 },
    end: { x: 555, y: totY - 4 },
    thickness: 1,
    color: primaryColor
  });
  totY -= 8;

  page.drawText('GRAND TOTAL:', { x: totalsX, y: totY - 10, size: 10, font: fontBold, color: primaryColor });
  const grandTotStr = Number(invoice.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  page.drawText(`Rs. ${grandTotStr}`, { x: valX - 5, y: totY - 10, size: 10, font: fontBold, color: primaryColor });

  // Signature & Legal Footer
  const footerY = 50;
  page.drawLine({
    start: { x: 40, y: footerY + 25 },
    end: { x: 555, y: footerY + 25 },
    thickness: 0.5,
    color: borderGray
  });

  page.drawText('This is a computer-generated tax invoice verified by OCR Invoice Management System.', {
    x: 40,
    y: footerY + 12,
    size: 7.5,
    font: fontRegular,
    color: slateMuted
  });

  page.drawText('Authorized Signatory', {
    x: 450,
    y: footerY + 12,
    size: 8,
    font: fontBold,
    color: slateDark
  });

  return await pdfDoc.save();
}

module.exports = {
  generateInvoicePdf
};
