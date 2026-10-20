const db = require('../database/db');
const ExcelJS = require('exceljs');
const { getIstIsoString } = require('../utils/dateTime');
const notificationService = require('../services/NotificationService');

class RequirementController {
  /**
   * 1. Get all store requirements with search, filters & summary statistics
   */
  async getRequirements(req, res) {
    try {
      const {
        search = '',
        status = '',
        priority = '',
        categoryId = '',
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = req.query;

      let whereClauses = [];
      let params = [];

      if (search) {
        whereClauses.push('(r.item_name LIKE ? OR r.specification LIKE ? OR r.notes LIKE ? OR r.requested_by_name LIKE ? OR r.preferred_vendor_name LIKE ?)');
        const s = `%${search}%`;
        params.push(s, s, s, s, s);
      }

      if (status && status !== 'All') {
        whereClauses.push('r.status = ?');
        params.push(status);
      }

      if (priority && priority !== 'All') {
        whereClauses.push('r.priority = ?');
        params.push(priority);
      }

      if (categoryId) {
        whereClauses.push('r.category_id = ?');
        params.push(Number(categoryId));
      }

      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      const validSorts = ['created_at', 'item_name', 'quantity', 'priority', 'status'];
      const finalSortBy = validSorts.includes(sortBy) ? `r.${sortBy}` : 'r.created_at';
      const finalOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      const sql = `
        SELECT r.*
        FROM store_requirements r
        ${whereSql}
        ORDER BY ${finalSortBy} ${finalOrder}
      `;

      const requirements = await db.query(sql, params);

      // Summary counts for dashboard badges
      const [totalR, pendingR, approvedR, orderedR, fulfilledR, urgentR] = await Promise.all([
        db.get('SELECT COUNT(*) as c FROM store_requirements'),
        db.get("SELECT COUNT(*) as c FROM store_requirements WHERE status = 'Pending'"),
        db.get("SELECT COUNT(*) as c FROM store_requirements WHERE status = 'Approved'"),
        db.get("SELECT COUNT(*) as c FROM store_requirements WHERE status = 'Ordered'"),
        db.get("SELECT COUNT(*) as c FROM store_requirements WHERE status = 'Fulfilled'"),
        db.get("SELECT COUNT(*) as c FROM store_requirements WHERE priority = 'Urgent' AND status != 'Fulfilled'")
      ]);
      const counts = {
        total: totalR?.c || 0,
        pending: pendingR?.c || 0,
        approved: approvedR?.c || 0,
        ordered: orderedR?.c || 0,
        fulfilled: fulfilledR?.c || 0,
        urgent: urgentR?.c || 0,
      };

      return res.json({
        success: true,
        data: requirements,
        counts
      });
    } catch (error) {
      console.error('[RequirementController] getRequirements error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * 2. Create new requirement (Rice - 25 KG - 10 bags)
   */
  async createRequirement(req, res) {
    try {
      const {
        item_name,
        specification = '',
        quantity = 1,
        unit = 'bags',
        category_id = null,
        category_name = '',
        priority = 'Medium',
        estimated_price = 0,
        preferred_vendor_id = null,
        preferred_vendor_name = '',
        notes = ''
      } = req.body;

      if (!item_name || !item_name.trim()) {
        return res.status(400).json({ success: false, error: 'Item name is required (e.g. Rice).' });
      }

      const reqUser = req.user;
      const requestedByName = reqUser ? reqUser.name : 'Store Staff';
      const requestedByUserId = reqUser ? reqUser.id : null;
      const isOwner = reqUser && (reqUser.role === 'owner' || reqUser.id === 1);
      const viewedByOwner = isOwner ? 1 : 0;
      const viewedByStaff = isOwner ? 0 : 1;
      const istNow = getIstIsoString();

      const result = await db.run(`
        INSERT INTO store_requirements (
          item_name, specification, quantity, unit,
          category_id, category_name, priority, estimated_price,
          preferred_vendor_id, preferred_vendor_name, notes,
          status, requested_by_user_id, requested_by_name,
          viewed_by_owner, viewed_at, viewed_by_staff, staff_viewed_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        item_name.trim(),
        (specification || '').trim(),
        Number(quantity) > 0 ? Number(quantity) : 1,
        (unit || 'bags').trim(),
        category_id ? Number(category_id) : null,
        (category_name || '').trim(),
        priority || 'Medium',
        Number(estimated_price) >= 0 ? Number(estimated_price) : 0,
        preferred_vendor_id ? Number(preferred_vendor_id) : null,
        (preferred_vendor_name || '').trim(),
        (notes || '').trim(),
        requestedByUserId,
        requestedByName,
        viewedByOwner,
        viewedByOwner ? istNow : null,
        viewedByStaff,
        viewedByStaff ? istNow : null,
        istNow,
        istNow
      ]);

      const created = await db.get('SELECT * FROM store_requirements WHERE id = ?', [result.lastInsertRowid || result.insertId]);

      if (!isOwner) {
        try {
          await notificationService.createNotification({
            target_role: 'owner',
            type: 'requirement_created',
            title: 'New Store Requirement',
            message: `${requestedByName} requested: ${created.item_name} (${created.quantity} ${created.unit})`,
            link: '/requirements',
            related_id: created.id,
            related_type: 'requirement',
            created_by_user_id: requestedByUserId,
            created_by_name: requestedByName
          });
        } catch (notifErr) {
          console.warn('[RequirementController] Notification error on create:', notifErr.message);
        }
      }

      return res.status(201).json({
        success: true,
        message: `Requirement for "${created.item_name} ${created.specification ? `(${created.specification})` : ''} - ${created.quantity} ${created.unit}" successfully added.`,
        data: created
      });
    } catch (error) {
      console.error('[RequirementController] createRequirement error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * 3. Update requirement or change status
   */
  async updateRequirement(req, res) {
    try {
      const { id } = req.params;
      const isOwner = req.user && (req.user.role === 'owner' || req.user.id === 1);
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Only Store Owner has permission to edit or update requirements.'
        });
      }

      const existing = await db.get('SELECT * FROM store_requirements WHERE id = ?', [id]);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Requirement not found.' });
      }

      const {
        item_name = existing.item_name,
        specification = existing.specification,
        quantity = existing.quantity,
        unit = existing.unit,
        category_id = existing.category_id,
        category_name = existing.category_name,
        priority = existing.priority,
        estimated_price = existing.estimated_price,
        preferred_vendor_id = existing.preferred_vendor_id,
        preferred_vendor_name = existing.preferred_vendor_name,
        notes = existing.notes,
        status = existing.status
      } = req.body;

      let fulfilledByUserId = existing.fulfilled_by_user_id;
      let fulfilledByName = existing.fulfilled_by_name;
      let fulfilledAt = existing.fulfilled_at;

      // If transitioning to Fulfilled, capture user and timestamp
      const istNow = getIstIsoString();
      if (status === 'Fulfilled' && existing.status !== 'Fulfilled') {
        fulfilledByUserId = req.user ? req.user.id : 1;
        fulfilledByName = req.user ? req.user.name : 'Store Owner';
        fulfilledAt = istNow;
      } else if (status !== 'Fulfilled') {
        fulfilledByUserId = null;
        fulfilledByName = null;
        fulfilledAt = null;
      }

      const cleanQuantity = !isNaN(Number(quantity)) && Number(quantity) > 0 ? Number(quantity) : (existing.quantity || 1);
      const cleanPrice = !isNaN(Number(estimated_price)) && Number(estimated_price) >= 0 ? Number(estimated_price) : 0;

      // When Owner updates/approves/orders, reset staff viewed status so staff receives live badge & notification
      const viewedByOwner = 1;
      const viewedAt = istNow;
      const viewedByStaff = 0;
      const staffViewedAt = null;

      await db.run(`
        UPDATE store_requirements
        SET item_name = ?, specification = ?, quantity = ?, unit = ?,
            category_id = ?, category_name = ?, priority = ?, estimated_price = ?,
            preferred_vendor_id = ?, preferred_vendor_name = ?, notes = ?,
            status = ?, fulfilled_by_user_id = ?, fulfilled_by_name = ?, fulfilled_at = ?,
            viewed_by_owner = ?, viewed_at = ?,
            viewed_by_staff = ?, staff_viewed_at = ?, updated_at = ?
        WHERE id = ?
      `, [
        (item_name || existing.item_name || '').trim(),
        (specification !== undefined ? specification : existing.specification || '').trim(),
        cleanQuantity,
        (unit || existing.unit || '').trim(),
        category_id ? Number(category_id) : null,
        (category_name || '').trim(),
        priority || existing.priority || 'Medium',
        cleanPrice,
        preferred_vendor_id ? Number(preferred_vendor_id) : null,
        (preferred_vendor_name || '').trim(),
        (notes || '').trim(),
        status || existing.status || 'Pending',
        fulfilledByUserId,
        fulfilledByName,
        fulfilledAt,
        viewedByOwner,
        viewedAt,
        viewedByStaff,
        staffViewedAt,
        istNow,
        id
      ]);

      const updated = await db.get('SELECT * FROM store_requirements WHERE id = ?', [id]);

      // Create distinct status notification for staff
      try {
        let notifType = 'requirement_updated';
        let notifTitle = `Requirement ${updated.status || 'Updated'}`;
        let notifMsg = `Owner marked demand "${updated.item_name}" as "${updated.status}"`;

        if (updated.status === 'Approved') {
          notifType = 'requirement_approved';
          notifTitle = 'Requirement Approved';
          notifMsg = `Owner approved demand for ${updated.item_name} (${updated.quantity} ${updated.unit})`;
        } else if (updated.status === 'Ordered') {
          notifType = 'requirement_ordered';
          notifTitle = 'Requirement Ordered';
          notifMsg = `Owner placed supplier order for ${updated.item_name} (${updated.quantity} ${updated.unit})`;
        } else if (updated.status === 'Fulfilled') {
          notifType = 'requirement_fulfilled';
          notifTitle = 'Requirement Fulfilled';
          notifMsg = `Demand for ${updated.item_name} (${updated.quantity} ${updated.unit}) has been fulfilled`;
        } else if (updated.status === 'Received') {
          notifType = 'requirement_received';
          notifTitle = 'Requirement Received';
          notifMsg = `Order for ${updated.item_name} (${updated.quantity} ${updated.unit}) arrived at store`;
        } else if (updated.status === 'Rejected') {
          notifType = 'requirement_rejected';
          notifTitle = 'Requirement Rejected';
          notifMsg = `Owner rejected demand for ${updated.item_name}`;
        }

        const requesterId = updated.requested_by_user_id;
        const isOwnerRequirement = !requesterId || requesterId === 1;

        // Only notify the particular staff member who requested this item
        if (!isOwnerRequirement && requesterId) {
          await notificationService.createNotification({
            user_id: requesterId,
            target_role: 'staff',
            type: notifType,
            title: notifTitle,
            message: notifMsg,
            link: '/requirements',
            related_id: updated.id,
            related_type: 'requirement',
            created_by_user_id: req.user?.id || 1,
            created_by_name: req.user?.name || 'Store Owner'
          });
        }
      } catch (notifErr) {
        console.warn('[RequirementController] Notification error on update:', notifErr.message);
      }

      return res.json({
        success: true,
        message: `Requirement "${updated.item_name}" updated to status "${updated.status}".`,
        data: updated
      });
    } catch (error) {
      console.error('[RequirementController] updateRequirement error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * 4. Delete requirement (Owner or Staff)
   */
  async deleteRequirement(req, res) {
    try {
      const { id } = req.params;
      const isOwner = !req.user || req.user.role === 'owner' || req.user.id === 1;

      const existing = await db.get('SELECT * FROM store_requirements WHERE id = ?', [id]);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Requirement not found.' });
      }

      // If not owner, verify staff can delete (creator of requirement or any pending item)
      if (!isOwner && req.user) {
        const isCreator = existing.requested_by_user_id === req.user.id;
        const isPending = existing.status === 'Pending';
        if (!isCreator && !isPending && req.user.role !== 'staff') {
          return res.status(403).json({
            success: false,
            error: 'Access denied. You can only delete pending requirements or requirements you requested.'
          });
        }
      }

      await db.transaction(async () => {
        await db.run('DELETE FROM store_requirements WHERE id = ?', [id]);
        await db.run('DELETE FROM notifications WHERE related_id = ? AND related_type = ?', [id, 'requirement']);
      });
      return res.json({ success: true, message: `Requirement "${existing.item_name}" deleted.` });
    } catch (error) {
      console.error('[RequirementController] deleteRequirement error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * 5. Download / Export requirements list as a genuine Excel spreadsheet (.xlsx)
   */
  async exportToExcel(req, res) {
    try {
      const { status = '', priority = '', search = '' } = req.query;

      let whereClauses = [];
      let params = [];

      if (search) {
        whereClauses.push('(r.item_name LIKE ? OR r.specification LIKE ? OR r.notes LIKE ? OR r.requested_by_name LIKE ?)');
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
      }

      if (status && status !== 'All') {
        whereClauses.push('r.status = ?');
        params.push(status);
      }

      if (priority && priority !== 'All') {
        whereClauses.push('r.priority = ?');
        params.push(priority);
      }

      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
      const items = await db.query(`
        SELECT r.*
        FROM store_requirements r
        ${whereSql}
        ORDER BY r.created_at DESC
      `, params);

      // Create Excel workbook
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Quontriz Invoza';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('Store Requirements', {
        pageSetup: { paperSize: 9, orientation: 'landscape' },
        views: [{ state: 'frozen', ySplit: 4 }]
      });

      // Title Banner Row
      worksheet.mergeCells('A1:L1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = 'QUONTRIZ INVOZA — STORE REQUIREMENTS & PURCHASE REQUISITION';
      titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' } // Slate 800
      };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getRow(1).height = 34;

      // Meta Subtitle Row
      worksheet.mergeCells('A2:L2');
      const metaCell = worksheet.getCell('A2');
      const dateStr = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
      metaCell.value = `Exported on: ${dateStr}  |  Total Demands: ${items.length}  |  Role: Owner & Store Operations`;
      metaCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF475569' } };
      metaCell.alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getRow(2).height = 20;

      // Empty separator row 3
      worksheet.getRow(3).height = 8;

      // Header Row 4
      const headers = [
        { header: 'Sl No', key: 'sl', width: 8 },
        { header: 'Item Name', key: 'item_name', width: 22 },
        { header: 'Specification / Packaging', key: 'specification', width: 22 },
        { header: 'Qty', key: 'quantity', width: 10 },
        { header: 'Unit', key: 'unit', width: 12 },
        { header: 'Full Description', key: 'full_desc', width: 32 },
        { header: 'Category', key: 'category', width: 18 },
        { header: 'Priority', key: 'priority', width: 12 },
        { header: 'Status', key: 'status', width: 14 },
        { header: 'Preferred Vendor', key: 'vendor', width: 24 },
        { header: 'Requested By', key: 'requested_by', width: 20 },
        { header: 'Notes / Remarks', key: 'notes', width: 32 },
      ];

      const headerRow = worksheet.getRow(4);
      headerRow.height = 26;
      headers.forEach((h, idx) => {
        const cell = headerRow.getCell(idx + 1);
        cell.value = h.header;
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4F46E5' } // Indigo 600
        };
        cell.alignment = { vertical: 'middle', horizontal: idx === 0 || idx === 3 ? 'center' : 'left' };
        worksheet.getColumn(idx + 1).width = h.width;
      });

      // Populate Data Rows
      items.forEach((item, index) => {
        const fullDesc = `${item.item_name}${item.specification ? ` - ${item.specification}` : ''} - ${item.quantity} ${item.unit}`;
        const row = worksheet.addRow([
          index + 1,
          item.item_name,
          item.specification || '—',
          item.quantity,
          item.unit || 'bags',
          fullDesc,
          item.category_name || 'General',
          item.priority || 'Medium',
          item.status || 'Pending',
          item.preferred_vendor_name || '—',
          item.requested_by_name || 'Staff',
          item.notes || '—'
        ]);

        row.height = 22;

        // Styling row cells
        row.eachCell((cell, colNumber) => {
          cell.font = { name: 'Arial', size: 9.5 };
          cell.alignment = { vertical: 'middle', horizontal: colNumber === 1 || colNumber === 4 ? 'center' : 'left' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
          };

          // Zebra striping
          if (index % 2 === 1) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF8FAFC' }
            };
          }

          // Priority color highlights
          if (colNumber === 8) {
            if (item.priority === 'Urgent') {
              cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFDC2626' } };
            } else if (item.priority === 'High') {
              cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFD97706' } };
            }
          }

          // Status highlights
          if (colNumber === 9) {
            if (item.status === 'Fulfilled') {
              cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF059669' } };
            } else if (item.status === 'Pending') {
              cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFB45309' } };
            } else if (item.status === 'Approved') {
              cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF4338CA' } };
            }
          }
        });
      });

      const today = new Date().toISOString().slice(0, 10);
      const filename = `Store_Requirements_Requisition_${today}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      await workbook.xlsx.write(res);
      return res.end();
    } catch (error) {
      console.error('[RequirementController] exportToExcel error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new RequirementController();
