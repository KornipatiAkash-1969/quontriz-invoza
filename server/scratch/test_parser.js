const path = require('path');
const ocrService = require('../services/OcrService');
const pdfExtractor = require('../services/PdfTextExtractor');
const unitNormalizationService = require('../services/UnitNormalizationService');

function cleanNum(val) {
  if (!val) return 0;
  return parseFloat(String(val).replace(/,/g, '').replace(/[^0-9.-]/g, '')) || 0;
}

function parseUniversalInvoice(text, filePath = '') {
  const raw = (text || '').replace(/\r\n/g, '\n');
  const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  const normalizeDateToIso = (dateStr) => {
    if (!dateStr) return null;
    const s = String(dateStr).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    const monthMap = {
      jan: '01', january: '01', feb: '02', february: '02', mar: '03', march: '03',
      apr: '04', april: '04', may: '05', jun: '06', june: '06', jul: '07', july: '07',
      aug: '08', august: '08', sep: '09', sept: '09', september: '09', oct: '10', october: '10',
      nov: '11', november: '11', dec: '12', december: '12'
    };

    const wordMatch = s.match(/^(\d{1,2})[\s\-\/\.]([A-Za-z]{3,9})[\s\-\/\.](\d{2,4})/);
    if (wordMatch) {
      const day = wordMatch[1].padStart(2, '0');
      const mStr = wordMatch[2].toLowerCase();
      const month = monthMap[mStr];
      let year = wordMatch[3];
      if (year.length === 2) year = '20' + year;
      if (month) return `${year}-${month}-${day}`;
    }

    const dmyMatch = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
    if (dmyMatch) {
      const d1 = parseInt(dmyMatch[1], 10);
      const d2 = parseInt(dmyMatch[2], 10);
      let year = dmyMatch[3];
      if (year.length === 2) year = '20' + year;
      if (d1 <= 31 && d2 <= 12) {
        return `${year}-${String(d2).padStart(2, '0')}-${String(d1).padStart(2, '0')}`;
      }
    }

    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
    return s;
  };

  // State Map
  const stateMap = {
    '33': 'Tamil Nadu', '36': 'Telangana', '37': 'Andhra Pradesh', '27': 'Maharashtra',
    '29': 'Karnataka', '07': 'Delhi', '09': 'Uttar Pradesh', '19': 'West Bengal',
    '24': 'Gujarat', '32': 'Kerala', '08': 'Rajasthan', '06': 'Haryana', '03': 'Punjab'
  };

  // 1. Detect GSTINs
  const gstinMatches = [...raw.matchAll(/\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1})\b/gi)];
  let supplierGstin = null;
  let buyerGstin = null;
  if (gstinMatches.length > 0) {
    supplierGstin = gstinMatches[0][1].toUpperCase();
    if (gstinMatches.length > 1) buyerGstin = gstinMatches[1][1].toUpperCase();
  }

  // 2. Supplier & Buyer
  let supplierName = null;
  let supplierAddress = null;
  let buyerName = null;
  let buyerAddress = null;

  // Labeled matches
  const bMatch = raw.match(/(?:billed\s*to|bill\s*to|buyer|customer|invoiced\s*to)[:\s]+([^\n\r]+?)(?=\s+(?:order\s*ref|po|payment|gstin|phone|date|\n|$))/i);
  if (bMatch) {
    buyerName = bMatch[1].replace(/tax\s*invoice/i, '').trim();
  }

  const sMatch = raw.match(/(?:billed\s*from|bill\s*from|supplier|vendor|seller)[:\s]+([^\n\r]+?)(?=\s+(?:invoice\s*no|inv\s*no|address|gstin|po|\n|$))/i);
  if (sMatch) {
    supplierName = sMatch[1].replace(/tax\s*invoice/i, '').trim();
  }

  // Top banner supplier detection
  if (!supplierName) {
    for (let i = 0; i < Math.min(lines.length, 6); i++) {
      const l = lines[i];
      if (!l.match(/tax\s*invoice|sample\s*invoice|retail\s*cash\s*memo|original|duplicate|triplicate|pharmaceutical\s*wholesale/i) &&
          !l.match(/^(?:store|phone|email|gstin|date|invoice)/i) &&
          l.length > 3 && l.length < 70) {
        supplierName = l.replace(/•.*$/, '').trim();
        break;
      }
    }
  }

  // Supplier address
  if (!supplierAddress) {
    for (let i = 0; i < Math.min(lines.length, 8); i++) {
      const l = lines[i];
      if (l.match(/(?:road|street|nagar|plot|complex|avenue|cross|layout|estate|pune|mumbai|delhi|bangalore|ahmedabad|hyderabad|chennai)\b/i) &&
          !l.match(/gstin|phone|email|invoice|bill/i)) {
        supplierAddress = l.trim();
        break;
      }
    }
  }

  // 3. Metadata
  let invoiceNumber = null;
  const invNoMatch = raw.match(/(?:invoice\s*(?:no\.?|number|#|id)|inv\s*(?:no\.?|#|id)|memo\s*no\.?|bill\s*no\.?|order\s*ref(?:\.?|erence)?|document\s*(?:no\.?|number|#|id))[:\s.\-]+([A-Za-z0-9.\-_/]+)/i) ||
                     raw.match(/\b([A-Z]{2,5}-(?:INV|MHD|VLT|PL|NOV|FB|PO|2026|[0-9]{2,4})-[0-9A-Za-z.\-_]+)\b/i) ||
                     raw.match(/\b([A-Z]{2,4}-\d{4}[.-]\d{3,6})\b/i);
  if (invNoMatch) {
    invoiceNumber = invNoMatch[1].trim();
  } else {
    invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
  }

  let invoiceDateRaw = null;
  const invDateMatch = raw.match(/(?:invoice\s*date|dated|issued|(?:^|\n)\s*date)[:\s]+([0-9]{1,2}[\s\/\-\.][A-Za-z]{3,9}[\s\/\-\.][0-9]{2,4}|[0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4}|[0-9]{4}-[0-9]{2}-[0-9]{2})/i);
  if (invDateMatch) invoiceDateRaw = invDateMatch[1].trim();
  const invoiceDate = normalizeDateToIso(invoiceDateRaw) || new Date().toISOString().split('T')[0];

  let dueDateRaw = null;
  const dueDateMatch = raw.match(/(?:due\s*date|payment\s*due|(?:^|\n)\s*due)[:\s]+([0-9]{1,2}[\s\/\-\.][A-Za-z]{3,9}[\s\/\-\.][0-9]{2,4}|[0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4}|[0-9]{4}-[0-9]{2}-[0-9]{2})/i);
  if (dueDateMatch) dueDateRaw = dueDateMatch[1].trim();
  const dueDate = normalizeDateToIso(dueDateRaw);

  const poMatch = raw.match(/\b(?:order\s*ref(?:\.?|erence)?|po(?:\s*(?:number|no|#))?|purchase\s*order(?:\s*(?:number|no|#))?)[:\s]+([A-Za-z0-9.\-_/]+)/i);
  const poNumber = poMatch ? poMatch[1].trim() : null;

  const payMethodMatch = raw.match(/(?:payment\s*mode|payment\s*method|mode)[:\s]+([^\n\r]+?)(?=\s+(?:upi|ref|total|amount|\n|$))/i);
  const paymentMethod = payMethodMatch ? payMethodMatch[1].trim() : 'Bank Transfer';

  // 4. Financial extraction with dynamic synonym dictionary
  const extractMoney = (regex) => {
    const m = raw.match(regex);
    return m ? cleanNum(m[1]) : 0;
  };

  const subtotal = extractMoney(/(?:merchandise\s*total|gross\s*merchandise\s*value|gross\s*subtotal|gross\s*value|subtotal\s*amount|subtotal|sub\s*total|taxable\s*subtotal|ctainable\s*subtotal|basic\s*amount|net\s*value)\s*(?:amount)?\s*(?:[:=−-]|is)?\s*(?:[■₹:−-]|\(n\)|n\b|rs\.?|\$)*\s*([0-9,]+(?:\.[0-9]{2})?)/i);
  const discount = extractMoney(/(?:total\s*discounts?|trade\s*discount|cash\s*discount|scheme\s*discount|store\s*member\s*discount|member\s*discount|less\s*discount|discounts?|less:\s*discount)\s*(?:\([^)]*\))?\s*(?:amount)?\s*(?:[:=−-]|is)?\s*(?:[■₹:−-]|\(n\)|n\b|rs\.?|\$)*\s*([0-9,]+(?:\.[0-9]{2})?)/i);
  const taxableAmount = extractMoney(/(?:net\s*taxable\s*value|taxable\s*amount|taxable\s*value|taxable\s*subtotal|ctainable\s*subtotal)\s*(?:[:=−-]|is)?\s*(?:[■₹:−-]|\(n\)|n\b|rs\.?|\$)*\s*([0-9,]+(?:\.[0-9]{2})?)/i);
  const totalGst = extractMoney(/(?:tax\s*total|gst\s*total(?:\s*\([0-9.%]+\))?|total\s*tax|total\s*gst|tax\s*amount|gst\s*amount)\s*(?:[:=−-]|is)?\s*(?:[■₹:−-]|\(n\)|n\b|rs\.?|\$)*\s*([0-9,]+(?:\.[0-9]{2})?)/i);
  const cgstExplicit = extractMoney(/(?:central\s*gst|cgst|cost\s*total|cost)\s*(?:\([0-9.%]+\))?\s*(?:total|amount)?\s*(?:[:=−-]|is)?\s*(?:[■₹:−-]|\(n\)|n\b|rs\.?|\$)*\s*([0-9,]+(?:\.[0-9]{2})?)/i);
  const sgstExplicit = extractMoney(/(?:state\s*gst|sgst)\s*(?:\([0-9.%]+\))?\s*(?:total|amount)?\s*(?:[:=−-]|is)?\s*(?:[■₹:−-]|\(n\)|n\b|rs\.?|\$)*\s*([0-9,]+(?:\.[0-9]{2})?)/i);
  const igstExplicit = extractMoney(/(?:integrated\s*gst|igst)\s*(?:\([0-9.%]+\))?\s*(?:total|amount)?\s*(?:[:=−-]|is)?\s*(?:[■₹:−-]|\(n\)|n\b|rs\.?|\$)*\s*([0-9,]+(?:\.[0-9]{2})?)/i);
  const freightCharges = extractMoney(/(?:cold\s*chain\s*delivery|delivery\s*fee|delivery\s*charges?|shipping\s*(?:&|\+)?\s*handling|shipping\s*charges?|freight\s*(?:charges)?|freight|transport\s*charges?)\s*(?:[:=−-]|is)?\s*(?:[■₹:−-]|\(n\)|n\b|rs\.?|\$)*\s*([0-9,]+(?:\.[0-9]{2})?)/i);
  const otherCharges = extractMoney(/(?:hamali|loading\s*charges?|packing\s*(?:&|\+)?\s*handling|handling\s*charges?|miscellaneous\s*charges?|other\s*charges)\s*(?:[:=−-]|is)?\s*(?:[■₹:−-]|\(n\)|n\b|rs\.?|\$)*\s*([0-9,]+(?:\.[0-9]{2})?)/i);
  const grandTotal = extractMoney(/(?:invoice\s*grand\s*total|net\s*payable\s*amount|net\s*payable|invoice\s*total|total\s*due|grand\s*total|net\s*total|bill\s*amount|total\s*invoice\s*value|total\s*amount(?:\s*payable)?|final\s*amount)\s*(?:[:=−-]|is)?\s*(?:[■₹:−-]|\(n\)|n\b|rs\.?|\$)*\s*([0-9,]+(?:\.[0-9]{2})?)/i);
  const advancePaid = extractMoney(/(?:less:\s*deposit|less:\s*advance|deposit\s*received|deposit|advance\s*received|advance\s*paid|advance)\s*(?:amount)?\s*(?:[:=−-]|is)?\s*(?:[■₹:−-]|\(n\)|n\b|rs\.?|\$)*\s*([0-9,]+(?:\.[0-9]{2})?)/i);
  const paid = extractMoney(/(?:less:\s*payment\s*received|payment\s*received|additional\s*payment|paid\s*amount|amount\s*paid|\bpaid\b|amount\s*settled)\s*(?:amount)?\s*(?:[:=−-]|is)?\s*(?:[■₹:−-]|\(n\)|n\b|rs\.?|\$)*\s*([0-9,]+(?:\.[0-9]{2})?)/i);
  const balanceDue = extractMoney(/(?:amount\s*outstanding|balance\s*to\s*pay|balance\s*due|pending\s*amount|outstanding\s*amount|amount\s*due|net\s*payable(?:\s*balance)?|outstanding\s*balance|balance\s*payable)\s*(?:[:=−-]|is)?\s*(?:[■₹:−-]|\(n\)|n\b|rs\.?|\$)*\s*([0-9,]+(?:\.[0-9]{2})?)/i);

  // 5. Line Item Extraction
  const items = [];
  let lineNum = 1;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];

    // Skip summary / header / footer lines
    if (rawLine.match(/tax\s*invoice|retail\s*cash\s*memo|gstin|phone|subtotal|cgst|sgst|igst|grand\s*total|net\s*payable|balance\s*due|thank\s*you|terms|bank|drug\s*lic/i)) {
      continue;
    }

    // Clean currency markers
    const line = rawLine
      .replace(/[■₹]/g, ' ')
      .replace(/\bRs\.?\s*/gi, ' ')
      .replace(/\(n\)/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Pattern A: Retail Memo / Supermarket
    // e.g. "Amul Butter Pasteurised 500g 2 pack 275.00 550.00"
    // or "Tata Tea Gold 1 Kg Pack 1 pack 620.00 620.00"
    const pRetail = line.match(/^(.*?)\s+(\d+(?:\.\d+)?)\s+([A-Za-z]+)\s+([0-9,]+(?:\.[0-9]+)?)\s+([0-9,]+(?:\.[0-9]+)?)$/);
    if (pRetail) {
      const name = pRetail[1].replace(/^[0-9]+[\.\)\s]+/, '').trim();
      const qty = parseFloat(pRetail[2]) || 1;
      const rawUnit = pRetail[3];
      const rate = cleanNum(pRetail[4]);
      const lineTot = cleanNum(pRetail[5]);

      if (name.length >= 2 && rate > 0 && Math.abs(qty * rate - lineTot) < 2.0) {
        const normUnit = unitNormalizationService.normalizeUnit(rawUnit);
        items.push({
          line_number: lineNum++,
          item_name: name,
          item_description: name,
          sku: 'N/A',
          hsn_code: 'N/A',
          category: 'General',
          quantity: qty,
          unit_original: normUnit.unit_original,
          unit_normalized: normUnit.unit_normalized,
          unit_price: rate,
          price_unit_quantity: 1,
          price_unit_measure: normUnit.unit_normalized,
          discount_amount: 0,
          taxable_value: lineTot,
          gst_rate: 0,
          cgst_amount: 0,
          sgst_amount: 0,
          igst_amount: 0,
          line_total: lineTot,
          calculation_valid: true,
          unit_flagged: normUnit.unit_flagged
        });
        continue;
      }
    }

    // Pattern B: Pharma Wholesale with GST%
    // e.g. "Paracetamol B50mg Tablets (Box of 100FT8312 02023 20 boxes 185.00 12% 3,700.00"
    const pPharma = line.match(/^(.*?)\s+(\d+(?:\.\d+)?)\s*([A-Za-z]+)\s+([0-9,]+(?:\.[0-9]+)?)\s+(\d+(?:\.\d+)?%)\s+([0-9,]+(?:\.[0-9]+)?)$/);
    if (pPharma) {
      let name = pPharma[1].replace(/^[0-9]+[\.\)\s]+/, '').trim();
      // Clean trailing batch codes from name if attached
      name = name.replace(/\s+[A-Z0-9]{5,}\s+\d{4,6}$/, '').trim();
      const qty = parseFloat(pPharma[2]) || 1;
      const rawUnit = pPharma[3];
      const rate = cleanNum(pPharma[4]);
      const gstRate = parseFloat(pPharma[5]) || 0;
      const lineTot = cleanNum(pPharma[6]);

      if (name.length >= 2 && rate > 0) {
        const normUnit = unitNormalizationService.normalizeUnit(rawUnit);
        const taxable = Math.min(lineTot, parseFloat((qty * rate).toFixed(2)));
        const gstAmt = parseFloat((taxable * (gstRate / 100)).toFixed(2));
        items.push({
          line_number: lineNum++,
          item_name: name,
          item_description: name,
          sku: 'N/A',
          hsn_code: 'N/A',
          category: 'Pharmaceutical',
          quantity: qty,
          unit_original: normUnit.unit_original,
          unit_normalized: normUnit.unit_normalized,
          unit_price: rate,
          price_unit_quantity: 1,
          price_unit_measure: normUnit.unit_normalized,
          discount_amount: 0,
          taxable_value: taxable,
          gst_rate: gstRate,
          cgst_amount: parseFloat((gstAmt / 2).toFixed(2)),
          sgst_amount: parseFloat((gstAmt / 2).toFixed(2)),
          igst_amount: 0,
          line_total: lineTot,
          calculation_valid: true,
          unit_flagged: normUnit.unit_flagged
        });
        continue;
      }
    }

    // Pattern C: Wholesale / Voltedge / Riverbend with SKU + HSN / GST%
    const pWholesale = line.match(/^(.*?)(?:[\t\s]+|(?=[A-Z]{2,5}-\d{2,4}))([A-Z]{2,5}-\d{2,4})\s+(\d{4,8}\s+)?(\d+(?:\.\d+)?)\s+([0-9,]+(?:\.[0-9]+)?)\s+([0-9,]+(?:\.[0-9]+)?)\s+([0-9,]+(?:\.[0-9]+)?)\s+(\d+(?:\.\d+)?%)\s+([0-9,]+(?:\.[0-9]+)?)\s+([0-9,]+(?:\.[0-9]+)?)$/);
    if (pWholesale) {
      const name = pWholesale[1].replace(/^[0-9]+[\.\)\s]+/, '').trim();
      const sku = pWholesale[2];
      const hsn = (pWholesale[3] || '').trim() || 'N/A';
      const qty = parseFloat(pWholesale[4]) || 1;
      const rate = cleanNum(pWholesale[5]);
      const disc = cleanNum(pWholesale[6]);
      const taxable = cleanNum(pWholesale[7]);
      const gstRate = parseFloat(pWholesale[8]) || 0;
      const gstAmt = cleanNum(pWholesale[9]);
      const lineTot = cleanNum(pWholesale[10]);

      items.push({
        line_number: lineNum++,
        item_name: name,
        item_description: name,
        sku,
        hsn_code: hsn,
        category: 'General',
        quantity: qty,
        unit_original: 'pcs',
        unit_normalized: 'pcs',
        unit_price: rate,
        price_unit_quantity: 1,
        price_unit_measure: 'pcs',
        discount_amount: disc,
        taxable_value: taxable,
        gst_rate: gstRate,
        cgst_amount: parseFloat((gstAmt / 2).toFixed(2)),
        sgst_amount: parseFloat((gstAmt / 2).toFixed(2)),
        igst_amount: 0,
        line_total: lineTot,
        calculation_valid: true,
        unit_flagged: false
      });
      continue;
    }
  }

  // Final Financial Arithmetic Rules (Rules A to H)
  const computedSubtotal = items.length > 0 ? items.reduce((s, it) => s + (it.taxable_value || it.line_total), 0) : (taxableAmount || subtotal);
  const effectiveDiscount = discount > 0 ? discount : items.reduce((s, it) => s + it.discount_amount, 0);
  const effectiveTaxable = Math.max(0, parseFloat((computedSubtotal - effectiveDiscount).toFixed(2)));

  let finalCgst = cgstExplicit;
  let finalSgst = sgstExplicit;
  let finalIgst = igstExplicit;
  let finalGst = totalGst;

  if (finalGst === 0) {
    finalGst = parseFloat((finalCgst + finalSgst + finalIgst).toFixed(2));
  }
  if (finalGst > 0 && finalCgst === 0 && finalSgst === 0 && finalIgst === 0) {
    finalCgst = parseFloat((finalGst / 2).toFixed(2));
    finalSgst = parseFloat((finalGst / 2).toFixed(2));
  }

  const computedGrandTotal = Math.max(0, parseFloat((effectiveTaxable + finalGst + freightCharges + otherCharges).toFixed(2)));
  const finalGrandTotal = grandTotal > 0 ? grandTotal : computedGrandTotal;

  const expectedRemaining = Math.max(0, parseFloat((finalGrandTotal - advancePaid - paid).toFixed(2)));
  let finalOutstanding = expectedRemaining;
  if (balanceDue > 0) {
    if (Math.abs(balanceDue - expectedRemaining) < 1.0) {
      finalOutstanding = balanceDue;
    } else if (Math.abs(balanceDue - finalGrandTotal) < 1.0 && (advancePaid > 0 || paid > 0)) {
      // Balance due printed on invoice did not subtract advance, so apply advance exactly once
      finalOutstanding = expectedRemaining;
    }
  }

  return {
    supplier: {
      company_name: supplierName || 'Supplier',
      gstin: supplierGstin,
      address: supplierAddress,
      state: supplierGstin && stateMap[supplierGstin.slice(0, 2)] ? stateMap[supplierGstin.slice(0, 2)] : 'India'
    },
    buyer: {
      company_name: buyerName || 'Buyer',
      gstin: buyerGstin
    },
    invoice: {
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,
      due_date: dueDate,
      po_number: poNumber,
      payment_method: paymentMethod,
      subtotal: parseFloat(computedSubtotal.toFixed(2)),
      discount: parseFloat(effectiveDiscount.toFixed(2)),
      taxable_amount: effectiveTaxable,
      cgst: finalCgst,
      sgst: finalSgst,
      igst: finalIgst,
      total_gst: finalGst,
      freight_charges: freightCharges,
      other_charges: otherCharges,
      grand_total: parseFloat(finalGrandTotal.toFixed(2)),
      advance_paid: advancePaid,
      amount_paid: paid,
      outstanding_balance: parseFloat(finalOutstanding.toFixed(2))
    },
    items
  };
}

async function testAll() {
  const pngPath = path.join(__dirname, '../uploads/invoice_1791760883988_ce998479.png');
  const pngOcr = await ocrService.processPdf(pngPath);
  const resPng = parseUniversalInvoice(pngOcr.text);
  console.log('Supplier:', resPng.supplier.company_name, 'InvNo:', resPng.invoice.invoice_number);
  console.log('Items found:', resPng.items.length);
  console.log('Subtotal:', resPng.invoice.subtotal, 'Discount:', resPng.invoice.discount, 'GST:', resPng.invoice.total_gst, 'Grand Total:', resPng.invoice.grand_total, 'Balance:', resPng.invoice.outstanding_balance);
  resPng.items.slice(0, 3).forEach(it => console.log('  Item:', it.item_name, 'Qty:', it.quantity, it.unit_normalized, 'Rate:', it.unit_price, 'Total:', it.line_total));

  console.log('\n--- 2. Testing Medilife JPG image ---');
  const jpgPath = path.join(__dirname, '../uploads/invoice_1791760918021_2120b1e4.jpg');
  const jpgOcr = await ocrService.processPdf(jpgPath);
  const resJpg = parseUniversalInvoice(jpgOcr.text);
  console.log('Supplier:', resJpg.supplier.company_name, 'InvNo:', resJpg.invoice.invoice_number);
  console.log('Items found:', resJpg.items.length);
  console.log('Subtotal:', resJpg.invoice.subtotal, 'Freight/Delivery:', resJpg.invoice.freight_charges, 'GST:', resJpg.invoice.total_gst, 'Grand Total:', resJpg.invoice.grand_total);
  resJpg.items.slice(0, 3).forEach(it => console.log('  Item:', it.item_name, 'Qty:', it.quantity, it.unit_normalized, 'Rate:', it.unit_price, 'Total:', it.line_total));
}

testAll().catch(console.error);
