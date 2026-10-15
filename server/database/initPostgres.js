const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const postgresClient = require('./postgresClient');

async function initPostgres() {
  console.log('[PostgreSQL] 🚀 Initializing PostgreSQL database schema and seed data...');

  // 1. Read and execute schema_pg.sql
  const schemaPath = path.join(__dirname, 'schema_pg.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  try {
    await postgresClient.exec(schemaSql);
    console.log('[PostgreSQL] ✅ Schema DDL executed successfully.');
  } catch (err) {
    console.error('[PostgreSQL Schema Error]', err.message);
    if (err.code === 'ECONNREFUSED' || (err.message && err.message.includes('ECONNREFUSED'))) {
      console.error('\n' + '='.repeat(70));
      console.error('❌ [PostgreSQL Connection Notice]');
      console.error('Could not connect to PostgreSQL database.');
      console.error('👉 If connecting to Render: Copy your External Database URL from Render');
      console.error('   Dashboard (quontriz-invoza-db) and set DATABASE_URL=<URL> in server/.env');
      console.error('👉 If running locally: Ensure PostgreSQL service is started on port 5432');
      console.error('='.repeat(70) + '\n');
    }
    throw err;
  }

  // 2. Seed Default Accounts
  const devHash = bcrypt.hashSync('owner123', 10);

  // Seed developer@supermarket.com
  const devUser = await postgresClient.get(
    "SELECT id FROM users WHERE LOWER(email) IN ('developer@supermarket.com', 'developer@gmail.com')"
  );
  if (!devUser) {
    await postgresClient.run(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
      ['Developer', 'developer@supermarket.com', devHash, 'owner']
    );
    console.log('[PostgreSQL] ✅ Seeded developer@supermarket.com (owner)');
  } else {
    await postgresClient.run(
      "UPDATE users SET email = 'developer@supermarket.com', password_hash = $1, role = 'owner' WHERE id = $2",
      [devHash, devUser.id]
    );
  }

  // One-time database migration: Permanently remove legacy auto-seeded non-developer accounts
  await postgresClient.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const legacySeedCleanup = await postgresClient.get(
    "SELECT id FROM schema_migrations WHERE id = 'cleanup_legacy_autoseeded_users_v1'"
  );
  if (!legacySeedCleanup) {
    try {
      // Disassociate foreign keys
      await postgresClient.run(
        "UPDATE invoices SET created_by_user_id = NULL WHERE created_by_user_id IN (SELECT id FROM users WHERE LOWER(email) = 'akash.kornipati1969@gmail.com')"
      );
      await postgresClient.run(
        "UPDATE invoices SET approved_by_user_id = NULL WHERE approved_by_user_id IN (SELECT id FROM users WHERE LOWER(email) = 'akash.kornipati1969@gmail.com')"
      );
      await postgresClient.run(
        "UPDATE store_requirements SET requested_by_user_id = NULL WHERE requested_by_user_id IN (SELECT id FROM users WHERE LOWER(email) = 'akash.kornipati1969@gmail.com')"
      );
      await postgresClient.run(
        "UPDATE store_requirements SET fulfilled_by_user_id = NULL WHERE fulfilled_by_user_id IN (SELECT id FROM users WHERE LOWER(email) = 'akash.kornipati1969@gmail.com')"
      );
      await postgresClient.run(
        "DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE LOWER(email) = 'akash.kornipati1969@gmail.com')"
      );
      await postgresClient.run(
        "DELETE FROM otps WHERE LOWER(email) = 'akash.kornipati1969@gmail.com'"
      );
      await postgresClient.run(
        "DELETE FROM users WHERE LOWER(email) = 'akash.kornipati1969@gmail.com'"
      );
      await postgresClient.run(
        "INSERT INTO schema_migrations (id) VALUES ('cleanup_legacy_autoseeded_users_v1')"
      );
      console.log('[PostgreSQL] 🧹 Purged legacy auto-seeded akash.kornipati1969@gmail.com from database.');
    } catch (cleanErr) {
      console.warn('[PostgreSQL Cleanup Warning]', cleanErr.message);
    }
  }

  // Purge all data and keep only primary Developer account
  const purgeAllMigration = await postgresClient.get(
    "SELECT id FROM schema_migrations WHERE id = 'purge_all_keep_developer_v1'"
  );
  if (!purgeAllMigration) {
    try {
      await postgresClient.run('DELETE FROM invoice_items');
      await postgresClient.run('DELETE FROM invoices');
      await postgresClient.run('DELETE FROM store_requirements');
      await postgresClient.run('DELETE FROM notifications');
      await postgresClient.run('DELETE FROM otps');
      try { await postgresClient.run('DELETE FROM buyers'); } catch (e) {}
      try { await postgresClient.run('DELETE FROM ai_training_samples'); } catch (e) {}
      try { await postgresClient.run('DELETE FROM ai_learned_vendor_templates'); } catch (e) {}
      try { await postgresClient.run('DELETE FROM ai_training_runs'); } catch (e) {}
      try { await postgresClient.run('DELETE FROM ai_extraction_logs'); } catch (e) {}
      await postgresClient.run("DELETE FROM users WHERE LOWER(email) NOT IN ('developer@supermarket.com', 'developer@gmail.com')");
      await postgresClient.run("INSERT INTO schema_migrations (id) VALUES ('purge_all_keep_developer_v1')");
      console.log('[PostgreSQL] 🧹 Cleaned all data and kept only primary Developer account.');
    } catch (cleanErr) {
      console.warn('[PostgreSQL Clean Notice]', cleanErr.message);
    }
  }

  // 3. Seed Default Categories if empty
  const catCountRow = await postgresClient.get('SELECT COUNT(*) as count FROM categories');
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
      await postgresClient.run('INSERT INTO categories (category_name) VALUES ($1) ON CONFLICT DO NOTHING', [cat]);
    }
    console.log(`[PostgreSQL] ✅ Seeded ${defaultCategories.length} default categories.`);
  }

  // 4. Seed Default Vendor Types if empty
  const typeCountRow = await postgresClient.get('SELECT COUNT(*) as count FROM vendor_types');
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
      await postgresClient.run('INSERT INTO vendor_types (type_name) VALUES ($1) ON CONFLICT DO NOTHING', [vt]);
    }
    console.log(`[PostgreSQL] ✅ Seeded ${defaultTypes.length} default vendor types.`);
  }

  // 5. Seed Initial Demo Vendors if empty
  const vendorCountRow = await postgresClient.get('SELECT COUNT(*) as count FROM vendors');
  if (vendorCountRow && Number(vendorCountRow.count) === 0) {
    const sampleVendors = [
      ['Metro Wholesale India Pvt Ltd', 'Grocery Supplier', '+91 98765 43210', 'billing@metrowholesale.in', 'Warehouse Hub 4, Yeshwanthpur, Bengaluru - 560022', '29AABCM1234F1Z5'],
      ['Amul Dairy Products Distributors', 'Dairy Supplier', '+91 98450 11223', 'orders@amuldairyblore.com', 'Plot 12, Dairy Circle, Bannerghatta Road, Bengaluru - 560029', '29AABCA5678K1Z2'],
      ['Britannia Industries Depo', 'Bakery Supplier', '+91 98110 99887', 'depot@britannia-south.in', 'Indl Area, Peenya 2nd Stage, Bengaluru - 560058', '29AABCB9012M1Z8'],
      ['Hindustan Unilever Distribution', 'Household', '+91 98220 33445', 'fmcg@hul-distributor.com', 'Whitefield Main Road, Bengaluru - 560066', '29AABCH3456P1Z3'],
      ['ITC Foods Division', 'Snacks', '+91 98330 77665', 'orders@itcfoods.in', 'ITC Infotech Park, Pulakeshi Nagar, Bengaluru - 560005', '29AABCI7890R1Z9']
    ];
    for (const v of sampleVendors) {
      await postgresClient.run(
        'INSERT INTO vendors (vendor_name, vendor_type, contact, email, address, gstin) VALUES ($1, $2, $3, $4, $5, $6)',
        v
      );
    }
    console.log(`[PostgreSQL] ✅ Seeded sample vendors.`);
  }

  console.log('[PostgreSQL] 🎉 Database setup complete.');
}

module.exports = initPostgres;
