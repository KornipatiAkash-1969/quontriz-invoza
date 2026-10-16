const supportService = require('../services/AiChatSupportService');

/**
 * Controller for AI Chat Support & Ticket Escalation
 */
class SupportController {
  /**
   * Process a chat message
   * POST /api/support/chat
   */
  async chat(req, res) {
    try {
      const { messages, context } = req.body;
      const user = req.user || { name: 'Store Member', role: 'staff' };

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Messages array is required.'
        });
      }

      const result = await supportService.processChatMessage({
        messages,
        context: context || {},
        user
      });

      return res.json({
        success: true,
        data: result
      });
    } catch (err) {
      console.error('[SupportController Chat Error]', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'An error occurred while processing support chat.'
      });
    }
  }

  /**
   * Escalate an unresolved issue to support@supermarket.com
   * POST /api/support/escalate
   */
  async escalate(req, res) {
    try {
      const { issue, messages, subject } = req.body;
      const user = req.user || {};

      const userEmail = req.body.userEmail || user.email || 'user@supermarket.com';
      const userName = req.body.userName || user.name || 'Store User';
      const userRole = req.body.userRole || user.role || 'staff';

      const result = await supportService.escalateToSupport({
        userEmail,
        userName,
        userRole,
        issue: issue || 'User marked their support chat as unresolved.',
        messages: messages || [],
        subject
      });

      return res.json({
        success: true,
        data: result
      });
    } catch (err) {
      console.error('[SupportController Escalate Error]', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Failed to escalate ticket to support@supermarket.com.'
      });
    }
  }
}

module.exports = new SupportController();
