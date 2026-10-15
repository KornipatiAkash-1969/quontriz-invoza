const db = require('../database/db');

class CategoryController {
  async getCategories(req, res) {
    try {
      const sql = `
        SELECT 
          c.*,
          COUNT(ii.id) as items_count,
          COALESCE(SUM(ii.total_price), 0) as total_purchase_amount
        FROM categories c
        LEFT JOIN invoice_items ii ON c.id = ii.category_id
        GROUP BY c.id
        ORDER BY total_purchase_amount DESC, c.category_name ASC
      `;
      const categories = await db.query(sql);
      return res.json({ success: true, data: categories });
    } catch (error) {
      console.error('[CategoryController] getCategories error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  async createCategory(req, res) {
    try {
      const { category_name } = req.body;
      if (!category_name || category_name.trim() === '') {
        return res.status(400).json({ success: false, error: 'Category name is required.' });
      }

      const trimmed = category_name.trim();
      const existing = await db.get('SELECT id FROM categories WHERE LOWER(category_name) = LOWER(?)', [trimmed]);
      if (existing) {
        return res.status(400).json({ success: false, error: 'Category already exists.' });
      }

      const result = await db.run('INSERT INTO categories (category_name) VALUES (?)', [trimmed]);
      const created = await db.get('SELECT * FROM categories WHERE id = ?', [result.lastInsertRowid || result.insertId]);

      return res.status(201).json({ success: true, message: 'Category created successfully.', data: created });
    } catch (error) {
      console.error('[CategoryController] createCategory error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const { category_name } = req.body;

      if (!category_name || category_name.trim() === '') {
        return res.status(400).json({ success: false, error: 'Category name is required.' });
      }

      const trimmed = category_name.trim();
      const existing = await db.get('SELECT id FROM categories WHERE id = ?', [id]);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Category not found.' });
      }

      // Check duplicate name
      const duplicate = await db.get('SELECT id FROM categories WHERE LOWER(category_name) = LOWER(?) AND id != ?', [trimmed, id]);
      if (duplicate) {
        return res.status(400).json({ success: false, error: 'Another category with this name already exists.' });
      }

      await db.run('UPDATE categories SET category_name = ? WHERE id = ?', [trimmed, id]);
      const updated = await db.get('SELECT * FROM categories WHERE id = ?', [id]);

      return res.json({ success: true, message: 'Category updated successfully.', data: updated });
    } catch (error) {
      console.error('[CategoryController] updateCategory error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  async deleteCategory(req, res) {
    try {
      const { id } = req.params;
      const existing = await db.get('SELECT id FROM categories WHERE id = ?', [id]);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Category not found.' });
      }

      // Re-assign items to 'Other' if exists or set to NULL
      const otherCat = await db.get("SELECT id FROM categories WHERE category_name = 'Other' AND id != ?", [id]);
      if (otherCat) {
        await db.run('UPDATE invoice_items SET category_id = ? WHERE category_id = ?', [otherCat.id, id]);
      } else {
        await db.run('UPDATE invoice_items SET category_id = NULL WHERE category_id = ?', [id]);
      }

      await db.run('DELETE FROM categories WHERE id = ?', [id]);
      return res.json({ success: true, message: 'Category deleted successfully.' });
    } catch (error) {
      console.error('[CategoryController] deleteCategory error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new CategoryController();
