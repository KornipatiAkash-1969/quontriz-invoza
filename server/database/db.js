const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'invoices.db');

// Ensure database directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new DatabaseSync(DB_PATH);

// Enable foreign keys and WAL mode for better concurrency and integrity
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

const dbHelper = {
  getRawDb() {
    return db;
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
