const { Pool } = require("pg")
const logger = {
  info: (message) => console.log(`ℹ️  ${message}`),
  error: (message, meta) => console.error(`❌ ${message}`, meta || ""),
  debug: (message) => console.log(`🐛 ${message}`),
}

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 20, // maximum number of clients in the pool
  idleTimeoutMillis: 30000, // how long a client is allowed to remain idle
  connectionTimeoutMillis: 2000, // how long to wait for a connection
})

// Test connection
pool.on("connect", () => {
  logger.info("🗄️  Connected to PostgreSQL database")
})

pool.on("error", (err) => {
  logger.error("💥 Unexpected error on idle client", err)
  process.exit(-1)
})

// Helper function to execute queries
const query = async (text, params) => {
  const start = Date.now()
  try {
    const res = await pool.query(text, params)
    const duration = Date.now() - start
    logger.debug(`Executed query: ${text} - Duration: ${duration}ms`)
    return res
  } catch (error) {
    logger.error(`Query error: ${error.message}`)
    throw error
  }
}

// Transaction helper
const transaction = async (callback) => {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    const result = await callback(client)
    await client.query("COMMIT")
    return result
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}

module.exports = {
  pool,
  query,
  transaction,
}
