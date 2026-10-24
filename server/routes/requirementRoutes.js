const express = require('express');
const router = express.Router();
const requirementController = require('../controllers/requirementController');
const { verifyToken, optionalToken } = require('../utils/authMiddleware');

// 1. Download requirements as Excel (.xlsx) sheet
router.get('/export/excel', optionalToken, (req, res) => {
  requirementController.exportToExcel(req, res);
});

// 2. Get all store requirements with search and filter
router.get('/', optionalToken, (req, res) => {
  requirementController.getRequirements(req, res);
});

// 3. Add a new required item (e.g. Rice - 25 KG - 10 bags)
router.post('/', verifyToken, (req, res) => {
  requirementController.createRequirement(req, res);
});

// 4. Update requirement status or details
router.put('/:id', verifyToken, (req, res) => {
  requirementController.updateRequirement(req, res);
});

// 5. Delete a requirement (Authenticated user)
router.delete('/:id', verifyToken, (req, res) => {
  requirementController.deleteRequirement(req, res);
});

module.exports = router;
