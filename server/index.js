const express = require("express")
const cors = require("cors")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")
const { Pool } = require("pg")
require("dotenv").config()

// Import routes
const dashboardRoutes = require("./routes/dashboard")
const goalsRoutes = require("./routes/goals")
const usersRoutes = require("./routes/users") // Assuming you have a users route for fetching user list

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

// Test database connection
pool.on("connect", () => {
  console.log("✅ Connected to PostgreSQL database")
})

pool.on("error", (err) => {
  console.error("💥 Database connection error:", err)
  process.exit(1) // Exit process if database connection fails
})

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
)
app.use(express.json())

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] Request: ${req.method} ${req.url}`)
  next()
})

// Auth middleware (defined here for login endpoint, but also imported in routes)
const authenticateToken = async (req, res, next) => {
  console.log("--- Server Auth: authenticateToken initiated ---")
  try {
    const authHeader = req.headers["authorization"]
    const token = authHeader && authHeader.split(" ")[1]

    if (!token) {
      console.log("❌ Server Auth: No token provided.")
      return res.status(401).json({ message: "Access token required" })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    console.log("✅ Server Auth: Token decoded for user ID:", decoded.id, "Role:", decoded.role)

    // Verify user still exists and is active
    const result = await pool.query(
      "SELECT id, name, email, role, supervisor, is_active FROM clone_users_apprudnik WHERE id = $1 AND is_active = true",
      [decoded.id],
    )

    if (result.rows.length === 0) {
      console.log("❌ Server Auth: User not found or inactive for ID:", decoded.id)
      return res.status(401).json({ message: "User not found or inactive" })
    }

    req.user = result.rows[0]
    console.log("✅ Server Auth: User authenticated:", req.user.email, "with role:", req.user.role)
    next()
  } catch (error) {
    console.error("❌ Server Auth: Authentication error:", error.message)
    return res.status(403).json({ message: "Invalid or expired token" })
  } finally {
    console.log("--- Server Auth: authenticateToken finished ---")
  }
}

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

// Login endpoint
app.post("/api/auth/login", async (req, res) => {
  console.log("--- Route: POST /api/auth/login initiated ---")
  try {
    console.log("🔐 Login attempt for:", req.body.email)
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" })
    }

    const result = await pool.query("SELECT * FROM clone_users_apprudnik WHERE email = $1 AND is_active = true", [
      email,
    ])

    if (result.rows.length === 0) {
      console.log("❌ Login: User not found:", email)
      return res.status(401).json({ message: "Credenciais inválidas" })
    }

    const user = result.rows[0]
    console.log("👤 Login: User found:", { id: user.id, role: user.role })

    // For demo purposes, we'll use simple password check
    // In production, use bcrypt.compare with hashed passwords
    if (password !== "123456") {
      console.log("❌ Login: Invalid password for user:", email)
      return res.status(401).json({ message: "Credenciais inválidas" })
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
    )

    console.log("✅ Login successful for:", user.email)

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("❌ Login error:", error)
    res.status(500).json({ message: "Erro interno do servidor", error: error.message })
  } finally {
    console.log("--- Route: POST /api/auth/login finished ---")
  }
})

// Use dashboard routes
app.use("/api/dashboard", dashboardRoutes)
// Use goals routes
app.use("/api/goals", goalsRoutes)
// Use users routes (for fetching user list in goal dashboard)
app.use("/api/users", usersRoutes)

// Error handling middleware (global catch-all for errors passed via next(error))
app.use((error, req, res, next) => {
  console.error("💥 Global Error Handler: Unhandled error:", error)
  res.status(error.status || 500).json({
    message: error.message || "Internal server error",
    error: process.env.NODE_ENV === "development" ? error.stack : undefined,
  })
})

// 404 handler for any unhandled routes
app.use("*", (req, res) => {
  console.log("❌ 404 Handler: Route not found:", req.originalUrl)
  res.status(404).json({ message: "Route not found" })
})

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📊 Dashboard API available at http://localhost:${PORT}/api/dashboard`)
  console.log(`🎯 Goals API available at http://localhost:${PORT}/api/goals`)
  console.log(`👤 Users API available at http://localhost:${PORT}/api/users`)
  console.log(`🏥 Health check at http://localhost:${PORT}/health`)
})
