const path = require('path');
const pdfTextExtractor = require('./services/PdfTextExtractor');
const ocrService = require('./services/OcrService');
const openAiService = require('./services/OpenAiInvoiceService');
const invoiceReconciliationService = require('./services/InvoiceReconciliationService');
const invoiceSchemaValidator = require('./services/InvoiceSchemaValidator');

const F_DIR = 'F:\\Testing PDFs';

async function checkDetails(fileName) {
  console.log(`\n======================================================`);
  console.log(`CHECKING DETAILS: ${fileName}`);
  console.log(`======================================================`);
  const fullPath = path.join(F_DIR, fileName);
  let rawText = '';
  if (fileName.endsWith('.pdf')) {
    const d = await pdfTextExtractor.extractText(fullPath);
    rawText = d.text && d.text.length >= 35 ? d.text : (await ocrService.processPdf(fullPath)).text;
  } else {
    rawText = (await ocrService.processPdf(fullPath)).text;
  }

  const p = await openAiService.parseWithUniversalEngine(rawText, fullPath);
  const validated = invoiceSchemaValidator.validateAndSanitize(p);
  const recon = invoiceReconciliationService.reconcile(validated);

  console.log('Invoice Header:', validated.invoice);
  console.log('Recon Summary:', recon.summary);
  console.log('Balanced:', recon.isBalanced);
  console.log('Warnings:', recon.warnings);
}

async function run() {
  await checkDetails('01_Grocery_Wholesale_Depot.pdf');
  await checkDetails('03_Paper_Stationery_Interstate.pdf');
  await checkDetails('random_invoice_12_items.pdf');
  await checkDetails('maple_home_depot_supplier_invoice.pdf');
  await checkDetails('04_Supermarket_Cash_Receipt.png');
  await checkDetails('05_Pharma_Healthcare_Bill.jpg');
}

run();
