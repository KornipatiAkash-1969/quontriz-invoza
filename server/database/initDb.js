const initPostgres = require('./initPostgres');

/**
 * Initialize PostgreSQL database schema, migrations, and seed data.
 */
async function initDb() {
  console.log('[Database] 🚀 Initializing PostgreSQL database schema & seeds...');
  return await initPostgres();
}

module.exports = initDb;
