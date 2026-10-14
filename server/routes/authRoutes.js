const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, requireRole } = require('../utils/authMiddleware');

router.post('/login', (req, res) => authController.login(req, res));
router.post('/logout', (req, res) => authController.logout(req, res));
router.get('/me', verifyToken, (req, res) => authController.getMe(req, res));
router.get('/demo-users', (req, res) => authController.getDemoUsers(req, res));

// User Management (Owner Only)
router.get('/users', verifyToken, requireRole('owner'), (req, res) => authController.getUsers(req, res));
router.post('/users', verifyToken, requireRole('owner'), (req, res) => authController.createUser(req, res));
router.delete('/users/:id', verifyToken, requireRole('owner'), (req, res) => authController.deleteUser(req, res));
router.put('/users/:id/password', verifyToken, requireRole('owner'), (req, res) => authController.resetUserPassword(req, res));

// Password Change (Accessible to both Owner and Staff)
router.post('/change-password', verifyToken, (req, res) => authController.changePassword(req, res));

// --- OTP System Endpoints ---
// 1. Login with OTP
router.post('/otp/send-login', (req, res) => authController.sendLoginOtp(req, res));
router.post('/otp/verify-login', (req, res) => authController.verifyLoginOtp(req, res));

// 2. Self-Registration with OTP (Create new Staff or Owner)
router.post('/otp/send-register', (req, res) => authController.sendRegisterOtp(req, res));
router.post('/otp/verify-register', (req, res) => authController.verifyRegisterOtp(req, res));

// 3. Owner creates Staff or Owner with OTP Verification
router.post('/otp/send-create-member', verifyToken, requireRole('owner'), (req, res) => authController.sendCreateMemberOtp(req, res));
router.post('/otp/verify-create-member', verifyToken, requireRole('owner'), (req, res) => authController.verifyCreateMemberOtp(req, res));

// 4. Dedicated Staff OTP creation (Owner -> Staff)
router.post('/users/send-staff-otp', verifyToken, requireRole('owner'), (req, res) => authController.sendStaffOtp(req, res));
router.post('/users/create-staff', verifyToken, requireRole('owner'), (req, res) => authController.createStaff(req, res));

// 5. Dedicated Dual-Owner OTP creation (Owner -> Other Owner: requires Current Owner OTP + New Owner OTP)
router.post('/users/send-owner-otps', verifyToken, requireRole('owner'), (req, res) => authController.sendOwnerOtps(req, res));
router.post('/users/create-owner', verifyToken, requireRole('owner'), (req, res) => authController.createOwner(req, res));

// 6. Dedicated Dual-Owner OTP Deletion (Owner -> Deleting Other Owner: requires Current Owner OTP + Target Owner OTP)
router.post('/users/:id/send-delete-owner-otps', verifyToken, requireRole('owner'), (req, res) => authController.sendDeleteOwnerOtps(req, res));

module.exports = router;
