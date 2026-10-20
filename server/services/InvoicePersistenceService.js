const db = require('../database/db');
const { getIstIsoString } = require('../utils/dateTime');
const notificationService = require('./NotificationService');

/**
 * Service 11: InvoicePersistenceService
 * Transactional database persistence for invoices, vendors, buyers, and dynamic line items.
 * Ensures PostgreSQL ACID compliance with decimal quantities, original/normalized units,
 * and pricing bases.
 */
class InvoicePersistenceService {
  /**
   * Persist a reviewed and approved invoice to the database inside a transaction
   * @param {Object} data - { invoice, items, vendor, buyer, aiLog, userId }
   * @returns {Object} persisted invoice record with relations
   */
  async persistInvoice(data) {
    const {
      invoice = {},
      items = [],
      vendor = null,
      buyer = null,
      aiLog = null,
      userId = null
    } = data;

    if (!invoice.invoice_number && !invoice.invoiceNumber) {
      throw new Error('Invoice number is required for persistence.');
    }

    const invoiceNumber = (invoice.invoice_number || invoice.invoiceNumber).trim();
    const grandTotal = Number(invoice.grand_total || invoice.total || 0);

    const persistedInvoice = await db.transaction(async () => {
      // 1. Resolve or Create Vendor
      let vendorId = vendor?.id || invoice.vendor_id || null;
      const vendorName = vendor?.vendor_name || vendor?.name || invoice.vendor_name;
      const vendorGstin = vendor?.gstin || invoice.vendor_gstin;

      if (!vendorId && (vendorName || vendorGstin)) {
        // Try finding by GSTIN first
        if (vendorGstin) {
          const matchByGstin = await db.get('SELECT id FROM vendors WHERE LOWER(gstin) = LOWER(?)', [vendorGstin.trim()]);
          if (matchByGstin) vendorId = matchByGstin.id;
        }

        // Try finding by Name
        if (!vendorId && vendorName) {
          const matchByName = await db.get('SELECT id FROM vendors WHERE LOWER(vendor_name) = LOWER(?)', [vendorName.trim()]);
          if (matchByName) vendorId = matchByName.id;
        }

        // Insert new vendor if not found
        if (!vendorId && vendorName) {
          const vResult = await db.run(`
            INSERT INTO vendors (vendor_name, vendor_type, contact, email, address, gstin, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            vendorName.trim(),
            vendor.vendor_type || 'General Supplier',
            vendor.contact || '',
            vendor.email || '',
            vendor.address || '',
            vendorGstin || '',
            vendor.notes || 'Created via invoice OCR'
          ]);
          vendorId = vResult.lastInsertRowid || vResult.insertId;
        }
      }

      // 2. Resolve or Create Buyer
      let buyerId = buyer?.id || invoice.buyer_id || null;
      const buyerName = buyer?.company_name || buyer?.name || invoice.buyer_name;
      const buyerGstin = buyer?.gstin || invoice.buyer_gstin;

      if (!buyerId && (buyerName || buyerGstin)) {
        if (buyerGstin) {
          const matchBuyerGstin = await db.get('SELECT id FROM buyers WHERE LOWER(gstin) = LOWER(?)', [buyerGstin.trim()]);
          if (matchBuyerGstin) buyerId = matchBuyerGstin.id;
        }

        if (!buyerId && buyerName) {
          const matchBuyerName = await db.get('SELECT id FROM buyers WHERE LOWER(company_name) = LOWER(?)', [buyerName.trim()]);
          if (matchBuyerName) buyerId = matchBuyerName.id;
        }

        if (!buyerId && buyerName) {
          const bResult = await db.run(`
            INSERT INTO buyers (company_name, gstin, billing_address, shipping_address)
            VALUES (?, ?, ?, ?)
          `, [
            buyerName.trim(),
            buyerGstin || '',
            buyer.billing_address || buyer.address || '',
            buyer.shipping_address || ''
          ]);
          buyerId = bResult.lastInsertRowid || bResult.insertId;
        }
      }

      // 3. Insert Invoice Header
      const subtotal = Number(invoice.subtotal) || 0;
      const discount = Number(invoice.discount) || 0;
      const taxableAmount = invoice.taxable_amount !== undefined ? Number(invoice.taxable_amount) : Math.max(0, parseFloat((subtotal - discount).toFixed(2)));
      const cgst = Number(invoice.cgst) || 0;
      const sgst = Number(invoice.sgst) || 0;
      const igst = Number(invoice.igst) || 0;
      const totalGst = Number(invoice.total_gst || invoice.tax || (cgst + sgst + igst)) || 0;
      const otherCharges = Number(invoice.other_charges) || 0;
      const freightCharges = Number(invoice.freight_charges) || 0;
      const roundOff = Number(invoice.round_off) || 0;
      const calculatedGrandTotal = Math.max(0, parseFloat((taxableAmount + totalGst + otherCharges + freightCharges + roundOff).toFixed(2)));
      const invoiceGrandTotal = Number(invoice.grand_total || invoice.total) || calculatedGrandTotal;
      const advancePaid = Number(invoice.advance_paid) || 0;
      const amountPaid = Number(invoice.amount_paid || invoice.paid) || 0;
      const isPaid = (invoice.status || 'Pending Approval') === 'Paid';
      const outstandingBalance = isPaid
        ? 0
        : (invoice.outstanding_balance !== undefined
            ? Number(invoice.outstanding_balance)
            : Math.max(0, parseFloat((invoiceGrandTotal - advancePaid - amountPaid).toFixed(2))));
      const currency = invoice.currency || 'INR';
      const placeOfSupply = invoice.place_of_supply || '';
      const invoiceDate = invoice.invoice_date || invoice.invoiceDate || null;
      const dueDate = invoice.due_date || invoice.dueDate || null;
      const poNumber = invoice.po_number || invoice.poNumber || null;
      const pdfPath = invoice.pdf_path || invoice.pdfPath || null;
      const ocrText = invoice.ocr_text || invoice.ocrText || '';
      const status = invoice.status || 'Pending Approval';

      const isOwnerCreating = (data.userRole === 'owner' || userId === 1);
      const viewedByOwner = isOwnerCreating ? 1 : 0;
      const viewedByStaff = 1;
      const istNow = getIstIsoString();
      const viewedAt = viewedByOwner ? istNow : null;
      const staffViewedAt = istNow;

      const invResult = await db.run(`
        INSERT INTO invoices (
          vendor_id, buyer_id, invoice_number, invoice_date, due_date, po_number,
          place_of_supply, currency, payment_terms, payment_method, category,
          subtotal, discount, taxable_amount,
          tax, cgst, sgst, igst, freight_charges, other_charges, round_off, total_gst,
          total, advance_paid, paid, amount_paid, outstanding_balance, total_amount_in_words,
          pdf_path, ocr_text, status, created_by_user_id, viewed_by_owner, viewed_at,
          viewed_by_staff, staff_viewed_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        vendorId,
        buyerId,
        invoiceNumber,
        invoiceDate,
        dueDate,
        poNumber,
        placeOfSupply,
        currency,
        invoice.payment_terms || null,
        invoice.payment_method || null,
        invoice.category || null,
        subtotal,
        discount,
        taxableAmount,
        totalGst,
        cgst,
        sgst,
        igst,
        freightCharges,
        otherCharges,
        roundOff,
        totalGst,
        invoiceGrandTotal,
        advancePaid,
        amountPaid,
        amountPaid,
        outstandingBalance,
        invoice.total_amount_in_words || null,
        pdfPath,
        ocrText,
        status,
        userId,
        viewedByOwner,
        viewedAt,
        viewedByStaff,
        staffViewedAt,
        istNow,
        istNow
      ]);

      const invoiceId = invResult.lastInsertRowid || invResult.insertId;

      // 4. Insert Line Items
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        let categoryId = item.category_id || item.categoryId || null;

        // Auto-resolve or create category
        const catName = item.category || item.category_name;
        if (!categoryId && catName && typeof catName === 'string') {
          const existingCat = await db.get('SELECT id FROM categories WHERE LOWER(category_name) = LOWER(?)', [catName.trim()]);
          if (existingCat) {
            categoryId = existingCat.id;
          } else {
            const newCat = await db.run('INSERT INTO categories (category_name) VALUES (?)', [catName.trim()]);
            categoryId = newCat.lastInsertRowid || newCat.insertId;
          }
        }

        const qty = Number(item.quantity) || 1;
        const rate = Number(item.unit_price || item.unitPrice) || 0;
        const basisQty = (Number(item.price_unit_quantity) > 0) ? Number(item.price_unit_quantity) : 1;
        const basisUnit = item.price_unit_measure || null;
        const discAmt = Number(item.discount_amount || item.discount) || 0;
        const taxVal = Number(item.taxable_value) || Math.max(0, (qty / basisQty) * rate - discAmt);
        const gstRate = Number(item.gst_rate) || 0;
        const cgstAmt = Number(item.cgst_amount) || 0;
        const sgstAmt = Number(item.sgst_amount) || 0;
        const igstAmt = Number(item.igst_amount) || 0;
        const itemTax = (cgstAmt + sgstAmt + igstAmt) || Number(item.tax) || 0;
        const lineTotal = Number(item.line_total || item.total_price || item.totalPrice) || (taxVal + itemTax);

        await db.run(`
          INSERT INTO invoice_items (
            invoice_id, line_number, item_name, item_description, sku, hsn_code,
            category_id, quantity, unit, unit_original, unit_normalized,
            unit_price, price_unit_quantity, price_unit_measure,
            discount, discount_amount, taxable_value, gst_rate,
            cgst_amount, sgst_amount, igst_amount, tax,
            total_price, line_total, calculation_valid, unit_flagged,
            classification_confidence
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          invoiceId,
          item.line_number || (i + 1),
          item.item_name || item.itemName || 'Invoice Item',
          item.item_description || item.description || '',
          item.sku || '',
          item.hsn_code || item.hsn || '',
          categoryId,
          qty,
          item.unit_normalized || item.unit || 'pcs',
          item.unit_original || item.unit || 'pcs',
          item.unit_normalized || item.unit || 'pcs',
          rate,
          basisQty,
          basisUnit,
          discAmt,
          discAmt,
          taxVal,
          gstRate,
          cgstAmt,
          sgstAmt,
          igstAmt,
          itemTax,
          lineTotal,
          lineTotal,
          item.calculation_valid !== undefined ? (item.calculation_valid ? 1 : 0) : 1,
          item.unit_flagged !== undefined ? (item.unit_flagged ? 1 : 0) : 0,
          Number(item.classification_confidence || item.confidence) || 1.0
        ]);
      }

      // 5. Store AI Extraction Log if available
      if (aiLog) {
        await db.run(`
          INSERT INTO ai_extraction_logs (
            invoice_id, engine, raw_text, ai_response, warnings, latency_ms
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
          invoiceId,
          aiLog.engine || 'DocumentAI',
          aiLog.raw_text || '',
          typeof aiLog.ai_response === 'object' ? JSON.stringify(aiLog.ai_response) : (aiLog.ai_response || ''),
          Array.isArray(aiLog.warnings) ? JSON.stringify(aiLog.warnings) : (aiLog.warnings || ''),
          Number(aiLog.latency_ms) || 0
        ]);
      }

      // 6. Continuous Learning: Record Ground-Truth Training Sample
      try {
        const aiTrainingService = require('./AiTrainingService');
        await aiTrainingService.recordTrainingSample({
          invoiceId,
          vendorId,
          vendorName: (vendor && vendor.vendor_name) ? vendor.vendor_name : 'Verified Supplier',
          ocrText,
          aiPrediction: aiLog && aiLog.ai_response ? (typeof aiLog.ai_response === 'string' ? JSON.parse(aiLog.ai_response) : aiLog.ai_response) : null,
          groundTruth: {
            invoice: { id: invoiceId, vendor_id: vendorId, total: invoiceGrandTotal, subtotal, ...invoice },
            items
          }
        });
      } catch (trainErr) {
        console.warn('[InvoicePersistenceService] Training sample capture note:', trainErr.message);
      }

      // Return persisted invoice with all details
      return await this.fetchInvoiceById(invoiceId);
    });

    try {
      const isOwnerCreating = (data.userRole === 'owner' || userId === 1);
      const vName = vendor?.vendor_name || vendor?.name || invoice.vendor_name || 'Vendor';

      // If created by owner, DO NOT create notifications for staff
      if (!isOwnerCreating) {
        // 1. Notify Owner so owner can review & approve
        await notificationService.createNotification({
          target_role: 'owner',
          type: 'invoice_created',
          title: 'New Invoice Uploaded by Staff',
          message: `${data.userName || 'Staff'} uploaded invoice #${persistedInvoice.invoice_number} for ${vName} (Total: ₹${persistedInvoice.total})`,
          link: `/invoices/${persistedInvoice.id}`,
          related_id: persistedInvoice.id,
          related_type: 'invoice',
          created_by_user_id: userId,
          created_by_name: data.userName || 'Staff'
        });

        // 2. Notify ONLY THAT PARTICULAR STAFF who uploaded it
        if (userId) {
          await notificationService.createNotification({
            user_id: userId,
            target_role: 'staff',
            type: 'invoice_created',
            title: 'Invoice Uploaded Successfully',
            message: `Invoice #${persistedInvoice.invoice_number} (${vName}) uploaded for owner review`,
            link: `/invoices/${persistedInvoice.id}`,
            related_id: persistedInvoice.id,
            related_type: 'invoice',
            created_by_user_id: userId,
            created_by_name: data.userName || 'Staff'
          });
        }
      }
    } catch (notifErr) {
      console.warn('[InvoicePersistenceService] Notification creation note:', notifErr.message);
    }

    return persistedInvoice;
  }

  /**
   * Fetch saved invoice with vendor, buyer, and items
   * @param {number} id 
   */
  async fetchInvoiceById(id) {
    const invoice = await db.get(`
      SELECT 
        i.*,
        v.vendor_name,
        v.vendor_type,
        v.contact as vendor_contact,
        v.email as vendor_email,
        v.address as vendor_address,
        v.gstin as vendor_gstin,
        b.company_name as buyer_name,
        b.gstin as buyer_gstin,
        b.billing_address as buyer_address,
        u_creator.name as created_by_name,
        u_creator.role as created_by_role,
        u_approver.name as approved_by_name,
        u_approver.role as approved_by_role
      FROM invoices i
      LEFT JOIN vendors v ON i.vendor_id = v.id
      LEFT JOIN buyers b ON i.buyer_id = b.id
      LEFT JOIN users u_creator ON i.created_by_user_id = u_creator.id
      LEFT JOIN users u_approver ON i.approved_by_user_id = u_approver.id
      WHERE i.id = ?
    `, [id]);

    if (!invoice) return null;

    const items = await db.query(`
      SELECT ii.*, c.category_name
      FROM invoice_items ii
      LEFT JOIN categories c ON ii.category_id = c.id
      WHERE ii.invoice_id = ?
      ORDER BY ii.line_number ASC, ii.id ASC
    `, [id]);

    return {
      ...invoice,
      items
    };
  }
}

module.exports = new InvoicePersistenceService();
