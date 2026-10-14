const fs = require('fs');
const path = require('path');
const openAiService = require('./services/OpenAiInvoiceService');
const invoiceSchemaValidator = require('./services/InvoiceSchemaValidator');
const invoiceReconciliationService = require('./services/InvoiceReconciliationService');

async function testExtraction() {
  console.log('====================================================');
  console.log('Testing Multimodal AI Extraction with Vision & Handwriting');
  console.log('====================================================\n');

  const filesToTest = [
    'F:\\Testing PDFs\\04_Supermarket_Cash_Receipt.png',
    'F:\\Testing PDFs\\05_Pharma_Healthcare_Bill.jpg',
    'F:\\Testing PDFs\\01_Grocery_Wholesale_Depot.pdf'
  ];

  for (const filePath of filesToTest) {
    if (!fs.existsSync(filePath)) {
      console.log(`Skipping ${path.basename(filePath)} (File not found)`);
      continue;
    }

    console.log(`\n--- Testing ${path.basename(filePath)} ---`);
    const startTime = Date.now();
    try {
      const result = await openAiService.analyzeInvoice(filePath, '');
      const latency = Date.now() - startTime;
      console.log(`Engine: ${result.engine} (${result.model}), Latency: ${latency}ms`);
      console.log(`Supplier: "${result.supplier?.company_name || result.supplier?.name}"`);
      console.log(`Invoice No: "${result.invoice?.invoice_number}", Date: "${result.invoice?.invoice_date}"`);
      console.log(`Grand Total: ₹${result.invoice?.grand_total}, Advance: ₹${result.invoice?.advance_paid}, Balance Due: ₹${result.invoice?.outstanding_balance}`);
      console.log(`Items extracted: ${result.items?.length || 0}`);
      if (result.items && result.items.length > 0) {
        result.items.slice(0, 3).forEach((it, idx) => {
          console.log(`  ${idx + 1}. ${it.item_name} | Qty: ${it.quantity} ${it.unit_normalized || it.unit_original} @ ₹${it.unit_price} = ₹${it.line_total}`);
        });
      }

      // Test validation & reconciliation
      const validated = invoiceSchemaValidator.validateAndSanitize(result);
      const reconciled = invoiceReconciliationService.reconcile(validated);
      console.log(`Reconciled Grand Total: ₹${reconciled.invoice?.grand_total}, Status: ${reconciled.warnings?.length === 0 ? 'CLEAN' : 'Flagged ' + reconciled.warnings.length}`);
    } catch (err) {
      console.error(`Error processing ${path.basename(filePath)}:`, err.message);
    }
  }

  console.log('\n====================================================');
  console.log('Multimodal Handwriting & Vision Test Completed');
  console.log('====================================================');
}

testExtraction().catch(console.error);
