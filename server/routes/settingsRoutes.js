const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const openAiService = require('../services/OpenAiInvoiceService');
const geminiService = require('../services/GeminiInvoiceService');
const systemSettingsService = require('../services/SystemSettingsService');
const db = require('../database/db');
const { verifyToken, requireRole } = require('../utils/authMiddleware');

/**
 * Settings Routes for Multimodal Document AI Engines (OpenAI & Google Gemini)
 * Features:
 * - Universal Cloud & Device Availability: API keys are shared across all devices and roles.
 * - Key Locking: Keys can be permanently locked to prevent accidental modification or tampering.
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

// 1. Get current AI provider configuration & system status (Universal for all devices)
router.get('/', verifyToken, async (req, res) => {
  try {
    const isAiConfigured = openAiService.isConfigured() || geminiService.isConfigured();
    const activeProvider = process.env.AI_PROVIDER || (geminiService.isConfigured() && !openAiService.isConfigured() ? 'gemini' : 'openai');
    const isLocked = await systemSettingsService.isLocked();

    return res.json({
      success: true,
      data: {
        activeProvider,
        isLocked,
        isKeyLocked: isLocked,
        deploymentScope: 'Universal Cloud Deployment (All Devices & Roles)',
        lockedReason: isLocked
          ? 'System AI Key is locked for all devices. Deployed centrally on the server.'
          : 'System key is unlocked for editing.',
        openai: {
          model: openAiService.model,
          isConfigured: openAiService.isConfigured(),
          isLocked,
          keyPreview: maskKey(openAiService.apiKey),
          apiKey: openAiService.apiKey ? maskKey(openAiService.apiKey) : '',
          isCustomKey: Boolean(openAiService.apiKey && openAiService.apiKey !== openAiService.DEFAULT_OPENAI_API_KEY),
          status: isLocked
            ? `Active & Locked (OpenAI ${openAiService.model})`
            : (openAiService.isConfigured() ? `Active (OpenAI ${openAiService.model})` : 'API Key Required'),
          deploymentScope: 'Universal across all devices (System Fallback)'
        },
        gemini: {
          model: geminiService.model,
          isConfigured: geminiService.isConfigured(),
          isLocked,
          keyPreview: maskKey(geminiService.apiKey),
          apiKey: geminiService.apiKey ? maskKey(geminiService.apiKey) : '',
          status: isLocked
            ? `Active & Locked (Google Gemini ${geminiService.model})`
            : (geminiService.isConfigured() ? `Active (Google Gemini ${geminiService.model})` : 'Free API Key Available'),
          deploymentScope: 'Universal across all devices (Owner & Staff)'
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
router.post('/', verifyToken, requireRole('owner'), async (req, res) => {
  try {
    const isLocked = await systemSettingsService.isLocked();

    const {
      provider,
      openaiApiKey,
      openaiModel,
      geminiApiKey,
      geminiModel
    } = req.body;

    // Security Check: If locked, disallow modifying the API keys
    const isModifyingGeminiKey = geminiApiKey !== undefined && !geminiApiKey.includes('••••') && geminiApiKey.trim() !== geminiService.apiKey;
    const isModifyingOpenAiKey = openaiApiKey !== undefined && !openaiApiKey.includes('••••') && openaiApiKey.trim() !== openAiService.apiKey;

    if (isLocked && (isModifyingGeminiKey || isModifyingOpenAiKey)) {
      return res.status(403).json({
        success: false,
        error: 'The deployed API key is locked for all devices. Modifying the key is prohibited while locked. Please unlock the key first if you are the Owner.'
      });
    }

    const envUpdates = {};

    if (provider && ['openai', 'gemini'].includes(provider)) {
      process.env.AI_PROVIDER = provider;
      envUpdates.AI_PROVIDER = provider;
      await systemSettingsService.set('ai_provider', provider);
    }

    // OpenAI updates
    if (openaiApiKey && openaiApiKey.trim() && !openaiApiKey.includes('••••')) {
      const cleanKey = openaiApiKey.trim();
      process.env.OPENAI_API_KEY = cleanKey;
      openAiService.apiKey = cleanKey;
      envUpdates.OPENAI_API_KEY = cleanKey;
      await systemSettingsService.set('openai_api_key', cleanKey);
    }

    if (openaiModel && openaiModel.trim()) {
      const cleanModel = openaiModel.trim();
      process.env.OPENAI_MODEL = cleanModel;
      openAiService.model = cleanModel;
      envUpdates.OPENAI_MODEL = cleanModel;
      await systemSettingsService.set('openai_model', cleanModel);
    }

    // Gemini updates
    if (geminiApiKey !== undefined && !geminiApiKey.includes('••••')) {
      const cleanKey = geminiApiKey.trim();
      process.env.GEMINI_API_KEY = cleanKey;
      geminiService.apiKey = cleanKey;
      envUpdates.GEMINI_API_KEY = cleanKey;
      await systemSettingsService.set('gemini_api_key', cleanKey);
    }

    if (geminiModel && geminiModel.trim()) {
      const cleanModel = geminiModel.trim();
      process.env.GEMINI_MODEL = cleanModel;
      geminiService.model = cleanModel;
      envUpdates.GEMINI_MODEL = cleanModel;
      await systemSettingsService.set('gemini_model', cleanModel);
    }

    updateEnvFile(envUpdates);

    return res.json({
      success: true,
      message: 'AI Provider configuration updated and saved successfully for all devices.',
      data: {
        activeProvider: process.env.AI_PROVIDER || 'gemini',
        isLocked,
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

// 2b. Toggle Lock State (Owner action to protect or unlock deployed keys)
router.post('/toggle-lock', verifyToken, requireRole('owner'), async (req, res) => {
  try {
    const { locked } = req.body;
    const isLocked = Boolean(locked);
    await systemSettingsService.setLocked(isLocked);
    updateEnvFile({ AI_KEY_LOCKED: isLocked ? 'true' : 'false' });

    return res.json({
      success: true,
      isLocked,
      message: isLocked
        ? 'Deployed AI keys are now LOCKED. Key fields cannot be edited on any device.'
        : 'System keys UNLOCKED for authorized editing.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Test OpenAI API connection (Verifies live credits & quota)
router.post('/test-openai', verifyToken, requireRole('owner'), async (req, res) => {
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
router.post('/test-gemini', verifyToken, requireRole('owner'), async (req, res) => {
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
