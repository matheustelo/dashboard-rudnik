const { Pool } = require("pg")
require("dotenv").config()

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
})

// Test database connection
pool.on("connect", () => {
  console.log("✅ Database pool connected")
})

pool.on("error", (err) => {
  console.error("💥 Database pool error:", err)
})

const query = async (text, params) => {
  console.log("🔍 Executing query:", text.substring(0, 100) + "...")
  const start = Date.now()
  try {
    const res = await pool.query(text, params)
    const duration = Date.now() - start
    console.log("✅ Query executed successfully in", duration, "ms")
    return res
  } catch (error) {
    console.error("❌ Query error:", error.message)
    throw error
  }
}

module.exports = {
  query,
  pool,
}
