const fs = require('fs');
const path = require('path');
const pdfTextExtractor = require('./services/PdfTextExtractor');
const ocrService = require('./services/OcrService');
const openAiService = require('./services/OpenAiInvoiceService');

const F_DIR = 'F:\\Testing PDFs';

async function inspect(fileName) {
  console.log(`\n======================================================`);
  console.log(`INSPECTING: ${fileName}`);
  console.log(`======================================================`);

  const fullPath = path.join(F_DIR, fileName);
  let rawText = '';
  if (fileName.endsWith('.pdf')) {
    const digital = await pdfTextExtractor.extractText(fullPath);
    if (digital.isTextBased && digital.text && digital.text.length >= 35) {
      rawText = digital.text;
      console.log(`[Digital PDF, ${rawText.length} chars]`);
    } else {
      const ocr = await ocrService.processPdf(fullPath);
      rawText = ocr.text;
      console.log(`[OCR PDF, ${rawText.length} chars]`);
    }
  } else {
    const ocr = await ocrService.processPdf(fullPath);
    rawText = ocr.text;
    console.log(`[Image OCR, ${rawText.length} chars]`);
  }

  console.log('--- RAW TEXT BEGIN ---');
  console.log(rawText.slice(0, 3000));
  console.log('--- RAW TEXT END ---');

  const p = await openAiService.parseWithUniversalEngine(rawText, fullPath);
  console.log('--- EXTRACTED INVOICE ---', p.invoice);
  console.log('--- EXTRACTED ITEMS (' + p.items?.length + ') ---');
  p.items?.forEach((it, i) => console.log(`  ${i+1}. ${it.item_name} | Qty: ${it.quantity} | Rate: ${it.unit_price} | LineTot: ${it.line_total} | Tax: ${it.gst_rate}% (CGST: ${it.cgst_amount}, SGST: ${it.sgst_amount}, IGST: ${it.igst_amount})`));
  console.log('--- WARNINGS ---', p.warnings);
}

async function run() {
  await inspect('01_Grocery_Wholesale_Depot.pdf');
  await inspect('02_Tech_Electronics_Distributor.pdf');
  await inspect('03_Paper_Stationery_Interstate.pdf');
  await inspect('03_stationery_invoice.pdf');
  await inspect('alternate_invoice_layout.pdf');
  await inspect('maple_home_depot_supplier_invoice.pdf');
  await inspect('random_invoice_12_items.pdf');
  await inspect('random_sample_invoice.pdf');
}

run();
