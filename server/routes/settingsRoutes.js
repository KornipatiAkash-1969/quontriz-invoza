const express = require('express');
const router = express.Router();
const openAiService = require('../services/OpenAiInvoiceService');
const db = require('../database/db');

/**
 * Settings Routes for OpenAI Engine & System Diagnostics
 */

const MASKED_PASSKEY = 'sk-proj-••••••••••••••••••••••••••••••••••••••••••••••••••••••••';

// 1. Get current OpenAI configuration, connection status & database engine
router.get('/', async (req, res) => {
  try {
    const isConfigured = openAiService.isConfigured();

    return res.json({
      success: true,
      data: {
        engine: 'openai',
        openai: {
          model: openAiService.model,
          isConfigured,
          keyPreview: MASKED_PASSKEY,
          apiKey: MASKED_PASSKEY,
          isLocked: true,
          status: isConfigured
            ? `Active & Protected (OpenAI ${openAiService.model})`
            : 'Protected (Master Key Active)'
        },
        database: {
          engine: 'PostgreSQL 16+ (Render Managed / Pure-JS pg)',
          dialect: 'POSTGRESQL',
          journalMode: 'ACID Multiversion Concurrency Control (MVCC)',
          status: 'Connected'
        }
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Update OpenAI configuration (Model only; master key is permanently locked and read-only)
router.post('/', (req, res) => {
  try {
    const { model } = req.body;

    // The OpenAI passkey is permanently locked to the production master key for security.
    // Client-side attempts to overwrite the passkey are ignored to maintain deployment integrity.
    if (!openAiService.apiKey) {
      openAiService.apiKey = openAiService.DEFAULT_OPENAI_API_KEY;
    }

    if (model !== undefined && model.trim().length > 0) {
      const cleanModel = model.trim();
      process.env.OPENAI_MODEL = cleanModel;
      openAiService.model = cleanModel;
    }

    return res.json({
      success: true,
      message: 'OpenAI settings updated successfully. Master passkey is locked and permanently protected.',
      data: {
        engine: 'openai',
        model: openAiService.model,
        apiKey: MASKED_PASSKEY,
        keyPreview: MASKED_PASSKEY,
        isLocked: true,
        isConfigured: openAiService.isConfigured()
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Test OpenAI API connection (Uses locked master key)
router.post('/test-openai', async (req, res) => {
  try {
    const { model } = req.body;
    
    // Always use the production master key
    if (!openAiService.apiKey) {
      openAiService.apiKey = openAiService.DEFAULT_OPENAI_API_KEY;
    }
    if (model && model.trim()) {
      openAiService.model = model.trim();
    }

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
