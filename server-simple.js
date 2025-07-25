const express = require("express")
const cors = require("cors")
const { Pool } = require("pg")
require("dotenv").config()

const app = express()
const PORT = process.env.PORT || 3001

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
})

// Middleware
app.use(cors())
app.use(express.json())

// Test database connection
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message)
  } else {
    console.log("✅ Database connected successfully!")
  }
})

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    message: "Server is running!",
  })
})

// Simple login endpoint for testing
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" })
    }

    // For testing, simply return a static user
    res.json({
      success: true,
      token: "test-token-123",
      user: {
        id: 1,
        name: "Test User",
        email,
        role: "vendedor",
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Simple dashboard endpoint
app.get("/api/dashboard/test", (req, res) => {
  res.json({
    success: true,
    message: "Dashboard endpoint working!",
    data: {
      totalPropostas: 10,
      vendas: 8,
      faturamento: 50000,
    },
  })
})

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📊 Test endpoints:`)
  console.log(`   - Health: http://localhost:${PORT}/health`)
  console.log(`   - Login: POST http://localhost:${PORT}/api/auth/login`)
  console.log(`   - Dashboard: http://localhost:${PORT}/api/dashboard/test`)
})
