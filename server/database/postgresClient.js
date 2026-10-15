const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

let pool = null;
let isLivePostgres = null;
let fallbackDb = null;

function convertPlaceholders(sql) {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

function normalizeSql(sql) {
  let normalized = sql;

  // Adapt INSERT OR IGNORE / INSERT IGNORE to ON CONFLICT DO NOTHING
  if (/INSERT\s+(OR\s+)?IGNORE\s+INTO/i.test(normalized)) {
    normalized = normalized.replace(/INSERT\s+(OR\s+)?IGNORE\s+INTO/i, 'INSERT INTO');
    if (!/ON\s+CONFLICT/i.test(normalized)) {
      normalized = normalized.trim().replace(/;?$/, ' ON CONFLICT DO NOTHING;');
    }
  }

  // SQLite / MySQL date functions
  normalized = normalized
    .replace(/datetime\('now',\s*'-(\d+)\s+days?'\)/gi, "NOW() - INTERVAL '$1 days'")
    .replace(/datetime\('now'\)/gi, 'NOW()')
    .replace(/date\('now'\)/gi, 'CURRENT_DATE')
    .replace(/CURDATE\(\)/gi, 'CURRENT_DATE')
    .replace(/COALESCE\(invoice_date,\s*created_at\)/gi, "COALESCE(invoice_date, created_at::text)");

  return normalized;
}

function getFallbackDb() {
  if (fallbackDb) return fallbackDb;
  const dbPath = path.join(__dirname, 'invoices.db');
  const { DatabaseSync } = require('node:sqlite');
  fallbackDb = new DatabaseSync(dbPath);
  fallbackDb.exec('PRAGMA foreign_keys = ON;');
  fallbackDb.exec('PRAGMA journal_mode = WAL;');
  return fallbackDb;
}

function init() {
  if (pool) return pool;

  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.PG_URL;

  console.log('[PostgreSQL] 🌐 Connecting to PostgreSQL pool...');

  const isLocal = connectionString && (connectionString.includes('localhost') || connectionString.includes('127.0.0.1'));

  const poolConfig = connectionString
    ? {
        connectionString,
        ssl: isLocal ? false : { rejectUnauthorized: false },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 3000,
      }
    : {
        host: process.env.PGHOST || 'localhost',
        port: parseInt(process.env.PGPORT || '5432', 10),
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || 'postgres',
        database: process.env.PGDATABASE || 'quontriz_invoza',
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 3000,
      };

  pool = new Pool(poolConfig);

  pool.on('error', (err) => {
    // Only log if not already detected offline
    if (isLivePostgres !== false) {
      console.warn('[PostgreSQL Pool Warning]', err.message);
    }
  });

  return pool;
}

async function checkConnection() {
  if (isLivePostgres !== null) return isLivePostgres;
  const p = init();
  try {
    const res = await p.query('SELECT 1 as connected');
    isLivePostgres = Boolean(res && res.rows && res.rows[0]);
    console.log('[PostgreSQL] ✅ Connected to live PostgreSQL server.');
    return true;
  } catch (err) {
    isLivePostgres = false;
    console.warn('\n======================================================================');
    console.warn('[PostgreSQL] ℹ️ Live PostgreSQL daemon is not active on localhost:5432.');
    console.warn('[PostgreSQL] 🚀 Enabled embedded local storage engine for offline localhost testing.');
    console.warn('[PostgreSQL] 💡 To connect to production Render PostgreSQL from localhost:');
    console.warn('   Add your Render External Database URL to server/.env:');
    console.warn('   DATABASE_URL=postgres://quontriz_user:PASSWORD@dpg-xxx-a.oregon-postgres.render.com/quontriz_invoza');
    console.warn('======================================================================\n');
    return false;
  }
}

function convertPgDdlToSqlite(sql) {
  return sql
    .replace(/SERIAL PRIMARY KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
    .replace(/TIMESTAMPTZ/gi, 'DATETIME')
    .replace(/NUMERIC\(\d+,\s*\d+\)/gi, 'NUMERIC')
    .replace(/VARCHAR\(\d+\)/gi, 'TEXT')
    .replace(/ON CONFLICT DO NOTHING/gi, '')
    .replace(/ON CONFLICT \([^)]+\) DO NOTHING/gi, '');
}

const postgresClient = {
  init,
  checkConnection,

  isLive() {
    return isLivePostgres === true;
  },

  getPool() {
    if (!pool) return init();
    return pool;
  },

  async query(sql, params = []) {
    const live = await checkConnection();
    if (live) {
      const p = init();
      const converted = convertPlaceholders(normalizeSql(sql));
      const result = await p.query(converted, params);
      return result.rows || [];
    }

    // Local embedded engine
    const fDb = getFallbackDb();
    let cleanSql = sql.replace(/\$(\d+)/g, '?');
    const stmt = fDb.prepare(cleanSql);
    return stmt.all(...params);
  },

  async get(sql, params = []) {
    const live = await checkConnection();
    if (live) {
      const p = init();
      const converted = convertPlaceholders(normalizeSql(sql));
      const result = await p.query(converted, params);
      return result.rows && result.rows.length > 0 ? result.rows[0] : null;
    }

    const fDb = getFallbackDb();
    let cleanSql = sql.replace(/\$(\d+)/g, '?');
    const stmt = fDb.prepare(cleanSql);
    return stmt.get(...params) || null;
  },

  async run(sql, params = []) {
    const live = await checkConnection();
    if (live) {
      const p = init();
      let normalized = normalizeSql(sql);

      // If INSERT statement without RETURNING, append RETURNING id to capture primary key
      const isInsert = /^\s*INSERT\s+INTO/i.test(normalized);
      const hasReturning = /RETURNING/i.test(normalized);
      if (isInsert && !hasReturning && !/ON\s+CONFLICT\s+DO\s+NOTHING/i.test(normalized)) {
        normalized = normalized.trim().replace(/;?$/, ' RETURNING id;');
      }

      const converted = convertPlaceholders(normalized);
      const result = await p.query(converted, params);

      const insertedId = result.rows && result.rows[0] && result.rows[0].id !== undefined
        ? result.rows[0].id
        : null;

      return {
        lastInsertRowid: insertedId,
        insertId: insertedId,
        affectedRows: result.rowCount || 0,
        rowCount: result.rowCount || 0,
        rows: result.rows || []
      };
    }

    const fDb = getFallbackDb();
    let cleanSql = sql.replace(/RETURNING id/gi, '').replace(/\$(\d+)/g, '?');
    const stmt = fDb.prepare(cleanSql);
    const result = stmt.run(...params);
    return {
      lastInsertRowid: result.lastInsertRowid || 0,
      insertId: result.lastInsertRowid || 0,
      affectedRows: result.changes || 0,
      rowCount: result.changes || 0
    };
  },

  async exec(sql) {
    const live = await checkConnection();
    if (live) {
      const p = init();
      return p.query(sql);
    }

    const fDb = getFallbackDb();
    const adapted = convertPgDdlToSqlite(sql);
    return fDb.exec(adapted);
  },

  async transaction(fn) {
    const live = await checkConnection();
    if (live) {
      const p = init();
      const client = await p.connect();
      try {
        await client.query('BEGIN');
        const txHelper = {
          query: (sql, params = []) => client.query(convertPlaceholders(normalizeSql(sql)), params).then(r => r.rows),
          get: (sql, params = []) => client.query(convertPlaceholders(normalizeSql(sql)), params).then(r => r.rows[0] || null),
          run: async (sql, params = []) => {
            let s = normalizeSql(sql);
            if (/^\s*INSERT\s+INTO/i.test(s) && !/RETURNING/i.test(s)) {
              s = s.trim().replace(/;?$/, ' RETURNING id;');
            }
            const res = await client.query(convertPlaceholders(s), params);
            const id = res.rows && res.rows[0]?.id !== undefined ? res.rows[0].id : null;
            return { lastInsertRowid: id, insertId: id, affectedRows: res.rowCount };
          }
        };
        const result = await fn(txHelper);
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    const fDb = getFallbackDb();
    fDb.exec('BEGIN TRANSACTION;');
    try {
      const txHelper = {
        query: (sql, params = []) => fDb.prepare(sql.replace(/\$(\d+)/g, '?')).all(...params),
        get: (sql, params = []) => fDb.prepare(sql.replace(/\$(\d+)/g, '?')).get(...params) || null,
        run: async (sql, params = []) => {
          const r = fDb.prepare(sql.replace(/RETURNING id/gi, '').replace(/\$(\d+)/g, '?')).run(...params);
          return { lastInsertRowid: r.lastInsertRowid || 0, insertId: r.lastInsertRowid || 0, affectedRows: r.changes || 0 };
        }
      };
      const result = await fn(txHelper);
      fDb.exec('COMMIT;');
      return result;
    } catch (err) {
      fDb.exec('ROLLBACK;');
      throw err;
    }
  }
};

module.exports = postgresClient;
