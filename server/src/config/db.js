const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'cold_chain_monitor',
});

pool.on('error', (err) => {
  console.error('数据库连接错误:', err);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
