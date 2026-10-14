const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const { PDFParse } = require('pdf-parse');

const SAMPLES_DIR = path.join(__dirname, '../uploads/samples');

async function ensureSamplePdfs() {
  if (!fs.existsSync(SAMPLES_DIR)) {
    fs.mkdirSync(SAMPLES_DIR, { recursive: true });
  }

  const sample1Path = path.join(SAMPLES_DIR, 'sample-digital-electronics-invoice.pdf');
  const sample2Path = path.join(SAMPLES_DIR, 'sample-grocery-supermart-invoice.pdf');
  const sample3Path = path.join(SAMPLES_DIR, 'sample-scanned-invoice.pdf');

  // Sample 1: Digital Electronics Invoice
  if (!fs.existsSync(sample1Path)) {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    page.drawText('TAX INVOICE', { x: 230, y: 800, size: 18, font: helveticaBold, color: rgb(0.1, 0.2, 0.5) });
    
    // Vendor Info
    page.drawText('ABC Electronics Pvt Ltd', { x: 50, y: 760, size: 14, font: helveticaBold });
    page.drawText('Plot 42, Tech Park, Phase II, Bengaluru, Karnataka - 560066', { x: 50, y: 742, size: 10, font: helvetica });
    page.drawText('GSTIN: 29ABCDE1234F1Z5 | Phone: +91 98765 43210', { x: 50, y: 728, size: 10, font: helvetica });

    // Invoice Meta
    page.drawText('Invoice Number: INV-88201', { x: 380, y: 760, size: 11, font: helveticaBold });
    page.drawText('Invoice Date: 2026-10-06', { x: 380, y: 742, size: 10, font: helvetica });
    page.drawText('Due Date: 2026-11-06', { x: 380, y: 728, size: 10, font: helvetica });
    page.drawText('PO Number: PO-45012', { x: 380, y: 714, size: 10, font: helvetica });

    // Table Header
    page.drawRectangle({ x: 50, y: 660, width: 495, height: 24, color: rgb(0.9, 0.93, 0.98) });
    page.drawText('Item Description', { x: 60, y: 668, size: 10, font: helveticaBold });
    page.drawText('SKU', { x: 250, y: 668, size: 10, font: helveticaBold });
    page.drawText('Qty', { x: 330, y: 668, size: 10, font: helveticaBold });
    page.drawText('Unit Price', { x: 390, y: 668, size: 10, font: helveticaBold });
    page.drawText('Total', { x: 480, y: 668, size: 10, font: helveticaBold });

    // Items
    const items = [
      { name: 'Samsung 55 inch LED TV', sku: 'ELEC-SAM-55', qty: '2', rate: '45000.00', total: '90000.00' },
      { name: 'HDMI Cable 4K 2m', sku: 'CAB-HDMI-02', qty: '5', rate: '1200.00', total: '6000.00' },
      { name: 'Logitech Wireless Mouse', sku: 'LOGI-M-331', qty: '10', rate: '950.00', total: '9500.00' }
    ];

    let y = 635;
    for (const it of items) {
      page.drawText(it.name, { x: 60, y, size: 10, font: helvetica });
      page.drawText(it.sku, { x: 250, y, size: 9, font: helvetica });
      page.drawText(it.qty, { x: 335, y, size: 10, font: helvetica });
      page.drawText(`Rs. ${it.rate}`, { x: 390, y, size: 10, font: helvetica });
      page.drawText(`Rs. ${it.total}`, { x: 480, y, size: 10, font: helvetica });
      y -= 25;
    }

    // Totals
    page.drawLine({ start: { x: 50, y: y + 10 }, end: { x: 545, y: y + 10 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    page.drawText('Subtotal: Rs. 105500.00', { x: 380, y: y - 10, size: 10, font: helveticaBold });
    page.drawText('Tax (18% GST): Rs. 18990.00', { x: 380, y: y - 28, size: 10, font: helvetica });
    page.drawText('Grand Total: Rs. 124490.00', { x: 380, y: y - 50, size: 12, font: helveticaBold, color: rgb(0.1, 0.5, 0.2) });

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(sample1Path, pdfBytes);
    console.log('[SamplePdfGenerator] Generated sample 1 (Digital Electronics)');
  }

  // Sample 2: Grocery & Supermarket Invoice
  if (!fs.existsSync(sample2Path)) {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    page.drawText('INVOICE / BILL OF SUPPLY', { x: 190, y: 800, size: 16, font: helveticaBold, color: rgb(0.2, 0.5, 0.2) });
    
    // Vendor Info
    page.drawText('Metro Supermarket Wholesalers', { x: 50, y: 760, size: 14, font: helveticaBold });
    page.drawText('Sector 18, Commercial Hub, Noida, Uttar Pradesh - 201301', { x: 50, y: 742, size: 10, font: helvetica });
    page.drawText('GSTIN: 09METRO9988A1Z9 | orders@metro-wholesalers.com', { x: 50, y: 728, size: 10, font: helvetica });

    // Invoice Meta
    page.drawText('Invoice No: INV-44910', { x: 380, y: 760, size: 11, font: helveticaBold });
    page.drawText('Date: 2026-10-05', { x: 380, y: 742, size: 10, font: helvetica });
    page.drawText('PO Ref: PO-METRO-08', { x: 380, y: 728, size: 10, font: helvetica });

    // Table Header
    page.drawRectangle({ x: 50, y: 660, width: 495, height: 24, color: rgb(0.92, 0.96, 0.92) });
    page.drawText('Item Description', { x: 60, y: 668, size: 10, font: helveticaBold });
    page.drawText('Qty', { x: 300, y: 668, size: 10, font: helveticaBold });
    page.drawText('Unit Price', { x: 380, y: 668, size: 10, font: helveticaBold });
    page.drawText('Total Amount', { x: 470, y: 668, size: 10, font: helveticaBold });

    // Supermarket Items across multiple categories
    const groceryItems = [
      { name: 'Coca Cola 500ml', qty: '50 pcs', rate: '35.00', total: '1750.00' },
      { name: 'Lays Classic Chips 50g', qty: '100 pcs', rate: '20.00', total: '2000.00' },
      { name: 'Amul Taaza Milk 500ml', qty: '80 pcs', rate: '27.00', total: '2160.00' },
      { name: 'Aashirvaad Superior MP Atta 5kg', qty: '20 bags', rate: '280.00', total: '5600.00' },
      { name: 'Britannia White Bread 400g', qty: '30 pcs', rate: '45.00', total: '1350.00' },
      { name: 'Dove Beauty Moisture Soap 100g', qty: '40 pcs', rate: '65.00', total: '2600.00' },
      { name: 'Surf Excel Easy Wash Detergent 1kg', qty: '15 packs', rate: '140.00', total: '2100.00' },
      { name: 'Fresh Shimla Apple 1kg', qty: '25 kg', rate: '120.00', total: '3000.00' },
      { name: 'Classmate Notebook A4 200 Pages', qty: '35 pcs', rate: '75.00', total: '2625.00' }
    ];

    let y = 635;
    for (const it of groceryItems) {
      page.drawText(it.name, { x: 60, y, size: 10, font: helvetica });
      page.drawText(it.qty, { x: 300, y, size: 9, font: helvetica });
      page.drawText(`Rs. ${it.rate}`, { x: 380, y, size: 10, font: helvetica });
      page.drawText(`Rs. ${it.total}`, { x: 470, y, size: 10, font: helvetica });
      y -= 22;
    }

    page.drawLine({ start: { x: 50, y: y + 8 }, end: { x: 545, y: y + 8 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    page.drawText('Subtotal: Rs. 23185.00', { x: 380, y: y - 10, size: 10, font: helveticaBold });
    page.drawText('Discount: Rs. 500.00', { x: 380, y: y - 26, size: 10, font: helvetica });
    page.drawText('Tax (GST 5%): Rs. 1134.25', { x: 380, y: y - 42, size: 10, font: helvetica });
    page.drawText('Grand Total: Rs. 23819.25', { x: 380, y: y - 62, size: 12, font: helveticaBold, color: rgb(0.1, 0.5, 0.2) });

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(sample2Path, pdfBytes);
    console.log('[SamplePdfGenerator] Generated sample 2 (Grocery & Supermarket)');
  }

  // Sample 3: Scanned-style PDF (renders an invoice page into a pure raster screenshot, then embeds it in a new PDF with no selectable text)
  if (!fs.existsSync(sample3Path)) {
    try {
      // 1. Create a base PDF
      const tempDoc = await PDFDocument.create();
      const p = tempDoc.addPage([500, 600]);
      const font = await tempDoc.embedFont(StandardFonts.HelveticaBold);
      const normalFont = await tempDoc.embedFont(StandardFonts.Helvetica);
      
      p.drawText('TAX INVOICE - SCANNED COPY', { x: 130, y: 550, size: 14, font });
      p.drawText('Sunrise Agro Farms Pvt Ltd', { x: 50, y: 510, size: 12, font });
      p.drawText('GSTIN: 27SUNAG7788K1Z3', { x: 50, y: 490, size: 10, font: normalFont });
      p.drawText('Invoice: INV-60091', { x: 320, y: 510, size: 11, font });
      p.drawText('Date: 2026-10-04', { x: 320, y: 490, size: 10, font: normalFont });
      p.drawText('Items:', { x: 50, y: 450, size: 11, font });
      p.drawText('1. Amul Butter 500g - Qty: 20 - Rate: 275 - Total: 5500', { x: 50, y: 425, size: 10, font: normalFont });
      p.drawText('2. Marie Gold Biscuits - Qty: 50 - Rate: 35 - Total: 1750', { x: 50, y: 400, size: 10, font: normalFont });
      p.drawText('3. Nescafe Classic Coffee 50g - Qty: 15 - Rate: 160 - Total: 2400', { x: 50, y: 375, size: 10, font: normalFont });
      p.drawText('Subtotal: 9650', { x: 300, y: 330, size: 10, font });
      p.drawText('Tax: 482.50', { x: 300, y: 310, size: 10, font: normalFont });
      p.drawText('Grand Total: 10132.50', { x: 300, y: 280, size: 12, font });
      
      const tempBytes = await tempDoc.save();

      // 2. Render screenshot of this page using PDFParse screenshot
      const parser = new PDFParse({ data: Buffer.from(tempBytes) });
      const sc = await parser.getScreenshot({ imageBuffer: true });
      await parser.destroy();

      if (sc.pages && sc.pages[0]) {
        // 3. Create a clean scanned PDF that only contains the image and NO selectable text!
        const scannedPdf = await PDFDocument.create();
        const embeddedPng = await scannedPdf.embedPng(Buffer.from(sc.pages[0].data));
        const scanPage = scannedPdf.addPage([500, 600]);
        scanPage.drawImage(embeddedPng, { x: 0, y: 0, width: 500, height: 600 });
        const scannedBytes = await scannedPdf.save();
        fs.writeFileSync(sample3Path, scannedBytes);
        console.log('[SamplePdfGenerator] Generated sample 3 (Pure Image Scanned PDF)');
      }
    } catch (e) {
      console.warn('[SamplePdfGenerator] Could not generate sample 3 scanned image:', e.message);
    }
  }

  // Sample 4: Messy Grocery Kacha Chit
  const sampleGroceryChit = path.join(SAMPLES_DIR, 'sample-handwritten-grocery-chit.pdf');
  if (!fs.existsSync(sampleGroceryChit)) {
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([400, 600]);
      const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

      page.drawRectangle({ x: 0, y: 0, width: 400, height: 600, color: rgb(0.99, 0.98, 0.93) });
      for (let ly = 50; ly <= 550; ly += 28) {
        page.drawLine({ start: { x: 20, y: ly }, end: { x: 380, y: ly }, thickness: 0.5, color: rgb(0.85, 0.88, 0.95) });
      }
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
      fs.writeFileSync(sampleGroceryChit, pdfBytes);
      console.log('[SamplePdfGenerator] Generated sample 4 (Handwritten Grocery Chit)');
    } catch (err) {
      console.warn('[SamplePdfGenerator] Note on grocery chit:', err.message);
    }
  }

  // Sample 5: Chemist & Pharma Prescription Bill
  const sampleChemistRx = path.join(SAMPLES_DIR, 'sample-handwritten-chemist-rx.pdf');
  if (!fs.existsSync(sampleChemistRx)) {
    try {
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
      fs.writeFileSync(sampleChemistRx, pdfBytes);
      console.log('[SamplePdfGenerator] Generated sample 5 (Handwritten Chemist Rx)');
    } catch (err) {
      console.warn('[SamplePdfGenerator] Note on chemist rx:', err.message);
    }
  }

  // Sample 6: Hardware & Electrical Informal Chit
  const sampleHardwareChit = path.join(SAMPLES_DIR, 'sample-handwritten-hardware-chit.pdf');
  if (!fs.existsSync(sampleHardwareChit)) {
    try {
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
      fs.writeFileSync(sampleHardwareChit, pdfBytes);
      console.log('[SamplePdfGenerator] Generated sample 6 (Handwritten Hardware Chit)');
    } catch (err) {
      console.warn('[SamplePdfGenerator] Note on hardware chit:', err.message);
    }
  }

  // Sample 7: Grain Mandi Wholesale Bilty
  const sampleMandiBilty = path.join(SAMPLES_DIR, 'sample-handwritten-mandi-bilty.pdf');
  if (!fs.existsSync(sampleMandiBilty)) {
    try {
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
      fs.writeFileSync(sampleMandiBilty, pdfBytes);
      console.log('[SamplePdfGenerator] Generated sample 7 (Handwritten Mandi Bilty)');
    } catch (err) {
      console.warn('[SamplePdfGenerator] Note on mandi bilty:', err.message);
    }
  }

  return {
    sample1: sample1Path,
    sample2: sample2Path,
    sample3: sample3Path
  };
}

module.exports = {
  ensureSamplePdfs,
  SAMPLES_DIR
};
