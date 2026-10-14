const fs = require('fs');
const path = require('path');

const pdfTextExtractor = require('./services/PdfTextExtractor');
const ocrService = require('./services/OcrService');
const openAiService = require('./services/OpenAiInvoiceService');
const invoiceSchemaValidator = require('./services/InvoiceSchemaValidator');
const invoiceReconciliationService = require('./services/InvoiceReconciliationService');

const F_DIR = 'F:\\Testing PDFs';

async function crossExamineAll() {
  console.log('================================================================');
  console.log(`🔍 CROSS-EXAMINING ALL INVOICES IN: ${F_DIR}`);
  console.log('================================================================\n');

  if (!fs.existsSync(F_DIR)) {
    console.error(`Directory not found: ${F_DIR}`);
    return;
  }

  const files = fs.readdirSync(F_DIR);
  console.log(`Found ${files.length} test files in ${F_DIR}.\n`);

  const results = [];

  for (let idx = 0; idx < files.length; idx++) {
    const fileName = files[idx];
    const fullPath = path.join(F_DIR, fileName);
    const ext = path.extname(fileName).toLowerCase();
    const isPdf = ext === '.pdf';

    console.log(`----------------------------------------------------------------`);
    console.log(`[${idx + 1}/${files.length}] Processing: ${fileName}`);
    console.log(`----------------------------------------------------------------`);

    try {
      let rawText = '';
      let extractionType = '';

      if (isPdf) {
        const digital = await pdfTextExtractor.extractText(fullPath);
        if (digital.isTextBased && digital.text && digital.text.length >= 35) {
          rawText = digital.text;
          extractionType = `Digital PDF (${digital.pageCount} pages, ${rawText.length} chars)`;
        } else {
          const ocr = await ocrService.processPdf(fullPath);
          rawText = ocr.text;
          extractionType = `OCR Scanned PDF (${rawText.length} chars)`;
        }
      } else {
        const ocr = await ocrService.processPdf(fullPath);
        rawText = ocr.text;
        extractionType = `Direct Image OCR (${rawText.length} chars)`;
      }

      console.log(`  Source Type: ${extractionType}`);

      // Run Extraction via OpenAi / Universal Engine
      let extraction = null;
      try {
        if (openAiService.apiKey && openAiService.apiKey.startsWith('sk-')) {
          extraction = await openAiService.queryOpenAi(rawText, fullPath, { fileName });
        }
      } catch (err) {
        console.log(`  (AI API call bypassed/fallback: ${err.message})`);
      }

      if (!extraction) {
        extraction = await openAiService.parseWithUniversalEngine(rawText, fullPath);
      }

      // Schema validate and reconcile
      const validated = invoiceSchemaValidator.validateAndSanitize(extraction);
      const reconciliation = invoiceReconciliationService.reconcile(validated);

      const inv = validated.invoice || {};
      const vendor = validated.vendor || {};
      const items = validated.items || [];
      const sum = reconciliation.summary || {};

      console.log(`  🏢 Supplier: ${vendor.vendor_name || 'N/A'} (GSTIN: ${vendor.gstin || 'N/A'})`);
      console.log(`  📄 Invoice #: ${inv.invoice_number || 'N/A'} | Date: ${inv.invoice_date || 'N/A'}`);
      console.log(`  📦 Items Extracted: ${items.length} items`);
      if (items.length > 0) {
        items.forEach((it, i) => {
          console.log(`     ${i + 1}. "${it.item_name}" | Qty: ${it.quantity} ${it.unit || ''} @ ₹${it.unit_price} = ₹${it.line_total} (Tax: ${it.gst_rate || 0}%)`);
        });
      }
      console.log(`  💰 Subtotal: ₹${inv.subtotal}`);
      console.log(`  🏷️ Discount: ₹${inv.discount}`);
      console.log(`  📊 Taxable Amount: ₹${inv.taxable_amount}`);
      console.log(`  🧾 Total GST: ₹${inv.total_gst} (CGST: ₹${inv.cgst}, SGST: ₹${inv.sgst}, IGST: ₹${inv.igst})`);
      if (inv.freight_charges || inv.other_charges) {
        console.log(`  🚚 Freight / Other Charges: ₹${(inv.freight_charges || 0) + (inv.other_charges || 0)}`);
      }
      console.log(`  💵 Grand Total: ₹${inv.grand_total || inv.total}`);
      console.log(`  💳 Advance Paid: ₹${inv.advance_paid || 0}`);
      console.log(`  ⚖️ Remaining Balance: ₹${inv.outstanding_balance}`);
      console.log(`  🎯 Balanced: ${reconciliation.isBalanced ? 'YES ✅' : 'NO ⚠️'}`);
      if (reconciliation.warnings && reconciliation.warnings.length > 0) {
        console.log(`  ⚠️ Warnings:`);
        reconciliation.warnings.forEach(w => console.log(`     - ${w}`));
      }
      console.log('');

      results.push({
        fileName,
        success: true,
        isBalanced: reconciliation.isBalanced,
        itemsCount: items.length,
        supplier: vendor.vendor_name,
        invoiceNumber: inv.invoice_number,
        grandTotal: inv.grand_total || inv.total,
        remainingBalance: inv.outstanding_balance,
        warnings: reconciliation.warnings
      });

    } catch (err) {
      console.error(`  ❌ Error processing ${fileName}:`, err.message);
      results.push({
        fileName,
        success: false,
        error: err.message
      });
    }
  }

  console.log('================================================================');
  console.log('📊 CROSS-EXAMINATION SUMMARY');
  console.log('================================================================');
  results.forEach(r => {
    if (r.success) {
      console.log(`${r.isBalanced ? '✅' : '⚠️'} ${r.fileName.padEnd(42)} | Items: ${String(r.itemsCount).padStart(2)} | Total: ₹${String(r.grandTotal).padStart(9)} | Bal: ₹${String(r.remainingBalance).padStart(9)} | ${r.supplier || 'N/A'}`);
    } else {
      console.log(`❌ ${r.fileName.padEnd(42)} | ERROR: ${r.error}`);
    }
  });
  console.log('');
}

crossExamineAll();
