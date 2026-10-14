const RuleBasedProvider = require('./providers/ruleBasedProvider');
const db = require('../../database/db');

class ClassificationService {
  constructor() {
    this.providers = new Map();
    this.currentProviderName = 'rule-based';
    this.confidenceThreshold = 0.70; // Any item below 70% confidence is flagged for manual review

    // Register default rule-based provider
    this.registerProvider('rule-based', new RuleBasedProvider());
  }

  /**
   * Register a new classification provider (e.g., Gemini, OpenAI, custom ML model)
   */
  registerProvider(name, providerInstance) {
    this.providers.set(name, providerInstance);
  }

  /**
   * Set active provider
   */
  setProvider(name) {
    if (!this.providers.has(name)) {
      throw new Error(`Provider '${name}' is not registered.`);
    }
    this.currentProviderName = name;
  }

  /**
   * Set confidence warning threshold (0 to 1)
   */
  setThreshold(threshold) {
    this.confidenceThreshold = threshold;
  }

  /**
   * Classify a single item
   * @param {string|Object} input - Either itemName string or { itemName: string }
   * @returns {Object} { item, category, confidence, lowConfidence, categoryId }
   */
  async classifyItem(input) {
    const itemName = typeof input === 'string' ? input : (input?.itemName || input?.item || '');
    const provider = this.providers.get(this.currentProviderName) || this.providers.get('rule-based');

    let result = { category: 'Other', confidence: 0.50 };
    try {
      result = await provider.classify(itemName);
    } catch (err) {
      console.warn(`[ClassificationService] Provider '${this.currentProviderName}' error:`, err.message);
      // Fallback to rule-based provider
      const fallback = this.providers.get('rule-based');
      result = fallback.classify(itemName);
    }

    const confidence = typeof result.confidence === 'number' ? result.confidence : 0.50;
    const isLowConfidence = confidence < this.confidenceThreshold;

    // Lookup category id in database if available
    let categoryId = null;
    try {
      const catRow = db.get('SELECT id FROM categories WHERE LOWER(category_name) = LOWER(?)', [result.category]);
      if (catRow) {
        categoryId = catRow.id;
      } else {
        // If exact match not found, check for 'Other'
        const otherRow = db.get('SELECT id FROM categories WHERE category_name = ?', ['Other']);
        if (otherRow) categoryId = otherRow.id;
      }
    } catch (_) {}

    return {
      item: itemName,
      itemName: itemName,
      category: result.category || 'Other',
      confidence: Number(confidence.toFixed(2)),
      lowConfidence: isLowConfidence,
      categoryId
    };
  }

  /**
   * Classify multiple items in batch
   * @param {Array<Object>} items
   * @returns {Promise<Array<Object>>}
   */
  async classifyBatch(items = []) {
    const results = [];
    for (const item of items) {
      const name = typeof item === 'string' ? item : (item.itemName || item.name || '');
      const classified = await this.classifyItem(name);
      results.push({
        ...item,
        category: classified.category,
        confidence: classified.confidence,
        classificationConfidence: classified.confidence,
        lowConfidence: classified.lowConfidence,
        categoryId: classified.categoryId
      });
    }
    return results;
  }
}

module.exports = new ClassificationService();
