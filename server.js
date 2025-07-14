const express = require("express")
const cors = require("cors")
const helmet = require("helmet")
const compression = require("compression")
const morgan = require("morgan")
const rateLimit = require("express-rate-limit")
require("dotenv").config()

// Import routes
const authRoutes = require("./routes/auth")
const dashboardRoutes = require("./routes/dashboard")
const userRoutes = require("./routes/users")
const proposalRoutes = require("./routes/proposals")
const salesRoutes = require("./routes/sales")
const reportRoutes = require("./routes/reports")
const goalsRoutes = require("./routes/goals")

// Import middleware
const errorHandler = require("./middleware/errorHandler")
const logger = {
  info: (message) => console.log(`ℹ️  ${message}`),
  error: (message, meta) => console.error(`❌ ${message}`, meta || ""),
  warn: (message) => console.warn(`⚠️  ${message}`),
  debug: (message) => console.log(`🐛 ${message}`),
}

const app = express()
const PORT = process.env.PORT || 3001

// Security middleware
app.use(helmet())
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
)

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
})
app.use("/api/", limiter)

// Body parsing middleware
app.use(compression())
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true }))

// Logging
app.use(morgan("combined", { stream: { write: (message) => logger.info(message.trim()) } }))

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  })
})

// API Routes
app.use("/api/auth", authRoutes)
app.use("/api/dashboard", dashboardRoutes)
app.use("/api/users", userRoutes)
app.use("/api/proposals", proposalRoutes)
app.use("/api/sales", salesRoutes)
app.use("/api/reports", reportRoutes)
app.use("/api/goals", goalsRoutes)

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ message: "Route not found" })
})

// Error handling middleware
app.use(errorHandler)

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully")
  process.exit(0)
})

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully")
  process.exit(0)
})

app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`)
  logger.info(`📊 Dashboard API available at http://localhost:${PORT}/api`)
  logger.info(`🏥 Health check at http://localhost:${PORT}/health`)
})

module.exports = app
