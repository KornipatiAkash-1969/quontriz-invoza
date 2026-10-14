const ai = require('./services/AiInvoiceExtractor');
const p = require('./services/PdfTextExtractor');

async function testFile(pathToFile) {
  console.log(`\n================= TESTING ${pathToFile} =================`);
  const r = await p.extractText(pathToFile);
  const res = await ai.extractInvoice(r.fullText, pathToFile);
  console.log('Supplier:', res.data.supplier.company_name);
  console.log('Address:', res.data.supplier.address);
  console.log('Buyer:', res.data.buyer.company_name);
  console.log('Invoice No:', res.data.invoice.invoice_number);
  console.log('Date:', res.data.invoice.invoice_date);
  console.log('Due Date:', res.data.invoice.due_date);
  console.log('PO:', res.data.invoice.po_number);
  console.log('Subtotal:', res.data.invoice.subtotal);
  console.log('Discount:', res.data.invoice.discount);
  console.log('Grand Total:', res.data.invoice.grand_total);
  console.log('Items Count:', res.data.items.length);
  res.data.items.forEach((it, i) => {
    console.log(`  [${i+1}] ${it.item_name} | SKU: ${it.sku} | HSN: ${it.hsn_code} | Qty: ${it.quantity} ${it.unit_normalized} | Rate: ₹${it.unit_price} | Disc: ₹${it.discount_amount} | Taxable: ₹${it.taxable_value} | GST: ${it.gst_rate}% (₹${it.cgst_amount}+₹${it.sgst_amount}) | Total: ₹${it.line_total} | Valid: ${it.calculation_valid}`);
  });
}

async function run() {
  await testFile('C:/Users/user/Downloads/freshmart_test_invoice_printed.pdf');
  await testFile('C:/Users/user/Downloads/Test_Invoice_ABC_Wholesale_Rice_Oil.pdf');
}

run().catch(console.error);
