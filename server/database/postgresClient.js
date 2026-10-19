const { Pool: RealPgPool } = require('pg');
const path = require('path');
const fs = require('fs');

let realPool = null;
let isRealPostgres = null;
let wasmDb = null;
let SQL_ENGINE = null;

const WASM_DB_FILE = path.join(__dirname, 'quontriz_dev.db');

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

  // PostgreSQL date functions and type coercions
  normalized = normalized
    .replace(/datetime\('now',\s*'-(\d+)\s+days?'\)/gi, "NOW() - INTERVAL '$1 days'")
    .replace(/datetime\('now'\)/gi, 'NOW()')
    .replace(/date\('now'\)/gi, 'CURRENT_DATE')
    .replace(/CURDATE\(\)/gi, 'CURRENT_DATE')
    .replace(/COALESCE\(invoice_date,\s*created_at\)/gi, "COALESCE(invoice_date, created_at::text)");

  return normalized;
}

function convertPgDdlToWasm(sql) {
  return sql
    .replace(/SERIAL PRIMARY KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
    .replace(/TIMESTAMPTZ/gi, 'DATETIME')
    .replace(/NUMERIC\(\d+,\s*\d+\)/gi, 'NUMERIC')
    .replace(/VARCHAR\(\d+\)/gi, 'TEXT')
    .replace(/ON CONFLICT DO NOTHING/gi, '')
    .replace(/ON CONFLICT \([^)]+\) DO NOTHING/gi, '');
}

let lastMtime = 0;
let inTransaction = false;

async function getWasmDb() {
  if (!SQL_ENGINE) {
    const initSqlJs = require('sql.js');
    SQL_ENGINE = await initSqlJs();
  }

  // If already instantiated in memory, keep the active instance (crucial for transactions)
  if (wasmDb) {
    return wasmDb;
  }

  if (fs.existsSync(WASM_DB_FILE)) {
    try {
      const buffer = fs.readFileSync(WASM_DB_FILE);
      wasmDb = new SQL_ENGINE.Database(buffer);
      const stats = fs.statSync(WASM_DB_FILE);
      lastMtime = stats.mtimeMs;
    } catch {
      wasmDb = new SQL_ENGINE.Database();
    }
  } else {
    wasmDb = new SQL_ENGINE.Database();
  }
  return wasmDb;
}

function persistWasmDb() {
  if (!wasmDb || inTransaction) return;
  try {
    const data = wasmDb.export();
    fs.writeFileSync(WASM_DB_FILE, Buffer.from(data));
    try {
      const stats = fs.statSync(WASM_DB_FILE);
      lastMtime = stats.mtimeMs;
    } catch {}
  } catch (err) {
    // Non-fatal warning if file is locked
  }
}

function init() {
  if (realPool) return realPool;

  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.PG_URL;

  const isLocal = connectionString && (connectionString.includes('localhost') || connectionString.includes('127.0.0.1'));

  let sslConfig = false;
  if (!isLocal) {
    if (connectionString && (connectionString.includes('sslmode=disable') || connectionString.includes('ssl=false'))) {
      sslConfig = false;
    } else {
      sslConfig = { rejectUnauthorized: false };
    }
  }

  // 15 seconds connection timeout for cloud cold starts (Render, Supabase, Neon)
  const timeoutMs = parseInt(process.env.PG_CONNECT_TIMEOUT || '15000', 10);
  const maxPool = parseInt(process.env.PG_MAX_POOL || '10', 10);

  const poolConfig = connectionString
    ? {
        connectionString,
        ssl: sslConfig,
        max: maxPool,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: timeoutMs,
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
      }
    : {
        host: process.env.PGHOST || 'localhost',
        port: parseInt(process.env.PGPORT || '5432', 10),
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || 'postgres',
        database: process.env.PGDATABASE || 'quontriz_invoza',
        ssl: false,
        max: maxPool,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: timeoutMs,
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
      };

  realPool = new RealPgPool(poolConfig);

  realPool.on('error', (err) => {
    if (isRealPostgres === true) {
      console.warn('[PostgreSQL Pool Warning]', err.message);
    }
  });

  return realPool;
}

async function checkConnection(forceRetry = false) {
  if (isRealPostgres !== null && !forceRetry) return isRealPostgres;

  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.PG_URL;
  const isCloudOrCustom = connectionString &&
    !connectionString.includes('localhost:5432') &&
    !connectionString.includes('127.0.0.1:5432');

  // If in production or explicitly connected to remote cloud PostgreSQL (Render, Supabase, Neon)
  if (isCloudOrCustom || process.env.NODE_ENV === 'production') {
    init();
    const maxAttempts = 5;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`[PostgreSQL] 🔌 Connecting to live PostgreSQL server (attempt ${attempt}/${maxAttempts})...`);
        const res = await realPool.query('SELECT 1 as connected');
        isRealPostgres = Boolean(res && res.rows && res.rows[0]);
        console.log('[PostgreSQL] ✅ Successfully connected to live PostgreSQL server.');
        return true;
      } catch (err) {
        console.warn(`[PostgreSQL Notice] Attempt ${attempt}/${maxAttempts} failed: ${err.message}`);
        if (attempt < maxAttempts) {
          const delayMs = attempt * 2000; // 2s, 4s, 6s, 8s backoff
          console.log(`[PostgreSQL] ⏳ Waiting ${delayMs}ms for database service to initialize...`);
          await new Promise((r) => setTimeout(r, delayMs));
        } else {
          console.error('[PostgreSQL Connection Error]', err.message);
          if (err.message && (err.message.includes('timeout') || err.message.includes('Connection terminated'))) {
            console.error('\n' + '='.repeat(70));
            console.error('❌ [Render PostgreSQL Timeout Diagnostics & Quick Fix]');
            console.error('1. REGION MISMATCH (Most Common):');
            console.error('   Render Internal URLs only work when Web Service & Database are in the');
            console.error('   EXACT SAME REGION (e.g. Oregon). If regions differ, you MUST use the');
            console.error('   External Database URL (ends with .render.com).');
            console.error('2. DATABASE STATUS:');
            console.error('   Check your Render Dashboard to verify quontriz-invoza-db is "Available"');
            console.error('   (Render free tier databases suspend after 30 days or period of inactivity).');
            console.error('3. CONNECTION STRING:');
            console.error('   Ensure DATABASE_URL environment variable has no surrounding spaces or quotes.');
            console.error('='.repeat(70) + '\n');
          }
          isRealPostgres = false;
          return false;
        }
      }
    }
  }

  // Localhost development: Probe port 5432
  init();
  try {
    const res = await realPool.query('SELECT 1 as connected');
    isRealPostgres = Boolean(res && res.rows && res.rows[0]);
    console.log('[PostgreSQL] ✅ Connected to local PostgreSQL server on port 5432.');
    return true;
  } catch (err) {
    isRealPostgres = false;
    console.log('[PostgreSQL] ℹ️ Live PostgreSQL daemon is not active on localhost:5432.');
    console.log('[PostgreSQL] 🚀 Enabled pure-JS WebAssembly PostgreSQL engine for seamless localhost testing.');
    return false;
  }
}

const postgresClient = {
  init,
  checkConnection,

  getPool() {
    if (!realPool) return init();
    return realPool;
  },

  async query(sql, params = []) {
    const live = await checkConnection();
    if (live) {
      const converted = convertPlaceholders(normalizeSql(sql));
      const res = await realPool.query(converted, params);
      return res.rows || [];
    }

    const db = await getWasmDb();
    const cleanSql = sql.replace(/\$(\d+)/g, '?');
    const stmt = db.prepare(cleanSql);
    if (params && params.length > 0) stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  },

  async get(sql, params = []) {
    const rows = await this.query(sql, params);
    return rows && rows.length > 0 ? rows[0] : null;
  },

  async run(sql, params = []) {
    const live = await checkConnection();
    if (live) {
      let normalized = normalizeSql(sql);
      const isInsert = /^\s*INSERT\s+INTO/i.test(normalized);
      const hasReturning = /RETURNING/i.test(normalized);
      if (isInsert && !hasReturning && !/ON\s+CONFLICT\s+DO\s+NOTHING/i.test(normalized)) {
        normalized = normalized.trim().replace(/;?$/, ' RETURNING id;');
      }
      const converted = convertPlaceholders(normalized);
      const res = await realPool.query(converted, params);
      const insertedId = res.rows && res.rows[0]?.id !== undefined ? res.rows[0].id : null;
      return {
        lastInsertRowid: insertedId,
        insertId: insertedId,
        affectedRows: res.rowCount || 0,
        rowCount: res.rowCount || 0,
        rows: res.rows || []
      };
    }

    const db = await getWasmDb();
    let cleanSql = sql.replace(/RETURNING id/gi, '').replace(/\$(\d+)/g, '?');
    db.run(cleanSql, params);
    const idRow = db.exec('SELECT last_insert_rowid() as id');
    const lastId = idRow && idRow[0]?.values && idRow[0].values[0] ? idRow[0].values[0][0] : null;
    if (!inTransaction) {
      persistWasmDb();
    }
    return {
      lastInsertRowid: lastId,
      insertId: lastId,
      affectedRows: 1,
      rowCount: 1
    };
  },

  async exec(sql) {
    const live = await checkConnection();
    if (live) {
      return realPool.query(sql);
    }
    const db = await getWasmDb();
    const adapted = convertPgDdlToWasm(sql);
    db.run(adapted);
    if (!inTransaction) {
      persistWasmDb();
    }
  },

  async transaction(fn) {
    const live = await checkConnection();
    if (live) {
      const client = await realPool.connect();
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

    const db = await getWasmDb();
    inTransaction = true;
    let inDbTx = false;
    try {
      db.run('BEGIN TRANSACTION;');
      inDbTx = true;
    } catch (bErr) {
      // Transaction already active
    }

    try {
      const self = this;
      const txHelper = {
        query: (sql, params = []) => self.query(sql, params),
        get: (sql, params = []) => self.get(sql, params),
        run: (sql, params = []) => self.run(sql, params)
      };
      const result = await fn(txHelper);
      if (inDbTx) {
        try {
          db.run('COMMIT;');
        } catch (cErr) {
          // If transaction was committed or inactive
        }
      }
      inTransaction = false;
      persistWasmDb();
      return result;
    } catch (err) {
      if (inDbTx) {
        try {
          db.run('ROLLBACK;');
        } catch (rbErr) {
          // Ignore rollback failure so the real error is preserved
        }
      }
      inTransaction = false;
      throw err;
    } finally {
      inTransaction = false;
    }
  }
};

module.exports = postgresClient;
