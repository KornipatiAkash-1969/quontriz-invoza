const db = require('../database/db');

class VendorTypeController {
  async getVendorTypes(req, res) {
    try {
      const sql = `
        SELECT 
          vt.*,
          (SELECT COUNT(*) FROM vendors WHERE vendor_type = vt.type_name) as vendor_count
        FROM vendor_types vt
        ORDER BY vt.type_name ASC
      `;
      const types = db.query(sql);
      return res.json({ success: true, data: types });
    } catch (error) {
      console.error('[VendorTypeController] getVendorTypes error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  async createVendorType(req, res) {
    try {
      const { type_name } = req.body;
      if (!type_name || type_name.trim() === '') {
        return res.status(400).json({ success: false, error: 'Vendor type name is required.' });
      }

      const trimmed = type_name.trim();
      const existing = db.get('SELECT id FROM vendor_types WHERE LOWER(type_name) = LOWER(?)', [trimmed]);
      if (existing) {
        return res.status(400).json({ success: false, error: 'Vendor type already exists.' });
      }

      const result = db.run('INSERT INTO vendor_types (type_name) VALUES (?)', [trimmed]);
      const created = db.get('SELECT * FROM vendor_types WHERE id = ?', [result.lastInsertRowid]);

      return res.status(201).json({ success: true, message: 'Vendor type created successfully.', data: created });
    } catch (error) {
      console.error('[VendorTypeController] createVendorType error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  async getVendorsByType(req, res) {
    try {
      const { id } = req.params;
      let vendorType = null;
      if (!isNaN(Number(id))) {
        vendorType = db.get('SELECT * FROM vendor_types WHERE id = ?', [Number(id)]);
      }
      if (!vendorType) {
        vendorType = db.get('SELECT * FROM vendor_types WHERE LOWER(type_name) = LOWER(?)', [decodeURIComponent(id).trim()]);
      }
      const typeName = vendorType ? vendorType.type_name : decodeURIComponent(id).trim();

      const sql = `
        SELECT 
          v.*,
          COUNT(DISTINCT i.id) as total_invoices,
          COALESCE(SUM(i.total), 0) as total_purchase_amount,
          COUNT(DISTINCT ii.id) as items_count
        FROM vendors v
        LEFT JOIN invoices i ON v.id = i.vendor_id
        LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
        WHERE LOWER(v.vendor_type) = LOWER(?)
        GROUP BY v.id
        ORDER BY total_purchase_amount DESC, v.vendor_name ASC
      `;
      const vendors = db.query(sql, [typeName]);

      return res.json({
        success: true,
        data: {
          vendorType: vendorType || { id: null, type_name: typeName },
          vendors,
          totalVendors: vendors.length
        }
      });
    } catch (error) {
      console.error('[VendorTypeController] getVendorsByType error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new VendorTypeController();
