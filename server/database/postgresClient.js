const { Pool } = require('pg');

let pool = null;

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

  // SQLite / MySQL date functions and type coercions to standard PostgreSQL
  normalized = normalized
    .replace(/datetime\('now',\s*'-(\d+)\s+days?'\)/gi, "NOW() - INTERVAL '$1 days'")
    .replace(/datetime\('now'\)/gi, 'NOW()')
    .replace(/date\('now'\)/gi, 'CURRENT_DATE')
    .replace(/CURDATE\(\)/gi, 'CURRENT_DATE')
    .replace(/COALESCE\(invoice_date,\s*created_at\)/gi, "COALESCE(invoice_date, created_at::text)");

  return normalized;
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
        connectionTimeoutMillis: 10000,
      }
    : {
        host: process.env.PGHOST || 'localhost',
        port: parseInt(process.env.PGPORT || '5432', 10),
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || 'postgres',
        database: process.env.PGDATABASE || 'quontriz_invoza',
        ssl: false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      };

  pool = new Pool(poolConfig);

  pool.on('error', (err) => {
    console.error('[PostgreSQL Pool Error]', err.message);
  });

  return pool;
}

function getPool() {
  if (!pool) return init();
  return pool;
}

const postgresClient = {
  init,
  getPool,

  async query(sql, params = []) {
    const p = getPool();
    const converted = convertPlaceholders(normalizeSql(sql));
    const result = await p.query(converted, params);
    return result.rows || [];
  },

  async get(sql, params = []) {
    const p = getPool();
    const converted = convertPlaceholders(normalizeSql(sql));
    const result = await p.query(converted, params);
    return result.rows && result.rows.length > 0 ? result.rows[0] : null;
  },

  async run(sql, params = []) {
    const p = getPool();
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
  },

  async exec(sql) {
    const p = getPool();
    return p.query(sql);
  },

  async transaction(fn) {
    const p = getPool();
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
};

module.exports = postgresClient;
