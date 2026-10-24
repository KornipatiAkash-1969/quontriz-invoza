const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

const { verifyToken, requireRole } = require('../utils/authMiddleware');

router.get('/', (req, res) => categoryController.getCategories(req, res));
router.post('/', verifyToken, (req, res) => categoryController.createCategory(req, res));
router.put('/:id', verifyToken, (req, res) => categoryController.updateCategory(req, res));
router.delete('/:id', verifyToken, requireRole('owner'), (req, res) => categoryController.deleteCategory(req, res));

module.exports = router;
