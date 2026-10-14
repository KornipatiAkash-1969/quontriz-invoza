const path = require('path');
const fs = require('fs');
const unitNormalizationService = require('./UnitNormalizationService');
const openAiService = require('./OpenAiInvoiceService');

/**
 * Service 5: AiInvoiceExtractor
 * Multimodal Document AI Invoice Parser powered exclusively by OpenAI (GPT-4o).
 * 
 * Extracts comprehensive structured invoice metadata and line items from any
 * format of PDF or Image document.
 */
class AiInvoiceExtractor {
  /**
   * Extract structured invoice data from document
   * @param {Object} params - { filePath, ocrText }
   * @returns {Promise<Object>}
   */
  async extract({ filePath, ocrText }) {
    const startTime = Date.now();
    const result = await openAiService.analyzeInvoice(filePath, ocrText);
    const latencyMs = Date.now() - startTime;

    // Apply unit normalization & unit flags on all items
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
      engine: 'openai',
      model: openAiService.model,
      latencyMs,
      ...result
    };
  }

  /**
   * Helper alias accepting (ocrText, filePath, options)
   */
  async extractInvoice(ocrText, filePath, options = {}) {
    const res = await this.extract({
      filePath,
      ocrText
    });
    return {
      engine: res.engine,
      latencyMs: res.latencyMs,
      data: res
    };
  }
}

module.exports = new AiInvoiceExtractor();
