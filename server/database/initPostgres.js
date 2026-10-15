const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const postgresClient = require('./postgresClient');

async function initPostgres() {
  console.log('[PostgreSQL] 🚀 Initializing PostgreSQL database schema and seed data...');
  const pool = postgresClient.getPool();

  // 1. Read and execute schema_pg.sql
  const schemaPath = path.join(__dirname, 'schema_pg.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  try {
    await pool.query(schemaSql);
    console.log('[PostgreSQL] ✅ Schema DDL executed successfully.');
  } catch (err) {
    console.error('[PostgreSQL Schema Error]', err.message);
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

  // Seed akash.kornipati1969@gmail.com
  const akashUser = await postgresClient.get(
    "SELECT id FROM users WHERE LOWER(email) = 'akash.kornipati1969@gmail.com'"
  );
  if (!akashUser) {
    await postgresClient.run(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
      ['Akash Kornipati', 'akash.kornipati1969@gmail.com', devHash, 'owner']
    );
    console.log('[PostgreSQL] ✅ Seeded akash.kornipati1969@gmail.com (owner)');
  } else {
    await postgresClient.run(
      "UPDATE users SET password_hash = $1, role = 'owner' WHERE id = $2",
      [devHash, akashUser.id]
    );
  }

  // Seed staff member akash.kornipati9@gmail.com
  const staffHash = bcrypt.hashSync('staff123', 10);
  const staffUser = await postgresClient.get(
    "SELECT id FROM users WHERE LOWER(email) = 'akash.kornipati9@gmail.com'"
  );
  if (!staffUser) {
    await postgresClient.run(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
      ['AB', 'akash.kornipati9@gmail.com', staffHash, 'staff']
    );
    console.log('[PostgreSQL] ✅ Seeded akash.kornipati9@gmail.com (staff)');
  } else {
    await postgresClient.run(
      "UPDATE users SET password_hash = $1, role = 'staff' WHERE id = $2",
      [staffHash, staffUser.id]
    );
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
