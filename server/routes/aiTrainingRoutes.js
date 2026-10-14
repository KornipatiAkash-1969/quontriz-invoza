const express = require('express');
const router = express.Router();
const aiTrainingController = require('../controllers/aiTrainingController');

// 1. Get model training overview & benchmark stats
router.get('/stats', (req, res) => aiTrainingController.getStats(req, res));

// 2. Trigger model retraining across ground truth invoices
router.post('/train', (req, res) => aiTrainingController.train(req, res));

// 3. Export LLM Fine-Tuning dataset (OpenAI or Gemini JSONL)
router.get('/export/:format?', (req, res) => aiTrainingController.exportDataset(req, res));

// 4. List ground-truth training samples
router.get('/samples', (req, res) => aiTrainingController.getSamples(req, res));

// 5. Run Live Accuracy Benchmark
router.get('/benchmark', (req, res) => aiTrainingController.runBenchmark(req, res));

module.exports = router;
