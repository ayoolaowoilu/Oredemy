import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const connectionLimit = Number(process.env.DB_CONNECTION_LIMIT ?? 10);
if (!Number.isInteger(connectionLimit) || connectionLimit < 1 || connectionLimit > 100) {
  throw new Error("DB_CONNECTION_LIMIT must be an integer between 1 and 100");
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit,
  queueLimit: 0,
});

try {
  const connection = await pool.getConnection();
  console.log("Successfully connected to the database.");
  connection.release();
} catch (err) {
  console.error("Error connecting to the database:", err);
}

export default pool;