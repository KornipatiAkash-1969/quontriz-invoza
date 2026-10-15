const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const mysqlClient = require('./mysqlClient');

async function initMysql() {
  console.log('[MySQL] 🚀 Initializing MySQL database schema and seed data...');
  const pool = mysqlClient.getPool();

  // 1. Read and execute schema.sql
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  try {
    await pool.query(schemaSql);
    console.log('[MySQL] ✅ Schema DDL executed successfully.');
  } catch (err) {
    console.error('[MySQL Schema Error]', err.message);
    throw err;
  }

  // 2. Seed Default Accounts
  const devHash = bcrypt.hashSync('owner123', 10);

  // Seed developer@supermarket.com
  const devUser = await mysqlClient.get(
    "SELECT id FROM users WHERE LOWER(email) IN ('developer@supermarket.com', 'developer@gmail.com')"
  );
  if (!devUser) {
    await mysqlClient.run(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      ['Developer', 'developer@supermarket.com', devHash, 'owner']
    );
    console.log('[MySQL] ✅ Seeded developer@supermarket.com (owner)');
  } else {
    await mysqlClient.run(
      "UPDATE users SET email = 'developer@supermarket.com', password_hash = ?, role = 'owner' WHERE id = ?",
      [devHash, devUser.id]
    );
  }

  // One-time database migration: Permanently remove legacy auto-seeded non-developer accounts
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const legacySeedCleanup = await mysqlClient.get(
    "SELECT id FROM schema_migrations WHERE id = 'cleanup_legacy_autoseeded_users_v1'"
  );
  if (!legacySeedCleanup) {
    try {
      await mysqlClient.run(
        "UPDATE invoices SET created_by_user_id = NULL WHERE created_by_user_id IN (SELECT id FROM users WHERE LOWER(email) = 'akash.kornipati1969@gmail.com')"
      );
      await mysqlClient.run(
        "UPDATE invoices SET approved_by_user_id = NULL WHERE approved_by_user_id IN (SELECT id FROM users WHERE LOWER(email) = 'akash.kornipati1969@gmail.com')"
      );
      await mysqlClient.run(
        "DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE LOWER(email) = 'akash.kornipati1969@gmail.com')"
      );
      await mysqlClient.run(
        "DELETE FROM otps WHERE LOWER(email) = 'akash.kornipati1969@gmail.com'"
      );
      await mysqlClient.run(
        "DELETE FROM users WHERE LOWER(email) = 'akash.kornipati1969@gmail.com'"
      );
      await mysqlClient.run(
        "INSERT INTO schema_migrations (id) VALUES ('cleanup_legacy_autoseeded_users_v1')"
      );
      console.log('[MySQL] 🧹 Purged legacy auto-seeded akash.kornipati1969@gmail.com from database.');
    } catch (cleanErr) {
      console.warn('[MySQL Cleanup Warning]', cleanErr.message);
    }
  }

  // 3. Seed Default Categories if empty
  const catCountRow = await mysqlClient.get('SELECT COUNT(*) as count FROM categories');
  if (catCountRow && Number(catCountRow.count) === 0) {
    const defaultCategories = [
      'Electronics',
      'Snacks',
      'Beverages',
      'Grocery',
      'Dairy',
      'Bakery',
      'Personal Care',
      'Household',
      'Stationery',
      'Fruits & Vegetables',
      'Other'
    ];
    for (const cat of defaultCategories) {
      await mysqlClient.run('INSERT IGNORE INTO categories (category_name) VALUES (?)', [cat]);
    }
    console.log(`[MySQL] ✅ Seeded ${defaultCategories.length} default categories.`);
  }

  // 4. Seed Default Vendor Types if empty
  const typeCountRow = await mysqlClient.get('SELECT COUNT(*) as count FROM vendor_types');
  if (typeCountRow && Number(typeCountRow.count) === 0) {
    const defaultTypes = [
      'Electronics Supplier',
      'Food Supplier',
      'Beverage Supplier',
      'Grocery Supplier',
      'Dairy Supplier',
      'Bakery Supplier',
      'General Supplier',
      'Other'
    ];
    for (const vt of defaultTypes) {
      await mysqlClient.run('INSERT IGNORE INTO vendor_types (type_name) VALUES (?)', [vt]);
    }
    console.log(`[MySQL] ✅ Seeded ${defaultTypes.length} default vendor types.`);
  }

  // 5. Seed Initial Demo Vendors if empty
  const vendorCountRow = await mysqlClient.get('SELECT COUNT(*) as count FROM vendors');
  if (vendorCountRow && Number(vendorCountRow.count) === 0) {
    const sampleVendors = [
      ['Metro Wholesale India Pvt Ltd', 'Grocery Supplier', '+91 98765 43210', 'billing@metrowholesale.in', 'Warehouse Hub 4, Yeshwanthpur, Bengaluru - 560022', '29AABCM1234F1Z5'],
      ['Amul Dairy Products Distributors', 'Dairy Supplier', '+91 98450 11223', 'orders@amuldairyblore.com', 'Plot 12, Dairy Circle, Bannerghatta Road, Bengaluru - 560029', '29AABCA5678K1Z2'],
      ['Britannia Industries Depo', 'Bakery Supplier', '+91 98110 99887', 'depot@britannia-south.in', 'Indl Area, Peenya 2nd Stage, Bengaluru - 560058', '29AABCB9012M1Z8'],
      ['Hindustan Unilever Distribution', 'Household', '+91 98220 33445', 'fmcg@hul-distributor.com', 'Whitefield Main Road, Bengaluru - 560066', '29AABCH3456P1Z3'],
      ['ITC Foods Division', 'Snacks', '+91 98330 77665', 'orders@itcfoods.in', 'ITC Infotech Park, Pulakeshi Nagar, Bengaluru - 560005', '29AABCI7890R1Z9']
    ];
    for (const v of sampleVendors) {
      await mysqlClient.run(
        'INSERT INTO vendors (vendor_name, vendor_type, contact, email, address, gstin) VALUES (?, ?, ?, ?, ?, ?)',
        v
      );
    }
    console.log(`[MySQL] ✅ Seeded sample vendors.`);
  }

  console.log('[MySQL] 🎉 Database setup complete.');
}

module.exports = initMysql;
