const sql = require('mssql');
const config = {
  server: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT || '1433'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  options: { encrypt: true, trustServerCertificate: false, enableArithAbort: true },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
};
let pool = null;
async function getPool() {
  if (!pool) pool = await new sql.ConnectionPool(config).connect();
  return pool;
}
module.exports = { getPool, sql };
