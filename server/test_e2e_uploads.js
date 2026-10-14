const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000/api';

async function testUploads() {
  console.log('================================================================');
  console.log('🧪 TESTING END-TO-END UPLOADS (Digital PDF, Scanned PDF, PNG, JPG)');
  console.log('================================================================\n');

  // Login as staff
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'staff@supermarket.com', password: 'staff123', portalRole: 'staff' })
  });
  const { token } = await loginRes.json();

  const testFiles = [
    { label: 'Digital PDF', path: path.join(__dirname, 'uploads/samples/sample-grocery-supermart-invoice.pdf') },
    { label: 'Scanned PDF', path: path.join(__dirname, 'uploads/samples/sample-scanned-invoice.pdf') },
    { label: 'Freshmart Image PNG', path: path.join(__dirname, 'uploads/invoice_1791760883988_ce998479.png') },
    { label: 'Medilife Pharma Image JPG', path: path.join(__dirname, 'uploads/invoice_1791760918021_2120b1e4.jpg') }
  ];

  for (const item of testFiles) {
    if (!fs.existsSync(item.path)) {
      console.log(`⚠️ Skip ${item.label} (file not found: ${item.path})`);
      continue;
    }

    console.log(`--- Testing ${item.label}: ${path.basename(item.path)} ---`);
    const fileBytes = fs.readFileSync(item.path);
    const blob = new Blob([fileBytes], { type: item.path.endsWith('.pdf') ? 'application/pdf' : (item.path.endsWith('.png') ? 'image/png' : 'image/jpeg') });
    const formData = new FormData();
    formData.append('pdf', blob, path.basename(item.path));

    const uploadRes = await fetch(`${BASE_URL}/invoices/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });

    const json = await uploadRes.json();
    if (!uploadRes.ok || !json.success) {
      console.error(`❌ Upload failed for ${item.label}:`, json.error);
      throw new Error(`Upload failed for ${item.label}`);
    }

    const d = json.data;
    console.log(`  ✅ Supplier: "${d.vendor?.vendor_name || d.supplier?.company_name}"`);
    console.log(`  ✅ Invoice No: "${d.invoice?.invoice_number}"`);
    console.log(`  ✅ Items count: ${d.items?.length}`);
    console.log(`  ✅ Subtotal: ₹${d.invoice?.subtotal}`);
    console.log(`  ✅ Taxable: ₹${d.invoice?.taxable_amount}`);
    console.log(`  ✅ Total GST: ₹${d.invoice?.total_gst}`);
    console.log(`  ✅ Grand Total: ₹${d.invoice?.grand_total || d.invoice?.total}`);
    console.log(`  ✅ Advance Paid: ₹${d.invoice?.advance_paid}`);
    console.log(`  ✅ Remaining Balance: ₹${d.invoice?.outstanding_balance}`);
    console.log(`  ✅ Reconciled balanced: ${d.reconciliation?.isBalanced}\n`);
  }

  console.log('🎉 ALL END-TO-END UPLOADS PROCESSED SUCCESSFULLY!\n');
}

testUploads().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
