const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');

const { verifyToken, requireRole } = require('../utils/authMiddleware');

router.get('/', (req, res) => vendorController.getVendors(req, res));
router.post('/', (req, res) => vendorController.createVendor(req, res));
router.get('/:id', (req, res) => vendorController.getVendorById(req, res));
router.put('/:id', (req, res) => vendorController.updateVendor(req, res));
router.delete('/:id', verifyToken, requireRole('owner'), (req, res) => vendorController.deleteVendor(req, res));

module.exports = router;
