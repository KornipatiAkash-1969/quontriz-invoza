const mysql = require('mysql2/promise');

class MysqlClient {
  constructor() {
    this.pool = null;
    this.isInitialized = false;
  }

  getPoolConfig() {
    const connectionUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;
    if (connectionUrl && (connectionUrl.startsWith('mysql://') || connectionUrl.startsWith('mysql2://'))) {
      const parsed = new URL(connectionUrl);
      return {
        host: parsed.hostname,
        port: parseInt(parsed.port || '3306', 10),
        user: decodeURIComponent(parsed.username || 'root'),
        password: decodeURIComponent(parsed.password || ''),
        database: parsed.pathname.replace(/^\//, '') || 'railway',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
        multipleStatements: true,
        ssl: process.env.MYSQL_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
      };
    }

    // Individual environment variables (Standard Railway / Render / AWS format)
    const host = process.env.MYSQLHOST || process.env.DB_HOST || '127.0.0.1';
    const port = parseInt(process.env.MYSQLPORT || process.env.DB_PORT || '3306', 10);
    const user = process.env.MYSQLUSER || process.env.DB_USER || 'root';
    const password = process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '';
    const database = process.env.MYSQLDATABASE || process.env.DB_NAME || 'railway';

    return {
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      multipleStatements: true,
      ssl: process.env.MYSQL_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    };
  }

  init() {
    if (this.pool) return this.pool;
    const config = this.getPoolConfig();
    this.pool = mysql.createPool(config);
    this.isInitialized = true;
    console.log(`[MySQL] 🐬 Connection pool initialized -> Host: ${config.host}:${config.port}, DB: ${config.database}`);
    return this.pool;
  }

  getPool() {
    if (!this.pool) {
      this.init();
    }
    return this.pool;
  }

  /**
   * Adapts SQLite syntax idiosyncrasies to MySQL standard syntax
   */
  normalizeSql(sql) {
    if (!sql || typeof sql !== 'string') return sql;
    let s = sql;
    // Replace INSERT OR IGNORE with INSERT IGNORE
    s = s.replace(/INSERT\s+OR\s+IGNORE/gi, 'INSERT IGNORE');
    // Replace SQLite datetime('now', '-X seconds') with MySQL DATE_SUB(NOW(), INTERVAL X SECOND)
    s = s.replace(/datetime\('now',\s*'-(\d+)\s*seconds'\)/gi, 'DATE_SUB(NOW(), INTERVAL $1 SECOND)');
    s = s.replace(/datetime\('now'\)/gi, 'NOW()');
    s = s.replace(/DATE\('now'(?:,\s*'localtime')?\)/gi, 'CURDATE()');
    return s;
  }

  async query(sql, params = []) {
    const pool = this.getPool();
    const cleanSql = this.normalizeSql(sql);
    try {
      const [rows] = await pool.query(cleanSql, params);
      return Array.isArray(rows) ? rows : [rows];
    } catch (err) {
      console.error('[MySQL Query Error]', err.message, 'SQL:', cleanSql, 'Params:', params);
      throw err;
    }
  }

  async get(sql, params = []) {
    const pool = this.getPool();
    const cleanSql = this.normalizeSql(sql);
    try {
      const [rows] = await pool.query(cleanSql, params);
      if (Array.isArray(rows) && rows.length > 0) {
        return rows[0];
      }
      return null;
    } catch (err) {
      console.error('[MySQL Get Error]', err.message, 'SQL:', cleanSql, 'Params:', params);
      throw err;
    }
  }

  async run(sql, params = []) {
    const pool = this.getPool();
    const cleanSql = this.normalizeSql(sql);
    try {
      const [result] = await pool.execute(cleanSql, params);
      return {
        lastInsertRowid: result.insertId || 0,
        insertId: result.insertId || 0,
        changes: result.affectedRows || 0,
        affectedRows: result.affectedRows || 0,
      };
    } catch (err) {
      console.error('[MySQL Run Error]', err.message, 'SQL:', cleanSql, 'Params:', params);
      throw err;
    }
  }

  async exec(sql) {
    const pool = this.getPool();
    const cleanSql = this.normalizeSql(sql);
    try {
      return await pool.query(cleanSql);
    } catch (err) {
      console.error('[MySQL Exec Error]', err.message);
      throw err;
    }
  }

  async transaction(fn) {
    const pool = this.getPool();
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    const self = this;
    try {
      // Transaction-bound helper
      const txHelper = {
        async query(sql, params = []) {
          const [rows] = await connection.query(self.normalizeSql(sql), params);
          return rows;
        },
        async get(sql, params = []) {
          const [rows] = await connection.query(self.normalizeSql(sql), params);
          return rows[0] || null;
        },
        async run(sql, params = []) {
          const [res] = await connection.execute(self.normalizeSql(sql), params);
          return {
            lastInsertRowid: res.insertId || 0,
            insertId: res.insertId || 0,
            changes: res.affectedRows || 0,
            affectedRows: res.affectedRows || 0,
          };
        }
      };

      const result = await fn(txHelper);
      await connection.commit();
      return result;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }
}

module.exports = new MysqlClient();
