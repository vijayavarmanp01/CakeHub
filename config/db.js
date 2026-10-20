const mysql = require("mysql2");
require("dotenv").config();

// Create connection pool using environment variables
const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "SpendSmart123",
    database: process.env.DB_NAME || "cakehub",
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Verify connection on startup
pool.getConnection((err, connection) => {
    if (err) {
        console.error("❌ Database connection failed:", err.message);
    } else {
        console.log("✅ MySQL database connected successfully to", process.env.DB_NAME || "cakehub");
        connection.release();
    }
});

module.exports = pool;