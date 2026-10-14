const openAiService = require('./services/OpenAiInvoiceService');
const invoiceReconciliationService = require('./services/InvoiceReconciliationService');
const invoiceReviewService = require('./services/InvoiceReviewService');

async function testCalculationsAndExtraction() {
  console.log('================================================================');
  console.log('🧪 TESTING AI INVOICE UNDERSTANDING & FINANCIAL CALCULATION RULES');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // -------------------------------------------------------------
  // TEST 1: USER'S EXACT SPECIFICATION EXAMPLE
  // Subtotal: ₹10,000
  // Discount: ₹500
  // Taxable Value: ₹9,500
  // GST 18%: ₹1,710
  // Final Invoice Total: ₹11,210
  // Advance Paid: ₹2,000
  // Remaining Payable: ₹9,210
  // -------------------------------------------------------------
  console.log('--- TEST 1: USER SPECIFICATION EXAMPLE (Rules A, B, D, E, F) ---');
  const userExampleReviewData = {
    invoice: {
      subtotal: 10000,
      discount: 500,
      gst_rate: 18,
      advance_paid: 2000,
      amount_paid: 0
    },
    items: [
      {
        item_name: 'Wholesale Basmati Rice 25kg',
        quantity: 10,
        unit_price: 1000,
        price_unit_quantity: 1,
        discount_amount: 500,
        gst_rate: 18
      }
    ]
  };

  const reconUserExample = invoiceReviewService.recalculateTotals(userExampleReviewData);
  const inv1 = reconUserExample.invoice;

  assert(inv1.subtotal === 10000, `Subtotal is ₹${inv1.subtotal} === ₹10,000`);
  assert(inv1.discount === 500, `Discount is ₹${inv1.discount} === ₹500`);
  assert(inv1.taxable_amount === 9500, `Taxable Value is ₹${inv1.taxable_amount} === ₹9,500`);
  assert(inv1.tax === 1710, `GST 18% is ₹${inv1.tax} === ₹1,710`);
  assert(inv1.cgst === 855 && inv1.sgst === 855, `CGST (9%) is ₹${inv1.cgst}, SGST (9%) is ₹${inv1.sgst}`);
  assert(inv1.total === 11210, `Final Invoice Total is ₹${inv1.total} === ₹11,210`);
  assert(inv1.advance_paid === 2000, `Advance Paid is ₹${inv1.advance_paid} === ₹2,000`);
  assert(inv1.outstanding_balance === 9210, `Remaining Payable is ₹${inv1.outstanding_balance} === ₹9,210`);
  assert(reconUserExample.reconciliation.isBalanced, `Invoice reconciliation is fully balanced`);

  // -------------------------------------------------------------
  // TEST 2: RULE D - NEVER DEDUCT GST FROM TAX-INCLUSIVE GRAND TOTAL
  // Grand total ₹11,210 includes GST. Remaining payable must be Grand Total - Advance (₹9,210).
  // Under NO circumstance should it be Grand Total - GST - Advance!
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: RULE D (NO GST DEDUCTION FROM INCLUSIVE TOTAL) ---');
  const inclusiveTaxData = {
    invoice: {
      subtotal: 9500,
      total_gst: 1710,
      grand_total: 11210,
      advance_paid: 2000,
      outstanding_balance: 9210
    },
    items: []
  };
  const reconInclusive = invoiceReconciliationService.reconcile(inclusiveTaxData);
  assert(inclusiveTaxData.invoice.grand_total === 11210, `Grand total preserved as ₹11,210`);
  assert(inclusiveTaxData.invoice.outstanding_balance === 9210, `Outstanding balance correctly ₹9,210 (not subtracted GST!)`);

  // -------------------------------------------------------------
  // TEST 3: RULE E - NEVER DEDUCT ADVANCE TWICE
  // If printed Balance Due already accounts for advance, do not deduct advance a 2nd time
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: RULE E (NEVER DEDUCT ADVANCE TWICE) ---');
  const alreadyDeductedData = {
    invoice: {
      grand_total: 11210,
      advance_paid: 2000,
      outstanding_balance: 9210 // Already accounts for 2000 advance
    },
    items: []
  };
  invoiceReconciliationService.reconcile(alreadyDeductedData);
  assert(alreadyDeductedData.invoice.outstanding_balance === 9210, `Balance due is ₹9,210 (advance deducted once, not twice to ₹7,210)`);

  // -------------------------------------------------------------
  // TEST 4: DYNAMIC FIELD SYNONYMS IN OCR TEXT
  // Test raw OCR text with unconventional headings:
  // "Bill Amount", "Basic Amount", "Trade Discount", "Hamali", "Advance Received", "Net Payable"
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: DYNAMIC HEADING MAPPINGS (Universal Fallback Engine) ---');
  const unconventionalOcrText = `
    SUPPLIER MEMO
    Vendor: Southern Provisions & FMCG Traders
    Tax ID: 29AAAAA0000A1Z5
    Bill No: BILL-90812
    Date: 12-10-2026
    
    Item Description | Qty | Rate | Line Total
    1. Premium Toor Dal 30kg | 5 | 2000.00 | 10000.00
    2. Sunflower Oil 15L | 2 | 1500.00 | 3000.00
    
    Basic Amount: 13000.00
    Trade Discount: 1000.00
    Hamali Charges: 250.00
    Tax Amount (GST 5%): 600.00
    Bill Amount: 12850.00
    Advance Received: 3000.00
    Net Payable: 9850.00
  `;

  const parsedUniversal = await openAiService.parseWithUniversalEngine(unconventionalOcrText, 'test.txt');
  assert(parsedUniversal.vendor?.vendor_name?.includes('Southern Provisions'), `Vendor extracted: "${parsedUniversal.vendor?.vendor_name}"`);
  assert(parsedUniversal.invoice?.invoice_number === 'BILL-90812', `Invoice number mapped from "Bill No": "${parsedUniversal.invoice?.invoice_number}"`);
  assert(parsedUniversal.items?.length === 2, `Line items extracted: ${parsedUniversal.items?.length}`);
  assert(parsedUniversal.invoice?.subtotal === 13000, `Subtotal mapped from "Basic Amount": ₹${parsedUniversal.invoice?.subtotal}`);
  assert(parsedUniversal.invoice?.discount === 1000, `Discount mapped from "Trade Discount": ₹${parsedUniversal.invoice?.discount}`);
  assert((parsedUniversal.invoice?.other_charges || parsedUniversal.invoice?.freight_charges) === 250, `Extra charges mapped from "Hamali Charges": ₹${parsedUniversal.invoice?.other_charges || parsedUniversal.invoice?.freight_charges}`);
  assert(parsedUniversal.invoice?.advance_paid === 3000, `Advance mapped from "Advance Received": ₹${parsedUniversal.invoice?.advance_paid}`);
  assert(parsedUniversal.invoice?.grand_total === 12850, `Grand total mapped from "Bill Amount": ₹${parsedUniversal.invoice?.grand_total}`);
  assert(parsedUniversal.invoice?.outstanding_balance === 9850, `Outstanding balance mapped from "Net Payable": ₹${parsedUniversal.invoice?.outstanding_balance}`);

  console.log('\n================================================================');
  console.log(`🎉 ALL ${passed}/${total} CALCULATION & EXTRACTION TESTS PASSED!`);
  console.log('================================================================\n');
}

testCalculationsAndExtraction().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
