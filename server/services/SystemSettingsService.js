const db = require('../database/db');

/**
 * SystemSettingsService
 * Manages universal system settings in PostgreSQL/database to ensure:
 * 1. Multimodal AI keys (Gemini / OpenAI) are universally available across ALL devices and users.
 * 2. Settings survive cloud server restarts, container cycling, and multi-dyno scaling.
 * 3. The deployed API key can be LOCKED to prevent accidental editing or tampering.
 */
class SystemSettingsService {
  constructor() {
    this.initialized = false;
  }

  async ensureTable() {
    try {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS system_settings (
          key VARCHAR(255) PRIMARY KEY,
          value TEXT,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
      `);
      this.initialized = true;
    } catch (err) {
      console.error('[SystemSettings] Failed to ensure system_settings table:', err.message);
    }
  }

  async init() {
    await this.ensureTable();
    try {
      // Sync environment variables into database if not already present
      const envKeys = [
        { k: 'gemini_api_key', v: process.env.GEMINI_API_KEY },
        { k: 'gemini_model', v: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite' },
        { k: 'ai_provider', v: process.env.AI_PROVIDER || 'gemini' },
        { k: 'openai_api_key', v: process.env.OPENAI_API_KEY },
        { k: 'openai_model', v: process.env.OPENAI_MODEL || 'gpt-4o' },
        { k: 'ai_key_locked', v: process.env.AI_KEY_LOCKED || 'true' } // Locked by default
      ];

      for (const item of envKeys) {
        if (item.v && typeof item.v === 'string' && item.v.trim()) {
          const existing = await db.get('SELECT value FROM system_settings WHERE key = $1', [item.k]);
          if (!existing) {
            await db.run(
              'INSERT INTO system_settings (key, value) VALUES ($1, $2)',
              [item.k, item.v.trim()]
            );
          } else if (item.k === 'gemini_api_key' && item.v.trim() && existing.value !== item.v.trim()) {
            // Keep DB in sync with active env key if provided
            await db.run(
              'UPDATE system_settings SET value = $1, updated_at = CURRENT_TIMESTAMP WHERE key = $2',
              [item.v.trim(), item.k]
            );
          }
        }
      }

      // Sync database values back to process.env so all services have them immediately
      const allRows = await db.query('SELECT key, value FROM system_settings') || [];
      for (const row of allRows) {
        if (row.key === 'gemini_api_key' && row.value && !process.env.GEMINI_API_KEY) {
          process.env.GEMINI_API_KEY = row.value;
        } else if (row.key === 'gemini_model' && row.value) {
          process.env.GEMINI_MODEL = row.value;
        } else if (row.key === 'ai_provider' && row.value) {
          process.env.AI_PROVIDER = row.value;
        } else if (row.key === 'openai_api_key' && row.value && !process.env.OPENAI_API_KEY) {
          process.env.OPENAI_API_KEY = row.value;
        } else if (row.key === 'openai_model' && row.value) {
          process.env.OPENAI_MODEL = row.value;
        }
      }
    } catch (err) {
      console.error('[SystemSettings] init sync warning:', err.message);
    }
  }

  async get(key, defaultValue = null) {
    if (!this.initialized) await this.ensureTable();
    try {
      const row = await db.get('SELECT value FROM system_settings WHERE key = $1', [key]);
      return row ? row.value : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  async set(key, value) {
    if (!this.initialized) await this.ensureTable();
    try {
      const existing = await db.get('SELECT key FROM system_settings WHERE key = $1', [key]);
      if (existing) {
        await db.run(
          'UPDATE system_settings SET value = $1, updated_at = CURRENT_TIMESTAMP WHERE key = $2',
          [String(value), key]
        );
      } else {
        await db.run(
          'INSERT INTO system_settings (key, value) VALUES ($1, $2)',
          [key, String(value)]
        );
      }
      return true;
    } catch (err) {
      console.error(`[SystemSettings] Failed to set ${key}:`, err.message);
      return false;
    }
  }

  async isLocked() {
    if (process.env.AI_KEY_LOCKED === 'true' || process.env.AI_KEY_LOCKED === '1') {
      return true;
    }
    const val = await this.get('ai_key_locked', 'true');
    return val === 'true' || val === '1';
  }

  async setLocked(locked) {
    const strVal = locked ? 'true' : 'false';
    process.env.AI_KEY_LOCKED = strVal;
    return await this.set('ai_key_locked', strVal);
  }
}

const systemSettingsService = new SystemSettingsService();
// Self-initialize
systemSettingsService.init().catch(err => console.warn('[SystemSettings] Async init error:', err.message));

module.exports = systemSettingsService;
