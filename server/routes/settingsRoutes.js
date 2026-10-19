const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const openAiService = require('../services/OpenAiInvoiceService');
const geminiService = require('../services/GeminiInvoiceService');
const db = require('../database/db');

/**
 * Settings Routes for Multimodal Document AI Engines (OpenAI & Google Gemini)
 */

const ENV_PATH = path.join(__dirname, '../.env');

function updateEnvFile(updates) {
  try {
    let content = '';
    if (fs.existsSync(ENV_PATH)) {
      content = fs.readFileSync(ENV_PATH, 'utf8');
    }

    let lines = content.split(/\r?\n/);
    const updatedKeys = new Set();

    lines = lines.map(line => {
      const match = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
      if (match) {
        const key = match[1];
        if (updates[key] !== undefined) {
          updatedKeys.add(key);
          return `${key}=${updates[key]}`;
        }
      }
      return line;
    });

    // Append any keys that weren't already present
    for (const [k, v] of Object.entries(updates)) {
      if (!updatedKeys.has(k) && v !== undefined) {
        lines.push(`${k}=${v}`);
      }
    }

    fs.writeFileSync(ENV_PATH, lines.join('\n'), 'utf8');
  } catch (err) {
    console.error('[Settings] Failed to persist to .env:', err.message);
  }
}

function maskKey(key) {
  if (!key || typeof key !== 'string' || key.length < 8) return '';
  return key.slice(0, 7) + '••••••••••••••••••••••••••••••••' + key.slice(-4);
}

// 1. Get current AI provider configuration & system status
router.get('/', async (req, res) => {
  try {
    const isAiConfigured = openAiService.isConfigured() || geminiService.isConfigured();
    const activeProvider = process.env.AI_PROVIDER || (geminiService.isConfigured() && !openAiService.isConfigured() ? 'gemini' : 'openai');

    return res.json({
      success: true,
      data: {
        activeProvider,
        openai: {
          model: openAiService.model,
          isConfigured: openAiService.isConfigured(),
          keyPreview: maskKey(openAiService.apiKey),
          apiKey: openAiService.apiKey ? maskKey(openAiService.apiKey) : '',
          isCustomKey: Boolean(openAiService.apiKey && openAiService.apiKey !== openAiService.DEFAULT_OPENAI_API_KEY),
          status: openAiService.isConfigured() ? `Active (OpenAI ${openAiService.model})` : 'API Key Required'
        },
        gemini: {
          model: geminiService.model,
          isConfigured: geminiService.isConfigured(),
          keyPreview: maskKey(geminiService.apiKey),
          apiKey: geminiService.apiKey ? maskKey(geminiService.apiKey) : '',
          status: geminiService.isConfigured() ? `Active (Google Gemini ${geminiService.model})` : 'Free API Key Available'
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

// 2. Update AI Provider & API Passkeys (OpenAI & Google Gemini)
router.post('/', (req, res) => {
  try {
    const {
      provider,
      openaiApiKey,
      openaiModel,
      geminiApiKey,
      geminiModel
    } = req.body;

    const envUpdates = {};

    if (provider && ['openai', 'gemini'].includes(provider)) {
      process.env.AI_PROVIDER = provider;
      envUpdates.AI_PROVIDER = provider;
    }

    // OpenAI updates
    if (openaiApiKey && openaiApiKey.trim() && !openaiApiKey.includes('••••')) {
      const cleanKey = openaiApiKey.trim();
      process.env.OPENAI_API_KEY = cleanKey;
      openAiService.apiKey = cleanKey;
      envUpdates.OPENAI_API_KEY = cleanKey;
    }

    if (openaiModel && openaiModel.trim()) {
      const cleanModel = openaiModel.trim();
      process.env.OPENAI_MODEL = cleanModel;
      openAiService.model = cleanModel;
      envUpdates.OPENAI_MODEL = cleanModel;
    }

    // Gemini updates
    if (geminiApiKey !== undefined && !geminiApiKey.includes('••••')) {
      const cleanKey = geminiApiKey.trim();
      process.env.GEMINI_API_KEY = cleanKey;
      geminiService.apiKey = cleanKey;
      envUpdates.GEMINI_API_KEY = cleanKey;
    }

    if (geminiModel && geminiModel.trim()) {
      const cleanModel = geminiModel.trim();
      process.env.GEMINI_MODEL = cleanModel;
      geminiService.model = cleanModel;
      envUpdates.GEMINI_MODEL = cleanModel;
    }

    updateEnvFile(envUpdates);

    return res.json({
      success: true,
      message: 'AI Provider configuration updated and saved successfully.',
      data: {
        activeProvider: process.env.AI_PROVIDER || 'openai',
        openai: {
          model: openAiService.model,
          isConfigured: openAiService.isConfigured(),
          keyPreview: maskKey(openAiService.apiKey)
        },
        gemini: {
          model: geminiService.model,
          isConfigured: geminiService.isConfigured(),
          keyPreview: maskKey(geminiService.apiKey)
        }
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Test OpenAI API connection (Verifies live credits & quota)
router.post('/test-openai', async (req, res) => {
  try {
    const { apiKey, model } = req.body;
    if (apiKey && apiKey.trim() && !apiKey.includes('••••')) {
      openAiService.apiKey = apiKey.trim();
    }
    if (model && model.trim()) {
      openAiService.model = model.trim();
    }

    const health = await openAiService.checkHealth();
    return res.json({
      success: health.connected,
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

// 4. Test Google Gemini API connection
router.post('/test-gemini', async (req, res) => {
  try {
    const { apiKey, model } = req.body;
    if (apiKey && apiKey.trim() && !apiKey.includes('••••')) {
      geminiService.apiKey = apiKey.trim();
    }
    if (model && model.trim()) {
      geminiService.model = model.trim();
    }

    const health = await geminiService.checkHealth();
    return res.json({
      success: health.connected,
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
