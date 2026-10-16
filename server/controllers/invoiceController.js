const path = require('path');
const fs = require('fs');
const db = require('../database/db');
const { getIstIsoString } = require('../utils/dateTime');

// Modular Services (Section 7)
const documentUploadService = require('../services/DocumentUploadService');
const documentPreprocessor = require('../services/DocumentPreprocessor');
const pdfTextExtractor = require('../services/PdfTextExtractor');
const ocrService = require('../services/ocr/ocrService');
const aiInvoiceExtractor = require('../services/AiInvoiceExtractor');
const invoiceSchemaValidator = require('../services/InvoiceSchemaValidator');
const unitNormalizationService = require('../services/UnitNormalizationService');
const invoiceReconciliationService = require('../services/InvoiceReconciliationService');
const duplicateDetectionService = require('../services/DuplicateDetectionService');
const invoiceReviewService = require('../services/InvoiceReviewService');
const invoicePersistenceService = require('../services/InvoicePersistenceService');
const notificationService = require('../services/NotificationService');

/**
 * Controller for AI-Powered OCR Invoice Processing and Management
 */
class InvoiceController {
  /**
   * 1. Upload and Process Invoice Document (PDF or Image)
   * Chains Services 1-9 to extract, validate, normalize, reconcile, and stage invoice data.
   */
  async uploadAndProcess(req, res) {
    const startTime = Date.now();
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No invoice document uploaded.' });
      }

      // Step 1: Upload Validation (Service 1)
      const uploadValidation = documentUploadService.validateUpload(req.file);
      if (!uploadValidation.valid) {
        return res.status(400).json({ success: false, error: uploadValidation.error });
      }

      const filePath = req.file.path;
      const originalName = req.file.originalname;
      const fileSize = req.file.size;
      const mimeType = req.file.mimetype;
      const fileExt = path.extname(originalName).toLowerCase();
      const isPdf = fileExt === '.pdf' || mimeType === 'application/pdf';

      console.log(`[InvoiceController] Received upload: ${originalName} (${fileSize} bytes, type: ${mimeType})`);

      // Step 2: Document Preprocessing (Service 4)
      const preprocessInfo = await documentPreprocessor.preprocess(filePath, mimeType);

      // Step 3: Text Extraction / OCR (Services 2 & 3)
      let ocrResult = null;
      let rawText = '';
      let extractionMethod = '';

      if (isPdf) {
        // Try direct digital extraction first
        const digitalPdf = await pdfTextExtractor.extractText(filePath);
        if (digitalPdf.isTextBased && digitalPdf.text && digitalPdf.text.length >= 35) {
          rawText = digitalPdf.text;
          extractionMethod = 'Direct Digital PDF Parser';
          ocrResult = {
            pdfType: 'text',
            text: rawText,
            pageCount: digitalPdf.pageCount,
            ocrConfidence: 100,
            extractionMethod,
            pages: digitalPdf.pages
          };
        } else {
          // Scanned or low digital density PDF: Run OCR
          console.log('[InvoiceController] Digital PDF text low/empty. Invoking Tesseract OCR service...');
          ocrResult = await ocrService.processPdf(filePath);
          rawText = ocrResult.text;
          extractionMethod = ocrResult.extractionMethod || 'Tesseract OCR v5';
        }
      } else {
        // Direct Image (JPG, PNG, WEBP)
        ocrResult = await ocrService.processPdf(filePath);
        rawText = ocrResult.text;
        extractionMethod = ocrResult.extractionMethod || 'Tesseract OCR v5 (Direct Image)';
      }

      // Step 4: Multimodal / Document AI Extraction (Service 5)
      const aiExtraction = await aiInvoiceExtractor.extractInvoice(rawText, filePath, {
        mimeType,
        fileName: originalName
      });

      // Step 5: Schema Validation & Normalization (Services 6 & 7)
      const validatedData = invoiceSchemaValidator.validateAndSanitize(aiExtraction.data);

      // Step 6: Arithmetic Reconciliation (Service 8)
      const reconciliation = invoiceReconciliationService.reconcile(validatedData);

      // Step 7: Duplicate Detection (Service 9)
      const duplicateInfo = duplicateDetectionService.checkDuplicate({
        invoiceNumber: validatedData.invoice?.invoice_number,
        vendorId: validatedData.vendor?.id,
        vendorName: validatedData.vendor?.vendor_name,
        invoiceDate: validatedData.invoice?.invoice_date,
        grandTotal: validatedData.invoice?.grand_total || validatedData.invoice?.total
      });

      const latencyMs = Date.now() - startTime;

      // Construct file viewer URL
      const relativeUploadPath = `/uploads/${path.basename(filePath)}`;

      // Return complete staging payload for Side-by-Side Review
      return res.json({
        success: true,
        data: {
          file: {
            fileName: originalName,
            storedPath: filePath.replace(/\\/g, '/'),
            viewUrl: relativeUploadPath,
            fileSize,
            mimeType,
            isPdf
          },
          preprocessing: preprocessInfo,
          ocr: {
            pdfType: ocrResult?.pdfType || (isPdf ? 'text' : 'image'),
            pageCount: ocrResult?.pageCount || 1,
            confidence: ocrResult?.ocrConfidence || 90,
            extractionMethod,
            rawText: rawText ? rawText.slice(0, 2000) : ''
          },
          aiEngine: aiExtraction.engine,
          invoice: {
            ...validatedData.invoice,
            pdf_path: filePath.replace(/\\/g, '/'),
            ocr_text: rawText.slice(0, 4000)
          },
          vendor: validatedData.vendor,
          buyer: validatedData.buyer,
          items: reconciliation.items || validatedData.items,
          reconciliation: reconciliation,
          duplicate: duplicateInfo,
          warnings: reconciliation.warnings || [],
          aiLog: {
            engine: aiExtraction.engine,
            raw_text: rawText.slice(0, 4000),
            ai_response: aiExtraction.data,
            warnings: reconciliation.warnings,
            latency_ms: latencyMs
          }
        }
      });
    } catch (error) {
      console.error('[InvoiceController] Upload processing error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to process invoice document.'
      });
    }
  }

  /**
   * 2. Recalculate Staged Review Data dynamically (Service 10)
   */
  async recalculateReview(req, res) {
    try {
      const reviewData = req.body;
      if (!reviewData || !reviewData.items) {
        return res.status(400).json({ success: false, error: 'Invalid review data payload.' });
      }

      const updated = invoiceReviewService.recalculateTotals(reviewData);
      return res.json({ success: true, data: updated });
    } catch (error) {
      console.error('[InvoiceController] Recalculate review error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * 3. Get Supported Measurement Units list
   */
  async getSupportedUnits(req, res) {
    try {
      const units = unitNormalizationService.getAllSupportedUnits();
      return res.json({ success: true, data: units });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * 3b. Check duplicate invoice in real time
   */
  async checkDuplicate(req, res) {
    try {
      const { invoiceNumber, vendorId, vendorName, invoiceDate, grandTotal } = req.body;
      const dup = duplicateDetectionService.checkDuplicate({
        invoiceNumber,
        vendorId,
        vendorName,
        invoiceDate,
        grandTotal: grandTotal || 0
      });
      return res.json({ success: true, data: dup });
    } catch (err) {
      console.error('[InvoiceController] checkDuplicate error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * 4. Save Confirmed & Reviewed Invoice to Database (Service 11)
   */
  async saveInvoice(req, res) {
    try {
      const body = req.body;

      // Handle both structured review format { invoice, items, vendor, buyer, aiLog }
      // and flat format { invoiceNumber, total, items, vendorId, ... }
      let persistencePayload = {};

      const creatorUserId = req.user?.id || body.userId || body.created_by_user_id || body.creatorId || null;
      let effectiveUserId = creatorUserId;
      if (!effectiveUserId && (req.user?.role === 'staff' || body.userRole === 'staff')) {
        const defaultStaff = await db.get("SELECT id FROM users WHERE role = 'staff' LIMIT 1");
        if (defaultStaff) effectiveUserId = defaultStaff.id;
      }

      if (body.invoice && Array.isArray(body.items)) {
        // Modern review payload
        const grandTot = body.invoice.total || body.invoice.grand_total || 0;
        const invObj = {
          ...body.invoice,
          invoice_number: body.invoice.invoice_number || body.invoice.invoiceNumber,
          invoice_date: body.invoice.invoice_date || body.invoice.invoiceDate,
          due_date: body.invoice.due_date || body.invoice.dueDate,
          po_number: body.invoice.po_number || body.invoice.poNumber,
          total: grandTot,
          grand_total: grandTot,
          paid: Number(body.invoice.paid || body.invoice.amount_paid || 0),
          amount_paid: Number(body.invoice.amount_paid || body.invoice.paid || 0),
          outstanding_balance: body.invoice.outstanding_balance !== undefined ? Number(body.invoice.outstanding_balance) : grandTot,
          status: (req.user?.role === 'staff' || req.user?.role === 'employee')
            ? 'Pending Approval'
            : (body.invoice.status || 'Pending Approval')
        };

        persistencePayload = {
          invoice: invObj,
          items: body.items,
          vendor: body.vendor || null,
          buyer: body.buyer || null,
          aiLog: body.aiLog || null,
          userId: effectiveUserId,
          userRole: req.user?.role || 'staff'
        };
      } else {
        // Flat format compatibility
        const grandTot = body.total || body.total_amount || body.grand_total || body.invoice?.grand_total || 0;
        persistencePayload = {
          invoice: {
            invoice_number: body.invoiceNumber || body.invoice_number,
            invoice_date: body.invoiceDate || body.invoice_date,
            due_date: body.dueDate || body.due_date,
            po_number: body.poNumber || body.po_number,
            place_of_supply: body.placeOfSupply || body.place_of_supply,
            currency: body.currency || 'INR',
            payment_terms: body.paymentTerms || body.payment_terms || null,
            payment_method: body.paymentMethod || body.payment_method || null,
            category: body.category || null,
            subtotal: body.subtotal,
            discount: body.discount || body.discount_amount || 0,
            taxable_amount: body.taxableAmount || body.taxable_amount || body.subtotal,
            tax: body.tax || body.total_tax || body.total_gst || 0,
            cgst: body.cgst || 0,
            sgst: body.sgst || 0,
            igst: body.igst || 0,
            freight_charges: body.freightCharges || body.freight_charges || 0,
            other_charges: body.otherCharges || body.other_charges || 0,
            round_off: body.roundOff || body.round_off || 0,
            total_gst: body.total_gst || body.tax || body.total_tax || 0,
            total: grandTot,
            grand_total: grandTot,
            advance_paid: body.advancePaid || body.advance_paid || 0,
            paid: Number(body.paid || body.amount_paid || 0),
            amount_paid: Number(body.amountPaid || body.paid || 0),
            outstanding_balance: body.outstandingBalance !== undefined ? Number(body.outstandingBalance) : grandTot,
            pdf_path: body.pdfPath || body.pdf_path || body.file_id,
            ocr_text: body.ocrText || body.ocr_text || '',
            status: (req.user?.role === 'staff' || req.user?.role === 'employee')
              ? 'Pending Approval'
              : (body.status || 'Pending Approval')
          },
          items: body.items || [],
          vendor: body.newVendor || (body.vendorId ? { id: body.vendorId } : (body.vendor || (body.vendor_name ? { vendor_name: body.vendor_name, gstin: body.vendor_gstin, address: body.vendor_address } : null))),
          buyer: body.buyer || (body.buyer_name ? { company_name: body.buyer_name, gstin: body.buyer_gstin, billing_address: body.buyer_address } : null),
          aiLog: body.aiLog || null,
          userId: effectiveUserId,
          userRole: req.user?.role || body.userRole || 'staff'
        };
      }

      if (!persistencePayload.invoice.invoice_number) {
        return res.status(400).json({ success: false, error: 'Invoice number is required.' });
      }

      const savedInvoice = await invoicePersistenceService.persistInvoice(persistencePayload);

      return res.status(201).json({
        success: true,
        message: 'Invoice and line items saved successfully.',
        data: savedInvoice
      });
    } catch (error) {
      console.error('[InvoiceController] Save error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to save invoice.' });
    }
  }

  /**
   * 5. Get all invoices with filtering, sorting and pagination
   */
  async getInvoices(req, res) {
    try {
      const {
        search,
        vendorId,
        categoryId,
        startDate,
        endDate,
        status,
        sortBy = 'created_at',
        sortOrder = 'DESC',
        page = 1,
        limit = 10,
        userId
      } = req.query;

      let whereClauses = [];
      let params = [];

      // Role-based visibility isolation:
      // When Staff / Employee logs in, ONLY the invoices uploaded by that particular staff member are visible
      const isStaffUser = (req.user && (req.user.role === 'staff' || req.user.role === 'employee'));
      if (isStaffUser) {
        whereClauses.push('i.created_by_user_id = ?');
        params.push(req.user.id);
      } else if (userId && req.user?.role !== 'owner') {
        whereClauses.push('i.created_by_user_id = ?');
        params.push(userId);
      }

      if (search) {
        whereClauses.push('(i.invoice_number LIKE ? OR v.vendor_name LIKE ? OR i.po_number LIKE ?)');
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      if (vendorId) {
        whereClauses.push('i.vendor_id = ?');
        params.push(vendorId);
      }

      if (status) {
        whereClauses.push('i.status = ?');
        params.push(status);
      }

      if (startDate) {
        whereClauses.push('i.invoice_date >= ?');
        params.push(startDate);
      }

      if (endDate) {
        whereClauses.push('i.invoice_date <= ?');
        params.push(endDate);
      }

      if (categoryId) {
        whereClauses.push('i.id IN (SELECT invoice_id FROM invoice_items WHERE category_id = ?)');
        params.push(categoryId);
      }

      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      // Count total matching
      const countSql = `
        SELECT COUNT(DISTINCT i.id) as totalCount
        FROM invoices i
        LEFT JOIN vendors v ON i.vendor_id = v.id
        ${whereSql}
      `;
      const countResult = await db.get(countSql, params);
      const totalCount = countResult ? countResult.totalCount : 0;

      // Safe sorting column - default by newest first (created_at DESC, id DESC)
      const validSortCols = ['created_at', 'invoice_date', 'total', 'invoice_number'];
      const effectiveSortBy = validSortCols.includes(sortBy) ? sortBy : 'created_at';
      const finalOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      let orderByClause = '';
      if (effectiveSortBy === 'created_at') {
        orderByClause = `ORDER BY i.created_at ${finalOrder}, i.id ${finalOrder}`;
      } else if (effectiveSortBy === 'invoice_date') {
        orderByClause = `ORDER BY i.invoice_date ${finalOrder}, i.id ${finalOrder}`;
      } else {
        orderByClause = `ORDER BY i.${effectiveSortBy} ${finalOrder}, i.id DESC`;
      }

      const offset = (Number(page) - 1) * Number(limit);

      const listSql = `
        SELECT 
          i.*,
          v.vendor_name,
          v.vendor_type,
          v.gstin as vendor_gstin,
          COALESCE(u_creator.name, 'Store Staff') as created_by_name,
          COALESCE(u_creator.role, 'staff') as created_by_role,
          u_approver.name as approved_by_name,
          u_approver.role as approved_by_role,
          (SELECT COUNT(*) FROM invoice_items WHERE invoice_id = i.id) as items_count
        FROM invoices i
        LEFT JOIN vendors v ON i.vendor_id = v.id
        LEFT JOIN users u_creator ON i.created_by_user_id = u_creator.id
        LEFT JOIN users u_approver ON i.approved_by_user_id = u_approver.id
        ${whereSql}
        ${orderByClause}
        LIMIT ? OFFSET ?
      `;

      const listParams = [...params, Number(limit), offset];
      const invoices = await db.query(listSql, listParams);

      return res.json({
        success: true,
        data: invoices,
        pagination: {
          total: totalCount,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(totalCount / Number(limit))
        }
      });
    } catch (error) {
      console.error('[InvoiceController] Get invoices error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * 6. Get single invoice by ID
   */
  async getInvoiceById(req, res) {
    try {
      const { id } = req.params;

      // Auto-mark invoice as viewed by requester (owner or staff)
      if (req.user) {
        try {
          const istNow = getIstIsoString();
          if (req.user.role === 'owner') {
            await db.run('UPDATE invoices SET viewed_by_owner = 1, viewed_at = ? WHERE id = ?', [istNow, id]);
            await db.run('UPDATE notifications SET is_read = 1, read_at = ? WHERE related_type = ? AND related_id = ? AND (target_role = ? OR target_role = ?)', [istNow, 'invoice', id, 'owner', 'all']);
          } else {
            await db.run('UPDATE invoices SET viewed_by_staff = 1, staff_viewed_at = ? WHERE id = ?', [istNow, id]);
            await db.run('UPDATE notifications SET is_read = 1, read_at = ? WHERE related_type = ? AND related_id = ? AND (target_role = ? OR target_role = ?)', [istNow, 'invoice', id, 'staff', 'all']);
          }
        } catch (e) {
          console.warn('[InvoiceController] Failed to mark viewed:', e.message);
        }
      }

      const invoiceData = await this.fetchInvoiceWithDetails(id);

      if (!invoiceData) {
        return res.status(404).json({ success: false, error: 'Invoice not found.' });
      }

      return res.json({ success: true, data: invoiceData });
    } catch (error) {
      console.error('[InvoiceController] Get invoice error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * 6b. Download clean Invoice PDF (only the invoice document)
   */
  async downloadInvoicePdf(req, res) {
    try {
      const { id } = req.params;
      const invoiceData = await this.fetchInvoiceWithDetails(id);

      if (!invoiceData) {
        return res.status(404).json({ success: false, error: 'Invoice not found.' });
      }

      const { generateInvoicePdf } = require('../utils/invoicePdfGenerator');
      const pdfBytes = await generateInvoicePdf(invoiceData);

      const cleanNum = (invoiceData.invoice_number || `invoice_${id}`).replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Invoice-${cleanNum}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBytes.length);

      return res.send(Buffer.from(pdfBytes));
    } catch (error) {
      console.error('[InvoiceController] Download PDF error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * 7. Get line items for an invoice
   */
  async getInvoiceItems(req, res) {
    try {
      const { id } = req.params;
      const items = await db.query(`
        SELECT ii.*, c.category_name
        FROM invoice_items ii
        LEFT JOIN categories c ON ii.category_id = c.id
        WHERE ii.invoice_id = ?
        ORDER BY ii.line_number ASC, ii.id ASC
      `, [id]);

      return res.json({ success: true, data: items });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * 8. Update existing invoice
   */
  async updateInvoice(req, res) {
    try {
      const { id } = req.params;
      const {
        vendorId,
        invoiceNumber,
        invoiceDate,
        dueDate,
        poNumber,
        subtotal,
        discount,
        tax,
        total,
        status,
        advance_paid,
        amount_paid,
        paid,
        outstanding_balance,
        taxable_amount,
        other_charges,
        freight_charges,
        round_off,
        items = []
      } = req.body;

      const existing = await db.get('SELECT * FROM invoices WHERE id = ?', [id]);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Invoice not found.' });
      }

      const isOwner = req.user && (req.user.role === 'owner' || req.user.id === 1);
      const istNow = getIstIsoString();
      // When staff updates an invoice, reset viewed_by_owner to 0 so the owner receives a new notification number
      const viewedByOwner = isOwner ? 1 : 0;
      const viewedAt = isOwner ? istNow : null;
      // When owner updates an invoice, reset viewed_by_staff to 0 so staff receives a notification number
      const viewedByStaff = isOwner ? 0 : 1;
      const staffViewedAt = isOwner ? null : istNow;

      const subtotalVal = subtotal !== undefined ? Number(subtotal) : (existing.subtotal || 0);
      const discountVal = discount !== undefined ? Number(discount) : (existing.discount || 0);
      const taxableVal = taxable_amount !== undefined ? Number(taxable_amount) : Math.max(0, parseFloat((subtotalVal - discountVal).toFixed(2)));
      const taxVal = tax !== undefined ? Number(tax) : (existing.tax || 0);
      const otherChargesVal = other_charges !== undefined ? Number(other_charges) : (existing.other_charges || 0);
      const freightVal = freight_charges !== undefined ? Number(freight_charges) : (existing.freight_charges || 0);
      const roundOffVal = round_off !== undefined ? Number(round_off) : (existing.round_off || 0);
      const totalVal = total !== undefined ? Number(total) : Math.max(0, parseFloat((taxableVal + taxVal + otherChargesVal + freightVal + roundOffVal).toFixed(2)));
      const advanceVal = advance_paid !== undefined ? Number(advance_paid) : (existing.advance_paid || 0);
      const paidVal = (amount_paid !== undefined || paid !== undefined) ? Number(amount_paid || paid || 0) : (existing.amount_paid || existing.paid || 0);
      const currentStatus = status || (isOwner ? (existing.status || 'Approved') : 'Pending Approval');
      const isPaidStatus = currentStatus === 'Paid';
      const balanceVal = isPaidStatus ? 0 : (outstanding_balance !== undefined ? Number(outstanding_balance) : Math.max(0, parseFloat((totalVal - advanceVal - paidVal).toFixed(2))));

      await db.transaction(async () => {
        await db.run(`
          UPDATE invoices SET
            vendor_id = ?,
            invoice_number = ?,
            invoice_date = ?,
            due_date = ?,
            po_number = ?,
            subtotal = ?,
            discount = ?,
            taxable_amount = ?,
            tax = ?,
            total = ?,
            advance_paid = ?,
            paid = ?,
            amount_paid = ?,
            outstanding_balance = ?,
            status = ?,
            viewed_by_owner = ?,
            viewed_at = ?,
            viewed_by_staff = ?,
            staff_viewed_at = ?,
            updated_at = ?
          WHERE id = ?
        `, [
          vendorId !== undefined ? (vendorId || null) : (existing.vendor_id || null),
          invoiceNumber || existing.invoice_number,
          invoiceDate || existing.invoice_date || null,
          dueDate || existing.due_date || null,
          poNumber || existing.po_number || null,
          subtotalVal,
          discountVal,
          taxableVal,
          taxVal,
          totalVal,
          advanceVal,
          paidVal,
          paidVal,
          balanceVal,
          currentStatus,
          viewedByOwner,
          viewedAt || null,
          viewedByStaff,
          staffViewedAt || null,
          istNow,
          id
        ]);

        if (items && items.length > 0) {
          await db.run('DELETE FROM invoice_items WHERE invoice_id = ?', [id]);
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            await db.run(`
              INSERT INTO invoice_items (
                invoice_id, line_number, item_name, item_description, sku, hsn_code, category_id,
                quantity, unit, unit_original, unit_normalized, unit_price,
                price_unit_quantity, price_unit_measure, discount, discount_amount,
                taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount,
                tax, total_price, line_total, calculation_valid, unit_flagged,
                classification_confidence
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              id,
              item.line_number || (i + 1),
              item.item_name || item.itemName || 'Item',
              item.item_description || item.description || '',
              item.sku || '',
              item.hsn_code || '',
              item.category_id || item.categoryId || null,
              Number(item.quantity) || 1,
              item.unit_normalized || item.unit || 'pcs',
              item.unit_original || item.unit || 'pcs',
              item.unit_normalized || item.unit || 'pcs',
              Number(item.unit_price || item.unitPrice) || 0,
              Number(item.price_unit_quantity) || 1,
              item.price_unit_measure || null,
              Number(item.discount_amount || item.discount) || 0,
              Number(item.discount_amount || item.discount) || 0,
              Number(item.taxable_value) || 0,
              Number(item.gst_rate) || 0,
              Number(item.cgst_amount) || 0,
              Number(item.sgst_amount) || 0,
              Number(item.igst_amount) || 0,
              Number(item.tax) || 0,
              Number(item.line_total || item.total_price || item.totalPrice) || 0,
              Number(item.line_total || item.total_price || item.totalPrice) || 0,
              item.calculation_valid !== undefined ? (item.calculation_valid ? 1 : 0) : 1,
              item.unit_flagged !== undefined ? (item.unit_flagged ? 1 : 0) : 0,
              Number(item.classification_confidence || item.confidence) || 1.0
            ]);
          }
        }
      });

      const updated = await this.fetchInvoiceWithDetails(id);

      // Create persistent notification for the reciprocal party
      try {
        await notificationService.createNotification({
          target_role: isOwner ? 'staff' : 'owner',
          type: 'invoice_updated',
          title: isOwner ? 'Invoice Updated by Owner' : 'Invoice Updated by Staff',
          message: `${isOwner ? 'Owner' : 'Staff'} updated invoice #${updated.invoice_number} (Total: ₹${updated.total})`,
          link: `/invoices/${updated.id}`,
          related_id: updated.id,
          related_type: 'invoice',
          created_by_user_id: req.user?.id || null,
          created_by_name: req.user?.name || (isOwner ? 'Store Owner' : 'Staff')
        });
      } catch (notifErr) {
        console.warn('[InvoiceController] Notification error:', notifErr.message);
      }

      return res.json({ success: true, message: 'Invoice updated successfully.', data: updated });
    } catch (error) {
      console.error('[InvoiceController] Update error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * 9. Delete invoice
   */
  async deleteInvoice(req, res) {
    try {
      const { id } = req.params;
      const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', [id]);
      if (!invoice) {
        return res.status(404).json({ success: false, error: 'Invoice not found.' });
      }

      if (invoice.pdf_path && fs.existsSync(invoice.pdf_path)) {
        try { fs.unlinkSync(invoice.pdf_path); } catch (_) {}
      }

      await db.transaction(async () => {
        await db.run('DELETE FROM invoice_items WHERE invoice_id = ?', [id]);
        await db.run('DELETE FROM invoices WHERE id = ?', [id]);
        await db.run('DELETE FROM notifications WHERE related_id = ? AND related_type = ?', [id, 'invoice']);
      });

      return res.json({ success: true, message: 'Invoice deleted successfully.' });
    } catch (error) {
      console.error('[InvoiceController] Delete error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * 10. Approve and Pay Invoice (Owner action)
   */
  async approveAndPay(req, res) {
    try {
      const { id } = req.params;
      const { paymentMethod = 'Bank Transfer', paymentReference = '', paymentNotes = '' } = req.body;

      const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', [id]);
      if (!invoice) {
        return res.status(404).json({ success: false, error: 'Invoice not found.' });
      }

      const txRef = paymentReference.trim() || `TXN-${Date.now().toString().slice(-8)}`;
      const istNow = getIstIsoString();

      const advancePaid = Number(invoice.advance_paid) || 0;
      const totalAmount = Number(invoice.total) || 0;
      const finalPaidSettlement = Math.max(0, parseFloat((totalAmount - advancePaid).toFixed(2)));

      await db.run(`
        UPDATE invoices SET
          status = 'Paid',
          paid = ?,
          amount_paid = ?,
          outstanding_balance = 0,
          approved_by_user_id = ?,
          payment_method = ?,
          payment_reference = ?,
          payment_notes = ?,
          paid_at = ?,
          viewed_by_owner = 1,
          viewed_at = ?,
          viewed_by_staff = 0,
          staff_viewed_at = NULL,
          updated_at = ?
        WHERE id = ?
      `, [
        finalPaidSettlement,
        totalAmount,
        req.user?.id || null,
        paymentMethod,
        txRef,
        paymentNotes || 'Payment confirmed by owner',
        istNow,
        istNow,
        istNow,
        id
      ]);

      const updated = await this.fetchInvoiceWithDetails(id);

      try {
        await notificationService.createNotification({
          target_role: 'staff',
          type: 'invoice_paid',
          title: 'Invoice Payment Approved',
          message: `Owner approved & paid invoice #${updated.invoice_number} (₹${updated.total}) via ${paymentMethod}`,
          link: `/invoices/${updated.id}`,
          related_id: updated.id,
          related_type: 'invoice',
          created_by_user_id: req.user?.id || 1,
          created_by_name: req.user?.name || 'Store Owner'
        });
      } catch (notifErr) {
        console.warn('[InvoiceController] Notification error on payment:', notifErr.message);
      }

      return res.json({
        success: true,
        message: `Invoice #${updated.invoice_number} successfully approved and payment recorded!`,
        data: updated
      });
    } catch (error) {
      console.error('[InvoiceController] approveAndPay error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * 11. Reject Invoice (Owner action)
   */
  async rejectInvoice(req, res) {
    try {
      const { id } = req.params;
      const { reason = 'Rejected by owner' } = req.body;

      const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', [id]);
      if (!invoice) {
        return res.status(404).json({ success: false, error: 'Invoice not found.' });
      }

      const istNow = getIstIsoString();
      await db.run(`
        UPDATE invoices SET
          status = 'Rejected',
          approved_by_user_id = ?,
          payment_notes = ?,
          viewed_by_owner = 1,
          viewed_at = ?,
          viewed_by_staff = 0,
          staff_viewed_at = NULL,
          updated_at = ?
        WHERE id = ?
      `, [
        req.user?.id || null,
        `Rejection Reason: ${reason}`,
        istNow,
        istNow,
        id
      ]);

      const updated = await this.fetchInvoiceWithDetails(id);

      try {
        await notificationService.createNotification({
          target_role: 'staff',
          type: 'invoice_rejected',
          title: 'Invoice Rejected by Owner',
          message: `Invoice #${updated.invoice_number} was rejected. Reason: ${reason}`,
          link: `/invoices/${updated.id}`,
          related_id: updated.id,
          related_type: 'invoice',
          created_by_user_id: req.user?.id || 1,
          created_by_name: req.user?.name || 'Store Owner'
        });
      } catch (notifErr) {
        console.warn('[InvoiceController] Notification error on reject:', notifErr.message);
      }

      return res.json({
        success: true,
        message: `Invoice #${updated.invoice_number} rejected.`,
        data: updated
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Helper to fetch full invoice with joined vendor, buyer, and items
   */
  async fetchInvoiceWithDetails(id) {
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
        COALESCE(u_creator.name, 'Store Staff') as created_by_name,
        COALESCE(u_creator.role, 'staff') as created_by_role,
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

module.exports = new InvoiceController();
