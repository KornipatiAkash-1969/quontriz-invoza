const express = require('express');
const router = express.Router();
const openAiService = require('../services/OpenAiInvoiceService');
const db = require('../database/db');

/**
 * Settings Routes for OpenAI Engine & System Diagnostics
 */

// 1. Get current OpenAI configuration, connection status & database engine
router.get('/', async (req, res) => {
  try {
    const isConfigured = openAiService.isConfigured();
    const keyPreview = openAiService.apiKey
      ? `${openAiService.apiKey.slice(0, 7)}...${openAiService.apiKey.slice(-4)}`
      : '';

    return res.json({
      success: true,
      data: {
        engine: 'openai',
        openai: {
          model: openAiService.model,
          isConfigured,
          keyPreview,
          status: isConfigured
            ? `Active (OpenAI ${openAiService.model})`
            : 'Unconfigured (Local Fallback Ready)'
        },
        database: {
          engine: db.isPostgres()
            ? 'PostgreSQL 16+ (Render Managed)'
            : db.isMysql()
            ? 'MySQL 8.0+ (Connection Pool)'
            : 'SQLite 3 (Node.js Native)',
          dialect: db.getDriverType().toUpperCase(),
          journalMode: db.isPostgres()
            ? 'ACID Multiversion Concurrency Control (MVCC)'
            : db.isMysql()
            ? 'InnoDB ACID Transactions'
            : 'WAL (Write-Ahead Logging)',
          status: 'Connected'
        }
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Update OpenAI configuration
router.post('/', (req, res) => {
  try {
    const { apiKey, model } = req.body;

    if (apiKey !== undefined && apiKey.trim().length > 0) {
      const cleanKey = apiKey.trim();
      process.env.OPENAI_API_KEY = cleanKey;
      openAiService.apiKey = cleanKey;
    }

    if (model !== undefined && model.trim().length > 0) {
      const cleanModel = model.trim();
      process.env.OPENAI_MODEL = cleanModel;
      openAiService.model = cleanModel;
    }

    return res.json({
      success: true,
      message: 'OpenAI settings updated successfully.',
      data: {
        engine: 'openai',
        model: openAiService.model,
        isConfigured: openAiService.isConfigured()
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Test OpenAI API connection
router.post('/test-openai', async (req, res) => {
  try {
    const { apiKey, model } = req.body;
    if (apiKey) openAiService.apiKey = apiKey.trim();
    if (model) openAiService.model = model.trim();

    const health = await openAiService.checkHealth();
    return res.json({
      success: true,
      data: health
    });
  } catch (err) {
    return res.json({
      success: false,
      data: {
        connected: false,
        message: `Connection attempt failed: ${err.message}`
      }
    });
  }
});

module.exports = router;
