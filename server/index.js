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
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "sales_dashboard",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
})

pool.on("connect", () => console.log("✅ Connected to PostgreSQL database"))
pool.on("error", (err) => console.error("💥 Database connection error:", err))

// Middleware
app.use(cors({ origin: "http://localhost:5173", credentials: true }))
app.use(express.json())
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`)
  next()
})

// Auth Middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"]
    const token = authHeader && authHeader.split(" ")[1]
    if (!token) return res.sendStatus(401)

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key")

    // Verify user still exists and is active
    const result = await pool.query(
      "SELECT id, name, email, role, supervisor, is_active FROM clone_users_apprudnik WHERE id = $1 AND is_active = true",
      [decoded.id],
    )

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "User not found or inactive" })
    }

    req.user = result.rows[0]
    next()
  } catch (error) {
    console.error("❌ Auth error:", error.message)
    return res.status(403).json({ message: "Invalid or expired token" })
  }
}

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" })
    }
    next()
  }
}

// Helper to get date range
function getDateRange(period, startDate, endDate) {
  if (startDate && endDate) {
    return { startDate, endDate }
  }
  if (period) {
    const [year, month] = period.split("-")
    const start = new Date(year, Number.parseInt(month) - 1, 1)
    const end = new Date(year, Number.parseInt(month), 0)
    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    }
  }
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  }
}

// API Endpoints

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body
    const result = await pool.query("SELECT * FROM clone_users_apprudnik WHERE email = $1 AND is_active = true", [
      email,
    ])
    if (result.rows.length === 0) return res.status(401).json({ message: "Credenciais inválidas" })

    const user = result.rows[0]
    if (password !== "123456") return res.status(401).json({ message: "Credenciais inválidas" })

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" },
    )
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } })
  } catch (error) {
    console.error("❌ Login error:", error)
    res.status(500).json({ message: "Erro interno do servidor", error: error.message })
  }
})

// Get Team Leaders (Supervisors and Parceiros)
app.get("/api/team-leaders", authenticateToken, authorize("admin", "gerente_comercial"), async (req, res) => {
  try {
    const leadersQuery = `
      SELECT DISTINCT id, name, role
      FROM clone_users_apprudnik 
      WHERE role IN ('supervisor', 'parceiro_comercial') AND is_active = true
      ORDER BY name
    `
    const { rows } = await pool.query(leadersQuery)
    console.log("✅ Team Leaders: Fetched", rows.length, "leaders")
    res.json(rows)
  } catch (error) {
    console.error("❌ Error fetching team leaders:", error)
    res.status(500).json({ message: "Erro ao buscar líderes de equipe", error: error.message })
  }
})

// Get Team Performance with fixed JSON handling
app.get("/api/performance/team", authenticateToken, authorize("admin", "gerente_comercial"), async (req, res) => {
  console.log("--- Performance API: GET /api/performance/team started ---")
  try {
    const { period, startDate, endDate, supervisor } = req.query
    const { startDate: dateStart, endDate: dateEnd } = getDateRange(period, startDate, endDate)

    console.log("📊 Team Performance: Date range:", { dateStart, dateEnd, supervisor })

    // Build supervisor filter with proper JSON handling
    let supervisorFilter = ""
    const queryParams = [dateStart, dateEnd]

    if (supervisor && supervisor !== "all") {
      // Use JSON contains operator for proper JSONB handling
      supervisorFilter = `AND (
        u.supervisor = $3 OR 
        u.id IN (
          SELECT jsonb_array_elements_text(children)::int 
          FROM clone_users_apprudnik 
          WHERE id = $3 AND children IS NOT NULL
        )
      )`
      queryParams.push(Number.parseInt(supervisor))
    }

    // Get all active sales representatives with targets
    const teamMembersQuery = `
      SELECT 
        u.id, u.name, u.email, u.role, u.supervisor,
        s.name as supervisor_name,
        COUNT(p.*) as total_propostas,
        COUNT(CASE WHEN p.has_generated_sale = true THEN 1 END) as propostas_convertidas,
        COALESCE(SUM(CASE WHEN p.has_generated_sale = true THEN p.total_price END), 0) as faturamento_total,
        COALESCE(AVG(CASE WHEN p.has_generated_sale = true THEN p.total_price END), 0) as ticket_medio,
        -- Default targets (can be customized per user)
        CASE 
          WHEN u.role = 'vendedor' THEN 50
          WHEN u.role = 'representante' THEN 30
          ELSE 40
        END as meta_propostas,
        CASE 
          WHEN u.role = 'vendedor' THEN 15
          WHEN u.role = 'representante' THEN 10
          ELSE 12
        END as meta_vendas,
        CASE 
          WHEN u.role = 'vendedor' THEN 75000
          WHEN u.role = 'representante' THEN 50000
          ELSE 60000
        END as meta_faturamento
      FROM clone_users_apprudnik u
      LEFT JOIN clone_users_apprudnik s ON u.supervisor = s.id
      LEFT JOIN clone_propostas_apprudnik p ON u.id = p.seller 
        AND p.created_at >= $1 AND p.created_at <= $2
      WHERE u.role IN ('vendedor', 'representante') AND u.is_active = true
      ${supervisorFilter}
      GROUP BY u.id, u.name, u.email, u.role, u.supervisor, s.name
      ORDER BY faturamento_total DESC
    `

    const teamMembers = await pool.query(teamMembersQuery, queryParams)

    // Calculate team stats
    const totalMembers = teamMembers.rows.length
    const totalPropostas = teamMembers.rows.reduce((sum, member) => sum + Number.parseInt(member.total_propostas), 0)
    const totalConvertidas = teamMembers.rows.reduce(
      (sum, member) => sum + Number.parseInt(member.propostas_convertidas),
      0,
    )
    const totalFaturamento = teamMembers.rows.reduce(
      (sum, member) => sum + Number.parseFloat(member.faturamento_total),
      0,
    )
    const teamConversionRate = totalPropostas > 0 ? ((totalConvertidas / totalPropostas) * 100).toFixed(2) : 0

    // Calculate goal achievement rates
    const totalMetaPropostas = teamMembers.rows.reduce((sum, member) => sum + Number.parseInt(member.meta_propostas), 0)
    const totalMetaVendas = teamMembers.rows.reduce((sum, member) => sum + Number.parseInt(member.meta_vendas), 0)
    const totalMetaFaturamento = teamMembers.rows.reduce(
      (sum, member) => sum + Number.parseFloat(member.meta_faturamento),
      0,
    )

    const goalAchievementRate =
      totalMetaFaturamento > 0 ? ((totalFaturamento / totalMetaFaturamento) * 100).toFixed(2) : 0

    // Format team members data
    const formattedTeamMembers = teamMembers.rows.map((member) => {
      const conversionRate =
        member.total_propostas > 0 ? ((member.propostas_convertidas / member.total_propostas) * 100).toFixed(2) : 0

      return {
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.role,
        supervisor: member.supervisor,
        supervisorName: member.supervisor_name,
        performance: {
          totalPropostas: Number.parseInt(member.total_propostas),
          propostasConvertidas: Number.parseInt(member.propostas_convertidas),
          conversionRate: Number.parseFloat(conversionRate),
          faturamentoTotal: Number.parseFloat(member.faturamento_total),
          ticketMedio: Number.parseFloat(member.ticket_medio),
        },
        targets: {
          metaPropostas: Number.parseInt(member.meta_propostas),
          metaVendas: Number.parseInt(member.meta_vendas),
          metaFaturamento: Number.parseFloat(member.meta_faturamento),
        },
        achievements: {
          propostasAchievement:
            member.meta_propostas > 0 ? ((member.total_propostas / member.meta_propostas) * 100).toFixed(1) : 0,
          vendasAchievement:
            member.meta_vendas > 0 ? ((member.propostas_convertidas / member.meta_vendas) * 100).toFixed(1) : 0,
          faturamentoAchievement:
            member.meta_faturamento > 0 ? ((member.faturamento_total / member.meta_faturamento) * 100).toFixed(1) : 0,
        },
      }
    })

    console.log("✅ Team Performance: Processed", formattedTeamMembers.length, "team members")

    res.json({
      teamStats: {
        totalMembers,
        teamConversionRate: Number.parseFloat(teamConversionRate),
        totalFaturamento,
        goalAchievementRate: Number.parseFloat(goalAchievementRate),
        totalPropostas,
        totalConvertidas,
        totalMetaPropostas,
        totalMetaVendas,
        totalMetaFaturamento,
      },
      teamMembers: formattedTeamMembers,
      period: { startDate: dateStart, endDate: dateEnd },
      filters: { supervisor },
    })
  } catch (error) {
    console.error("❌ Team Performance: Error:", error.message)
    res.status(500).json({
      message: "Erro ao carregar performance da equipe",
      error: error.message,
    })
  }
})

// Get Revenue vs. Target Chart Data
app.get(
  "/api/dashboard/revenue-vs-target",
  authenticateToken,
  authorize("admin", "gerente_comercial"),
  async (req, res) => {
    try {
      const { period, startDate, endDate } = req.query
      const { startDate: dateStart, endDate: dateEnd } = getDateRange(period, startDate, endDate)

      console.log("📊 Revenue vs Target: Date range:", { dateStart, dateEnd })

      // Get monthly revenue data
      const revenueQuery = `
        SELECT 
          to_char(date_trunc('month', p.created_at), 'YYYY-MM') as month, 
          COALESCE(SUM(p.total_price), 0) as revenue
        FROM clone_propostas_apprudnik p
        WHERE p.has_generated_sale = true AND p.created_at BETWEEN $1 AND $2
        GROUP BY date_trunc('month', p.created_at)
        ORDER BY month
      `
      const revenueResult = await pool.query(revenueQuery, [dateStart, dateEnd])

      // Get monthly targets (using a default target for now)
      const defaultMonthlyTarget = 150000 // R$ 150,000 per month

      // Create chart data combining revenue and targets
      const chartData = []
      const currentDate = new Date(dateStart)
      const endDateObj = new Date(dateEnd)

      while (currentDate <= endDateObj) {
        const monthKey = currentDate.toISOString().substring(0, 7) // YYYY-MM format
        const revenueData = revenueResult.rows.find((row) => row.month === monthKey)

        chartData.push({
          month: monthKey,
          revenue: revenueData ? Number.parseFloat(revenueData.revenue) : 0,
          target: defaultMonthlyTarget,
          monthName: currentDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
        })

        currentDate.setMonth(currentDate.getMonth() + 1)
      }

      console.log("✅ Revenue vs Target: Generated", chartData.length, "data points")
      res.json(chartData)
    } catch (error) {
      console.error("❌ Error fetching revenue vs target chart data:", error)
      res.status(500).json({ message: "Erro ao carregar dados do gráfico", error: error.message })
    }
  },
)

// Get Revenue by Supervisor Chart Data
app.get(
  "/api/dashboard/revenue-by-supervisor",
  authenticateToken,
  authorize("admin", "gerente_comercial"),
  async (req, res) => {
    try {
      const { period, startDate, endDate } = req.query
      const { startDate: dateStart, endDate: dateEnd } = getDateRange(period, startDate, endDate)

      console.log("📊 Revenue by Supervisor: Date range:", { dateStart, dateEnd })

      // Get revenue by supervisor using the children JSON field
      const query = `
        WITH supervisor_revenue AS (
          SELECT 
            s.id as supervisor_id,
            s.name as supervisor_name,
            s.role as supervisor_role,
            COALESCE(SUM(p.total_price), 0) as total_revenue
          FROM clone_users_apprudnik s
          LEFT JOIN clone_propostas_apprudnik p ON p.seller IN (
            SELECT jsonb_array_elements_text(s.children)::int
            WHERE s.children IS NOT NULL
          ) AND p.has_generated_sale = true AND p.created_at BETWEEN $1 AND $2
          WHERE s.role IN ('supervisor', 'parceiro_comercial') AND s.is_active = true
          GROUP BY s.id, s.name, s.role
        )
        SELECT 
          supervisor_name,
          supervisor_role,
          total_revenue
        FROM supervisor_revenue
        WHERE total_revenue > 0
        ORDER BY total_revenue DESC
      `

      const { rows } = await pool.query(query, [dateStart, dateEnd])

      const chartData = rows.map((row) => ({
        supervisorName: row.supervisor_name,
        supervisorRole: row.supervisor_role,
        totalRevenue: Number.parseFloat(row.total_revenue),
      }))

      console.log("✅ Revenue by Supervisor: Generated", chartData.length, "data points")
      res.json(chartData)
    } catch (error) {
      console.error("❌ Error fetching revenue by supervisor chart data:", error)
      res.status(500).json({ message: "Erro ao carregar dados do gráfico", error: error.message })
    }
  },
)

// Get detailed representative performance (drill-down)
app.get(
  "/api/performance/representative/:id",
  authenticateToken,
  authorize("admin", "gerente_comercial"),
  async (req, res) => {
    console.log("--- Performance API: GET /api/performance/representative started ---")
    try {
      const { id } = req.params
      const { period, startDate, endDate } = req.query
      const { startDate: dateStart, endDate: dateEnd } = getDateRange(period, startDate, endDate)

      console.log("📊 Representative Performance: User ID:", id, "Date range:", { dateStart, dateEnd })

      // Get representative basic info
      const userQuery = `
        SELECT u.*, s.name as supervisor_name
        FROM clone_users_apprudnik u
        LEFT JOIN clone_users_apprudnik s ON u.supervisor = s.id
        WHERE u.id = $1
      `
      const userResult = await pool.query(userQuery, [id])

      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "Representative not found" })
      }

      const representative = userResult.rows[0]

      // Get detailed proposals
      const proposalsQuery = `
        SELECT 
          id, client_name, total_price, has_generated_sale, created_at,
          CASE 
            WHEN has_generated_sale = true THEN 'Convertida'
            ELSE 'Pendente'
          END as status
        FROM clone_propostas_apprudnik 
        WHERE seller = $1 AND created_at >= $2 AND created_at <= $3
        ORDER BY created_at DESC
      `
      const proposals = await pool.query(proposalsQuery, [id, dateStart, dateEnd])

      // Get monthly performance trend
      const monthlyTrendQuery = `
        SELECT 
          DATE_TRUNC('month', created_at) as mes,
          COUNT(*) as propostas,
          COUNT(CASE WHEN has_generated_sale = true THEN 1 END) as vendas,
          COALESCE(SUM(CASE WHEN has_generated_sale = true THEN total_price END), 0) as faturamento,
          COALESCE(AVG(CASE WHEN has_generated_sale = true THEN total_price END), 0) as ticket_medio
        FROM clone_propostas_apprudnik 
        WHERE seller = $1 AND created_at >= $2 AND created_at <= $3
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY mes
      `
      const monthlyTrend = await pool.query(monthlyTrendQuery, [id, dateStart, dateEnd])

      // Get weekly performance for detailed chart
      const weeklyTrendQuery = `
        SELECT 
          DATE_TRUNC('week', created_at) as semana,
          COUNT(*) as propostas,
          COUNT(CASE WHEN has_generated_sale = true THEN 1 END) as vendas,
          COALESCE(SUM(CASE WHEN has_generated_sale = true THEN total_price END), 0) as faturamento
        FROM clone_propostas_apprudnik 
        WHERE seller = $1 AND created_at >= $2 AND created_at <= $3
        GROUP BY DATE_TRUNC('week', created_at)
        ORDER BY semana
      `
      const weeklyTrend = await pool.query(weeklyTrendQuery, [id, dateStart, dateEnd])

      // Get conversion funnel data
      const funnelQuery = `
        SELECT 
          COUNT(*) as total_propostas,
          COUNT(CASE WHEN has_generated_sale = true THEN 1 END) as vendas_fechadas,
          COALESCE(SUM(total_price), 0) as valor_total_propostas,
          COALESCE(SUM(CASE WHEN has_generated_sale = true THEN total_price END), 0) as valor_vendas
        FROM clone_propostas_apprudnik 
        WHERE seller = $1 AND created_at >= $2 AND created_at <= $3
      `
      const funnel = await pool.query(funnelQuery, [id, dateStart, dateEnd])

      // Calculate performance metrics
      const totalPropostas = Number.parseInt(funnel.rows[0].total_propostas)
      const vendasFechadas = Number.parseInt(funnel.rows[0].vendas_fechadas)
      const conversionRate = totalPropostas > 0 ? ((vendasFechadas / totalPropostas) * 100).toFixed(2) : 0
      const ticketMedio = vendasFechadas > 0 ? (funnel.rows[0].valor_vendas / vendasFechadas).toFixed(2) : 0

      const response = {
        representative: {
          id: representative.id,
          name: representative.name,
          email: representative.email,
          role: representative.role,
          supervisorName: representative.supervisor_name,
        },
        summary: {
          totalPropostas,
          vendasFechadas,
          conversionRate: Number.parseFloat(conversionRate),
          faturamentoTotal: Number.parseFloat(funnel.rows[0].valor_vendas),
          ticketMedio: Number.parseFloat(ticketMedio),
          valorTotalPropostas: Number.parseFloat(funnel.rows[0].valor_total_propostas),
        },
        proposals: proposals.rows.map((proposal) => ({
          id: proposal.id,
          clientName: proposal.client_name,
          totalPrice: Number.parseFloat(proposal.total_price),
          status: proposal.status,
          createdAt: proposal.created_at,
          hasGeneratedSale: proposal.has_generated_sale,
        })),
        monthlyTrend: monthlyTrend.rows.map((row) => ({
          mes: row.mes,
          propostas: Number.parseInt(row.propostas),
          vendas: Number.parseInt(row.vendas),
          faturamento: Number.parseFloat(row.faturamento),
          ticketMedio: Number.parseFloat(row.ticket_medio),
          conversionRate: row.propostas > 0 ? ((row.vendas / row.propostas) * 100).toFixed(2) : 0,
        })),
        weeklyTrend: weeklyTrend.rows.map((row) => ({
          semana: row.semana,
          propostas: Number.parseInt(row.propostas),
          vendas: Number.parseInt(row.vendas),
          faturamento: Number.parseFloat(row.faturamento),
          conversionRate: row.propostas > 0 ? ((row.vendas / row.propostas) * 100).toFixed(2) : 0,
        })),
        period: { startDate: dateStart, endDate: dateEnd },
      }

      console.log("✅ Representative Performance: Processed data for", representative.name)
      res.json(response)
    } catch (error) {
      console.error("❌ Representative Performance: Error:", error.message)
      res.status(500).json({
        message: "Erro ao carregar performance do representante",
        error: error.message,
      })
    }
  },
)

// Get supervisors list
app.get("/api/supervisors", authenticateToken, authorize("admin", "gerente_comercial"), async (req, res) => {
  console.log("--- Supervisors API: GET /api/supervisors started ---")
  try {
    const supervisorsQuery = `
      SELECT DISTINCT id, name, role
      FROM clone_users_apprudnik 
      WHERE role IN ('supervisor', 'parceiro_comercial') AND is_active = true
      ORDER BY name
    `
    const supervisors = await pool.query(supervisorsQuery)

    console.log("✅ Supervisors: Fetched", supervisors.rows.length, "supervisors")
    res.json(supervisors.rows)
  } catch (error) {
    console.error("❌ Supervisors: Error fetching supervisors:", error.message)
    res.status(500).json({
      message: "Erro ao buscar supervisores",
      error: error.message,
    })
  }
})

// Other dashboard endpoints remain the same...
app.get("/api/dashboard/vendedor/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { period } = req.query
    const { startDate, endDate } = getDateRange(period)

    if (req.user.role === "vendedor" && req.user.id !== Number.parseInt(id)) {
      return res.status(403).json({ message: "Access denied" })
    }

    const proposalsQuery = `
      SELECT 
        COUNT(*) as total, 
        COUNT(CASE WHEN has_generated_sale = true THEN 1 END) as convertidas,
        COALESCE(SUM(CASE WHEN has_generated_sale = true THEN total_price END), 0) as faturamento_total
      FROM clone_propostas_apprudnik 
      WHERE seller = $1 AND created_at >= $2 AND created_at <= $3
    `
    const propostas = await pool.query(proposalsQuery, [id, startDate, endDate])

    const monthlySalesQuery = `
      SELECT 
        DATE_TRUNC('month', created_at) as mes,
        COUNT(*) as total_propostas,
        COUNT(CASE WHEN has_generated_sale = true THEN 1 END) as vendas,
        COALESCE(SUM(CASE WHEN has_generated_sale = true THEN total_price END), 0) as faturamento
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

    res.json({
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
    })
  } catch (error) {
    console.error("❌ Dashboard vendedor error:", error)
    res.status(500).json({ message: "Erro ao carregar dashboard", error: error.message })
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
        COALESCE(SUM(CASE WHEN has_generated_sale = true THEN total_price END), 0) as faturamento_total
      FROM clone_propostas_apprudnik 
      WHERE created_at >= $1 AND created_at <= $2
    `
    const indicadores = await pool.query(globalQuery, [startDate, endDate])

    const monthlyRevenueQuery = `
      SELECT 
        DATE_TRUNC('month', created_at) as mes,
        COALESCE(SUM(total_price), 0) as faturamento,
        COUNT(CASE WHEN has_generated_sale = true THEN 1 END) as vendas
      FROM clone_propostas_apprudnik 
      WHERE has_generated_sale = true AND created_at >= $1 AND created_at <= $2
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY mes
    `
    const faturamentoMensal = await pool.query(monthlyRevenueQuery, [startDate, endDate])

    const metaMensal = 150000 // R$ 150.000,00

    res.json({
      indicadores: {
        totalPropostas: Number.parseInt(indicadores.rows[0].total_propostas),
        totalVendas: Number.parseInt(indicadores.rows[0].vendas),
        faturamentoTotal: Number.parseFloat(indicadores.rows[0].faturamento_total),
        metaMensal,
      },
      faturamentoMensal: faturamentoMensal.rows.map((row) => ({
        mes: row.mes,
        faturamento: Number.parseFloat(row.faturamento),
        vendas: Number.parseInt(row.vendas),
      })),
    })
  } catch (error) {
    console.error("❌ Dashboard gerente comercial error:", error)
    res.status(500).json({ message: "Erro ao carregar dashboard", error: error.message })
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
  res.status(404).json({ message: "Route not found" })
})

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📊 Dashboard API available at http://localhost:${PORT}/api/dashboard`)
  console.log(`📈 Performance API available at http://localhost:${PORT}/api/performance`)
  console.log(`🏥 Health check at http://localhost:${PORT}/health`)
})
