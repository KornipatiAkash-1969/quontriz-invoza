const postgresClient = require('./postgresClient');

// Initialize PostgreSQL connection pool
postgresClient.init();

const dbHelper = {
  isPostgres() {
    return true;
  },

  isMysql() {
    return false;
  },

  getDriverType() {
    return 'postgres';
  },

  getRawDb() {
    return postgresClient.getPool();
  },

  async query(sql, params = []) {
    return await postgresClient.query(sql, params);
  },

  async get(sql, params = []) {
    return await postgresClient.get(sql, params);
  },

  async run(sql, params = []) {
    return await postgresClient.run(sql, params);
  },

  async exec(sql) {
    return await postgresClient.exec(sql);
  },

  async transaction(fn) {
    return await postgresClient.transaction(fn);
  }
};

module.exports = dbHelper;
