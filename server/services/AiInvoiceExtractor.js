const path = require('path');
const fs = require('fs');
const unitNormalizationService = require('./UnitNormalizationService');
const openAiService = require('./OpenAiInvoiceService');
const geminiService = require('./GeminiInvoiceService');

/**
 * Service 5: AiInvoiceExtractor
 * Unified Multimodal Document AI Invoice Parser.
 * Seamlessly manages:
 * 1. Google Gemini (1.5 Flash / 2.0 Flash) - Free-tier multimodal vision with handwriting OCR
 * 2. OpenAI (GPT-4o / GPT-4o-mini) - Precision JSON multimodal vision
 * 3. High-res resilient local fallback with transparent quota/credential notices
 */
class AiInvoiceExtractor {
  async extract({ filePath, ocrText }) {
    const startTime = Date.now();
    let result = null;
    let engineUsed = 'local_fallback';
    let modelUsed = 'rule_based_engine';
    let aiNotice = null;

    const preferredProvider = process.env.AI_PROVIDER || (geminiService.isConfigured() ? 'gemini' : 'openai');

    // Strategy A: If Gemini is preferred and configured
    if (preferredProvider === 'gemini' && geminiService.isConfigured()) {
      try {
        console.log(`[AiInvoiceExtractor] Running Google Gemini multimodal parser (${geminiService.model})...`);
        const geminiRes = await geminiService.analyzeInvoice(filePath, ocrText);
        if (geminiRes && Array.isArray(geminiRes.items) && geminiRes.items.length > 0) {
          result = geminiRes;
          engineUsed = 'gemini';
          modelUsed = geminiService.model;
        }
      } catch (geminiErr) {
        console.warn(`[AiInvoiceExtractor] Gemini error (${geminiErr.message}). Attempting secondary engine...`);
        aiNotice = {
          provider: 'gemini',
          error: true,
          message: `Google Gemini error: ${geminiErr.message}`
        };
      }
    }

    // Strategy B: If OpenAI is preferred or Gemini failed / not configured
    if (!result && openAiService.isConfigured()) {
      try {
        console.log(`[AiInvoiceExtractor] Submitting invoice to OpenAI (${openAiService.model})...`);
        const openAiRes = await openAiService.queryOpenAi(filePath, ocrText);
        if (openAiRes && Array.isArray(openAiRes.items) && openAiRes.items.length > 0) {
          result = openAiRes;
          engineUsed = 'openai';
          modelUsed = openAiService.model;
          aiNotice = null; // Clear any earlier warning if OpenAI succeeded
        }
      } catch (openAiErr) {
        const isQuota = openAiErr.message?.includes('429') || openAiErr.message?.includes('insufficient_quota');
        console.warn(`[AiInvoiceExtractor] OpenAI error (${openAiErr.message}).`);

        aiNotice = {
          provider: 'openai',
          error: true,
          quotaExhausted: isQuota,
          message: isQuota
            ? 'OpenAI Quota Exhausted (HTTP 429): Your OpenAI account has no credits remaining. System used local fallback. Enter an active OpenAI key or a free Google Gemini key in Settings for full AI accuracy.'
            : `OpenAI error: ${openAiErr.message}`
        };

        // If OpenAI failed with 429 quota exhausted, try Gemini as immediate automatic backup!
        if (geminiService.isConfigured()) {
          try {
            console.log(`[AiInvoiceExtractor] Auto-failing over to Google Gemini (${geminiService.model})...`);
            const geminiBackup = await geminiService.analyzeInvoice(filePath, ocrText);
            if (geminiBackup && Array.isArray(geminiBackup.items) && geminiBackup.items.length > 0) {
              result = geminiBackup;
              engineUsed = 'gemini';
              modelUsed = geminiService.model;
              aiNotice = {
                provider: 'gemini',
                fallback: true,
                message: 'Auto-switched to Google Gemini because OpenAI quota was exhausted.'
              };
            }
          } catch (backupErr) {
            console.warn(`[AiInvoiceExtractor] Backup Gemini attempt also failed: ${backupErr.message}`);
          }
        }
      }
    }

    // Strategy C: If no AI result was obtained, execute universal local engine
    if (!result) {
      console.log(`[AiInvoiceExtractor] Executing high-precision universal document engine fallback...`);
      const localResult = await openAiService.parseWithUniversalEngine(ocrText, filePath);
      result = localResult;
      engineUsed = 'local_fallback';
      modelUsed = 'universal_rule_engine';

      if (!aiNotice) {
        aiNotice = {
          provider: 'none',
          message: 'No active AI API key found. Processed using local OCR parser. For handwritten bills and full AI accuracy, add an OpenAI or Google Gemini key in Settings.'
        };
      }
    }

    const latencyMs = Date.now() - startTime;

    // Apply unit normalization & flags on all items
    if (result && Array.isArray(result.items)) {
      result.items = result.items.map(it => {
        const rawUnit = it.unit_original || it.unit || it.unit_normalized;
        const norm = unitNormalizationService.normalizeUnit(rawUnit);
        return {
          ...it,
          unit_original: norm.unit_original,
          unit_normalized: norm.unit_normalized,
          unit_flagged: norm.unit_flagged,
          price_unit_quantity: Number(it.price_unit_quantity) > 0 ? Number(it.price_unit_quantity) : 1,
          price_unit_measure: it.price_unit_measure || norm.unit_normalized || norm.unit_original
        };
      });
    }

    return {
      engine: engineUsed,
      model: modelUsed,
      latencyMs,
      aiNotice,
      ...result
    };
  }

  async extractInvoice(ocrText, filePath, options = {}) {
    const res = await this.extract({
      filePath,
      ocrText
    });
    return {
      engine: res.engine,
      model: res.model,
      latencyMs: res.latencyMs,
      aiNotice: res.aiNotice,
      data: res
    };
  }
}

module.exports = new AiInvoiceExtractor();
