const path = require('path');
const fs = require('fs');

// Detect if PostgreSQL is configured (Render native, Supabase, Neon, or custom env vars)
const isPostgresConfigured = Boolean(
  (process.env.DATABASE_URL && (process.env.DATABASE_URL.startsWith('postgres://') || process.env.DATABASE_URL.startsWith('postgresql://'))) ||
  process.env.POSTGRES_URL ||
  process.env.PG_URL ||
  process.env.PGHOST ||
  process.env.DB_TYPE === 'postgres' ||
  process.env.DB_TYPE === 'postgresql'
);

// Detect if MySQL is configured (Railway, cloud MySQL, or custom env vars)
const isMysqlConfigured = !isPostgresConfigured && Boolean(
  process.env.MYSQL_URL ||
  (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('mysql')) ||
  process.env.MYSQLHOST ||
  process.env.DB_HOST ||
  process.env.DB_TYPE === 'mysql'
);

let sqliteDb = null;
let mysqlClient = null;
let postgresClient = null;

if (isPostgresConfigured) {
  postgresClient = require('./postgresClient');
  postgresClient.init();
} else if (isMysqlConfigured) {
  mysqlClient = require('./mysqlClient');
  mysqlClient.init();
} else {
  const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'invoices.db');
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  try {
    const { DatabaseSync } = require('node:sqlite');
    sqliteDb = new DatabaseSync(DB_PATH);
    console.log('[DB] ✅ Connected to SQLite via native node:sqlite at:', DB_PATH);
  } catch (err) {
    try {
      const Database = require('better-sqlite3');
      sqliteDb = new Database(DB_PATH);
      console.log('[DB] ✅ Connected to SQLite via better-sqlite3 at:', DB_PATH);
    } catch (bErr) {
      console.error('[DB Fatal] Neither node:sqlite nor better-sqlite3 loaded:', err.message);
      throw bErr;
    }
  }

  sqliteDb.exec('PRAGMA foreign_keys = ON;');
  sqliteDb.exec('PRAGMA journal_mode = WAL;');
}

const dbHelper = {
  isPostgres() {
    return isPostgresConfigured;
  },

  isMysql() {
    return isMysqlConfigured;
  },

  getDriverType() {
    if (isPostgresConfigured) return 'postgres';
    if (isMysqlConfigured) return 'mysql';
    return 'sqlite';
  },

  getRawDb() {
    if (isPostgresConfigured) return postgresClient.getPool();
    if (isMysqlConfigured) return mysqlClient.getPool();
    return sqliteDb;
  },

  async query(sql, params = []) {
    if (isPostgresConfigured) {
      return await postgresClient.query(sql, params);
    }
    if (isMysqlConfigured) {
      return await mysqlClient.query(sql, params);
    }
    const stmt = sqliteDb.prepare(sql);
    return stmt.all(...params);
  },

  async get(sql, params = []) {
    if (isPostgresConfigured) {
      return await postgresClient.get(sql, params);
    }
    if (isMysqlConfigured) {
      return await mysqlClient.get(sql, params);
    }
    const stmt = sqliteDb.prepare(sql);
    return stmt.get(...params) || null;
  },

  async run(sql, params = []) {
    if (isPostgresConfigured) {
      return await postgresClient.run(sql, params);
    }
    if (isMysqlConfigured) {
      return await mysqlClient.run(sql, params);
    }
    const stmt = sqliteDb.prepare(sql);
    const result = stmt.run(...params);
    return {
      lastInsertRowid: result.lastInsertRowid || 0,
      insertId: result.lastInsertRowid || 0,
      changes: result.changes || 0,
      affectedRows: result.changes || 0
    };
  },

  async exec(sql) {
    if (isPostgresConfigured) {
      return await postgresClient.exec(sql);
    }
    if (isMysqlConfigured) {
      return await mysqlClient.exec(sql);
    }
    return sqliteDb.exec(sql);
  },

  async transaction(fn) {
    if (isPostgresConfigured) {
      return await postgresClient.transaction(fn);
    }
    if (isMysqlConfigured) {
      return await mysqlClient.transaction(fn);
    }
    if (typeof sqliteDb.transaction === 'function') {
      return sqliteDb.transaction(fn)();
    }
    sqliteDb.exec('BEGIN TRANSACTION;');
    try {
      const res = await fn(this);
      sqliteDb.exec('COMMIT;');
      return res;
    } catch (err) {
      sqliteDb.exec('ROLLBACK;');
      throw err;
    }
  }
};

module.exports = dbHelper;
