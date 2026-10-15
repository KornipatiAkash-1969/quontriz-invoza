const db = require('./database/db');
const initDb = require('./database/initDb');

console.log('Resetting database to initial state...');

const tables = [
  'ai_extraction_logs',
  'ai_training_samples',
  'ai_learned_vendor_templates',
  'ai_training_runs',
  'store_requirements',
  'invoice_items',
  'invoices',
  'buyers',
  'vendors',
  'vendor_types',
  'categories',
  'users'
];

async function reset() {
  const isMysql = db.isMysql;
  if (isMysql) {
    await db.exec('SET FOREIGN_KEY_CHECKS = 0;');
  } else {
    await db.exec('PRAGMA foreign_keys = OFF;');
  }

  for (const t of tables) {
    try {
      await db.exec(`DROP TABLE IF EXISTS ${t};`);
    } catch (e) {
      console.error(`Error dropping table ${t}:`, e.message);
    }
  }

  if (isMysql) {
    await db.exec('SET FOREIGN_KEY_CHECKS = 1;');
  } else {
    await db.exec('PRAGMA foreign_keys = ON;');
  }

  console.log('All tables dropped. Re-initializing database schema & seeding demo data...');
  await initDb();
  console.log('Database reset complete!');
}

reset().catch(err => {
  console.error('Reset failed:', err);
  process.exit(1);
});

