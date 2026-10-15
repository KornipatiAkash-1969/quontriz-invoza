const db = require('./db');
const initPostgres = require('./initPostgres');
const initMysql = require('./initMysql');

async function initDb() {
  if (db.isPostgres()) {
    console.log('[initDb] Detected PostgreSQL environment. Initializing PostgreSQL schema & seeds...');
    return await initPostgres();
  }

  if (db.isMysql()) {
    console.log('[initDb] Detected MySQL environment. Initializing MySQL schema & seeds...');
    return await initMysql();
  }

  console.log('Initializing SQLite database schema...');

  // Create tables according to specifications
  await db.exec(`
    -- Users table for Role-Based Access Control
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('owner', 'staff', 'employee')),
      last_login_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Vendor Types table
    CREATE TABLE IF NOT EXISTS vendor_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type_name TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Vendors table
    CREATE TABLE IF NOT EXISTS vendors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendor_name TEXT NOT NULL,
      vendor_type TEXT,
      contact TEXT,
      email TEXT,
      address TEXT,
      gstin TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Categories table
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_name TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Buyers table
    CREATE TABLE IF NOT EXISTS buyers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL,
      gstin TEXT,
      billing_address TEXT,
      shipping_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Invoices table
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendor_id INTEGER,
      buyer_id INTEGER,
      invoice_number TEXT NOT NULL,
      invoice_date TEXT,
      due_date TEXT,
      po_number TEXT,
      place_of_supply TEXT,
      currency TEXT DEFAULT 'INR',
      payment_terms TEXT,
      category TEXT,
      subtotal REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      taxable_amount REAL DEFAULT 0,
      tax REAL DEFAULT 0,
      cgst REAL DEFAULT 0,
      sgst REAL DEFAULT 0,
      igst REAL DEFAULT 0,
      freight_charges REAL DEFAULT 0,
      other_charges REAL DEFAULT 0,
      round_off REAL DEFAULT 0,
      total_gst REAL DEFAULT 0,
      total REAL NOT NULL,
      advance_paid REAL DEFAULT 0,
      paid REAL DEFAULT 0,
      amount_paid REAL DEFAULT 0,
      outstanding_balance REAL DEFAULT 0,
      total_amount_in_words TEXT,
      pdf_path TEXT,
      ocr_text TEXT,
      status TEXT DEFAULT 'Pending Approval',
      created_by_user_id INTEGER,
      approved_by_user_id INTEGER,
      payment_method TEXT,
      payment_reference TEXT,
      paid_at DATETIME,
      payment_notes TEXT,
      viewed_by_owner INTEGER DEFAULT 0,
      viewed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL,
      FOREIGN KEY (buyer_id) REFERENCES buyers(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (approved_by_user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Invoice items table with dynamic units & pricing basis
    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      line_number INTEGER,
      item_name TEXT NOT NULL,
      item_description TEXT,
      sku TEXT,
      hsn_code TEXT,
      category_id INTEGER,
      quantity NUMERIC DEFAULT 1,
      unit TEXT DEFAULT 'pcs',
      unit_original TEXT,
      unit_normalized TEXT,
      unit_price NUMERIC DEFAULT 0,
      price_unit_quantity NUMERIC DEFAULT 1,
      price_unit_measure TEXT,
      discount REAL DEFAULT 0,
      discount_amount NUMERIC DEFAULT 0,
      taxable_value NUMERIC DEFAULT 0,
      gst_rate NUMERIC DEFAULT 0,
      cgst_amount NUMERIC DEFAULT 0,
      sgst_amount NUMERIC DEFAULT 0,
      igst_amount NUMERIC DEFAULT 0,
      tax REAL DEFAULT 0,
      total_price REAL DEFAULT 0,
      line_total NUMERIC DEFAULT 0,
      calculation_valid INTEGER DEFAULT 1,
      unit_flagged INTEGER DEFAULT 0,
      classification_confidence REAL DEFAULT 1.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    -- AI Extraction Logs table
    CREATE TABLE IF NOT EXISTS ai_extraction_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER,
      engine TEXT,
      raw_text TEXT,
      ai_response TEXT,
      warnings TEXT,
      latency_ms INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- AI Ground Truth Training Samples
    CREATE TABLE IF NOT EXISTS ai_training_samples (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER,
      vendor_id INTEGER,
      vendor_name TEXT,
      document_type TEXT DEFAULT 'pdf',
      ocr_text TEXT,
      ai_prediction_json TEXT,
      ground_truth_json TEXT,
      user_corrections_json TEXT,
      sample_quality_score REAL DEFAULT 1.0,
      is_validated INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    );

    -- AI Learned Vendor Layout Templates & Few-Shot Memory
    CREATE TABLE IF NOT EXISTS ai_learned_vendor_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendor_name TEXT UNIQUE NOT NULL,
      vendor_id INTEGER,
      sample_count INTEGER DEFAULT 1,
      table_format TEXT,
      column_order_json TEXT,
      unit_vocabulary_json TEXT,
      few_shot_prompt_json TEXT,
      accuracy_score REAL DEFAULT 0.95,
      last_trained_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- AI Model Training Runs History & Benchmarks
    CREATE TABLE IF NOT EXISTS ai_training_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model_type TEXT DEFAULT 'hybrid_document_ai',
      training_samples_count INTEGER DEFAULT 0,
      accuracy_before REAL DEFAULT 0.0,
      accuracy_after REAL DEFAULT 0.0,
      learned_patterns_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'completed',
      logs TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Store Requirements table (Required items / Purchase requisitions)
    CREATE TABLE IF NOT EXISTS store_requirements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_name TEXT NOT NULL,
      specification TEXT,
      quantity REAL NOT NULL DEFAULT 1,
      unit TEXT NOT NULL DEFAULT 'bags',
      category_id INTEGER,
      category_name TEXT,
      priority TEXT DEFAULT 'Medium',
      estimated_price REAL DEFAULT 0,
      preferred_vendor_id INTEGER,
      preferred_vendor_name TEXT,
      notes TEXT,
      status TEXT DEFAULT 'Pending',
      requested_by_user_id INTEGER,
      requested_by_name TEXT,
      fulfilled_by_user_id INTEGER,
      fulfilled_by_name TEXT,
      fulfilled_at DATETIME,
      viewed_by_owner INTEGER DEFAULT 0,
      viewed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
      FOREIGN KEY (preferred_vendor_id) REFERENCES vendors(id) ON DELETE SET NULL,
      FOREIGN KEY (requested_by_user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Persistent Notifications table for Staff & Owner
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      target_role TEXT NOT NULL CHECK(target_role IN ('owner', 'staff', 'all')),
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link TEXT,
      related_id INTEGER,
      related_type TEXT,
      is_read INTEGER DEFAULT 0,
      read_at DATETIME,
      created_by_user_id INTEGER,
      created_by_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- OTPs table for secure login, self-registration, and member creation
    CREATE TABLE IF NOT EXISTS otps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      otp_code TEXT NOT NULL,
      purpose TEXT NOT NULL,
      metadata TEXT,
      attempts INTEGER DEFAULT 0,
      expires_at DATETIME NOT NULL,
      verified_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Indexes for performance and lookup
    CREATE INDEX IF NOT EXISTS idx_otps_email_purpose ON otps(email, purpose);
    CREATE INDEX IF NOT EXISTS idx_otps_created ON otps(created_at);
    CREATE INDEX IF NOT EXISTS idx_notifications_target ON notifications(target_role, is_read);
    CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);
    CREATE INDEX IF NOT EXISTS idx_invoices_vendor_id ON invoices(vendor_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
    CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_invoice_items_category_id ON invoice_items(category_id);
    CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(vendor_name);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_lower_email ON users(LOWER(TRIM(email)));
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_lower_name ON users(LOWER(TRIM(name)));
    CREATE INDEX IF NOT EXISTS idx_training_samples_vendor ON ai_training_samples(vendor_name);
    CREATE INDEX IF NOT EXISTS idx_vendor_templates_name ON ai_learned_vendor_templates(vendor_name);
    CREATE INDEX IF NOT EXISTS idx_requirements_status ON store_requirements(status);
    CREATE INDEX IF NOT EXISTS idx_requirements_priority ON store_requirements(priority);
    CREATE INDEX IF NOT EXISTS idx_requirements_created ON store_requirements(created_at);
  `);

  // Ensure migration of new columns if tables already existed
  try {
    const invoiceCols = (await db.query("PRAGMA table_info(invoices)")).map(c => c.name);
    const itemCols = (await db.query("PRAGMA table_info(invoice_items)")).map(c => c.name);
    
    // Invoices migrations
    if (!invoiceCols.includes('buyer_id')) await db.exec("ALTER TABLE invoices ADD COLUMN buyer_id INTEGER;");
    if (!invoiceCols.includes('place_of_supply')) await db.exec("ALTER TABLE invoices ADD COLUMN place_of_supply TEXT;");
    if (!invoiceCols.includes('currency')) await db.exec("ALTER TABLE invoices ADD COLUMN currency TEXT DEFAULT 'INR';");
    if (!invoiceCols.includes('payment_terms')) await db.exec("ALTER TABLE invoices ADD COLUMN payment_terms TEXT;");
    if (!invoiceCols.includes('taxable_amount')) await db.exec("ALTER TABLE invoices ADD COLUMN taxable_amount REAL DEFAULT 0;");
    if (!invoiceCols.includes('cgst')) await db.exec("ALTER TABLE invoices ADD COLUMN cgst REAL DEFAULT 0;");
    if (!invoiceCols.includes('sgst')) await db.exec("ALTER TABLE invoices ADD COLUMN sgst REAL DEFAULT 0;");
    if (!invoiceCols.includes('igst')) await db.exec("ALTER TABLE invoices ADD COLUMN igst REAL DEFAULT 0;");
    if (!invoiceCols.includes('other_charges')) await db.exec("ALTER TABLE invoices ADD COLUMN other_charges REAL DEFAULT 0;");
    if (!invoiceCols.includes('round_off')) await db.exec("ALTER TABLE invoices ADD COLUMN round_off REAL DEFAULT 0;");
    if (!invoiceCols.includes('total_gst')) await db.exec("ALTER TABLE invoices ADD COLUMN total_gst REAL DEFAULT 0;");
    if (!invoiceCols.includes('amount_paid')) await db.exec("ALTER TABLE invoices ADD COLUMN amount_paid REAL DEFAULT 0;");
    if (!invoiceCols.includes('outstanding_balance')) await db.exec("ALTER TABLE invoices ADD COLUMN outstanding_balance REAL DEFAULT 0;");
    if (!invoiceCols.includes('total_amount_in_words')) await db.exec("ALTER TABLE invoices ADD COLUMN total_amount_in_words TEXT;");
    if (!invoiceCols.includes('created_by_user_id')) await db.exec("ALTER TABLE invoices ADD COLUMN created_by_user_id INTEGER;");
    if (!invoiceCols.includes('approved_by_user_id')) await db.exec("ALTER TABLE invoices ADD COLUMN approved_by_user_id INTEGER;");
    if (!invoiceCols.includes('payment_method')) await db.exec("ALTER TABLE invoices ADD COLUMN payment_method TEXT;");
    if (!invoiceCols.includes('payment_reference')) await db.exec("ALTER TABLE invoices ADD COLUMN payment_reference TEXT;");
    if (!invoiceCols.includes('freight_charges')) await db.exec("ALTER TABLE invoices ADD COLUMN freight_charges REAL DEFAULT 0;");
    if (!invoiceCols.includes('advance_paid')) await db.exec("ALTER TABLE invoices ADD COLUMN advance_paid REAL DEFAULT 0;");
    if (!invoiceCols.includes('paid')) await db.exec("ALTER TABLE invoices ADD COLUMN paid REAL DEFAULT 0;");
    if (!invoiceCols.includes('category')) await db.exec("ALTER TABLE invoices ADD COLUMN category TEXT;");
    if (!invoiceCols.includes('paid_at')) await db.exec("ALTER TABLE invoices ADD COLUMN paid_at DATETIME;");
    if (!invoiceCols.includes('payment_notes')) await db.exec("ALTER TABLE invoices ADD COLUMN payment_notes TEXT;");
    if (!invoiceCols.includes('viewed_by_owner')) await db.exec("ALTER TABLE invoices ADD COLUMN viewed_by_owner INTEGER DEFAULT 0;");
    if (!invoiceCols.includes('viewed_at')) await db.exec("ALTER TABLE invoices ADD COLUMN viewed_at DATETIME;");
    if (!invoiceCols.includes('viewed_by_staff')) await db.exec("ALTER TABLE invoices ADD COLUMN viewed_by_staff INTEGER DEFAULT 1;");
    if (!invoiceCols.includes('staff_viewed_at')) await db.exec("ALTER TABLE invoices ADD COLUMN staff_viewed_at DATETIME;");

    // Store requirements migrations
    const reqCols = (await db.query("PRAGMA table_info(store_requirements)")).map(c => c.name);
    if (!reqCols.includes('viewed_by_owner')) await db.exec("ALTER TABLE store_requirements ADD COLUMN viewed_by_owner INTEGER DEFAULT 0;");
    if (!reqCols.includes('viewed_at')) await db.exec("ALTER TABLE store_requirements ADD COLUMN viewed_at DATETIME;");
    if (!reqCols.includes('viewed_by_staff')) await db.exec("ALTER TABLE store_requirements ADD COLUMN viewed_by_staff INTEGER DEFAULT 1;");
    if (!reqCols.includes('staff_viewed_at')) await db.exec("ALTER TABLE store_requirements ADD COLUMN staff_viewed_at DATETIME;");

    // Invoice items migrations
    if (!itemCols.includes('line_number')) await db.exec("ALTER TABLE invoice_items ADD COLUMN line_number INTEGER;");
    if (!itemCols.includes('item_description')) await db.exec("ALTER TABLE invoice_items ADD COLUMN item_description TEXT;");
    if (!itemCols.includes('hsn_code')) await db.exec("ALTER TABLE invoice_items ADD COLUMN hsn_code TEXT;");
    if (!itemCols.includes('unit_original')) await db.exec("ALTER TABLE invoice_items ADD COLUMN unit_original TEXT;");
    if (!itemCols.includes('unit_normalized')) await db.exec("ALTER TABLE invoice_items ADD COLUMN unit_normalized TEXT;");
    if (!itemCols.includes('price_unit_quantity')) await db.exec("ALTER TABLE invoice_items ADD COLUMN price_unit_quantity NUMERIC DEFAULT 1;");
    if (!itemCols.includes('price_unit_measure')) await db.exec("ALTER TABLE invoice_items ADD COLUMN price_unit_measure TEXT;");
    if (!itemCols.includes('discount_amount')) await db.exec("ALTER TABLE invoice_items ADD COLUMN discount_amount NUMERIC DEFAULT 0;");
    if (!itemCols.includes('taxable_value')) await db.exec("ALTER TABLE invoice_items ADD COLUMN taxable_value NUMERIC DEFAULT 0;");
    if (!itemCols.includes('gst_rate')) await db.exec("ALTER TABLE invoice_items ADD COLUMN gst_rate NUMERIC DEFAULT 0;");
    if (!itemCols.includes('cgst_amount')) await db.exec("ALTER TABLE invoice_items ADD COLUMN cgst_amount NUMERIC DEFAULT 0;");
    if (!itemCols.includes('sgst_amount')) await db.exec("ALTER TABLE invoice_items ADD COLUMN sgst_amount NUMERIC DEFAULT 0;");
    if (!itemCols.includes('igst_amount')) await db.exec("ALTER TABLE invoice_items ADD COLUMN igst_amount NUMERIC DEFAULT 0;");
    if (!itemCols.includes('line_total')) await db.exec("ALTER TABLE invoice_items ADD COLUMN line_total NUMERIC DEFAULT 0;");
    if (!itemCols.includes('calculation_valid')) await db.exec("ALTER TABLE invoice_items ADD COLUMN calculation_valid INTEGER DEFAULT 1;");
    if (!itemCols.includes('unit_flagged')) await db.exec("ALTER TABLE invoice_items ADD COLUMN unit_flagged INTEGER DEFAULT 0;");
  } catch (migErr) {
    console.warn('[initDb] Column migration note:', migErr.message);
  }

  // Ensure users table CHECK constraint allows 'staff'
  try {
    const userTableDef = await db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'");
    if (userTableDef && userTableDef.sql && !userTableDef.sql.includes("'staff'")) {
      console.log('[initDb] Migrating users table constraint to support staff role...');
      await db.exec(`
        PRAGMA foreign_keys = OFF;
        DROP TABLE IF EXISTS users_migrated;
        CREATE TABLE users_migrated (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('owner', 'staff', 'employee')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO users_migrated (id, name, email, password_hash, role, created_at)
        SELECT id, name, email, password_hash, CASE WHEN role = 'employee' THEN 'staff' ELSE role END, created_at FROM users;
        DROP TABLE users;
        ALTER TABLE users_migrated RENAME TO users;
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        PRAGMA foreign_keys = ON;
      `);
      console.log('[initDb] Users table migration completed.');
    }
  } catch (uMigErr) {
    console.error('[initDb] Users migration error:', uMigErr);
    throw uMigErr;
  }

  // Seed Developer Account (developer@supermarket.com with owner role)
  const bcrypt = require('bcryptjs');
  const devHash = bcrypt.hashSync('owner123', 10);
  const devUser = await db.get("SELECT id FROM users WHERE LOWER(email) IN ('developer@supermarket.com', 'developer@gmail.com')");
  if (!devUser) {
    await db.run(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES (?, ?, ?, ?)
    `, ['Developer', 'developer@supermarket.com', devHash, 'owner']);
    console.log('[initDb] Seeded account: developer@supermarket.com (owner)');
  } else {
    await db.run("UPDATE users SET email = 'developer@supermarket.com', password_hash = ?, role = 'owner' WHERE id = ?", [devHash, devUser.id]);
  }

  // One-time database migration: Permanently remove legacy auto-seeded non-developer accounts
  await db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  const legacySeedCleanup = await db.get("SELECT id FROM schema_migrations WHERE id = 'cleanup_legacy_autoseeded_users_v1'");
  if (!legacySeedCleanup) {
    try {
      await db.run("UPDATE invoices SET created_by_user_id = NULL WHERE created_by_user_id IN (SELECT id FROM users WHERE LOWER(email) = 'akash.kornipati1969@gmail.com')");
      await db.run("UPDATE invoices SET approved_by_user_id = NULL WHERE approved_by_user_id IN (SELECT id FROM users WHERE LOWER(email) = 'akash.kornipati1969@gmail.com')");
      await db.run("UPDATE store_requirements SET requested_by_user_id = NULL WHERE requested_by_user_id IN (SELECT id FROM users WHERE LOWER(email) = 'akash.kornipati1969@gmail.com')");
      await db.run("UPDATE store_requirements SET fulfilled_by_user_id = NULL WHERE fulfilled_by_user_id IN (SELECT id FROM users WHERE LOWER(email) = 'akash.kornipati1969@gmail.com')");
      await db.run("DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE LOWER(email) = 'akash.kornipati1969@gmail.com')");
      await db.run("DELETE FROM otps WHERE LOWER(email) = 'akash.kornipati1969@gmail.com'");
      await db.run("DELETE FROM users WHERE LOWER(email) = 'akash.kornipati1969@gmail.com'");
      await db.run("INSERT INTO schema_migrations (id) VALUES ('cleanup_legacy_autoseeded_users_v1')");
      console.log('[initDb] 🧹 Purged legacy auto-seeded akash.kornipati1969@gmail.com from database.');
    } catch (cleanErr) {
      console.warn('[initDb Cleanup Warning]', cleanErr.message);
    }
  }

  // Seed default Categories if empty
  const categoryCount = (await db.get('SELECT COUNT(*) as count FROM categories')).count;
  if (categoryCount === 0) {
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
      await db.run('INSERT OR IGNORE INTO categories (category_name) VALUES (?)', [cat]);
    }
    console.log(`Seeded ${defaultCategories.length} default categories.`);
  }

  // Seed default Vendor Types if empty
  const typeCount = (await db.get('SELECT COUNT(*) as count FROM vendor_types')).count;
  if (typeCount === 0) {
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
      await db.run('INSERT OR IGNORE INTO vendor_types (type_name) VALUES (?)', [vt]);
    }
    console.log(`Seeded ${defaultTypes.length} default vendor types.`);
  }

  // Seed initial sample Vendors and Invoices if vendors table is empty
  const vendorCount = (await db.get('SELECT COUNT(*) as count FROM vendors')).count;
  if (vendorCount === 0) {
    await seedInitialDemoData();
  }

  // Seed sample Store Requirements if empty
  try {
    const reqCount = (await db.get('SELECT COUNT(*) as count FROM store_requirements')).count;
    if (reqCount === 0) {
      await db.run(`
        INSERT INTO store_requirements (item_name, specification, quantity, unit, category_name, priority, estimated_price, preferred_vendor_name, notes, status, requested_by_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, ['Rice', '25 KG', 10, 'bags', 'Grocery & Staples', 'High', 1450, 'Metro Supermarket Wholesalers', 'Supermarket aisle 2 low stock requirement', 'Pending', 'Priya Sharma (Staff)']);

      await db.run(`
        INSERT INTO store_requirements (item_name, specification, quantity, unit, category_name, priority, estimated_price, preferred_vendor_name, notes, status, requested_by_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, ['Sunflower Cooking Oil', '15 L Tin', 8, 'tins', 'Grocery & Staples', 'Urgent', 2100, 'Metro Supermarket Wholesalers', 'Fast moving item, urgently needed for restocking', 'Approved', 'Rajesh Kumar (Owner)']);

      await db.run(`
        INSERT INTO store_requirements (item_name, specification, quantity, unit, category_name, priority, estimated_price, preferred_vendor_name, notes, status, requested_by_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, ['Sugar', '50 KG', 5, 'bags', 'Grocery & Staples', 'Medium', 1950, 'Metro Supermarket Wholesalers', 'Wholesale packaging requirement', 'Pending', 'Priya Sharma (Staff)']);

      await db.run(`
        INSERT INTO store_requirements (item_name, specification, quantity, unit, category_name, priority, estimated_price, preferred_vendor_name, notes, status, requested_by_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, ['A4 Billing Paper', '75 GSM', 15, 'reams', 'Office Supplies', 'Low', 240, 'ABC Electronics Pvt Ltd', 'Point-of-Sale thermal roll and printer paper', 'Ordered', 'Priya Sharma (Staff)']);

      console.log('Seeded sample store requirements (including Rice - 25 KG - 10 bags).');
    }
  } catch (reqErr) {
    console.warn('[initDb] store_requirements seeding note:', reqErr.message);
  }

  console.log('Database initialized successfully.');
}

async function seedInitialDemoData() {
  console.log('Seeding demo vendors and invoices...');

  // Sample vendors
  const v1 = await db.run(`
    INSERT INTO vendors (vendor_name, vendor_type, contact, email, address, gstin, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    'ABC Electronics Pvt Ltd',
    'Electronics Supplier',
    '+91 98765 43210',
    'sales@abcelectronics.com',
    'Plot 42, Tech Park, Phase II, Bengaluru, Karnataka - 560066',
    '29ABCDE1234F1Z5',
    'Primary supplier for digital displays, cables, and hardware accessories'
  ]);

  const v2 = await db.run(`
    INSERT INTO vendors (vendor_name, vendor_type, contact, email, address, gstin, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    'Amul Dairy & Agro Products',
    'Dairy Supplier',
    '+91 98220 11223',
    'orders@amuldairy.co.in',
    'GIDC Industrial Estate, Anand, Gujarat - 388001',
    '24AABCA5678B1Z2',
    'Daily milk, butter, cheese, and yogurt supplier'
  ]);

  const v3 = await db.run(`
    INSERT INTO vendors (vendor_name, vendor_type, contact, email, address, gstin, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    'Britannia & FMCG Distributors',
    'Food Supplier',
    '+91 99000 88776',
    'support@fmcgdistributors.com',
    'Warehouse 14, Ring Road, Mumbai, Maharashtra - 400072',
    '27AAACB9012C1Z4',
    'Biscuits, bakery snacks, and packaged breakfast foods'
  ]);

  // Seed initial invoices for rich dashboard charts
  const catMap = {};
  const cats = await db.query('SELECT id, category_name FROM categories');
  cats.forEach(c => { catMap[c.category_name] = c.id; });

  // Invoice 1
  const inv1 = await db.run(`
    INSERT INTO invoices (vendor_id, invoice_number, invoice_date, due_date, po_number, subtotal, discount, tax, total, status, ocr_text)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    v1.lastInsertRowid,
    'INV-10234',
    '2026-09-15',
    '2026-10-15',
    'PO-9821',
    96000.00,
    0.00,
    17280.00,
    113280.00,
    'Approved',
    'TAX INVOICE\nABC Electronics Pvt Ltd\nInvoice No: INV-10234\nDate: 15-09-2026\nGSTIN: 29ABCDE1234F1Z5\nItems:\n1. Samsung 55 inch LED TV - Qty: 2 - Price: 45000\n2. HDMI High Speed Cable - Qty: 5 - Price: 1200\nSubtotal: 96000\nTax (18%): 17280\nGrand Total: 113280'
  ]);

  await db.run(`
    INSERT INTO invoice_items (invoice_id, item_name, sku, category_id, quantity, unit, unit_price, discount, tax, total_price, classification_confidence)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    inv1.lastInsertRowid,
    'Samsung 55 inch LED TV',
    'ELEC-SAM-55',
    catMap['Electronics'] || null,
    2,
    'pcs',
    45000.00,
    0,
    16200.00,
    106200.00,
    0.98
  ]);

  await db.run(`
    INSERT INTO invoice_items (invoice_id, item_name, sku, category_id, quantity, unit, unit_price, discount, tax, total_price, classification_confidence)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    inv1.lastInsertRowid,
    'HDMI High Speed Cable 2m',
    'CAB-HDMI-02',
    catMap['Electronics'] || null,
    5,
    'pcs',
    1200.00,
    0,
    1080.00,
    7080.00,
    0.95
  ]);

  // Invoice 2
  const inv2 = await db.run(`
    INSERT INTO invoices (vendor_id, invoice_number, invoice_date, due_date, po_number, subtotal, discount, tax, total, status, ocr_text)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    v2.lastInsertRowid,
    'INV-20455',
    '2026-09-28',
    '2026-10-10',
    'PO-9870',
    24500.00,
    500.00,
    1200.00,
    25200.00,
    'Approved',
    'INVOICE\nAmul Dairy & Agro Products\nInvoice: INV-20455\nDate: 28-09-2026\nAmul Taaza Milk 500ml - 300 packets\nAmul Salted Butter 500g - 50 units'
  ]);

  await db.run(`
    INSERT INTO invoice_items (invoice_id, item_name, sku, category_id, quantity, unit, unit_price, discount, tax, total_price, classification_confidence)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    inv2.lastInsertRowid,
    'Amul Taaza Fresh Toned Milk 500ml',
    'DAIRY-AML-500',
    catMap['Dairy'] || null,
    300,
    'packets',
    27.00,
    0,
    405.00,
    8505.00,
    0.99
  ]);

  await db.run(`
    INSERT INTO invoice_items (invoice_id, item_name, sku, category_id, quantity, unit, unit_price, discount, tax, total_price, classification_confidence)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    inv2.lastInsertRowid,
    'Amul Salted Butter 500g',
    'DAIRY-AML-BUTTER',
    catMap['Dairy'] || null,
    60,
    'packs',
    275.00,
    500.00,
    795.00,
    16695.00,
    0.97
  ]);

  // Invoice 3
  const inv3 = await db.run(`
    INSERT INTO invoices (vendor_id, invoice_number, invoice_date, due_date, po_number, subtotal, discount, tax, total, status, ocr_text)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    v3.lastInsertRowid,
    'INV-30112',
    '2026-10-02',
    '2026-11-02',
    'PO-9915',
    38400.00,
    1200.00,
    1860.00,
    39060.00,
    'Approved',
    'TAX INVOICE\nBritannia & FMCG Distributors\nInvoice: INV-30112\nGood Day Cashew Cookies - 200 boxes\nMarie Gold Biscuits - 300 boxes\nLays Classic Chips - 150 packs'
  ]);

  await db.run(`
    INSERT INTO invoice_items (invoice_id, item_name, sku, category_id, quantity, unit, unit_price, discount, tax, total_price, classification_confidence)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    inv3.lastInsertRowid,
    'Britannia Good Day Cashew Cookies 200g',
    'SNK-BRIT-GD200',
    catMap['Snacks'] || null,
    200,
    'boxes',
    45.00,
    400.00,
    430.00,
    9030.00,
    0.96
  ]);

  await db.run(`
    INSERT INTO invoice_items (invoice_id, item_name, sku, category_id, quantity, unit, unit_price, discount, tax, total_price, classification_confidence)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    inv3.lastInsertRowid,
    'Lays Classic Salted Potato Chips 50g',
    'SNK-LAYS-50',
    catMap['Snacks'] || null,
    150,
    'packs',
    20.00,
    200.00,
    140.00,
    2940.00,
    0.97
  ]);

  console.log('Sample demo data seeded.');
}

module.exports = initDb;
