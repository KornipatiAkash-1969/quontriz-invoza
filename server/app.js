require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const initDb = require('./database/initDb');
const { ensureSamplePdfs, SAMPLES_DIR } = require('./utils/samplePdfGenerator');

const authRoutes = require('./routes/authRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const vendorTypeRoutes = require('./routes/vendorTypeRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const classificationService = require('./services/classifier/classificationService');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Database (SQLite or MySQL depending on environment)
initDb().catch(err => {
  console.error('[App Fatal] Database initialization error:', err);
});

// Generate Sample PDFs asynchronously
ensureSamplePdfs().catch(err => console.warn('[App] Sample PDF generation note:', err.message));

// Middlewares
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Serve Uploads statically for PDF viewing/download
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check (supports /api/health and Render default /healthz)
app.get(['/api/health', '/healthz', '/health'], (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Classification Test API
app.post('/api/classifier/test', async (req, res) => {
  try {
    const { itemName } = req.body;
    if (!itemName) {
      return res.status(400).json({ success: false, error: 'itemName is required' });
    }
    const result = await classificationService.classifyItem(itemName);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Sample files list API
app.get('/api/samples', (req, res) => {
  try {
    if (!fs.existsSync(SAMPLES_DIR)) {
      return res.json({ success: true, samples: [] });
    }
    const files = fs.readdirSync(SAMPLES_DIR).filter(f => f.endsWith('.pdf'));
    const samples = files.map(f => ({
      name: f,
      url: `/uploads/samples/${f}`,
      key: f.includes('electronics') ? 'electronics' : (f.includes('grocery') ? 'grocery' : 'scanned'),
      title: f.includes('electronics') ? 'ABC Electronics (Digital PDF)' : (f.includes('grocery') ? 'Metro Supermarket (Grocery Digital PDF)' : 'Sunrise Agro (Pure Scanned Image PDF)')
    }));
    res.json({ success: true, samples });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Mount Resource Routes
const aiTrainingRoutes = require('./routes/aiTrainingRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const requirementRoutes = require('./routes/requirementRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
app.use('/api/auth', authRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/requirements', requirementRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/vendor-types', vendorTypeRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ai-training', aiTrainingRoutes);
app.use('/api/settings', settingsRoutes);

// Serve frontend static assets if built (Production / Unified Full-Stack deployment)
const frontendDistPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  console.log(`[App] 📦 Serving production frontend build from: ${frontendDistPath}`);
  app.use(express.static(frontendDistPath));

  // SPA fallback for client-side routing (non-API / non-uploads)
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.originalUrl} not found.` });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error('[App Error Handler]', err);

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'File size limit exceeded. Maximum allowed size is 15 MB.'
    });
  }

  if (err.message && err.message.includes('Only PDF files are allowed')) {
    return res.status(400).json({
      success: false,
      error: 'Invalid file format. Please upload a PDF file.'
    });
  }

  return res.status(500).json({
    success: false,
    error: err.message || 'An unexpected internal server error occurred.'
  });
});

if (process.env.NODE_ENV !== 'test') {
  const HOST = '0.0.0.0';
  app.listen(PORT, HOST, () => {
    console.log(`===============================================`);
    console.log(`🚀 OCR Invoice Server running on http://${HOST}:${PORT}`);
    console.log(`👉 Health check: http://${HOST}:${PORT}/api/health`);
    console.log(`===============================================`);
  });
}

module.exports = app;
