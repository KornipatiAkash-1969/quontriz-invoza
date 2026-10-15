const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, requireRole } = require('../utils/authMiddleware');

// Authentication (Direct Email + Password)
router.post('/login', (req, res) => authController.login(req, res));
router.post('/logout', (req, res) => authController.logout(req, res));
router.get('/me', verifyToken, (req, res) => authController.getMe(req, res));
router.get('/demo-users', (req, res) => authController.getDemoUsers(req, res));

// User Management (Owner Only)
router.get('/users', verifyToken, requireRole('owner'), (req, res) => authController.getUsers(req, res));
router.post('/users', verifyToken, requireRole('owner'), (req, res) => authController.createUser(req, res));
router.post('/users/create-staff', verifyToken, requireRole('owner'), (req, res) => authController.createStaff(req, res));
router.post('/users/create-owner', verifyToken, requireRole('owner'), (req, res) => authController.createOwner(req, res));
router.delete('/users/:id', verifyToken, requireRole('owner'), (req, res) => authController.deleteUser(req, res));
router.put('/users/:id/password', verifyToken, requireRole('owner'), (req, res) => authController.resetUserPassword(req, res));

// Password Change (Accessible to both Owner and Staff)
router.post('/change-password', verifyToken, (req, res) => authController.changePassword(req, res));

module.exports = router;
