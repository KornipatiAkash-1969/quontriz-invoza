const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { optionalToken } = require('../utils/authMiddleware');

// Get active updates and route badges
router.get('/updates', optionalToken, (req, res) => {
  notificationController.getUpdates(req, res);
});

// Get paginated persistent notifications
router.get('/', optionalToken, (req, res) => {
  notificationController.getNotifications(req, res);
});

// Mark all notifications as read
router.post('/mark-all-read', optionalToken, (req, res) => {
  notificationController.markAllAsRead(req, res);
});

// Mark single notification as read
router.post('/:id/read', optionalToken, (req, res) => {
  notificationController.markAsRead(req, res);
});

// Delete single notification
router.delete('/:id', optionalToken, (req, res) => {
  notificationController.deleteNotification(req, res);
});

// Clear all notifications completely
router.delete('/clear-all', optionalToken, (req, res) => {
  notificationController.clearAllNotifications(req, res);
});
router.post('/clear-all', optionalToken, (req, res) => {
  notificationController.clearAllNotifications(req, res);
});

// Mark all updates as viewed
router.post('/mark-viewed', optionalToken, (req, res) => {
  notificationController.markAllViewed(req, res);
});

// Mark specific invoice as viewed
router.post('/invoices/:id/view', optionalToken, (req, res) => {
  notificationController.markInvoiceViewed(req, res);
});

// Mark all invoices as viewed
router.post('/invoices/mark-all-viewed', optionalToken, (req, res) => {
  notificationController.markAllInvoicesViewed(req, res);
});

// Mark specific requirement as viewed
router.post('/requirements/:id/view', optionalToken, (req, res) => {
  notificationController.markRequirementViewed(req, res);
});

// Mark all requirements as viewed
router.post('/requirements/mark-all-viewed', optionalToken, (req, res) => {
  notificationController.markAllRequirementsViewed(req, res);
});

module.exports = router;
