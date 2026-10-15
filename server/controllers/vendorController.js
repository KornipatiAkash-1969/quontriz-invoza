const db = require('../database/db');

class VendorController {
  async getVendors(req, res) {
    try {
      const { search, vendor_type, type } = req.query;
      let sql = `
        SELECT 
          v.*,
          COUNT(DISTINCT i.id) as total_invoices,
          COALESCE(SUM(i.total), 0) as total_purchase_amount,
          COUNT(DISTINCT ii.id) as items_count
        FROM vendors v
        LEFT JOIN invoices i ON v.id = i.vendor_id
        LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
      `;
      let params = [];
      let whereClauses = [];

      if (search && search.trim()) {
        whereClauses.push('(v.vendor_name LIKE ? OR v.gstin LIKE ? OR v.vendor_type LIKE ?)');
        const s = `%${search.trim()}%`;
        params.push(s, s, s);
      }

      const targetType = (vendor_type || type || '').trim();
      if (targetType) {
        whereClauses.push('LOWER(v.vendor_type) = LOWER(?)');
        params.push(targetType);
      }

      if (whereClauses.length > 0) {
        sql += ' WHERE ' + whereClauses.join(' AND ');
      }

      sql += ' GROUP BY v.id ORDER BY total_purchase_amount DESC, v.vendor_name ASC';

      const vendors = await db.query(sql, params);
      return res.json({ success: true, data: vendors });
    } catch (error) {
      console.error('[VendorController] getVendors error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  async getVendorById(req, res) {
    try {
      const { id } = req.params;
      const vendor = await db.get('SELECT * FROM vendors WHERE id = ?', [id]);
      if (!vendor) {
        return res.status(404).json({ success: false, error: 'Vendor not found.' });
      }

      // Invoices from this vendor
      const invoices = await db.query(`
        SELECT i.*, COUNT(ii.id) as items_count
        FROM invoices i
        LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
        WHERE i.vendor_id = ?
        GROUP BY i.id
        ORDER BY i.invoice_date DESC
      `, [id]);

      // Items purchased from this vendor
      const items = await db.query(`
        SELECT 
          ii.item_name,
          ii.sku,
          c.category_name,
          SUM(ii.quantity) as total_quantity,
          ii.unit,
          AVG(ii.unit_price) as avg_price,
          SUM(ii.total_price) as total_spent,
          COUNT(DISTINCT i.id) as order_frequency
        FROM invoice_items ii
        JOIN invoices i ON ii.invoice_id = i.id
        LEFT JOIN categories c ON ii.category_id = c.id
        WHERE i.vendor_id = ?
        GROUP BY ii.item_name
        ORDER BY total_spent DESC
      `, [id]);

      const stats = await db.get(`
        SELECT 
          COUNT(DISTINCT id) as total_invoices,
          COALESCE(SUM(total), 0) as total_spent
        FROM invoices
        WHERE vendor_id = ?
      `, [id]);

      return res.json({
        success: true,
        data: {
          ...vendor,
          stats: {
            totalInvoices: stats ? stats.total_invoices : 0,
            totalSpent: stats ? stats.total_spent : 0
          },
          invoices,
          items
        }
      });
    } catch (error) {
      console.error('[VendorController] getVendorById error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  async createVendor(req, res) {
    try {
      const { vendor_name, vendor_type, contact, email, address, gstin, notes } = req.body;

      if (!vendor_name || vendor_name.trim() === '') {
        return res.status(400).json({ success: false, error: 'Vendor name is required.' });
      }

      const result = await db.run(`
        INSERT INTO vendors (vendor_name, vendor_type, contact, email, address, gstin, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        vendor_name.trim(),
        vendor_type || 'General Supplier',
        contact || '',
        email || '',
        address || '',
        gstin ? gstin.trim().toUpperCase() : '',
        notes || ''
      ]);

      const created = await db.get('SELECT * FROM vendors WHERE id = ?', [result.lastInsertRowid || result.insertId]);
      return res.status(201).json({ success: true, message: 'Vendor created successfully.', data: created });
    } catch (error) {
      console.error('[VendorController] createVendor error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateVendor(req, res) {
    try {
      const { id } = req.params;
      const { vendor_name, vendor_type, contact, email, address, gstin, notes } = req.body;

      const existing = await db.get('SELECT id FROM vendors WHERE id = ?', [id]);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Vendor not found.' });
      }

      await db.run(`
        UPDATE vendors SET
          vendor_name = ?,
          vendor_type = ?,
          contact = ?,
          email = ?,
          address = ?,
          gstin = ?,
          notes = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        vendor_name.trim(),
        vendor_type || 'General Supplier',
        contact || '',
        email || '',
        address || '',
        gstin ? gstin.trim().toUpperCase() : '',
        notes || '',
        id
      ]);

      const updated = await db.get('SELECT * FROM vendors WHERE id = ?', [id]);
      return res.json({ success: true, message: 'Vendor updated successfully.', data: updated });
    } catch (error) {
      console.error('[VendorController] updateVendor error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  async deleteVendor(req, res) {
    try {
      const { id } = req.params;
      const existing = await db.get('SELECT id FROM vendors WHERE id = ?', [id]);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Vendor not found.' });
      }

      // Check if vendor has invoices
      const invRow = await db.get('SELECT COUNT(*) as count FROM invoices WHERE vendor_id = ?', [id]);
      const invCount = invRow?.count || 0;
      if (invCount > 0) {
        await db.run('UPDATE invoices SET vendor_id = NULL WHERE vendor_id = ?', [id]);
      }

      await db.run('DELETE FROM vendors WHERE id = ?', [id]);
      return res.json({ success: true, message: 'Vendor deleted successfully.' });
    } catch (error) {
      console.error('[VendorController] deleteVendor error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new VendorController();
