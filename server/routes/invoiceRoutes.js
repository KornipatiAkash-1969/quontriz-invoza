const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const upload = require('../utils/multerConfig');
const invoiceController = require('../controllers/invoiceController');
const { SAMPLES_DIR } = require('../utils/samplePdfGenerator');
const { verifyToken, optionalToken, requireRole } = require('../utils/authMiddleware');

// 1. Upload & OCR/AI process PDF or Image (Service 1-9 pipeline)
router.post('/upload', upload.single('pdf'), (req, res) => {
  invoiceController.uploadAndProcess(req, res);
});

// 2. Process predefined sample PDF or messy handwritten invoices for instant testing
router.post('/process-sample/:sampleKey', async (req, res) => {
  try {
    const { sampleKey } = req.params;
    const sampleMap = {
      'electronics': { file: 'sample-digital-electronics-invoice.pdf', mime: 'application/pdf' },
      'grocery': { file: 'sample-grocery-supermart-invoice.pdf', mime: 'application/pdf' },
      'scanned': { file: 'sample-scanned-invoice.pdf', mime: 'application/pdf' },
      'handwritten-grocery': { file: 'sample-handwritten-grocery-chit.pdf', mime: 'application/pdf' },
      'handwritten-chemist': { file: 'sample-handwritten-chemist-rx.pdf', mime: 'application/pdf' },
      'handwritten-hardware': { file: 'sample-handwritten-hardware-chit.pdf', mime: 'application/pdf' },
      'handwritten-mandi': { file: 'sample-handwritten-mandi-bilty.pdf', mime: 'application/pdf' },
      'handwritten-receipt': { file: 'sample-handwritten-thermal-receipt.png', mime: 'image/png' },
      'handwritten-pharma': { file: 'sample-handwritten-pharma-bill.jpg', mime: 'image/jpeg' },
    };

    const target = sampleMap[sampleKey];
    if (!target) {
      return res.status(400).json({ success: false, error: `Unknown sample invoice key: ${sampleKey}` });
    }

    const filePath = path.join(SAMPLES_DIR, target.file);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: `Sample file "${target.file}" not found.` });
    }

    const stats = fs.statSync(filePath);
    req.file = {
      path: filePath,
      originalname: target.file,
      mimetype: target.mime,
      size: stats.size
    };

    return invoiceController.uploadAndProcess(req, res);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

const TESTING_FILES_ROOT = path.join(__dirname, '../Testing files');

// 2b. Get all available test files from the Testing files directory
router.get('/testing-files', (req, res) => {
  try {
    if (!fs.existsSync(TESTING_FILES_ROOT)) {
      return res.json({ success: true, files: [] });
    }

    const categories = [
      { key: 'sample', name: 'Sample & Handwritten Invoices', dir: 'Sample invoices' },
      { key: 'digital', name: '20 Store Test PDFs', dir: 'freshmart_ocr_20_test_pdfs' },
      { key: 'varied', name: 'Varied & Scanned Layouts (30 Invoices)', dir: 'freshmart_ocr_20_varied_formats' }
    ];

    const result = categories.map(cat => {
      const catDir = path.join(TESTING_FILES_ROOT, cat.dir);
      let fileList = [];
      if (fs.existsSync(catDir)) {
        fileList = fs.readdirSync(catDir)
          .filter(f => f.endsWith('.pdf') || f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'))
          .map(f => {
            const stats = fs.statSync(path.join(catDir, f));
            return {
              filename: f,
              relativePath: path.posix.join(cat.dir, f),
              size: stats.size,
              displayName: f.replace(/\.pdf$/i, '').replace(/_/g, ' ')
            };
          });
      }
      return {
        ...cat,
        files: fileList
      };
    });

    return res.json({ success: true, categories: result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2c. Process a specific test file from the Testing files directory
router.post('/process-test-file', async (req, res) => {
  try {
    const { relativePath } = req.body;
    if (!relativePath || typeof relativePath !== 'string') {
      return res.status(400).json({ success: false, error: 'relativePath is required.' });
    }

    // Security check to prevent directory traversal
    const safePath = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');
    const fullPath = path.join(TESTING_FILES_ROOT, safePath);

    if (!fs.existsSync(fullPath) || !fullPath.startsWith(TESTING_FILES_ROOT)) {
      return res.status(404).json({ success: false, error: `Test file not found: ${relativePath}` });
    }

    const ext = path.extname(fullPath).toLowerCase();
    let mime = 'application/pdf';
    if (ext === '.png') mime = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
    else if (ext === '.webp') mime = 'image/webp';

    const stats = fs.statSync(fullPath);
    req.file = {
      path: fullPath,
      originalname: path.basename(fullPath),
      mimetype: mime,
      size: stats.size
    };

    return invoiceController.uploadAndProcess(req, res);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Dynamic review recalculation (Service 10)
router.post('/review/recalculate', optionalToken, (req, res) => {
  invoiceController.recalculateReview(req, res);
});

// 4. Get supported measurement units for autocomplete
router.get('/units', (req, res) => {
  invoiceController.getSupportedUnits(req, res);
});

// 4b. Real-time duplicate invoice check
router.post('/check-duplicate', optionalToken, (req, res) => {
  invoiceController.checkDuplicate(req, res);
});

// 5. Save confirmed & reviewed invoice (Service 11 transactional persistence)
router.post('/', optionalToken, (req, res) => {
  invoiceController.saveInvoice(req, res);
});

// 6. Owner approves & pays invoice
router.post('/:id/approve-pay', verifyToken, requireRole('owner'), (req, res) => {
  invoiceController.approveAndPay(req, res);
});

// 7. Owner rejects invoice
router.post('/:id/reject', verifyToken, requireRole('owner'), (req, res) => {
  invoiceController.rejectInvoice(req, res);
});

// 8. Get all invoices (with filters & pagination)
router.get('/', optionalToken, (req, res) => {
  invoiceController.getInvoices(req, res);
});

// 9. Get single invoice by ID
router.get('/:id', optionalToken, (req, res) => {
  invoiceController.getInvoiceById(req, res);
});

// 9b. Download clean Invoice PDF (only the invoice document)
router.get('/:id/pdf', optionalToken, (req, res) => {
  invoiceController.downloadInvoicePdf(req, res);
});

// 10. Get line items for single invoice
router.get('/:id/items', optionalToken, (req, res) => {
  invoiceController.getInvoiceItems(req, res);
});

// 11. Update invoice
router.put('/:id', verifyToken, (req, res) => {
  invoiceController.updateInvoice(req, res);
});

// 12. Delete invoice (Owner ONLY)
router.delete('/:id', verifyToken, requireRole('owner'), (req, res) => {
  invoiceController.deleteInvoice(req, res);
});

module.exports = router;
