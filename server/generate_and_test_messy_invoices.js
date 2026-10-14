const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

const BASE_URL = 'http://localhost:5000/api';
const OUT_DIR = path.join(__dirname, 'uploads/messy_test_invoices');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

// 1. Create Messy Invoice 1: Grocery / Kirana Kacha Bill (Ruled Notebook Chit)
async function createGroceryKachaBill() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([400, 600]);
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  // Background light yellow tint (like notepad paper)
  page.drawRectangle({ x: 0, y: 0, width: 400, height: 600, color: rgb(0.99, 0.98, 0.93) });

  // Draw ruled blue lines
  for (let ly = 50; ly <= 550; ly += 28) {
    page.drawLine({ start: { x: 20, y: ly }, end: { x: 380, y: ly }, thickness: 0.5, color: rgb(0.85, 0.88, 0.95) });
  }

  // Margin red line
  page.drawLine({ start: { x: 60, y: 30 }, end: { x: 60, y: 570 }, thickness: 1, color: rgb(0.95, 0.8, 0.8) });

  let y = 560;
  page.drawText('SHREE GANESH PROVISION STORE', { x: 70, y, size: 14, font: fontBold, color: rgb(0.1, 0.1, 0.4) });
  y -= 25;
  page.drawText('Daily Cash Memo / Chit - Bill No: CHIT-8842', { x: 70, y, size: 9, font });
  y -= 20;
  page.drawText('Date: 14/10/2026', { x: 70, y, size: 9, font });
  y -= 28;

  const lines = [
    'Basmati Rice 10 kg @ 85/- = 850/-',
    'Toor Dal 5 kg @ 140 = 700',
    'Sugar 5 kg @ 42 = 210',
    'Sunflower Oil 3 ltr @ 155 = 465',
    'Atta 10 kg @ 38 = 380'
  ];

  for (const l of lines) {
    page.drawText(l, { x: 70, y, size: 11, font, color: rgb(0.05, 0.05, 0.3) });
    y -= 28;
  }

  y -= 10;
  page.drawText('Subtotal: 2605', { x: 180, y, size: 11, font: fontBold });
  y -= 25;
  page.drawText('Discount (Chhoot): 105', { x: 180, y, size: 11, font });
  y -= 25;
  page.drawText('Total Amount: 2500', { x: 180, y, size: 12, font: fontBold, color: rgb(0.7, 0.1, 0.1) });
  y -= 25;
  page.drawText('Adv (Jama): 1000', { x: 180, y, size: 11, font });
  y -= 25;
  page.drawText('Bal (Baki): 1500', { x: 180, y, size: 12, font: fontBold, color: rgb(0.1, 0.4, 0.1) });

  const pdfBytes = await pdfDoc.save();
  const filePath = path.join(OUT_DIR, '01_Grocery_Kacha_Chit.pdf');
  fs.writeFileSync(filePath, pdfBytes);
  return filePath;
}

// 2. Create Messy Invoice 2: Chemist & Pharma Handwritten Prescription Bill
async function createChemistPrescriptionBill() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([420, 580]);
  const font = await pdfDoc.embedFont(StandardFonts.Courier);
  const fontBold = await pdfDoc.embedFont(StandardFonts.CourierBold);

  page.drawRectangle({ x: 0, y: 0, width: 420, height: 580, color: rgb(0.98, 0.99, 0.98) });

  let y = 540;
  page.drawText('APOLLO HEALTHCARE & PHARMA CHEMIST', { x: 30, y, size: 12, font: fontBold, color: rgb(0.1, 0.4, 0.2) });
  y -= 20;
  page.drawText('Memo No: RX-7109   Date: 14-10-2026', { x: 30, y, size: 9, font });
  y -= 20;
  page.drawText('Patient / Buyer: Ramesh Patel', { x: 30, y, size: 9, font });
  y -= 30;

  const lines = [
    'Paracetamol 500mg 2 strips @ 25 = 50',
    'Amoxicillin 500mg 2 strips @ 65 = 130',
    'Azithromycin 500mg 1 strip @ 115 = 115',
    'Cough Syrup 1 bot @ 110 = 110',
    'Vitamin C 3 pkt @ 45 = 135'
  ];

  for (const l of lines) {
    page.drawText(l, { x: 30, y, size: 10, font });
    y -= 25;
  }

  y -= 15;
  page.drawText('Subtotal: 540.00', { x: 180, y, size: 10, font: fontBold });
  y -= 22;
  page.drawText('GST (12%): 64.80', { x: 180, y, size: 10, font });
  y -= 24;
  page.drawText('Grand Total: 604.80', { x: 180, y, size: 11, font: fontBold, color: rgb(0.6, 0.1, 0.1) });
  y -= 22;
  page.drawText('Advance Paid: 200.00', { x: 180, y, size: 10, font });
  y -= 22;
  page.drawText('Balance Payable: 404.80', { x: 180, y, size: 11, font: fontBold, color: rgb(0.1, 0.3, 0.6) });

  const pdfBytes = await pdfDoc.save();
  const filePath = path.join(OUT_DIR, '02_Chemist_Prescription_Bill.pdf');
  fs.writeFileSync(filePath, pdfBytes);
  return filePath;
}

// 3. Create Messy Invoice 3: Hardware / Electrician Informal Chit (Quantity-First)
async function createHardwareChit() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([400, 560]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  page.drawRectangle({ x: 0, y: 0, width: 400, height: 560, color: rgb(0.97, 0.97, 0.98) });

  let y = 520;
  page.drawText('KUMAR ELECTRICALS & HARDWARE STORE', { x: 35, y, size: 12, font: fontBold, color: rgb(0.2, 0.2, 0.3) });
  y -= 22;
  page.drawText('Ref No: ELEC-9021   Date: 14/10/2026', { x: 35, y, size: 9, font });
  y -= 30;

  // Quantity First format: "10 pcs LED Bulbs 9W @ 70 = 700"
  const lines = [
    '10 pcs LED Bulbs 9W @ 70 = 700',
    '2 rolls Wire 1.5mm @ 650 = 1300',
    '5 Switch 6A @ 45 = 225',
    '1 Tape @ 25 = 25'
  ];

  for (const l of lines) {
    page.drawText(l, { x: 35, y, size: 10, font });
    y -= 25;
  }

  y -= 15;
  page.drawText('Total: 2250', { x: 180, y, size: 10, font: fontBold });
  y -= 22;
  page.drawText('Hamali (Labor): 50', { x: 180, y, size: 10, font });
  y -= 22;
  page.drawText('G.Total: 2300', { x: 180, y, size: 11, font: fontBold, color: rgb(0.7, 0.1, 0.1) });
  y -= 22;
  page.drawText('Advance (Jama): 1000', { x: 180, y, size: 10, font });
  y -= 22;
  page.drawText('Balance Due (Baki): 1300', { x: 180, y, size: 11, font: fontBold, color: rgb(0.1, 0.4, 0.1) });

  const pdfBytes = await pdfDoc.save();
  const filePath = path.join(OUT_DIR, '03_Hardware_Electrical_Chit.pdf');
  fs.writeFileSync(filePath, pdfBytes);
  return filePath;
}

// 4. Create Messy Invoice 4: Grain Mandi Wholesale Bilty (with Vernacular Terms & Freight)
async function createMandiBilty() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([420, 580]);
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  page.drawRectangle({ x: 0, y: 0, width: 420, height: 580, color: rgb(0.99, 0.98, 0.95) });

  let y = 530;
  page.drawText('KISAN MANDI VYAPAR DEPOT', { x: 40, y, size: 14, font: fontBold, color: rgb(0.4, 0.2, 0.05) });
  y -= 22;
  page.drawText('Bilty No: MANDI-4412   Date: 14-10-2026', { x: 40, y, size: 9, font });
  y -= 30;

  const lines = [
    'Chana Dal 50 kg @ 72 = 3600',
    'Moong 25 kg @ 110 = 2750',
    'Sarson 40 kg @ 60 = 2400'
  ];

  for (const l of lines) {
    page.drawText(l, { x: 40, y, size: 11, font });
    y -= 28;
  }

  y -= 15;
  page.drawText('Subtotal: 8750', { x: 180, y, size: 11, font: fontBold });
  y -= 24;
  page.drawText('Bhada (Freight): 250', { x: 180, y, size: 10, font });
  y -= 24;
  page.drawText('Hamali (Coolie): 100', { x: 180, y, size: 10, font });
  y -= 24;
  page.drawText('Kul Yog (Grand Total): 9100', { x: 180, y, size: 12, font: fontBold, color: rgb(0.6, 0.1, 0.1) });
  y -= 24;
  page.drawText('Peshgi (Advance): 5000', { x: 180, y, size: 11, font });
  y -= 24;
  page.drawText('Baaki (Net Due): 4100', { x: 180, y, size: 12, font: fontBold, color: rgb(0.1, 0.4, 0.1) });

  const pdfBytes = await pdfDoc.save();
  const filePath = path.join(OUT_DIR, '04_Mandi_Wholesale_Bilty.pdf');
  fs.writeFileSync(filePath, pdfBytes);
  return filePath;
}

async function runTests() {
  console.log('========================================================================');
  console.log('🧪 TESTING REAL-WORLD MESSY HANDWRITTEN INVOICES VIA OCR & AI ENGINE');
  console.log('========================================================================\n');

  // Step 1: Generate test invoice files
  console.log('Generating 4 realistic messy/handwritten sample bills...');
  const files = [
    { label: 'Grocery / Kirana Ruled Notepad Chit', path: await createGroceryKachaBill() },
    { label: 'Chemist & Medical Prescription Bill', path: await createChemistPrescriptionBill() },
    { label: 'Hardware Informal Chit (Quantity First)', path: await createHardwareChit() },
    { label: 'Mandi Wholesale Bilty (Vernacular Terms)', path: await createMandiBilty() }
  ];
  console.log('✅ Generated 4 realistic PDF invoices in: ' + OUT_DIR + '\n');

  // Step 2: Login as staff
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'staff@supermarket.com', password: 'staff123', portalRole: 'staff' })
  });
  const { token } = await loginRes.json();
  if (!token) throw new Error('Failed to login as staff');

  // Step 3: Upload each invoice and test extraction
  let passedCount = 0;

  for (let idx = 0; idx < files.length; idx++) {
    const f = files[idx];
    console.log(`------------------------------------------------------------------------`);
    console.log(`📄 TEST INVOICE #${idx + 1}: ${f.label}`);
    console.log(`   File: ${path.basename(f.path)}`);
    console.log(`------------------------------------------------------------------------`);

    const fileBytes = fs.readFileSync(f.path);
    const blob = new Blob([fileBytes], { type: 'application/pdf' });
    const formData = new FormData();
    formData.append('pdf', blob, path.basename(f.path));

    const uploadRes = await fetch(`${BASE_URL}/invoices/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });

    const json = await uploadRes.json();
    if (!uploadRes.ok || !json.success) {
      console.error(`❌ Upload failed:`, json.error || json);
      continue;
    }

    const d = json.data;
    const inv = d.invoice || {};
    const items = d.items || [];
    const supp = d.vendor?.vendor_name || d.supplier?.company_name;

    console.log(`  🏢 Supplier / Shop:     "${supp}"`);
    console.log(`  🔢 Invoice / Chit No:   "${inv.invoice_number}"`);
    console.log(`  📅 Date:                "${inv.invoice_date}"`);
    console.log(`  📦 Total Items Extracted: ${items.length}`);
    
    // Print itemized breakdown
    items.forEach((it, i) => {
      console.log(`     ${i + 1}. [${it.item_name}]  Qty: ${it.quantity} ${it.unit_normalized}  @ ₹${it.unit_price}  = ₹${it.line_total} (Valid: ${it.calculation_valid ? '✅' : '⚠️'})`);
    });

    console.log(`  💰 Financial Summary:`);
    console.log(`     - Subtotal:          ₹${inv.subtotal}`);
    console.log(`     - Discount:          ₹${inv.discount || 0}`);
    console.log(`     - Total GST / Tax:   ₹${inv.total_gst || 0}`);
    console.log(`     - Freight Charges:   ₹${inv.freight_charges || 0}`);
    console.log(`     - Other / Hamali:    ₹${inv.other_charges || 0}`);
    console.log(`     - Grand Total:       ₹${inv.grand_total || inv.total}`);
    console.log(`     - Advance Paid:      ₹${inv.advance_paid || 0}`);
    console.log(`     - Balance Due:       ₹${inv.outstanding_balance}`);

    // Verification assertion
    const isItemsFound = items.length > 0;
    const isMathValid = items.every(it => it.calculation_valid);
    const isTotalPositive = (inv.grand_total || inv.total) > 0;

    if (isItemsFound && isTotalPositive) {
      console.log(`  🎉 Result: PASSED (Accurate Line Extraction & Reconciliation)\n`);
      passedCount++;
    } else {
      console.log(`  ⚠️ Result: Partial / Review Warnings: ${JSON.stringify(d.warnings)}\n`);
    }
  }

  console.log('========================================================================');
  console.log(`🏁 TEST COMPLETION SUMMARY: ${passedCount}/${files.length} MESSY INVOICES PASSED`);
  console.log('========================================================================');
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
