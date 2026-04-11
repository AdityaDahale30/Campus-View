import mysql from "mysql2/promise";

/* ================= DB CONFIG ================= */

// 🔥 Use ENV variables if available (Render / Railway)
// otherwise fallback to local DB

const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "aditya",
  database: process.env.DB_NAME || "campus_view",
  port: process.env.DB_PORT || 3306,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

/* ================= TEST CONNECTION ================= */

(async () => {
  try {
    const connection = await db.getConnection();
    console.log("✅ MySQL Connected Successfully");
    connection.release();
  } catch (error) {
    console.log("❌ DB CONNECTION ERROR:", error.message);
  }
})();

/* ================= EXPORT ================= */

export default db;