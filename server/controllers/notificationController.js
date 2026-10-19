const db = require('../database/db');
const { getIstIsoString } = require('../utils/dateTime');
const notificationService = require('../services/NotificationService');

class NotificationController {
  /**
   * Get updates and notifications for Owner and Staff
   * Owner: notified on new/updated invoices and requirements submitted by staff
   * Staff: notified on status updates, approvals, payments, rejections, or edits made by owner
   */
  async getUpdates(req, res) {
    try {
      const user = req.user;
      const isOwner = !user || user.role === 'owner' || user.id === 1;

      // 1. Invoices list with upload_type and user metadata
      const allInvoices = await db.query(`
        SELECT 
          i.id,
          i.invoice_number,
          i.invoice_date,
          i.total,
          i.amount_paid,
          i.paid,
          i.status,
          i.pdf_path,
          i.viewed_by_owner,
          i.viewed_at,
          i.viewed_by_staff,
          i.staff_viewed_at,
          i.created_at,
          i.updated_at,
          v.vendor_name,
          v.vendor_type,
          u.name as staff_name,
          u.role as staff_role,
          CASE
            WHEN LOWER(i.pdf_path) LIKE '%.pdf' THEN 'pdf'
            WHEN LOWER(i.pdf_path) LIKE '%.png' 
              OR LOWER(i.pdf_path) LIKE '%.jpg' 
              OR LOWER(i.pdf_path) LIKE '%.jpeg' 
              OR LOWER(i.pdf_path) LIKE '%.webp' THEN 'image'
            ELSE 'manual'
          END as upload_type
        FROM invoices i
        LEFT JOIN vendors v ON i.vendor_id = v.id
        LEFT JOIN users u ON i.created_by_user_id = u.id
        ORDER BY COALESCE(i.updated_at, i.created_at) DESC, i.id DESC
      `);

      // 2. Requirements list
      const allRequirements = await db.query(`
        SELECT 
          r.id,
          r.item_name,
          r.specification,
          r.quantity,
          r.unit,
          r.priority,
          r.status,
          r.viewed_by_owner,
          r.viewed_at,
          r.viewed_by_staff,
          r.staff_viewed_at,
          r.requested_by_name,
          r.fulfilled_by_name,
          r.created_at,
          r.updated_at
        FROM store_requirements r
        ORDER BY COALESCE(r.updated_at, r.created_at) DESC, r.id DESC
      `);

      // Total pending invoice summary
      const totalPendingResult = await db.get(`
        SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as amount 
        FROM invoices 
        WHERE status LIKE 'Pending%' OR (status = 'Approved' AND (amount_paid IS NULL OR amount_paid = 0))
      `);
      const totalPendingInvoicesCount = totalPendingResult ? totalPendingResult.count : 0;
      const totalPendingAmount = totalPendingResult ? totalPendingResult.amount : 0;

      let unviewedInvoices = [];
      let viewedInvoices = [];
      let unviewedRequirements = [];
      let viewedRequirements = [];

      if (isOwner) {
        // Owner notifications: staff uploads and staff updates
        unviewedInvoices = allInvoices.filter(inv => !inv.viewed_by_owner || inv.viewed_by_owner === 0);
        viewedInvoices = allInvoices.filter(inv => inv.viewed_by_owner === 1);

        unviewedRequirements = allRequirements.filter(r => !r.viewed_by_owner || r.viewed_by_owner === 0);
        viewedRequirements = allRequirements.filter(r => r.viewed_by_owner === 1);
      } else {
        // Staff notifications: updates made by owner
        unviewedInvoices = allInvoices.filter(inv => !inv.viewed_by_staff || inv.viewed_by_staff === 0);
        viewedInvoices = allInvoices.filter(inv => inv.viewed_by_staff === 1);

        unviewedRequirements = allRequirements.filter(r => !r.viewed_by_staff || r.viewed_by_staff === 0);
        viewedRequirements = allRequirements.filter(r => r.viewed_by_staff === 1);
      }

      // Fetch persistent notifications from notifications table
      const persistentNotifs = await notificationService.getNotifications({
        role: isOwner ? 'owner' : 'staff',
        userId: user ? user.id : null,
        limit: 30
      });

      const invoicesRouteBadge = unviewedInvoices.length;
      const requirementsRouteBadge = unviewedRequirements.length;
      const unreadNotificationsCount = persistentNotifs.unreadCount || 0;
      const totalUpdatesCount = Math.max(
        invoicesRouteBadge + requirementsRouteBadge,
        unreadNotificationsCount
      );

      const staffPdfUploadsCount = unviewedInvoices.filter(inv => inv.upload_type === 'pdf').length;
      const staffImageUploadsCount = unviewedInvoices.filter(inv => inv.upload_type === 'image').length;
      const staffManualUploadsCount = unviewedInvoices.filter(inv => inv.upload_type === 'manual').length;

      const sortedInvoices = [...unviewedInvoices, ...viewedInvoices];
      const sortedRequirements = [...unviewedRequirements, ...viewedRequirements];

      return res.json({
        success: true,
        data: {
          role: isOwner ? 'owner' : 'staff',
          totalUpdatesCount,
          invoicesRouteBadge,
          requirementsRouteBadge,
          staffInvoicesCount: invoicesRouteBadge,
          staffPdfUploadsCount,
          staffImageUploadsCount,
          staffManualUploadsCount,
          totalPendingInvoicesCount,
          totalPendingAmount,
          pendingRequirementsCount: requirementsRouteBadge,
          recentStaffInvoices: sortedInvoices.slice(0, 8),
          recentRequirements: sortedRequirements.slice(0, 6),
          notifications: persistentNotifs.notifications || [],
          unreadCount: unreadNotificationsCount,
          hasNewUpdates: unreadNotificationsCount > 0 || totalUpdatesCount > 0
        }
      });
    } catch (error) {
      console.error('[NotificationController] getUpdates error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get paginated persistent notifications with filters
   */
  async getNotifications(req, res) {
    try {
      const user = req.user;
      const isOwner = !user || user.role === 'owner' || user.id === 1;
      const { isRead, type, limit = 50, offset = 0 } = req.query;

      const result = await notificationService.getNotifications({
        role: isOwner ? 'owner' : 'staff',
        userId: user ? user.id : null,
        isRead: isRead !== undefined && isRead !== '' ? (isRead === 'true' || isRead === '1') : null,
        type: type || null,
        limit: parseInt(limit, 10) || 50,
        offset: parseInt(offset, 10) || 0
      });

      return res.json({ success: true, data: result });
    } catch (error) {
      console.error('[NotificationController] getNotifications error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Mark a single persistent notification as read
   */
  async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;
      const isOwner = !user || user.role === 'owner' || user.id === 1;
      const istNow = getIstIsoString();

      const notif = await db.get('SELECT * FROM notifications WHERE id = ?', [id]);
      await notificationService.markAsRead(id, isOwner ? 'owner' : 'staff', user ? user.id : null);

      if (notif) {
        if (notif.related_type === 'invoice' && notif.related_id) {
          if (isOwner) {
            await db.run('UPDATE invoices SET viewed_by_owner = 1, viewed_at = ? WHERE id = ?', [istNow, notif.related_id]);
          } else {
            await db.run('UPDATE invoices SET viewed_by_staff = 1, staff_viewed_at = ? WHERE id = ?', [istNow, notif.related_id]);
          }
        } else if (notif.related_type === 'requirement' && notif.related_id) {
          if (isOwner) {
            await db.run('UPDATE store_requirements SET viewed_by_owner = 1, viewed_at = ? WHERE id = ?', [istNow, notif.related_id]);
          } else {
            await db.run('UPDATE store_requirements SET viewed_by_staff = 1, staff_viewed_at = ? WHERE id = ?', [istNow, notif.related_id]);
          }
        }
      }

      return res.json({ success: true, message: `Notification #${id} marked as read.` });
    } catch (error) {
      console.error('[NotificationController] markAsRead error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Mark all persistent notifications and updates as read/viewed
   */
  async markAllAsRead(req, res) {
    try {
      const user = req.user;
      const isOwner = !user || user.role === 'owner' || user.id === 1;
      const istNow = getIstIsoString();

      // Mark notifications table rows as read
      await notificationService.markAllAsRead(isOwner ? 'owner' : 'staff', user ? user.id : null);

      // Mark invoices and requirements viewed
      if (isOwner) {
        await db.run('UPDATE invoices SET viewed_by_owner = 1, viewed_at = ? WHERE (viewed_by_owner IS NULL OR viewed_by_owner = 0)', [istNow]);
        await db.run('UPDATE store_requirements SET viewed_by_owner = 1, viewed_at = ? WHERE (viewed_by_owner IS NULL OR viewed_by_owner = 0)', [istNow]);
      } else {
        await db.run('UPDATE invoices SET viewed_by_staff = 1, staff_viewed_at = ? WHERE (viewed_by_staff IS NULL OR viewed_by_staff = 0)', [istNow]);
        await db.run('UPDATE store_requirements SET viewed_by_staff = 1, staff_viewed_at = ? WHERE (viewed_by_staff IS NULL OR viewed_by_staff = 0)', [istNow]);
      }

      return res.json({ success: true, message: 'All notifications marked as read.' });
    } catch (error) {
      console.error('[NotificationController] markAllAsRead error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Delete a persistent notification
   */
  async deleteNotification(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;
      const isOwner = !user || user.role === 'owner' || user.id === 1;
      const istNow = getIstIsoString();

      const notif = await db.get('SELECT * FROM notifications WHERE id = ?', [id]);
      if (notif) {
        if (notif.related_type === 'invoice' && notif.related_id) {
          if (isOwner) {
            await db.run('UPDATE invoices SET viewed_by_owner = 1, viewed_at = ? WHERE id = ?', [istNow, notif.related_id]);
          } else {
            await db.run('UPDATE invoices SET viewed_by_staff = 1, staff_viewed_at = ? WHERE id = ?', [istNow, notif.related_id]);
          }
        } else if (notif.related_type === 'requirement' && notif.related_id) {
          if (isOwner) {
            await db.run('UPDATE store_requirements SET viewed_by_owner = 1, viewed_at = ? WHERE id = ?', [istNow, notif.related_id]);
          } else {
            await db.run('UPDATE store_requirements SET viewed_by_staff = 1, staff_viewed_at = ? WHERE id = ?', [istNow, notif.related_id]);
          }
        }
      }

      await notificationService.deleteNotification(id);
      return res.json({ success: true, message: `Notification #${id} deleted.` });
    } catch (error) {
      console.error('[NotificationController] deleteNotification error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Clear all persistent notifications and mark all items viewed
   */
  async clearAllNotifications(req, res) {
    try {
      const user = req.user;
      const isOwner = !user || user.role === 'owner' || user.id === 1;
      const istNow = getIstIsoString();

      await notificationService.clearAll(isOwner ? 'owner' : 'staff', user ? user.id : null);

      if (isOwner) {
        await db.run('UPDATE invoices SET viewed_by_owner = 1, viewed_at = ? WHERE (viewed_by_owner IS NULL OR viewed_by_owner = 0)', [istNow]);
        await db.run('UPDATE store_requirements SET viewed_by_owner = 1, viewed_at = ? WHERE (viewed_by_owner IS NULL OR viewed_by_owner = 0)', [istNow]);
      } else {
        await db.run('UPDATE invoices SET viewed_by_staff = 1, staff_viewed_at = ? WHERE (viewed_by_staff IS NULL OR viewed_by_staff = 0)', [istNow]);
        await db.run('UPDATE store_requirements SET viewed_by_staff = 1, staff_viewed_at = ? WHERE (viewed_by_staff IS NULL OR viewed_by_staff = 0)', [istNow]);
      }

      return res.json({ success: true, message: 'All notifications cleared.' });
    } catch (error) {
      console.error('[NotificationController] clearAllNotifications error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Mark a specific invoice as viewed by the caller
   */
  async markInvoiceViewed(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;
      const isOwner = !user || user.role === 'owner' || user.id === 1;
      const istNow = getIstIsoString();

      if (isOwner) {
        await db.run('UPDATE invoices SET viewed_by_owner = 1, viewed_at = ? WHERE id = ?', [istNow, id]);
        await db.run('UPDATE notifications SET is_read = 1, read_at = ? WHERE related_type = ? AND related_id = ? AND (target_role = ? OR target_role = ?)', [istNow, 'invoice', id, 'owner', 'all']);
      } else {
        await db.run('UPDATE invoices SET viewed_by_staff = 1, staff_viewed_at = ? WHERE id = ?', [istNow, id]);
        await db.run('UPDATE notifications SET is_read = 1, read_at = ? WHERE related_type = ? AND related_id = ? AND (target_role = ? OR target_role = ?)', [istNow, 'invoice', id, 'staff', 'all']);
      }

      return res.json({ success: true, message: `Invoice #${id} marked as viewed.` });
    } catch (error) {
      console.error('[NotificationController] markInvoiceViewed error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Mark all invoices as viewed by caller (clears sidebar invoices route badge)
   */
  async markAllInvoicesViewed(req, res) {
    try {
      const user = req.user;
      const isOwner = !user || user.role === 'owner' || user.id === 1;
      const istNow = getIstIsoString();

      if (isOwner) {
        await db.run('UPDATE invoices SET viewed_by_owner = 1, viewed_at = ? WHERE (viewed_by_owner IS NULL OR viewed_by_owner = 0)', [istNow]);
      } else {
        await db.run('UPDATE invoices SET viewed_by_staff = 1, staff_viewed_at = ? WHERE (viewed_by_staff IS NULL OR viewed_by_staff = 0)', [istNow]);
      }

      return res.json({ success: true, message: 'All invoices marked as viewed.' });
    } catch (error) {
      console.error('[NotificationController] markAllInvoicesViewed error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Mark a specific store requirement as viewed by caller
   */
  async markRequirementViewed(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;
      const isOwner = !user || user.role === 'owner' || user.id === 1;
      const istNow = getIstIsoString();

      if (isOwner) {
        await db.run('UPDATE store_requirements SET viewed_by_owner = 1, viewed_at = ? WHERE id = ?', [istNow, id]);
        await db.run('UPDATE notifications SET is_read = 1, read_at = ? WHERE related_type = ? AND related_id = ? AND (target_role = ? OR target_role = ?)', [istNow, 'requirement', id, 'owner', 'all']);
      } else {
        await db.run('UPDATE store_requirements SET viewed_by_staff = 1, staff_viewed_at = ? WHERE id = ?', [istNow, id]);
        await db.run('UPDATE notifications SET is_read = 1, read_at = ? WHERE related_type = ? AND related_id = ? AND (target_role = ? OR target_role = ?)', [istNow, 'requirement', id, 'staff', 'all']);
      }

      return res.json({ success: true, message: `Requirement #${id} marked as viewed.` });
    } catch (error) {
      console.error('[NotificationController] markRequirementViewed error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Mark all store requirements as viewed by caller (clears sidebar requirements route badge)
   */
  async markAllRequirementsViewed(req, res) {
    try {
      const user = req.user;
      const isOwner = !user || user.role === 'owner' || user.id === 1;
      const istNow = getIstIsoString();

      if (isOwner) {
        await db.run('UPDATE store_requirements SET viewed_by_owner = 1, viewed_at = ? WHERE (viewed_by_owner IS NULL OR viewed_by_owner = 0)', [istNow]);
      } else {
        await db.run('UPDATE store_requirements SET viewed_by_staff = 1, staff_viewed_at = ? WHERE (viewed_by_staff IS NULL OR viewed_by_staff = 0)', [istNow]);
      }

      return res.json({ success: true, message: 'All requirements marked as viewed.' });
    } catch (error) {
      console.error('[NotificationController] markAllRequirementsViewed error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Mark all notifications (invoices + requirements + notifications table) as viewed by caller
   */
  async markAllViewed(req, res) {
    try {
      const user = req.user;
      const isOwner = !user || user.role === 'owner' || user.id === 1;
      const istNow = getIstIsoString();

      await notificationService.markAllAsRead(isOwner ? 'owner' : 'staff', user ? user.id : null);

      if (isOwner) {
        await db.run('UPDATE invoices SET viewed_by_owner = 1, viewed_at = ? WHERE (viewed_by_owner IS NULL OR viewed_by_owner = 0)', [istNow]);
        await db.run('UPDATE store_requirements SET viewed_by_owner = 1, viewed_at = ? WHERE (viewed_by_owner IS NULL OR viewed_by_owner = 0)', [istNow]);
      } else {
        await db.run('UPDATE invoices SET viewed_by_staff = 1, staff_viewed_at = ? WHERE (viewed_by_staff IS NULL OR viewed_by_staff = 0)', [istNow]);
        await db.run('UPDATE store_requirements SET viewed_by_staff = 1, staff_viewed_at = ? WHERE (viewed_by_staff IS NULL OR viewed_by_staff = 0)', [istNow]);
      }

      return res.json({ success: true, message: 'All notifications marked as viewed.' });
    } catch (error) {
      console.error('[NotificationController] markAllViewed error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new NotificationController();

