const aiTrainingService = require('../services/AiTrainingService');
const db = require('../database/db');

class AiTrainingController {
  /**
   * 1. Get training overview, benchmark score, and learned templates
   */
  async getStats(req, res) {
    try {
      const stats = await aiTrainingService.getTrainingStats();
      return res.json({ success: true, data: stats });
    } catch (err) {
      console.error('[AiTrainingController] getStats error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * 2. Trigger training run across all verified ground-truth invoices
   */
  async train(req, res) {
    try {
      const result = await aiTrainingService.trainModel();
      return res.json({ success: true, data: result });
    } catch (err) {
      console.error('[AiTrainingController] train error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * 3. Export LLM Fine-Tuning Dataset (OpenAI JSONL or Gemini format)
   */
  async exportDataset(req, res) {
    try {
      const format = req.params.format || req.query.format || 'openai';
      const result = await aiTrainingService.generateFineTuningDataset(format);

      if (req.query.download === 'true') {
        const fileName = `invoice_ai_finetune_${format}_${Date.now()}.jsonl`;
        res.setHeader('Content-Type', 'application/x-jsonlines');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        return res.send(result.content);
      }

      return res.json({
        success: true,
        data: {
          format: result.format,
          totalLines: result.totalLines,
          snippet: result.content.split('\n').slice(0, 3).join('\n')
        }
      });
    } catch (err) {
      console.error('[AiTrainingController] exportDataset error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * 4. List all ground-truth training samples with details
   */
  async getSamples(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      const totalRow = await db.get('SELECT COUNT(*) as count FROM ai_training_samples');
      const total = totalRow?.count || 0;
      const samples = await db.query(`
        SELECT s.*, i.invoice_number, i.total
        FROM ai_training_samples s
        LEFT JOIN invoices i ON s.invoice_id = i.id
        ORDER BY s.id DESC
        LIMIT ? OFFSET ?
      `, [limit, offset]);

      const formatted = samples.map(s => {
        let truth = null;
        let diff = null;
        try { truth = JSON.parse(s.ground_truth_json); } catch (_) {}
        try { diff = JSON.parse(s.user_corrections_json); } catch (_) {}
        return {
          id: s.id,
          invoiceId: s.invoice_id,
          invoiceNumber: s.invoice_number || 'N/A',
          vendorName: s.vendor_name,
          documentType: s.document_type,
          itemCount: truth?.items?.length || 0,
          qualityScore: s.sample_quality_score,
          corrections: diff,
          total: s.total,
          createdAt: s.created_at
        };
      });

      return res.json({
        success: true,
        data: formatted,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
      });
    } catch (err) {
      console.error('[AiTrainingController] getSamples error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * 5. Run Live Accuracy Benchmark on Invoices
   */
  async runBenchmark(req, res) {
    try {
      const samples = await db.query('SELECT * FROM ai_training_samples WHERE is_validated = 1');
      const stats = aiTrainingService.computeBenchmarkAccuracy(samples);
      return res.json({
        success: true,
        data: {
          testSetSize: samples.length,
          overallAccuracy: stats.accuracyScore,
          headerPrecision: stats.headerAccuracy,
          tableReconstructionAccuracy: stats.itemAccuracy,
          unitDetectionAccuracy: stats.unitAccuracy,
          timestamp: new Date().toISOString()
        }
      });
    } catch (err) {
      console.error('[AiTrainingController] runBenchmark error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new AiTrainingController();
