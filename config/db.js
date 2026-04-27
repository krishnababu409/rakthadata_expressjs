const mysql = require('mysql2/promise');

let pool;

const sanitizeIdentifier = (value) => String(value || '').replace(/`/g, '');

const getServerConfig = () => ({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const getDatabaseName = () => sanitizeIdentifier(process.env.DB_NAME || 'rakthata_db');

const ensureDatabaseExists = async () => {
  const connection = await mysql.createConnection(getServerConfig());

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${getDatabaseName()}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await connection.end();
  }
};

const getPool = async () => {
  if (!pool) {
    await ensureDatabaseExists();
    pool = mysql.createPool({
      ...getServerConfig(),
      database: getDatabaseName()
    });
  }

  return pool;
};

module.exports = {
  getPool,
  getDatabaseName,
  ensureDatabaseExists
};
