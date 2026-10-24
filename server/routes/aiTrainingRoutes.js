const express = require('express');
const router = express.Router();
const aiTrainingController = require('../controllers/aiTrainingController');
const { verifyToken, requireRole } = require('../utils/authMiddleware');

// 1. Get model training overview & benchmark stats
router.get('/stats', verifyToken, (req, res) => aiTrainingController.getStats(req, res));

// 2. Trigger model retraining across ground truth invoices (Owner only)
router.post('/train', verifyToken, requireRole('owner'), (req, res) => aiTrainingController.train(req, res));

// 3. Export LLM Fine-Tuning dataset (Owner only)
router.get('/export/:format?', verifyToken, requireRole('owner'), (req, res) => aiTrainingController.exportDataset(req, res));

// 4. List ground-truth training samples
router.get('/samples', verifyToken, (req, res) => aiTrainingController.getSamples(req, res));

// 5. Run Live Accuracy Benchmark
router.get('/benchmark', verifyToken, (req, res) => aiTrainingController.runBenchmark(req, res));

module.exports = router;
