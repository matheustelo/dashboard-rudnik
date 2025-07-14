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
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`)
  if (req.headers.authorization) {
    console.log("🔑 Authorization header present")
  }
  next()
})

// Auth middleware
const authenticateToken = async (req, res, next) => {
  console.log("--- Auth: authenticateToken started ---")
  try {
    const authHeader = req.headers["authorization"]
    const token = authHeader && authHeader.split(" ")[1]

    if (!token) {
      console.log("❌ Auth: No token provided")
      return res.status(401).json({ message: "Access token required" })
    }

    console.log("🔍 Auth: Verifying token...")
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    console.log("✅ Auth: Token decoded - User ID:", decoded.id, "Role:", decoded.role)

    // Verify user still exists and is active
    const result = await pool.query(
      "SELECT id, name, email, role, supervisor, is_active FROM clone_users_apprudnik WHERE id = $1 AND is_active = true",
      [decoded.id],
    )

    if (result.rows.length === 0) {
      console.log("❌ Auth: User not found or inactive for ID:", decoded.id)
      return res.status(401).json({ message: "User not found or inactive" })
    }

    req.user = result.rows[0]
    console.log("✅ Auth: User authenticated -", req.user.email, "with role:", req.user.role)
    next()
  } catch (error) {
    console.error("❌ Auth: Authentication error:", error.message)
    if (error.name === "TokenExpiredError") {
      return res.status(403).json({ message: "Token expired" })
    }
    return res.status(403).json({ message: "Invalid or expired token" })
  }
}

// Authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    console.log("--- Auth: authorize started ---")
    console.log("🔍 Auth: User role:", req.user?.role, "Required roles:", roles)

    if (!req.user) {
      console.log("❌ Auth: No user in request")
      return res.status(401).json({ message: "Authentication required" })
    }

    if (!roles.includes(req.user.role)) {
      console.log("❌ Auth: User role", req.user.role, "not in required roles:", roles)
      return res.status(403).json({ message: "Insufficient permissions" })
    }

    console.log("✅ Auth: User authorized")
    next()
  }
}

// Helper function to get date range
function getDateRange(period) {
  if (!period) {
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return {
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    }
  }

  const [year, month] = period.split("-")
  const startDate = `${year}-${month.padStart(2, "0")}-01`
  const endDate = `${year}-${month.padStart(2, "0")}-31`

  return { startDate, endDate }
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
    console.log("👤 Login: User found - ID:", user.id, "Role:", user.role)

    if (password !== "123456") {
      console.log("❌ Login: Invalid password")
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
  }
})

// Goals API endpoints
app.get("/api/goals", authenticateToken, authorize("admin", "gerente_comercial"), async (req, res) => {
  console.log("--- Goals API: GET /api/goals started ---")
  try {
    const { period } = req.query
    const { startDate, endDate } = getDateRange(period)
    console.log("📅 Goals: Date range:", { startDate, endDate })

    // Check if tables exist first
    const tableCheckQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'metas_gerais'
      ) as metas_gerais_exists,
      EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'metas_individuais'
      ) as metas_individuais_exists
    `

    const tableCheck = await pool.query(tableCheckQuery)
    console.log("🔍 Goals: Table check:", tableCheck.rows[0])

    if (!tableCheck.rows[0].metas_gerais_exists || !tableCheck.rows[0].metas_individuais_exists) {
      console.log("❌ Goals: Tables do not exist, returning empty data")
      return res.json({
        generalGoals: [],
        individualGoals: [],
        message: "Goal tables not found. Please run the database migration script.",
      })
    }

    const generalGoalsQuery = `
      SELECT * FROM metas_gerais 
      WHERE data_inicio <= $2 AND data_fim >= $1
      ORDER BY data_inicio DESC
    `
    const generalGoals = await pool.query(generalGoalsQuery, [startDate, endDate])
    console.log("✅ Goals: Fetched", generalGoals.rows.length, "general goals")

    const individualGoalsQuery = `
      SELECT m.*, u.name as user_name, u.email as user_email 
      FROM metas_individuais m
      JOIN clone_users_apprudnik u ON m.usuario_id = u.id
      WHERE m.data_inicio <= $2 AND m.data_fim >= $1
      ORDER BY u.name, m.data_inicio DESC
    `
    const individualGoals = await pool.query(individualGoalsQuery, [startDate, endDate])
    console.log("✅ Goals: Fetched", individualGoals.rows.length, "individual goals")

    res.json({
      generalGoals: generalGoals.rows,
      individualGoals: individualGoals.rows,
    })
  } catch (error) {
    console.error("❌ Goals: Error fetching goals:", error.message)
    res.status(500).json({
      message: "Erro ao carregar metas",
      error: error.message,
    })
  }
})

// Create/Update goal
app.post("/api/goals", authenticateToken, authorize("admin", "gerente_comercial"), async (req, res) => {
  console.log("--- Goals API: POST /api/goals started ---")
  try {
    const { type, goalData } = req.body
    const { id, tipo_meta, valor_meta, data_inicio, data_fim, usuario_id } = goalData
    const created_by = req.user.id

    console.log("📝 Goals: Creating/updating goal:", { type, goalData })

    let result
    if (type === "general") {
      if (id) {
        result = await pool.query(
          `UPDATE metas_gerais SET tipo_meta = $1, valor_meta = $2, data_inicio = $3, data_fim = $4, atualizado_em = NOW()
           WHERE id = $5 RETURNING *`,
          [tipo_meta, valor_meta, data_inicio, data_fim, id],
        )
      } else {
        result = await pool.query(
          `INSERT INTO metas_gerais (tipo_meta, valor_meta, data_inicio, data_fim, criado_por)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [tipo_meta, valor_meta, data_inicio, data_fim, created_by],
        )
      }
    } else if (type === "individual") {
      if (id) {
        result = await pool.query(
          `UPDATE metas_individuais SET tipo_meta = $1, valor_meta = $2, data_inicio = $3, data_fim = $4, usuario_id = $5, atualizado_em = NOW()
           WHERE id = $6 RETURNING *`,
          [tipo_meta, valor_meta, data_inicio, data_fim, usuario_id, id],
        )
      } else {
        result = await pool.query(
          `INSERT INTO metas_individuais (tipo_meta, valor_meta, data_inicio, data_fim, usuario_id, criado_por)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [tipo_meta, valor_meta, data_inicio, data_fim, usuario_id, created_by],
        )
      }
    } else {
      return res.status(400).json({ message: "Invalid goal type" })
    }

    console.log("✅ Goals: Goal saved successfully")
    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error("❌ Goals: Error saving goal:", error.message)
    res.status(500).json({
      message: "Erro ao salvar meta",
      error: error.message,
    })
  }
})

// Delete goal
app.delete("/api/goals/:type/:id", authenticateToken, authorize("admin", "gerente_comercial"), async (req, res) => {
  console.log("--- Goals API: DELETE /api/goals started ---")
  try {
    const { type, id } = req.params
    console.log("🗑️ Goals: Deleting goal:", { type, id })

    if (type === "general") {
      await pool.query("DELETE FROM metas_gerais WHERE id = $1", [id])
    } else if (type === "individual") {
      await pool.query("DELETE FROM metas_individuais WHERE id = $1", [id])
    } else {
      return res.status(400).json({ message: "Invalid goal type" })
    }

    console.log("✅ Goals: Goal deleted successfully")
    res.status(204).send()
  } catch (error) {
    console.error("❌ Goals: Error deleting goal:", error.message)
    res.status(500).json({
      message: "Erro ao excluir meta",
      error: error.message,
    })
  }
})

// Get goal tracking for seller
app.get("/api/goals/tracking/seller/:id", authenticateToken, async (req, res) => {
  console.log("--- Goals API: GET /api/goals/tracking/seller started ---")
  try {
    const { id } = req.params
    const { period } = req.query
    const { startDate, endDate } = getDateRange(period)

    console.log("📊 Goals Tracking: User ID:", id, "Period:", period)

    // Check if user can access this data
    if (req.user.role === "vendedor" && req.user.id !== Number.parseInt(id)) {
      return res.status(403).json({ message: "Access denied" })
    }

    // Get individual goals for this user
    const individualGoalsQuery = `
      SELECT * FROM metas_individuais 
      WHERE usuario_id = $1 
      AND data_inicio <= $3 AND data_fim >= $2
      ORDER BY data_inicio DESC
    `
    const individualGoals = await pool.query(individualGoalsQuery, [id, startDate, endDate])

    // Get general goals that apply to this user
    const generalGoalsQuery = `
      SELECT * FROM metas_gerais 
      WHERE data_inicio <= $2 AND data_fim >= $1
      ORDER BY data_inicio DESC
    `
    const generalGoals = await pool.query(generalGoalsQuery, [startDate, endDate])

    // Get actual performance data
    const performanceQuery = `
      SELECT 
        COUNT(*) as total_propostas,
        COUNT(CASE WHEN has_generated_sale = true THEN 1 END) as propostas_convertidas,
        COALESCE(SUM(CASE WHEN has_generated_sale = true THEN CAST(total_price AS DECIMAL) END), 0) as faturamento_total
      FROM clone_propostas_apprudnik 
      WHERE seller = $1 AND created_at >= $2 AND created_at <= $3
    `
    const performance = await pool.query(performanceQuery, [id, startDate, endDate])

    const actualData = performance.rows[0]

    // Calculate progress for each goal
    const processGoals = (goals, isIndividual = false) => {
      return goals.map((goal) => {
        let achieved = 0
        if (goal.tipo_meta === "faturamento") {
          achieved = Number.parseFloat(actualData.faturamento_total)
        } else if (goal.tipo_meta === "propostas") {
          achieved = Number.parseInt(actualData.total_propostas)
        }

        const target = Number.parseFloat(goal.valor_meta)
        const progress = target > 0 ? (achieved / target) * 100 : 0

        return {
          ...goal,
          achieved,
          progress: Math.min(progress, 100), // Cap at 100%
          isIndividual,
        }
      })
    }

    const individualGoalsWithProgress = processGoals(individualGoals.rows, true)
    const generalGoalsWithProgress = processGoals(generalGoals.rows, false)

    const allGoals = [...individualGoalsWithProgress, ...generalGoalsWithProgress]

    console.log("✅ Goals Tracking: Processed", allGoals.length, "goals")

    res.json(allGoals)
  } catch (error) {
    console.error("❌ Goals Tracking: Error:", error.message)
    res.status(500).json({
      message: "Erro ao carregar tracking de metas",
      error: error.message,
    })
  }
})

// Get comprehensive team performance for gerente_comercial
app.get("/api/performance/team", authenticateToken, authorize("admin", "gerente_comercial"), async (req, res) => {
  console.log("--- Performance API: GET /api/performance/team started ---")
  try {
    const { period } = req.query
    const { startDate, endDate } = getDateRange(period)

    console.log("📊 Team Performance: Date range:", { startDate, endDate })

    // Get all active sales representatives
    const teamMembersQuery = `
      SELECT id, name, email, role, supervisor
      FROM clone_users_apprudnik 
      WHERE role IN ('vendedor', 'representante') AND is_active = true
      ORDER BY name
    `
    const teamMembers = await pool.query(teamMembersQuery)

    // Get performance data for each team member
    const performancePromises = teamMembers.rows.map(async (member) => {
      // Basic performance metrics
      const performanceQuery = `
        SELECT 
          COUNT(*) as total_propostas,
          COUNT(CASE WHEN has_generated_sale = true THEN 1 END) as propostas_convertidas,
          COALESCE(SUM(CASE WHEN has_generated_sale = true THEN CAST(total_price AS DECIMAL) END), 0) as faturamento_total,
          COALESCE(AVG(CASE WHEN has_generated_sale = true THEN CAST(total_price AS DECIMAL) END), 0) as ticket_medio
        FROM clone_propostas_apprudnik 
        WHERE seller = $1 AND created_at >= $2 AND created_at <= $3
      `
      const performance = await pool.query(performanceQuery, [member.id, startDate, endDate])
      const perfData = performance.rows[0]

      // Calculate conversion rate
      const totalPropostas = Number.parseInt(perfData.total_propostas)
      const propostasConvertidas = Number.parseInt(perfData.propostas_convertidas)
      const conversionRate = totalPropostas > 0 ? (propostasConvertidas / totalPropostas) * 100 : 0

      // Get individual goals for this member
      const individualGoalsQuery = `
        SELECT * FROM metas_individuais 
        WHERE usuario_id = $1 
        AND data_inicio <= $3 AND data_fim >= $2
        ORDER BY data_inicio DESC
      `
      const individualGoals = await pool.query(individualGoalsQuery, [member.id, startDate, endDate])

      // Get general goals
      const generalGoalsQuery = `
        SELECT * FROM metas_gerais 
        WHERE data_inicio <= $2 AND data_fim >= $1
        ORDER BY data_inicio DESC
      `
      const generalGoals = await pool.query(generalGoalsQuery, [startDate, endDate])

      // Calculate goal achievement
      const calculateGoalAchievement = (goals) => {
        return goals.map((goal) => {
          let achieved = 0
          if (goal.tipo_meta === "faturamento") {
            achieved = Number.parseFloat(perfData.faturamento_total)
          } else if (goal.tipo_meta === "propostas") {
            achieved = Number.parseInt(perfData.total_propostas)
          }

          const target = Number.parseFloat(goal.valor_meta)
          const progress = target > 0 ? (achieved / target) * 100 : 0

          return {
            ...goal,
            achieved,
            target,
            progress: Math.round(progress * 100) / 100,
            status: progress >= 100 ? "achieved" : progress >= 75 ? "on-track" : "behind",
          }
        })
      }

      const individualGoalsWithProgress = calculateGoalAchievement(individualGoals.rows)
      const generalGoalsWithProgress = calculateGoalAchievement(generalGoals.rows)

      // Get monthly trend data
      const monthlyTrendQuery = `
        SELECT 
          DATE_TRUNC('month', created_at) as mes,
          COUNT(*) as propostas,
          COUNT(CASE WHEN has_generated_sale = true THEN 1 END) as vendas,
          COALESCE(SUM(CASE WHEN has_generated_sale = true THEN CAST(total_price AS DECIMAL) END), 0) as faturamento
        FROM clone_propostas_apprudnik 
        WHERE seller = $1 AND created_at >= $2 AND created_at <= $3
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY mes
      `
      const monthlyTrend = await pool.query(monthlyTrendQuery, [member.id, startDate, endDate])

      return {
        ...member,
        performance: {
          totalPropostas,
          propostasConvertidas,
          faturamentoTotal: Number.parseFloat(perfData.faturamento_total),
          ticketMedio: Number.parseFloat(perfData.ticket_medio),
          conversionRate: Math.round(conversionRate * 100) / 100,
        },
        goals: {
          individual: individualGoalsWithProgress,
          general: generalGoalsWithProgress,
          totalGoals: individualGoalsWithProgress.length + generalGoalsWithProgress.length,
          achievedGoals: [...individualGoalsWithProgress, ...generalGoalsWithProgress].filter(
            (g) => g.status === "achieved",
          ).length,
        },
        monthlyTrend: monthlyTrend.rows.map((row) => ({
          mes: row.mes,
          propostas: Number.parseInt(row.propostas),
          vendas: Number.parseInt(row.vendas),
          faturamento: Number.parseFloat(row.faturamento),
          conversionRate: row.propostas > 0 ? Math.round((row.vendas / row.propostas) * 10000) / 100 : 0,
        })),
      }
    })

    const teamPerformance = await Promise.all(performancePromises)

    // Calculate team-wide statistics
    const teamStats = {
      totalMembers: teamPerformance.length,
      totalPropostas: teamPerformance.reduce((sum, member) => sum + member.performance.totalPropostas, 0),
      totalVendas: teamPerformance.reduce((sum, member) => sum + member.performance.propostasConvertidas, 0),
      totalFaturamento: teamPerformance.reduce((sum, member) => sum + member.performance.faturamentoTotal, 0),
      averageConversionRate:
        teamPerformance.length > 0
          ? Math.round(
              (teamPerformance.reduce((sum, member) => sum + member.performance.conversionRate, 0) /
                teamPerformance.length) *
                100,
            ) / 100
          : 0,
      totalGoals: teamPerformance.reduce((sum, member) => sum + member.goals.totalGoals, 0),
      totalAchievedGoals: teamPerformance.reduce((sum, member) => sum + member.goals.achievedGoals, 0),
    }

    teamStats.teamConversionRate =
      teamStats.totalPropostas > 0 ? Math.round((teamStats.totalVendas / teamStats.totalPropostas) * 10000) / 100 : 0

    teamStats.goalAchievementRate =
      teamStats.totalGoals > 0 ? Math.round((teamStats.totalAchievedGoals / teamStats.totalGoals) * 10000) / 100 : 0

    console.log("✅ Team Performance: Processed", teamPerformance.length, "team members")

    res.json({
      teamStats,
      teamMembers: teamPerformance,
      period: { startDate, endDate },
    })
  } catch (error) {
    console.error("❌ Team Performance: Error:", error.message)
    res.status(500).json({
      message: "Erro ao carregar performance da equipe",
      error: error.message,
    })
  }
})

// Get users for goal assignment
app.get("/api/users", authenticateToken, authorize("admin", "gerente_comercial"), async (req, res) => {
  console.log("--- Users API: GET /api/users started ---")
  try {
    const usersQuery = `
      SELECT id, name, email, role, supervisor, is_active
      FROM clone_users_apprudnik 
      WHERE is_active = true
      ORDER BY name
    `

    const result = await pool.query(usersQuery)
    console.log("✅ Users: Fetched", result.rows.length, "users")

    res.json(result.rows)
  } catch (error) {
    console.error("❌ Users: Error fetching users:", error.message)
    res.status(500).json({
      message: "Erro ao buscar usuários",
      error: error.message,
    })
  }
})

// Dashboard endpoints (keeping existing ones)
app.get("/api/dashboard/vendedor/:id", authenticateToken, async (req, res) => {
  try {
    console.log("📊 Vendedor dashboard request:", { id: req.params.id, period: req.query.period })
    const { id } = req.params
    const { period } = req.query

    const { startDate, endDate } = getDateRange(period)
    console.log("📅 Date range:", { startDate, endDate })

    // Check if user can access this data
    if (req.user.role === "vendedor" && req.user.id !== Number.parseInt(id)) {
      return res.status(403).json({ message: "Access denied" })
    }

    // Get proposals data
    const proposalsQuery = `
      SELECT 
        COUNT(*) as total, 
        COUNT(CASE WHEN has_generated_sale = true THEN 1 END) as convertidas,
        COALESCE(SUM(CASE WHEN has_generated_sale = true THEN CAST(total_price AS DECIMAL) END), 0) as faturamento_total
      FROM clone_propostas_apprudnik 
      WHERE seller = $1 AND created_at >= $2 AND created_at <= $3
    `

    const propostas = await pool.query(proposalsQuery, [id, startDate, endDate])

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
    console.error("❌ Dashboard vendedor error:", error)
    res.status(500).json({
      message: "Erro ao carregar dashboard",
      error: error.message,
    })
  }
})

app.get("/api/dashboard/representante/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { period } = req.query

    const { startDate, endDate } = getDateRange(period)

    if (req.user.role === "representante" && req.user.id !== Number.parseInt(id)) {
      return res.status(403).json({ message: "Access denied" })
    }

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

app.get("/api/dashboard/supervisor/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { period } = req.query

    const { startDate, endDate } = getDateRange(period)

    if (req.user.role === "supervisor" && req.user.id !== Number.parseInt(id)) {
      return res.status(403).json({ message: "Access denied" })
    }

    const teamQuery = `
      SELECT id, name FROM clone_users_apprudnik 
      WHERE supervisor = $1 AND is_active = true
    `
    const vendedores = await pool.query(teamQuery, [id])
    const vendedorIds = vendedores.rows.map((v) => v.id)

    if (vendedorIds.length === 0) {
      return res.json({
        resumo: { totalPropostas: 0, propostasConvertidas: 0, faturamentoTotal: 0 },
        rankingVendedores: [],
      })
    }

    const teamSummaryQuery = `
      SELECT 
        COUNT(*) as total_propostas,
        COUNT(CASE WHEN has_generated_sale = true THEN 1 END) as convertidas,
        COALESCE(SUM(CASE WHEN has_generated_sale = true THEN CAST(total_price AS DECIMAL) END), 0) as faturamento
      FROM clone_propostas_apprudnik 
      WHERE seller = ANY($1) AND created_at >= $2 AND created_at <= $3
    `

    const resumoEquipe = await pool.query(teamSummaryQuery, [vendedorIds, startDate, endDate])

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

app.get("/api/dashboard/gerente_comercial", authenticateToken, async (req, res) => {
  try {
    const { period } = req.query

    const { startDate, endDate } = getDateRange(period)

    const globalQuery = `
      SELECT 
        COUNT(*) as total_propostas,
        COUNT(CASE WHEN has_generated_sale = true THEN 1 END) as vendas,
        COALESCE(SUM(CASE WHEN has_generated_sale = true THEN CAST(p.total_price AS DECIMAL) END), 0) as faturamento_total
      FROM clone_propostas_apprudnik 
      WHERE created_at >= $1 AND created_at <= $2
    `

    const indicadores = await pool.query(globalQuery, [startDate, endDate])

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
        totalPropostas: Number.parseInt(indicadores.rows[0].total_propostas),
        totalVendas: Number.parseInt(indicadores.rows[0].vendas),
        faturamentoTotal: Number.parseFloat(indicadores.rows[0].faturamento_total),
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
  console.error("💥 Global Error Handler:", error)
  res.status(error.status || 500).json({
    message: error.message || "Internal server error",
    error: process.env.NODE_ENV === "development" ? error.stack : undefined,
  })
})

// 404 handler
app.use("*", (req, res) => {
  console.log("❌ 404: Route not found:", req.originalUrl)
  res.status(404).json({ message: "Route not found" })
})

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📊 Dashboard API available at http://localhost:${PORT}/api/dashboard`)
  console.log(`🎯 Goals API available at http://localhost:${PORT}/api/goals`)
  console.log(`👤 Users API available at http://localhost:${PORT}/api/users`)
  console.log(`📈 Performance API available at http://localhost:${PORT}/api/performance`)
  console.log(`🏥 Health check at http://localhost:${PORT}/health`)
})
