const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'invoices.db');

// Ensure database directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db = null;
let driverType = '';

// SQLite driver initialization:
// 1. First try native built-in 'node:sqlite' (Built into Node >= 22.5.0, zero external C++ binary crashes)
// 2. Fallback to 'better-sqlite3' if available
try {
  const { DatabaseSync } = require('node:sqlite');
  db = new DatabaseSync(DB_PATH);
  driverType = 'node:sqlite';
  console.log('[DB] ✅ Connected to SQLite via native node:sqlite at:', DB_PATH);
} catch (nodeSqliteErr) {
  try {
    const Database = require('better-sqlite3');
    db = new Database(DB_PATH);
    driverType = 'better-sqlite3';
    console.log('[DB] ✅ Connected to SQLite via better-sqlite3 at:', DB_PATH);
  } catch (betterErr) {
    console.error('[DB Fatal] Neither node:sqlite nor better-sqlite3 could be loaded.');
    console.error('node:sqlite error:', nodeSqliteErr.message);
    console.error('better-sqlite3 error:', betterErr.message);
    throw new Error('SQLite driver initialization failed. Ensure Node >= 22.5.0 is active.');
  }
}

// Enable foreign keys and WAL mode for better concurrency and integrity
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

const dbHelper = {
  getRawDb() {
    return db;
  },

  getDriverType() {
    return driverType;
  },

  query(sql, params = []) {
    try {
      const stmt = db.prepare(sql);
      return stmt.all(...params);
    } catch (error) {
      console.error('Database query error:', error.message, 'SQL:', sql, 'Params:', params);
      throw error;
    }
  },

  get(sql, params = []) {
    try {
      const stmt = db.prepare(sql);
      return stmt.get(...params);
    } catch (error) {
      console.error('Database get error:', error.message, 'SQL:', sql, 'Params:', params);
      throw error;
    }
  },

  run(sql, params = []) {
    try {
      const stmt = db.prepare(sql);
      return stmt.run(...params);
    } catch (error) {
      console.error('Database run error:', error.message, 'SQL:', sql, 'Params:', params);
      throw error;
    }
  },

  exec(sql) {
    try {
      return db.exec(sql);
    } catch (error) {
      console.error('Database exec error:', error.message, 'SQL:', sql);
      throw error;
    }
  },

  transaction(fn) {
    if (typeof db.transaction === 'function') {
      return db.transaction(fn)();
    }
    db.exec('BEGIN TRANSACTION;');
    try {
      const result = fn();
      db.exec('COMMIT;');
      return result;
    } catch (error) {
      db.exec('ROLLBACK;');
      throw error;
    }
  }
};

module.exports = dbHelper;
