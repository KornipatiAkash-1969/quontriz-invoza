const db = require('../database/db');
const { getIstIsoString } = require('../utils/dateTime');

class NotificationService {
  /**
   * Create a persistent notification record with duplicate prevention
   * @param {Object} data 
   * @returns {Object} inserted notification record
   */
  async createNotification(data) {
    try {
      const {
        user_id = null,
        target_role = 'owner', // 'owner' | 'staff' | 'all'
        type,                  // 'requirement_created', 'requirement_updated', 'invoice_created', 'invoice_paid', 'invoice_rejected', etc.
        title,
        message,
        link = null,
        related_id = null,
        related_type = null,   // 'invoice' | 'requirement'
        created_by_user_id = null,
        created_by_name = null
      } = data;

      if (!target_role || !type || !title || !message) {
        console.warn('[NotificationService] Missing required fields for notification');
        return null;
      }

      const istNow = getIstIsoString();

      // Duplicate prevention: if identical unread notification created in the last 15 seconds, skip
      const existing = await db.get(`
        SELECT id, created_at FROM notifications
        WHERE target_role = ? AND type = ? AND related_id = ? AND title = ? AND is_read = 0
        ORDER BY id DESC LIMIT 1
      `, [target_role, type, related_id || -1, title.trim()]);

      if (existing && existing.created_at) {
        const diffMs = Math.abs(Date.now() - new Date(existing.created_at).getTime());
        if (diffMs <= 15000) {
          return existing;
        }
      }

      const result = await db.run(`
        INSERT INTO notifications (
          user_id, target_role, type, title, message, link,
          related_id, related_type, is_read, read_at,
          created_by_user_id, created_by_name, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?, ?)
      `, [
        user_id,
        target_role,
        type,
        title.trim(),
        message.trim(),
        link || null,
        related_id || null,
        related_type || null,
        created_by_user_id || null,
        created_by_name || null,
        istNow
      ]);

      const inserted = await db.get('SELECT * FROM notifications WHERE id = ?', [result.lastInsertRowid || result.insertId]);
      return inserted;
    } catch (err) {
      console.error('[NotificationService] Error creating notification:', err.message);
      return null;
    }
  }

  /**
   * Get notifications for a user/role with filtering and unread count
   */
  async getNotifications(filter = {}) {
    const {
      role = 'owner',
      userId = null,
      isRead = null,
      type = null,
      limit = 30,
      offset = 0
    } = filter;

    const roleConditions = [];
    const params = [];

    // Filter by target role or all, or targeted user
    if (userId) {
      roleConditions.push('(user_id = ? OR (user_id IS NULL AND (target_role = ? OR target_role = ?)))');
      params.push(userId, role, 'all');
    } else {
      roleConditions.push('(target_role = ? OR target_role = ?)');
      params.push(role, 'all');
    }

    if (isRead !== null && isRead !== undefined) {
      roleConditions.push('is_read = ?');
      params.push(isRead ? 1 : 0);
    }

    if (type) {
      roleConditions.push('type = ?');
      params.push(type);
    }

    // Exclude test dummy notifications and orphaned references to deleted invoices/requirements
    roleConditions.push("type != 'test_duplicate_check'");
    roleConditions.push("(related_type != 'invoice' OR related_id IS NULL OR related_id IN (SELECT id FROM invoices))");
    roleConditions.push("(related_type != 'requirement' OR related_id IS NULL OR related_id IN (SELECT id FROM store_requirements))");

    const whereClause = roleConditions.length > 0 ? `WHERE ${roleConditions.join(' AND ')}` : '';

    // Total matching
    const totalRow = await db.get(`SELECT COUNT(*) as count FROM notifications ${whereClause}`, params);
    const totalCount = totalRow?.count || 0;

    // Unread count specifically for this role/user (excluding test & orphaned)
    const unreadParams = userId ? [userId, role, 'all'] : [role, 'all'];
    const unreadUserClause = userId
      ? '(user_id = ? OR (user_id IS NULL AND (target_role = ? OR target_role = ?)))'
      : '(target_role = ? OR target_role = ?)';
    const unreadRow = await db.get(`
      SELECT COUNT(*) as count FROM notifications
      WHERE is_read = 0 
        AND ${unreadUserClause}
        AND type != 'test_duplicate_check'
        AND (related_type != 'invoice' OR related_id IS NULL OR related_id IN (SELECT id FROM invoices))
        AND (related_type != 'requirement' OR related_id IS NULL OR related_id IN (SELECT id FROM store_requirements))
    `, unreadParams);
    const unreadCount = unreadRow?.count || 0;

    // Fetch paginated rows
    const queryParams = [...params, limit, offset];
    const notifications = await db.query(`
      SELECT * FROM notifications
      ${whereClause}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `, queryParams);

    return {
      notifications,
      unreadCount,
      totalCount
    };
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(id, role = null, userId = null) {
    const istNow = getIstIsoString();
    let sql = 'UPDATE notifications SET is_read = 1, read_at = ? WHERE id = ?';
    const params = [istNow, id];

    if (role && !userId) {
      sql += ' AND (target_role = ? OR target_role = ?)';
      params.push(role, 'all');
    } else if (userId) {
      sql += ' AND (user_id = ? OR (user_id IS NULL AND (target_role = ? OR target_role = ?)))';
      params.push(userId, role, 'all');
    }

    return await db.run(sql, params);
  }

  /**
   * Mark all unread notifications as read for a role/user
   */
  async markAllAsRead(role = 'owner', userId = null) {
    const istNow = getIstIsoString();
    let sql = 'UPDATE notifications SET is_read = 1, read_at = ? WHERE is_read = 0';
    const params = [istNow];

    if (userId) {
      sql += ' AND (user_id = ? OR (user_id IS NULL AND (target_role = ? OR target_role = ?)))';
      params.push(userId, role, 'all');
    } else {
      sql += ' AND (target_role = ? OR target_role = ?)';
      params.push(role, 'all');
    }

    return await db.run(sql, params);
  }

  /**
   * Delete a notification
   */
  async deleteNotification(id) {
    return await db.run('DELETE FROM notifications WHERE id = ?', [id]);
  }

  /**
   * Clear / delete all notifications for a role/user
   */
  async clearAll(role = 'owner', userId = null) {
    let sql = 'DELETE FROM notifications';
    const params = [];
    if (userId) {
      sql += ' WHERE (user_id = ? OR (user_id IS NULL AND (target_role = ? OR target_role = ?)))';
      params.push(userId, role, 'all');
    } else {
      sql += ' WHERE (target_role = ? OR target_role = ?)';
      params.push(role, 'all');
    }
    return await db.run(sql, params);
  }
}

module.exports = new NotificationService();
