const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const { optionalToken } = require('../utils/authMiddleware');

// Chat interaction endpoint
router.post('/chat', optionalToken, (req, res) => supportController.chat(req, res));

// Escalation endpoint to send email to support@supermarket.com
router.post('/escalate', optionalToken, (req, res) => supportController.escalate(req, res));

module.exports = router;
