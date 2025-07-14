const express = require("express")
const cors = require("cors")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")
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

// Test database connection
pool.on("connect", () => {
  console.log("✅ Connected to PostgreSQL database")
})

pool.on("error", (err) => {
  console.error("💥 Database connection error:", err)
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
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`)
  next()
})

// Auth middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"]
    const token = authHeader && authHeader.split(" ")[1]

    if (!token) {
      console.log("❌ No token provided")
      return res.status(401).json({ message: "Access token required" })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    console.log("✅ Token decoded:", { id: decoded.id, role: decoded.role })

    // Verify user still exists and is active
    const result = await pool.query(
      "SELECT id, name, email, role, supervisor, is_active FROM clone_users_apprudnik WHERE id = $1 AND is_active = true",
      [decoded.id],
    )

    if (result.rows.length === 0) {
      console.log("❌ User not found or inactive")
      return res.status(401).json({ message: "User not found or inactive" })
    }

    req.user = result.rows[0]
    console.log("✅ User authenticated:", req.user.email)
    next()
  } catch (error) {
    console.error("❌ Authentication error:", error.message)
    return res.status(403).json({ message: "Invalid or expired token" })
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
  try {
    console.log("🔐 Login attempt:", req.body.email)
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" })
    }

    const result = await pool.query("SELECT * FROM clone_users_apprudnik WHERE email = $1 AND is_active = true", [
      email,
    ])

    if (result.rows.length === 0) {
      console.log("❌ User not found:", email)
      return res.status(401).json({ message: "Credenciais inválidas" })
    }

    const user = result.rows[0]
    console.log("👤 User found:", { id: user.id, role: user.role })

    // For demo purposes, we'll use simple password check
    if (password !== "123456") {
      console.log("❌ Invalid password")
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

    console.log("✅ Login successful:", user.email)

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
  }
})

// Helper function to get date range
function getDateRange(period) {
  if (!period) {
    // Default to current month
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return {
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    }
  }

  // Period format: YYYY-MM
  const [year, month] = period.split("-")
  const startDate = `${year}-${month}-01`
  const endDate = `${year}-${month}-31`

  return { startDate, endDate }
}

// Dashboard endpoints
app.get("/api/dashboard/vendedor/:id", authenticateToken, async (req, res) => {
  try {
    console.log("📊 Vendedor dashboard request:", { id: req.params.id, period: req.query.period })
    const { id } = req.params
    const { period } = req.query

    const { startDate, endDate } = getDateRange(period)
    console.log("📅 Date range:", { startDate, endDate })

    // Check if user can access this data
    /*if (req.user.role === "vendedor" && req.user.id !== Number.parseInt(id)) {
      return res.status(403).json({ message: "Access denied" })
    }*/

    // Get proposals data
    const proposalsQuery = `
      SELECT 
        COUNT(*) as total, 
        COUNT(CASE WHEN has_generated_sale = true THEN 1 END) as convertidas,
        COALESCE(SUM(CASE WHEN has_generated_sale = true THEN CAST(total_price AS DECIMAL) END), 0) as faturamento_total
      FROM clone_propostas_apprudnik 
      WHERE seller = $1 AND created_at >= $2 AND created_at <= $3
    `

    console.log("🔍 Executing proposals query...")
    const propostas = await pool.query(proposalsQuery, [id, startDate, endDate])
    console.log("✅ Proposals data:", propostas.rows[0])

    // Get monthly sales data
    const monthlySalesQuery = `
      SELECT 
        DATE_TRUNC('month', created_at) as mes,
        COUNT(*) as total_propostas,
        COUNT(CASE WHEN has_generated_sale = true THEN 1 END) as vendas,
        COALESCE(SUM(CASE WHEN has_generated_sale = true THEN CAST(total_price AS DECIMAL) END), 0) as faturamento
      FROM clone_propostas_apprudnik 
      WHERE seller = $1 AND created_at >= $2 AND created_at <= $3
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY mes
    `

    console.log("🔍 Executing monthly sales query...")
    const vendasMensais = await pool.query(monthlySalesQuery, [id, startDate, endDate])
    console.log("✅ Monthly sales data:", vendasMensais.rows.length, "rows")

    const totalPropostas = Number.parseInt(propostas.rows[0].total)
    const propostasConvertidas = Number.parseInt(propostas.rows[0].convertidas)
    const faturamentoTotal = Number.parseFloat(propostas.rows[0].faturamento_total)
    const taxaConversao = totalPropostas > 0 ? ((propostasConvertidas / totalPropostas) * 100).toFixed(2) : 0
    const ticketMedio = propostasConvertidas > 0 ? (faturamentoTotal / propostasConvertidas).toFixed(2) : 0

    const response = {
      resumo: {
        totalPropostas,
        propostasConvertidas,
        faturamentoTotal,
        taxaConversao: Number.parseFloat(taxaConversao),
        ticketMedio: Number.parseFloat(ticketMedio),
      },
      vendasMensais: vendasMensais.rows.map((row) => ({
        mes: row.mes,
        totalPropostas: Number.parseInt(row.total_propostas),
        vendas: Number.parseInt(row.vendas),
        faturamento: Number.parseFloat(row.faturamento),
      })),
    }

    console.log("✅ Sending response:", response)
    res.json(response)
  } catch (error) {
    console.error("❌ Dashboard vendedor error:", error)
    res.status(500).json({
      message: "Erro ao carregar dashboard",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    })
  }
})

// Representante dashboard (same as vendedor)
app.get("/api/dashboard/representante/:id", authenticateToken, async (req, res) => {
  try {
    console.log("📊 Representante dashboard request:", { id: req.params.id, period: req.query.period })
    const { id } = req.params
    const { period } = req.query

    const { startDate, endDate } = getDateRange(period)

    // Check if user can access this data
    /*if (req.user.role === "representante" && req.user.id !== Number.parseInt(id)) {
      return res.status(403).json({ message: "Access denied" })
    }*/

    // Same logic as vendedor
    const proposalsQuery = `
      SELECT 
        COUNT(*) as total, 
        COUNT(CASE WHEN has_generated_sale = true THEN 1 END) as convertidas,
        COALESCE(SUM(CASE WHEN has_generated_sale = true THEN CAST(total_price AS DECIMAL) END), 0) as faturamento_total
      FROM clone_propostas_apprudnik 
      WHERE seller = $1 AND created_at >= $2 AND created_at <= $3
    `

    const propostas = await pool.query(proposalsQuery, [id, startDate, endDate])

    const monthlySalesQuery = `
      SELECT 
        DATE_TRUNC('month', created_at) as mes,
        COUNT(*) as total_propostas,
        COUNT(CASE WHEN has_generated_sale = true THEN 1 END) as vendas,
        COALESCE(SUM(CASE WHEN has_generated_sale = true THEN CAST(total_price AS DECIMAL) END), 0) as faturamento
      FROM clone_propostas_apprudnik 
      WHERE seller = $1 AND created_at >= $2 AND created_at <= $3
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY mes
    `

    const vendasMensais = await pool.query(monthlySalesQuery, [id, startDate, endDate])

    const totalPropostas = Number.parseInt(propostas.rows[0].total)
    const propostasConvertidas = Number.parseInt(propostas.rows[0].convertidas)
    const faturamentoTotal = Number.parseFloat(propostas.rows[0].faturamento_total)
    const taxaConversao = totalPropostas > 0 ? ((propostasConvertidas / totalPropostas) * 100).toFixed(2) : 0
    const ticketMedio = propostasConvertidas > 0 ? (faturamentoTotal / propostasConvertidas).toFixed(2) : 0

    const response = {
      resumo: {
        totalPropostas,
        propostasConvertidas,
        faturamentoTotal,
        taxaConversao: Number.parseFloat(taxaConversao),
        ticketMedio: Number.parseFloat(ticketMedio),
      },
      vendasMensais: vendasMensais.rows.map((row) => ({
        mes: row.mes,
        totalPropostas: Number.parseInt(row.total_propostas),
        vendas: Number.parseInt(row.vendas),
        faturamento: Number.parseFloat(row.faturamento),
      })),
    }

    res.json(response)
  } catch (error) {
    console.error("❌ Dashboard representante error:", error)
    res.status(500).json({
      message: "Erro ao carregar dashboard",
      error: error.message,
    })
  }
})

// Supervisor dashboard
app.get("/api/dashboard/supervisor/:id", authenticateToken, async (req, res) => {
  try {
    console.log("📊 Supervisor dashboard request:", { id: req.params.id, period: req.query.period })
    const { id } = req.params
    const { period } = req.query

    const { startDate, endDate } = getDateRange(period)

    // Check if user can access this data
    /*if (req.user.role === "supervisor" && req.user.id !== Number.parseInt(id)) {
      return res.status(403).json({ message: "Access denied" })
    }*/

    // Get supervised users
    const teamQuery = `
      SELECT id, name FROM clone_users_apprudnik 
      WHERE supervisor = $1 AND is_active = true
    `
    const vendedores = await pool.query(teamQuery, [id])
    const vendedorIds = vendedores.rows.map((v) => v.id)

    console.log("👥 Team members:", vendedorIds)

    if (vendedorIds.length === 0) {
      return res.json({
        resumo: { totalPropostas: 0, propostasConvertidas: 0, faturamentoTotal: 0 },
        rankingVendedores: [],
      })
    }

    // Team summary
    const teamSummaryQuery = `
      SELECT 
        COUNT(*) as total_propostas,
        COUNT(CASE WHEN has_generated_sale = true THEN 1 END) as convertidas,
        COALESCE(SUM(CASE WHEN has_generated_sale = true THEN CAST(total_price AS DECIMAL) END), 0) as faturamento
      FROM clone_propostas_apprudnik 
      WHERE seller = ANY($1) AND created_at >= $2 AND created_at <= $3
    `

    const resumoEquipe = await pool.query(teamSummaryQuery, [vendedorIds, startDate, endDate])

    // Individual performance ranking
    const rankingQuery = `
      SELECT 
        u.name, u.id,
        COUNT(p.*) as propostas,
        COUNT(CASE WHEN p.has_generated_sale = true THEN 1 END) as vendas,
        COALESCE(SUM(CASE WHEN p.has_generated_sale = true THEN CAST(p.total_price AS DECIMAL) END), 0) as faturamento
      FROM clone_users_apprudnik u
      LEFT JOIN clone_propostas_apprudnik p ON u.id = p.seller 
        AND p.created_at >= $2 AND p.created_at <= $3
      WHERE u.id = ANY($1)
      GROUP BY u.id, u.name
      ORDER BY faturamento DESC
    `

    const ranking = await pool.query(rankingQuery, [vendedorIds, startDate, endDate])

    const response = {
      resumo: {
        totalPropostas: Number.parseInt(resumoEquipe.rows[0].total_propostas),
        propostasConvertidas: Number.parseInt(resumoEquipe.rows[0].convertidas),
        faturamentoTotal: Number.parseFloat(resumoEquipe.rows[0].faturamento),
      },
      rankingVendedores: ranking.rows.map((row) => ({
        id: row.id,
        name: row.name,
        propostas: Number.parseInt(row.propostas),
        vendas: Number.parseInt(row.vendas),
        faturamento: Number.parseFloat(row.faturamento),
      })),
    }

    res.json(response)
  } catch (error) {
    console.error("❌ Dashboard supervisor error:", error)
    res.status(500).json({
      message: "Erro ao carregar dashboard",
      error: error.message,
    })
  }
})

// Gerente Comercial dashboard
app.get("/api/dashboard/gerente_comercial", authenticateToken, async (req, res) => {
  try {
    console.log("📊 Gerente Comercial dashboard request:", { period: req.query.period })
    const { period } = req.query

    const { startDate, endDate } = getDateRange(period)

    // Global indicators
    const globalQuery = `
      SELECT 
        COUNT(*) as total_propostas,
        COUNT(CASE WHEN has_generated_sale = true THEN 1 END) as vendas,
        COALESCE(SUM(CASE WHEN has_generated_sale = true THEN CAST(total_price AS DECIMAL) END), 0) as faturamento_total
      FROM clone_propostas_apprudnik 
      WHERE created_at >= $1 AND created_at <= $2
    `

    const indicadores = await pool.query(globalQuery, [startDate, endDate])

    const totalPropostas = Number.parseInt(indicadores.rows[0].total_propostas)
    const totalVendas = Number.parseInt(indicadores.rows[0].vendas)
    const faturamentoTotal = Number.parseFloat(indicadores.rows[0].faturamento_total)
    const taxaConversao =
      totalPropostas > 0 ? ((totalVendas / totalPropostas) * 100).toFixed(2) : 0

    // Monthly revenue
    const monthlyRevenueQuery = `
      SELECT 
        DATE_TRUNC('month', created_at) as mes,
        COALESCE(SUM(CAST(total_price AS DECIMAL)), 0) as faturamento,
        COUNT(CASE WHEN has_generated_sale = true THEN 1 END) as vendas
      FROM clone_propostas_apprudnik 
      WHERE has_generated_sale = true AND created_at >= $1 AND created_at <= $2
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY mes
    `

    const faturamentoMensal = await pool.query(monthlyRevenueQuery, [startDate, endDate])

    // Top performers
    const topPerformersQuery = `
      SELECT 
        u.name,
        u.role,
        COALESCE(SUM(CASE WHEN p.has_generated_sale = true THEN CAST(p.total_price AS DECIMAL) END), 0) as faturamento,
        COUNT(CASE WHEN p.has_generated_sale = true THEN 1 END) as vendas
      FROM clone_users_apprudnik u
      LEFT JOIN clone_propostas_apprudnik p ON u.id = p.seller 
        AND p.created_at >= $1 AND p.created_at <= $2
      WHERE u.role IN ('vendedor', 'representante') AND u.is_active = true
      GROUP BY u.id, u.name, u.role
      ORDER BY faturamento DESC
      LIMIT 10
    `

    const topVendedores = await pool.query(topPerformersQuery, [startDate, endDate])

    const response = {
      indicadores: {
        totalPropostas,
        totalVendas,
        faturamentoTotal,
        taxaConversao: Number.parseFloat(taxaConversao),
      },
      faturamentoMensal: faturamentoMensal.rows.map((row) => ({
        mes: row.mes,
        faturamento: Number.parseFloat(row.faturamento),
        vendas: Number.parseInt(row.vendas),
      })),
      topVendedores: topVendedores.rows.map((row) => ({
        name: row.name,
        role: row.role,
        faturamento: Number.parseFloat(row.faturamento),
        vendas: Number.parseInt(row.vendas),
      })),
    }

    res.json(response)
  } catch (error) {
    console.error("❌ Dashboard gerente comercial error:", error)
    res.status(500).json({
      message: "Erro ao carregar dashboard",
      error: error.message,
    })
  }
})

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("💥 Unhandled error:", error)
  res.status(500).json({
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
  })
})

// 404 handler
app.use("*", (req, res) => {
  console.log("❌ Route not found:", req.originalUrl)
  res.status(404).json({ message: "Route not found" })
})

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📊 Dashboard API available at http://localhost:${PORT}/api`)
  console.log(`🏥 Health check at http://localhost:${PORT}/health`)
})
