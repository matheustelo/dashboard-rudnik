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
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]
  if (!token) return res.sendStatus(401)

  jwt.verify(token, process.env.JWT_SECRET || "your-secret-key", (err, user) => {
    if (err) return res.sendStatus(403)
    req.user = user
    next()
  })
}

const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" })
    }
    next()
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
    // Using a placeholder password check as per previous context
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
    res.json(rows)
  } catch (error) {
    console.error("❌ Error fetching team leaders:", error)
    res.status(500).json({ message: "Erro ao buscar líderes de equipe", error: error.message })
  }
})

// Get Team Performance
app.get("/api/performance/team", authenticateToken, authorize("admin", "gerente_comercial"), async (req, res) => {
  try {
    const { period, startDate, endDate, supervisorId } = req.query
    const { startDate: dateStart, endDate: dateEnd } = getDateRange(period, startDate, endDate)

    let supervisorFilter = ""
    const queryParams = [dateStart, dateEnd]

    if (supervisorId && supervisorId !== "all") {
      // Filter by users who are children of the selected supervisor/parceiro
      supervisorFilter = `AND u.id IN (
        SELECT jsonb_array_elements_text(children)::bigint
        FROM clone_users_apprudnik
        WHERE id = $3
      )`
      queryParams.push(supervisorId)
    }

    const teamMembersQuery = `
      SELECT 
        u.id, u.name, u.email, u.role,
        sup.name as supervisor_name,
        COUNT(p.id) as total_propostas,
        SUM(CASE WHEN p.has_generated_sale = true THEN 1 ELSE 0 END) as propostas_convertidas,
        COALESCE(SUM(CASE WHEN p.has_generated_sale = true THEN CAST(p.total_price AS DECIMAL) ELSE 0 END), 0) as faturamento_total,
        COALESCE(m_prop.valor_meta, 40) as meta_propostas,
        COALESCE(m_vend.valor_meta, 12) as meta_vendas,
        COALESCE(m_fat.valor_meta, 60000) as meta_faturamento
      FROM clone_users_apprudnik u
      LEFT JOIN clone_users_apprudnik s ON u.supervisor = s.id
      LEFT JOIN clone_propostas_apprudnik p ON u.id = p.seller::bigint 
        AND p.created_at >= $1 AND p.created_at <= $2
      LEFT JOIN metas_individuais m_prop ON u.id = m_prop.usuario_id AND m_prop.tipo_meta = 'propostas' AND m_prop.data_inicio <= $2 AND m_prop.data_fim >= $1
      LEFT JOIN metas_individuais m_vend ON u.id = m_vend.usuario_id AND m_vend.tipo_meta = 'vendas' AND m_vend.data_inicio <= $2 AND m_vend.data_fim >= $1
      LEFT JOIN metas_individuais m_fat ON u.id = m_fat.usuario_id AND m_fat.tipo_meta = 'faturamento' AND m_fat.data_inicio <= $2 AND m_fat.data_fim >= $1
      WHERE u.role IN ('vendedor', 'representante') AND u.is_active = true
      ${supervisorFilter}
      GROUP BY u.id, u.name, u.email, u.role, sup.name, m_prop.valor_meta, m_vend.valor_meta, m_fat.valor_meta
      ORDER BY faturamento_total DESC
    `
    const { rows: teamMembers } = await pool.query(teamMembersQuery, queryParams)
    // ... (processing logic remains the same as previous turn, it's correct)
    const formattedTeamMembers = teamMembers.map((member) => {
      const conversionRate =
        member.total_propostas > 0 ? ((member.propostas_convertidas / member.total_propostas) * 100).toFixed(2) : 0
      return {
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.role,
        supervisorName: member.supervisor_name,
        performance: {
          totalPropostas: Number.parseInt(member.total_propostas),
          propostasConvertidas: Number.parseInt(member.propostas_convertidas),
          conversionRate: Number.parseFloat(conversionRate),
          faturamentoTotal: Number.parseFloat(member.faturamento_total),
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
    res.json({ teamMembers: formattedTeamMembers })
  } catch (error) {
    console.error("❌ Error fetching team performance:", error)
    res.status(500).json({ message: "Erro ao carregar performance da equipe", error: error.message })
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

      const revenueQuery = `
      SELECT to_char(date_trunc('month', p.created_at), 'YYYY-MM') as month, SUM(CAST(p.total_price AS DECIMAL)) as revenue
      FROM clone_propostas_apprudnik p
      WHERE p.has_generated_sale = true AND p.created_at BETWEEN $1 AND $2
      GROUP BY 1 ORDER BY 1;
    `
      const revenueResult = await pool.query(revenueQuery, [dateStart, dateEnd])

      const targetQuery = `
      SELECT to_char(date_trunc('month', m.data_inicio), 'YYYY-MM') as month, SUM(m.valor_meta) as target
      FROM metas_gerais m
      WHERE m.tipo_meta = 'faturamento' AND m.data_inicio BETWEEN $1 AND $2
      GROUP BY 1 ORDER BY 1;
    `
      const targetResult = await pool.query(targetQuery, [dateStart, dateEnd])

      const dataMap = new Map()
      revenueResult.rows.forEach((row) =>
        dataMap.set(row.month, { month: row.month, revenue: Number.parseFloat(row.revenue), target: 0 }),
      )
      targetResult.rows.forEach((row) => {
        if (!dataMap.has(row.month)) dataMap.set(row.month, { month: row.month, revenue: 0, target: 0 })
        dataMap.get(row.month).target = Number.parseFloat(row.target)
      })

      const chartData = Array.from(dataMap.values()).sort((a, b) => a.month.localeCompare(b.month))
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

      const query = `
      WITH supervisor_children AS (
        SELECT id as supervisor_id, name as supervisor_name,
          jsonb_array_elements_text(children)::bigint as child_id
        FROM clone_users_apprudnik
        WHERE role IN ('supervisor', 'parceiro_comercial')
      )
      SELECT sc.supervisor_name, COALESCE(SUM(CAST(p.total_price AS DECIMAL)), 0) as total_revenue
      FROM clone_propostas_apprudnik p
      JOIN supervisor_children sc ON p.seller::bigint = sc.child_id
      WHERE p.has_generated_sale = true AND p.created_at BETWEEN $1 AND $2
      GROUP BY sc.supervisor_name
      ORDER BY total_revenue DESC;
    `
      const { rows } = await pool.query(query, [dateStart, dateEnd])
      const chartData = rows.map((row) => ({
        supervisorName: row.supervisor_name,
        totalRevenue: Number.parseFloat(row.total_revenue),
      }))
      res.json(chartData)
    } catch (error) {
      console.error("❌ Error fetching revenue by supervisor chart data:", error)
      res.status(500).json({ message: "Erro ao carregar dados do gráfico", error: error.message })
    }
  },
)

// Get supervisors list
app.get("/api/supervisors", authenticateToken, authorize("admin", "gerente_comercial"), async (req, res) => {
  console.log("--- Supervisors API: GET /api/supervisors started ---")
  try {
    const supervisorsQuery = `
      SELECT DISTINCT id, name
      FROM clone_users_apprudnik 
      WHERE role = 'supervisor' AND is_active = true
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

// Get comprehensive team performance with enhanced filtering
app.get("/api/performance/team", authenticateToken, authorize("admin", "gerente_comercial"), async (req, res) => {
  console.log("--- Performance API: GET /api/performance/team started ---")
  try {
    const { period, startDate, endDate, supervisor } = req.query
    const { startDate: dateStart, endDate: dateEnd } = getDateRange(period, startDate, endDate)

    console.log("📊 Team Performance: Date range:", { dateStart, dateEnd, supervisor })

    // Build supervisor filter
    let supervisorFilter = ""
    const queryParams = [dateStart, dateEnd]

    if (supervisor && supervisor !== "all") {
      supervisorFilter = "AND u.supervisor = $3"
      queryParams.push(supervisor)
    }

    // Get all active sales representatives with targets
    const teamMembersQuery = `
      SELECT 
        u.id, u.name, u.email, u.role, u.supervisor,
        s.name as supervisor_name,
        COUNT(p.*) as total_propostas,
        COUNT(CASE WHEN p.has_generated_sale = true THEN 1 END) as propostas_convertidas,
        COALESCE(SUM(CASE WHEN p.has_generated_sale = true THEN CAST(p.total_price AS DECIMAL) END), 0) as faturamento_total,
        COALESCE(AVG(CASE WHEN p.has_generated_sale = true THEN CAST(p.total_price AS DECIMAL) END), 0) as ticket_medio,
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
      LEFT JOIN clone_propostas_apprudnik p ON u.id = p.seller::bigint
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
      WHERE seller::bigint = $1 AND created_at >= $2 AND created_at <= $3
      ORDER BY created_at DESC
    `
      const proposals = await pool.query(proposalsQuery, [id, dateStart, dateEnd])

      // Get monthly performance trend
      const monthlyTrendQuery = `
      SELECT 
        DATE_TRUNC('month', created_at) as mes,
        COUNT(*) as propostas,
        COUNT(CASE WHEN has_generated_sale = true THEN 1 END) as vendas,
        COALESCE(SUM(CASE WHEN has_generated_sale = true THEN CAST(total_price AS DECIMAL) END), 0) as faturamento,
        COALESCE(AVG(CASE WHEN has_generated_sale = true THEN CAST(total_price AS DECIMAL) END), 0) as ticket_medio
      FROM clone_propostas_apprudnik 
      WHERE seller::bigint = $1 AND created_at >= $2 AND created_at <= $3
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
        COALESCE(SUM(CASE WHEN has_generated_sale = true THEN CAST(total_price AS DECIMAL) END), 0) as faturamento
      FROM clone_propostas_apprudnik 
      WHERE seller::bigint = $1 AND created_at >= $2 AND created_at <= $3
      GROUP BY DATE_TRUNC('week', created_at)
      ORDER BY semana
    `
      const weeklyTrend = await pool.query(weeklyTrendQuery, [id, dateStart, dateEnd])

      // Get conversion funnel data
      const funnelQuery = `
      SELECT 
        COUNT(*) as total_propostas,
        COUNT(CASE WHEN has_generated_sale = true THEN 1 END) as vendas_fechadas,
        COALESCE(SUM(CAST(total_price AS DECIMAL)), 0) as valor_total_propostas,
        COALESCE(SUM(CASE WHEN has_generated_sale = true THEN CAST(total_price AS DECIMAL) END), 0) as valor_vendas
      FROM clone_propostas_apprudnik 
      WHERE seller::bigint = $1 AND created_at >= $2 AND created_at <= $3
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
      WHERE seller::bigint = $1 AND created_at >= $2 AND created_at <= $3
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
      WHERE seller::bigint = $1 AND created_at >= $2 AND created_at <= $3
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
      WHERE seller::bigint = $1 AND created_at >= $2 AND created_at <= $3
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
      WHERE seller::bigint = $1 AND created_at >= $2 AND created_at <= $3
    `

    const propostas = await pool.query(proposalsQuery, [id, startDate, endDate])

    const monthlySalesQuery = `
      SELECT 
        DATE_TRUNC('month', created_at) as mes,
        COUNT(*) as total_propostas,
        COUNT(CASE WHEN has_generated_sale = true THEN 1 END) as vendas,
        COALESCE(SUM(CASE WHEN has_generated_sale = true THEN CAST(total_price AS DECIMAL) END), 0) as faturamento
      FROM clone_propostas_apprudnik 
      WHERE seller::bigint = $1 AND created_at >= $2 AND created_at <= $3
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
      WHERE seller::bigint = ANY($1) AND created_at >= $2 AND created_at <= $3
    `

    const resumoEquipe = await pool.query(teamSummaryQuery, [vendedorIds, startDate, endDate])

    const rankingQuery = `
      SELECT 
        u.name, u.id,
        COUNT(p.*) as propostas,
        COUNT(CASE WHEN p.has_generated_sale = true THEN 1 END) as vendas,
        COALESCE(SUM(CASE WHEN p.has_generated_sale = true THEN CAST(p.total_price AS DECIMAL) END), 0) as faturamento
      FROM clone_users_apprudnik u
      LEFT JOIN clone_propostas_apprudnik p ON u.id = p.seller::bigint
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
        COALESCE(SUM(CASE WHEN has_generated_sale = true THEN CAST(total_price AS DECIMAL) END), 0) as faturamento_total
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
      LEFT JOIN clone_propostas_apprudnik p ON u.id = p.seller::bigint 
        AND p.created_at >= $1 AND p.created_at <= $2
      WHERE u.role IN ('vendedor', 'representante') AND u.is_active = true
      GROUP BY u.id, u.name, u.role
      ORDER BY faturamento DESC
      LIMIT 10
    `

    const topVendedores = await pool.query(topPerformersQuery, [startDate, endDate])

    // Meta mensal (exemplo fixo, pode vir de uma tabela de metas)
    const metaMensal = 150000 // R$ 150.000,00

    const response = {
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
