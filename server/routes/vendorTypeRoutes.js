const express = require('express');
const router = express.Router();
const vendorTypeController = require('../controllers/vendorTypeController');

router.get('/', (req, res) => vendorTypeController.getVendorTypes(req, res));
router.get('/:id/vendors', (req, res) => vendorTypeController.getVendorsByType(req, res));
router.post('/', (req, res) => vendorTypeController.createVendorType(req, res));

module.exports = router;
