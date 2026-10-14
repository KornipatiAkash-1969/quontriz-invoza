const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { optionalToken } = require('../utils/authMiddleware');

router.get('/', optionalToken, (req, res) => dashboardController.getDashboardData(req, res));
router.get('/stats', optionalToken, (req, res) => dashboardController.getDashboardData(req, res));

module.exports = router;
