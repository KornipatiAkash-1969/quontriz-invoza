const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const postgresClient = require('./postgresClient');
const initPostgres = require('./initPostgres');

async function restartEntireDatabase() {
  console.log('=====================================================');
  console.log('🔄 [Database Restart] Starting FULL database restart...');
  console.log('=====================================================');

  const WASM_DB_FILE = path.join(__dirname, 'quontriz_dev.db');

  // 1. Check live Postgres connection
  const isLivePostgres = await postgresClient.checkConnection();
  console.log(`[Database Restart] Mode: ${isLivePostgres ? 'Live PostgreSQL Server' : 'Local SQLite/WASM'}`);

  if (isLivePostgres) {
    console.log('[Database Restart] Dropping all tables on live PostgreSQL server...');
    const dropTablesSql = `
      DROP TABLE IF EXISTS invoice_items CASCADE;
      DROP TABLE IF EXISTS invoices CASCADE;
      DROP TABLE IF EXISTS buyers CASCADE;
      DROP TABLE IF EXISTS store_requirements CASCADE;
      DROP TABLE IF EXISTS notifications CASCADE;
      DROP TABLE IF EXISTS ai_extraction_logs CASCADE;
      DROP TABLE IF EXISTS ai_training_runs CASCADE;
      DROP TABLE IF EXISTS ai_training_samples CASCADE;
      DROP TABLE IF EXISTS ai_learned_vendor_templates CASCADE;
      DROP TABLE IF EXISTS categories CASCADE;
      DROP TABLE IF EXISTS vendors CASCADE;
      DROP TABLE IF EXISTS vendor_types CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TABLE IF EXISTS otps CASCADE;
      DROP TABLE IF EXISTS schema_migrations CASCADE;
    `;
    try {
      await postgresClient.exec(dropTablesSql);
      console.log('[Database Restart] ✅ All tables dropped successfully on PostgreSQL.');
    } catch (err) {
      console.warn('[Database Restart Warning while dropping tables]:', err.message);
    }
  } else {
    // If local wasm/sqlite, reset the database file
    console.log('[Database Restart] Resetting local WASM database file...');
    try {
      if (fs.existsSync(WASM_DB_FILE)) {
        fs.unlinkSync(WASM_DB_FILE);
        console.log('[Database Restart] ✅ Deleted old quontriz_dev.db.');
      }
    } catch (err) {
      console.warn('[Database Restart] Notice on file remove:', err.message);
    }
  }

  // 2. Reinitialize schema and seeds
  console.log('[Database Restart] Executing schema DDL and seeding default data...');
  await initPostgres();

  // 3. Clean uploaded test files (keep samples)
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (fs.existsSync(uploadsDir)) {
    const files = fs.readdirSync(uploadsDir);
    let removedFiles = 0;
    for (const f of files) {
      const fullPath = path.join(uploadsDir, f);
      try {
        if (
          fs.statSync(fullPath).isFile() &&
          (f.startsWith('invoice_') || f.endsWith('.pdf') || f.endsWith('.png') || f.endsWith('.jpg'))
        ) {
          fs.unlinkSync(fullPath);
          removedFiles++;
        }
      } catch (err) {}
    }
    console.log(`[Database Restart] 🧹 Cleaned ${removedFiles} temporary invoice file(s) from server/uploads.`);
  }

  // 4. Verification of database state
  console.log('\n=====================================================');
  console.log('📊 [Database Verification] Verifying tables and users...');
  console.log('=====================================================');

  const tables = [
    'users',
    'categories',
    'vendor_types',
    'vendors',
    'invoices',
    'invoice_items',
    'store_requirements',
    'notifications'
  ];

  for (const t of tables) {
    try {
      const res = await postgresClient.get(`SELECT COUNT(*) as count FROM ${t}`);
      console.log(`  📁 Table [${t}]: ${res ? res.count : 0} rows`);
    } catch (err) {
      console.log(`  📁 Table [${t}]: error checking (${err.message})`);
    }
  }

  const users = await postgresClient.query('SELECT id, name, email, role, created_at FROM users ORDER BY id ASC');
  console.log('\n👥 Active Authenticated Accounts:');
  users.forEach((u) => {
    console.log(`  - [${u.role.toUpperCase()}] ${u.name} <${u.email}> (ID: ${u.id})`);
  });

  console.log('\n=====================================================');
  console.log('🎉 [Database Restart] Database restarted successfully!');
  console.log('=====================================================\n');
}

if (require.main === module) {
  restartEntireDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ [Database Restart Fatal Error]:', err);
      process.exit(1);
    });
}

module.exports = restartEntireDatabase;
