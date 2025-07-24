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

function parseJsonField(field) {
  if (!field) return []
  if (Array.isArray(field)) return field
  if (typeof field === "string") {
    try {
      return JSON.parse(field)
    } catch (err) {
      console.warn("Failed to parse JSON field", field)
      return []
    }
  }
  return []
}

// Helper to fetch a leader's active team members
async function getTeamMembers(leaderId) {
  const leaderQuery = `
    SELECT children
    FROM clone_users_apprudnik
    WHERE id = $1 AND is_active = true
  `
  const leaderResult = await pool.query(leaderQuery, [leaderId])
  if (leaderResult.rows.length === 0) return []

  const children = parseJsonField(leaderResult.rows[0].children)
  if (!children || children.length === 0) return []
  const childIds = children.map((c) => c.id)

  const teamQuery = `
    SELECT id, name, email, role
    FROM clone_users_apprudnik
    WHERE id = ANY($1) AND is_active = true
    ORDER BY name
  `
  const teamResult = await pool.query(teamQuery, [childIds])
  return teamResult.rows
}

// Helper to fetch a leader's team including prepostos of representante_premium members
async function getTeamHierarchyIds(leaderId) {
  const baseTeam = await getTeamMembers(leaderId)
  const ids = baseTeam.map((m) => m.id)
  for (const member of baseTeam) {
    if (member.role === "representante_premium") {
      const prepostos = await getTeamMembers(member.id)
      prepostos
        .filter((p) => p.role === "preposto")
        .forEach((p) => ids.push(p.id))
    }
  }
  return ids
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
      SELECT DISTINCT id, name, role, children
      FROM clone_users_apprudnik
      WHERE role IN ('supervisor', 'parceiro_comercial', 'representante_premium', 'gerente_comercial')
        AND is_active = true
      ORDER BY name
    `
    const { rows } = await pool.query(leadersQuery)
    res.json(rows)
  } catch (error) {
    console.error("❌ Error fetching team leaders:", error)
    res.status(500).json({ message: "Erro ao buscar líderes de equipe", error: error.message })
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
        SELECT to_char(date_trunc('month', p.created_at), 'YYYY-MM') as month, 
               SUM(CAST(p.total_price AS DECIMAL)) as revenue
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
      const { period, startDate, endDate } = req.query;
      const { startDate: dateStart, endDate: dateEnd } = getDateRange(
        period,
        startDate,
        endDate
      );

      const query = `
      SELECT 
          sup.name AS supervisor_name,
          COALESCE(SUM(p.total_price::DECIMAL), 0) AS total_revenue
      FROM clone_users_apprudnik sup
      LEFT JOIN clone_users_apprudnik u
        ON EXISTS (
            SELECT 1
            FROM jsonb_array_elements(u.supervisors::jsonb) AS elem
            WHERE (elem->>'id')::bigint = sup.id
        )
      LEFT JOIN clone_propostas_apprudnik p
        ON u.id = p.seller
      AND p.has_generated_sale = true
      AND p.created_at BETWEEN $1 AND $2
      WHERE sup.role IN ('supervisor', 'parceiro_comercial')
        AND sup.is_active = true
      GROUP BY sup.id, sup.name
      ORDER BY total_revenue DESC;
      `;

      const { rows } = await pool.query(query, [dateStart, dateEnd]);

      const chartData = rows.map((row) => ({
        supervisorName: row.supervisor_name,
        totalRevenue: parseFloat(row.total_revenue),
      }));

      res.json(chartData);
    } catch (error) {
      console.error("❌ Error fetching revenue by supervisor chart data:", error);
      res.status(500).json({
        message: "Erro ao carregar dados do gráfico",
        error: error.message,
      });
    }
  }
);

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
app.get(
  "/api/performance/team",
  authenticateToken,
  authorize("admin", "gerente_comercial"),
  async (req, res) => {
    console.log("--- Performance API: GET /api/performance/team started ---")
    try {
      const { period, startDate, endDate } = req.query
      const supervisor = req.query.supervisorId || req.query.supervisor
      const { startDate: dateStart, endDate: dateEnd } = getDateRange(
        period,
        startDate,
        endDate,
      )

    console.log("📊 Team Performance: Date range:", { dateStart, dateEnd, supervisor })

    // Build supervisor filter
    let supervisorFilter = ""
    const queryParams = [dateStart, dateEnd]

      if (supervisor && supervisor !== "all") {
        const teamIds = await getTeamHierarchyIds(supervisor)
        if (teamIds.length > 0) {
          supervisorFilter = "AND u.id = ANY($3)"
          queryParams.push(teamIds)
        } else {
          supervisorFilter = "AND u.supervisor_id = $3"
          queryParams.push(supervisor)
        }
      } 

    // Get all active sales representatives with targets
    const teamMembersQuery = `
    WITH usuarios_com_supervisor AS (
      SELECT 
        u.*, 
        s.id AS supervisor_id,
        s.name AS supervisor_name
      FROM clone_users_apprudnik u
      LEFT JOIN LATERAL (
          SELECT (elem->>'id')::bigint AS id, (elem->>'name') AS name
          FROM jsonb_array_elements(u.supervisors::jsonb) elem
      ) s ON TRUE
    ),
    metas_agg AS (
      SELECT
        usuario_id,
        SUM(CASE WHEN tipo_meta = 'propostas' THEN valor_meta ELSE 0 END) AS meta_propostas,
        SUM(CASE WHEN tipo_meta = 'vendas' THEN valor_meta ELSE 0 END) AS meta_vendas,
        SUM(CASE WHEN tipo_meta = 'faturamento' THEN valor_meta ELSE 0 END) AS meta_faturamento
      FROM metas_individuais
      WHERE data_inicio <= $2 AND data_fim >= $1
      GROUP BY usuario_id
    )
    SELECT
      u.id,
      u.name,
      u.email,
      u.role,
      u.supervisor,
      u.supervisor_name,
      COUNT(p.*) AS total_propostas,
      COUNT(CASE WHEN p.has_generated_sale = true THEN 1 END) AS propostas_convertidas,
      COALESCE(SUM(CASE WHEN p.has_generated_sale = true THEN CAST(p.total_price AS DECIMAL) END), 0) AS faturamento_total,
      COALESCE(AVG(CASE WHEN p.has_generated_sale = true THEN CAST(p.total_price AS DECIMAL) END), 0) AS ticket_medio,
      COALESCE(m.meta_propostas,
        CASE WHEN u.role = 'vendedor' THEN 0
             WHEN u.role = 'representante' THEN 0
             ELSE 0 END) AS meta_propostas,
      COALESCE(m.meta_vendas,
        CASE WHEN u.role = 'vendedor' THEN 0
             WHEN u.role = 'representante' THEN 0
             ELSE 0 END) AS meta_vendas,
      COALESCE(m.meta_faturamento,
        CASE WHEN u.role = 'vendedor' THEN 0
             WHEN u.role = 'representante' THEN 0
             ELSE 0 END) AS meta_faturamento
    FROM usuarios_com_supervisor u
    LEFT JOIN metas_agg m ON m.usuario_id = u.id
    LEFT JOIN clone_propostas_apprudnik p
      ON u.id = p.seller
      AND p.created_at BETWEEN $1 AND $2
    WHERE u.role IN ('vendedor', 'representante', 'parceiro_comercial', 'supervisor', 'preposto', 'representante_premium') 
      AND u.is_active = true
      ${supervisorFilter}
    GROUP BY u.id, u.name, u.email, u.role, u.supervisor, u.supervisor_name, m.meta_propostas, m.meta_vendas, m.meta_faturamento
    ORDER BY faturamento_total DESC;
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
      filters: { supervisor},
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
      LEFT JOIN clone_users_apprudnik s ON (u.supervisor)::bigint = s.id
      WHERE u.id = $1
    `
      const userResult = await pool.query(userQuery, [id])

      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "Representative not found" })
      }

      const representative = userResult.rows[0]

      // Get child users for proposal listing
      const childMembers = await getTeamMembers(id)
      const childIds = childMembers.map((m) => m.id)
      const sellerIds = [Number(id), ...childIds]

      // Get detailed proposals including child users
      const proposalsQuery = `
        SELECT DISTINCT ON (c.phone)
            p.id,
            c.name AS client_name,
            c.phone AS client_phone,
            u.name AS proposer_name,
            u.role AS proposer_role,
            p.seller AS seller_id,
            CASE WHEN p.seller = $2 THEN 'self' ELSE 'child' END AS origin,
            p.total_price,
            p.has_generated_sale,
            p.created_at,
            CASE 
                WHEN p.has_generated_sale = true THEN 'Convertida'
                ELSE 'Pendente'
            END AS status
        FROM
            clone_propostas_apprudnik p
        JOIN
            clone_contatos_apprudnik c ON p.lead = c.id
        JOIN
            clone_users_apprudnik u ON p.seller = u.id
        WHERE
            p.seller = ANY($1)
            AND p.created_at >= $3
            AND p.created_at <= $4
        ORDER BY
            c.phone, p.created_at DESC;
      `
      const proposals = await pool.query(proposalsQuery, [sellerIds, id, dateStart, dateEnd])

      // Get monthly performance trend
      const monthlyTrendQuery = `
      SELECT 
          DATE_TRUNC('month', created_at) AS mes,
          COUNT(*) AS propostas,
          COUNT(CASE WHEN has_generated_sale = true THEN 1 END) AS vendas,
          COALESCE(SUM(CASE WHEN has_generated_sale = true THEN CAST(total_price AS DECIMAL) END), 0) AS faturamento,
          COALESCE(AVG(CASE WHEN has_generated_sale = true THEN CAST(total_price AS DECIMAL) END), 0) AS ticket_medio
      FROM 
          clone_propostas_apprudnik 
      WHERE 
          seller = $1 
          AND created_at >= $2 
          AND created_at <= $3
      GROUP BY 
          DATE_TRUNC('month', created_at)
      ORDER BY 
          mes;
      `
      const monthlyTrend = await pool.query(monthlyTrendQuery, [id, dateStart, dateEnd])

      // Get weekly performance for detailed chart
      const weeklyTrendQuery = `
      SELECT 
          DATE_TRUNC('week', created_at) AS semana,
          COUNT(*) AS propostas,
          COUNT(CASE WHEN has_generated_sale = true THEN 1 END) AS vendas,
          COALESCE(SUM(CASE WHEN has_generated_sale = true THEN CAST(total_price AS DECIMAL) END), 0) AS faturamento
      FROM 
          clone_propostas_apprudnik 
      WHERE 
          seller = $1 
          AND created_at >= $2 
          AND created_at <= $3
      GROUP BY 
          DATE_TRUNC('week', created_at)
      ORDER BY 
          semana;
      `
      const weeklyTrend = await pool.query(weeklyTrendQuery, [id, dateStart, dateEnd])

      // Get conversion funnel data
      const funnelQuery = `
      SELECT 
          COUNT(*) AS total_propostas,
          COUNT(CASE WHEN has_generated_sale = true THEN 1 END) AS vendas_fechadas,
          COALESCE(SUM(CAST(total_price AS DECIMAL)), 0) AS valor_total_propostas,
          COALESCE(SUM(CASE WHEN has_generated_sale = true THEN CAST(total_price AS DECIMAL) END), 0) AS valor_vendas
      FROM 
          clone_propostas_apprudnik 
      WHERE 
          seller = $1 
          AND created_at >= $2 
          AND created_at <= $3;
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
          clientPhone: proposal.client_phone,
          proposerName: proposal.proposer_name,
          proposerRole: proposal.proposer_role,
          origin: proposal.origin,
          sellerId: proposal.seller_id,
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
    const { period, startDate: start, endDate: end } = req.query
    
    const { startDate, endDate } = getDateRange(period, start, end)

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
      SELECT g.*, u.name AS supervisor_name, u.role AS supervisor_role, u.children
      FROM metas_gerais g
      JOIN clone_users_apprudnik u ON g.usuario_id = u.id
      WHERE g.data_inicio <= $2 AND g.data_fim >= $1
      ORDER BY g.data_inicio DESC
    `
    const generalResult = await pool.query(generalGoalsQuery, [startDate, endDate])
    console.log("✅ Goals: Fetched", generalResult.rows.length, "general goals")

    const enhancedGeneral = []
    for (const goal of generalResult.rows) {
      const teamMembers = await getTeamMembers(goal.usuario_id)
      const memberIds = teamMembers.map((m) => m.id)

      for (const member of teamMembers) {
        if (member.role === 'representante_premium') {
          const prepostos = await getTeamMembers(member.id)
          if (prepostos && prepostos.length > 0) {
            prepostos
              .filter((p) => p.role === 'preposto')
              .forEach((p) => memberIds.push(p.id))
          }
        }
      }
      let childGoals = []
      if (memberIds.length > 0) {
        const childQuery = `
          SELECT m.*, u.name as user_name, u.role as user_role
          FROM metas_individuais m
          JOIN clone_users_apprudnik u ON m.usuario_id = u.id
          WHERE m.usuario_id = ANY($1)
            AND m.data_inicio <= $3 AND m.data_fim >= $2
            AND m.tipo_meta = $4
          ORDER BY u.name, m.data_inicio DESC
        `
        const { rows } = await pool.query(childQuery, [memberIds, startDate, endDate, goal.tipo_meta])
        childGoals = rows
      }

      enhancedGeneral.push({
        ...goal,
        children: parseJsonField(goal.children),
        team_members: teamMembers,
        team_members_count: teamMembers.length,
        child_goals: childGoals,
      })
    }

    const individualGoalsQuery = `
      SELECT m.*, u.name as user_name, u.email as user_email, u.role as user_role, u.supervisors,
             s.name AS supervisor_name, s.role AS supervisor_role
      FROM metas_individuais m
      JOIN clone_users_apprudnik u ON m.usuario_id = u.id
      LEFT JOIN clone_users_apprudnik s ON m.supervisor_id = s.id
      WHERE m.data_inicio <= $2 AND m.data_fim >= $1
      ORDER BY u.name, m.data_inicio DESC
    `
    const individualResult = await pool.query(individualGoalsQuery, [startDate, endDate])
    console.log("✅ Goals: Fetched", individualResult.rows.length, "individual goals")

    const enhancedIndividual = individualResult.rows.map((goal) => ({
      ...goal,
      supervisors: parseJsonField(goal.supervisors),
      supervisor_name: goal.supervisor_name,
      supervisor_role: goal.supervisor_role,
    }))

    res.json({
      generalGoals: enhancedGeneral,
      individualGoals: enhancedIndividual,
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
  const { type, goalData } = req.body
  const created_by = req.user.id

  if (type === "general") {
    // This is now a Team Goal
    const { usuario_id, tipo_meta, valor_meta, data_inicio, data_fim, manualDistribution } = goalData

    if (new Date(data_inicio) > new Date(data_fim)) {
      return res.status(400).json({
        message: "Data de início não pode ser maior que a data de fim",
      })
    }

    // Prevent overlapping goals for the same month
    const overlapCheck = await pool.query(
      `SELECT 1 FROM metas_gerais
       WHERE usuario_id = $1
         AND tipo_meta = $4
         AND NOT (data_fim < $2 OR data_inicio > $3)
       LIMIT 1`,
      [usuario_id, data_inicio, data_fim, tipo_meta],
    )
    if (overlapCheck.rows.length > 0) {
      return res.status(400).json({
        message: "Já existe uma meta de equipe cadastrada para este período",
      })
    }

    const supervisorId = usuario_id
    if (!usuario_id) {
      return res.status(400).json({ message: "Líder de equipe é obrigatório para metas de equipe." })
    }

    const client = await pool.connect()
    try {
      await client.query("BEGIN")

      // 1. Insert the main team goal
      const teamGoalQuery = `
        INSERT INTO metas_gerais (usuario_id, tipo_meta, valor_meta, data_inicio, data_fim, criado_por, is_distributed)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`
      const teamGoalResult = await client.query(teamGoalQuery, [
        usuario_id,
        tipo_meta,
        valor_meta,
        data_inicio,
        data_fim,
        created_by,
        true,
      ])
      const teamGoal = teamGoalResult.rows[0]

      let childrenIds = []
      let distributionMethod = "automatic"

      if (manualDistribution && manualDistribution.length > 0) {
        // Manual distribution provided
        distributionMethod = "manual"
        childrenIds = manualDistribution.map((item) => ({
          id: Number(item.usuario_id),
          goalAmount: Number.parseFloat(item.valor_meta) || 0,
        }))

        const leaderData = await client.query(
          "SELECT children FROM clone_users_apprudnik WHERE id = $1 AND is_active = true",
          [supervisorId],
        )
        const leaderChildren =
          leaderData.rows.length > 0
            ? parseJsonField(leaderData.rows[0].children).map((c) => Number(c.id))
            : []

        // Allow prepostos of representante_premium children
        const allowedIds = new Set()
        leaderChildren.forEach((id) => allowedIds.add(id))

        for (const childId of leaderChildren) {
          const { rows } = await client.query(
            `SELECT role, children FROM clone_users_apprudnik WHERE id = $1 AND is_active = true`,
            [childId],
          )
          if (rows.length && rows[0].role === 'representante_premium') {
            const prepostos = parseJsonField(rows[0].children)
            prepostos.forEach((p) => allowedIds.add(Number(p.id)))
          }
        }

        const { rows: activeRows } = await client.query(
          `SELECT id FROM clone_users_apprudnik WHERE id = ANY($1) AND is_active = true`,
          [childrenIds.map((c) => c.id)],
        )
        const activeIds = activeRows.map((r) => Number(r.id))

        const invalidUsers = childrenIds.filter(
          (child) => !allowedIds.has(child.id) || !activeIds.includes(child.id),
        )

        if (invalidUsers.length > 0 || leaderChildren.length === 0) {
          await client.query("ROLLBACK")
          return res.status(400).json({
            message: "Alguns usuários selecionados não pertencem a este líder ou não estão ativos.",
            invalidUsers: invalidUsers.map((u) => u.id),
          })
        }
      } else {
        const leaderData = await client.query(
          "SELECT children FROM clone_users_apprudnik WHERE id = $1 AND is_active = true",
          [usuario_id],
        )
        
        const leaderChildren =
          leaderData.rows.length > 0
            ? parseJsonField(leaderData.rows[0].children).map((c) => Number(c.id))
            : []

        const childrenIdsOnly = leaderChildren

        if (!childrenIdsOnly || childrenIdsOnly.length === 0) {
          await client.query("ROLLBACK")
          return res.status(400).json({ message: "Este líder não possui vendedores na equipe para distribuir a meta." })
        }

        // Calculate equal distribution
        const totalAmount = Number.parseFloat(valor_meta)
        const childCount = childrenIdsOnly.length
        const individualAmount = Math.floor((totalAmount / childCount) * 100) / 100
        const remainder = Number.parseFloat((totalAmount - individualAmount * childCount).toFixed(2))

        childrenIds = childrenIdsOnly.map((id, index) => ({
          id: id,
          goalAmount: index === 0 ? individualAmount + remainder : individualAmount,
        }))
      }

      // 4. Expand representante_premium to their preposto children
      let finalChildren = []
      let repGoals = []
      for (const child of childrenIds) {
        const { rows } = await client.query(
          `SELECT role, children FROM clone_users_apprudnik WHERE id = $1 AND is_active = true`,
          [child.id],
        )

        if (rows.length > 0 && rows[0].role === 'representante_premium') {
          const prepostos = parseJsonField(rows[0].children)
          if (prepostos && prepostos.length > 0) {
            repGoals.push({ id: child.id, goalAmount: child.goalAmount })
            const ids = prepostos.map((p) => Number(p.id))
            const amount = Math.floor((child.goalAmount / ids.length) * 100) / 100
            const rem = Number.parseFloat((child.goalAmount - amount * ids.length).toFixed(2))
            ids.forEach((pid, idx) => {
              finalChildren.push({
                id: Number(pid),
                goalAmount: idx === 0 ? amount + rem : amount,
              })
            })
            continue
          }
        }

        finalChildren.push(child)
      }

      // Merge duplicates that may appear after manual distribution
      const mergeById = (arr) => {
        const map = new Map()
        for (const item of arr) {
          if (map.has(item.id)) {
            map.get(item.id).goalAmount += item.goalAmount
          } else {
            map.set(item.id, { ...item })
          }
        }
        return Array.from(map.values())
      }

      finalChildren = mergeById(finalChildren)
      repGoals = mergeById(repGoals)

      // Insert individual goals for each resolved child
      const individualGoalQuery = `
        INSERT INTO metas_individuais (usuario_id, tipo_meta, valor_meta, data_inicio, data_fim, criado_por, supervisor_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)`

        const hasDup = async (uid) => {
        const { rows } = await client.query(
          `SELECT 1 FROM metas_individuais
            WHERE usuario_id = $1
              AND supervisor_id = $2
              AND tipo_meta = $3
              AND date_trunc('month', data_inicio) = date_trunc('month', $4::date)
            LIMIT 1`,
          [uid, supervisorId, tipo_meta, data_inicio],
        )
        return rows.length > 0
      }

      for (const child of finalChildren) {
        if (await hasDup(child.id)) {
          await client.query('ROLLBACK')
          return res.status(400).json({
            message: `Usuário ${child.id} já possui meta cadastrada para este período e tipo`,
          })
        }
        await client.query(individualGoalQuery, [
          child.id,
          tipo_meta,
          child.goalAmount,
          data_inicio,
          data_fim,
          created_by,
          supervisorId,
        ])
      }

      // Also insert goals for representante_premium users themselves
      for (const rep of repGoals) {
        if (await hasDup(rep.id)) {
          await client.query('ROLLBACK')
          return res.status(400).json({
            message: `Usuário ${rep.id} já possui meta cadastrada para este período e tipo`,
          })
        }
        await client.query(individualGoalQuery, [
          rep.id,
          tipo_meta,
          rep.goalAmount,
          data_inicio,
          data_fim,
          created_by,
          supervisorId,
        ])
      }

      await client.query("COMMIT")

      const totalDistributed = finalChildren.reduce((sum, child) => sum + child.goalAmount, 0)

      res.status(201).json({
        message: `Meta de equipe criada e distribuída para ${finalChildren.length} vendedores usando distribuição ${distributionMethod === "manual" ? "manual" : "automática"}.`,
        teamGoal: teamGoal,
        distribution: {
          method: distributionMethod,
          totalGoal: Number.parseFloat(valor_meta),
          totalDistributed: totalDistributed,
          childrenCount: finalChildren.length,
        },
      })
    } catch (error) {
      await client.query("ROLLBACK")
      console.error("❌ Goals: Error distributing goal:", error)
      res.status(500).json({ message: "Erro ao distribuir meta", error: error.message })
    } finally {
      client.release()
    }
  } else if (type === "individual") {
    const { id, tipo_meta, valor_meta, data_inicio, data_fim, usuario_id } = goalData

    if (new Date(data_inicio) > new Date(data_fim)) {
      return res.status(400).json({
        message: "Data de início não pode ser maior que a data de fim",
      })
    }
    let result
    const duplicateCheck = await pool.query(
      `SELECT 1 FROM metas_individuais
         WHERE usuario_id = $1
           AND supervisor_id = $2
           AND tipo_meta = $3
           AND NOT (data_fim < $4 OR data_inicio > $5)
           ${id ? 'AND id <> $6' : ''}
         LIMIT 1`,
      id
        ? [usuario_id, goalData.supervisor_id, tipo_meta, data_inicio, data_fim, id]
        : [usuario_id, goalData.supervisor_id, tipo_meta, data_inicio, data_fim],
    )
    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({
        message: `Usuário ${usuario_id} já possui meta cadastrada para este período e tipo`,
      })
    }
    if (id) {
      result = await pool.query(
        `UPDATE metas_individuais SET tipo_meta = $1, valor_meta = $2, data_inicio = $3, data_fim = $4, usuario_id = $5, supervisor_id = $6, atualizado_em = NOW()
         WHERE id = $7 RETURNING *`,
        [tipo_meta, valor_meta, data_inicio, data_fim, usuario_id, goalData.supervisor_id, id],
      )
    } else {
      result = await pool.query(
        `INSERT INTO metas_individuais (tipo_meta, valor_meta, data_inicio, data_fim, usuario_id, criado_por, supervisor_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [tipo_meta, valor_meta, data_inicio, data_fim, usuario_id, created_by, goalData.supervisor_id],
      )
    }
    res.status(201).json(result.rows[0])
  } else {
      const conflict = await pool.query(
        `SELECT 1 FROM metas_individuais
          WHERE usuario_id=$1
            AND tipo_meta=$2
            AND NOT (data_fim < $3 OR data_inicio > $4)
          LIMIT 1`,
        [usuario_id, tipo_meta, data_inicio, data_fim],
      )
      if (conflict.rows.length > 0) {
        return res.status(400).json({
          message: 'Já existe uma meta cadastrada para este período e tipo',
        })
      }
    return res.status(400).json({ message: "Invalid goal type" })
  }
})

// Update existing goal
app.put("/api/goals/:type/:id", authenticateToken, authorize("admin", "gerente_comercial"), async (req, res) => {
  const { type, id } = req.params
  const { goalData } = req.body

  if (type === "general") {
    const { usuario_id, tipo_meta, valor_meta, data_inicio, data_fim } = goalData

    if (new Date(data_inicio) > new Date(data_fim)) {
      return res.status(400).json({
        message: "Data de início não pode ser maior que a data de fim",
      })
    }

    try {
      const conflict = await pool.query(
        `SELECT 1 FROM metas_gerais
         WHERE usuario_id = $1
           AND tipo_meta = $5
           AND id <> $2
           AND NOT (data_fim < $3 OR data_inicio > $4)
         LIMIT 1`,
        [usuario_id, id, data_inicio, data_fim, tipo_meta],
      )
      if (conflict.rows.length > 0) {
        return res.status(400).json({ message: "Já existe uma meta de equipe cadastrada para este período" })
      }

      await pool.query(
        `UPDATE metas_gerais SET usuario_id=$1, tipo_meta=$2, valor_meta=$3, data_inicio=$4, data_fim=$5 WHERE id=$6`,
        [usuario_id, tipo_meta, valor_meta, data_inicio, data_fim, id],
      )
      res.json({ success: true })
    } catch (error) {
      console.error("❌ Goals: Error updating general goal:", error)
      res.status(500).json({ message: "Erro ao atualizar meta" })
    }
  } else if (type === "individual") {
    const { usuario_id, tipo_meta, valor_meta, data_inicio, data_fim } = goalData

    if (new Date(data_inicio) > new Date(data_fim)) {
      return res.status(400).json({
        message: "Data de início não pode ser maior que a data de fim",
      })
    }
    try {
      const conflict = await pool.query(
        `SELECT 1 FROM metas_individuais
         WHERE usuario_id=$1
           AND supervisor_id=$6
           AND tipo_meta = $5
           AND id<>$2
           AND NOT (data_fim < $3 OR data_inicio > $4)
         LIMIT 1`,
        [usuario_id, id, data_inicio, data_fim, tipo_meta, goalData.supervisor_id],
      )
      if (conflict.rows.length > 0) {
        return res.status(400).json({ message: "Já existe uma meta cadastrada para este período" })
      }
      await pool.query(
        `UPDATE metas_individuais SET usuario_id=$1, tipo_meta=$2, valor_meta=$3, data_inicio=$4, data_fim=$5, supervisor_id=$6 WHERE id=$7`,
        [usuario_id, tipo_meta, valor_meta, data_inicio, data_fim, goalData.supervisor_id, id],
      )
      res.json({ success: true })
    } catch (error) {
      console.error("❌ Goals: Error updating individual goal:", error)
      res.status(500).json({ message: "Erro ao atualizar meta" })
    }
  } else {
    res.status(400).json({ message: "Invalid goal type" })
  }
})

// Delete goal
app.delete("/api/goals/:type/:id", authenticateToken, authorize("admin", "gerente_comercial"), async (req, res) => {
  console.log("--- Goals API: DELETE /api/goals/:type/:id started ---");
  try {
    const { type, id } = req.params
    console.log("🗑️ Goals: Deleting goal:", { type, id })

    if (type === "general") {
            // Fetch goal periods for this leader so we can remove individual goals
      const { rows } = await pool.query(
        "SELECT usuario_id, tipo_meta, data_inicio, data_fim FROM metas_gerais WHERE id = $1",
        [id],
      )
      if (rows.length === 0) {
        return res.status(404).json({ message: 'Meta não encontrada' })
      }
      const goalInfo = rows[0]

      // Fetch goal periods for this leader so we can remove individual goals
      const userId = goalInfo.usuario_id

      // Resolve all team member ids including prepostos and representante_premium themselves
      const teamMembers = await getTeamMembers(userId)
      const childIds = []
      const premiumIds = []
      for (const member of teamMembers) {
        if (member.role === "representante_premium") {
          const result = await pool.query(
            `SELECT children FROM clone_users_apprudnik WHERE id = $1 AND is_active = true`,
            [member.id],
          )
          const prepostos = result.rows.length > 0 ? parseJsonField(result.rows[0].children) : []
          if (prepostos && prepostos.length > 0) {
            premiumIds.push(Number(member.id))
            prepostos.forEach((p) => childIds.push(Number(p.id)))
          } else {
            childIds.push(Number(member.id))
          }
        } else {
          childIds.push(Number(member.id))
        }
      }
      const allIds = Array.from(new Set([...childIds, ...premiumIds]))

      await pool.query(
        `DELETE FROM metas_individuais
         WHERE usuario_id = ANY($1)
           AND tipo_meta = $2
           AND data_inicio = $3
           AND data_fim = $4`,
        [allIds, goalInfo.tipo_meta, goalInfo.data_inicio, goalInfo.data_fim],
      )

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
});

// Get available goal periods for a user
app.get("/api/goals/periods/:userId", authenticateToken, async (req, res) => {
  console.log("--- Goals API: GET /api/goals/periods started ---");
  try {
    const { userId } = req.params;
    const query = `
      SELECT DISTINCT TO_CHAR(data_inicio, 'YYYY-MM') AS period
      FROM metas_individuais
      WHERE usuario_id = $1
      UNION
      SELECT DISTINCT TO_CHAR(data_inicio, 'YYYY-MM') AS period
      FROM metas_gerais
      WHERE usuario_id = $1
      ORDER BY period DESC
    `;
    const { rows } = await pool.query(query, [userId]);
    res.json(rows.map((r) => r.period));
  } catch (error) {
    console.error("❌ Goals: Error fetching periods:", error.message);
    res.status(500).json({
      message: "Erro ao buscar períodos de metas",
      error: error.message,
    });
  }
});

// Get goal tracking for seller
app.get("/api/goals/tracking/seller/:id", authenticateToken, async (req, res) => {
  console.log("--- Goals API: GET /api/goals/tracking/seller started ---")
  try {
    const { id } = req.params
    const { period, startDate: start, endDate: end } = req.query
    const { startDate, endDate } = getDateRange(period, start, end)

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

    const totalTarget = allGoals.reduce((s, g) => s + parseFloat(g.valor_meta), 0)
    const totalAchieved = allGoals.reduce((s, g) => s + (g.achieved || 0), 0)
    const overallProgress = totalTarget > 0 ? (totalAchieved / totalTarget) * 100 : 0
    console.log("✅ Goals Tracking: Processed", allGoals.length, "goals")

    res.json({
      goals: allGoals,
      summary: {
        target: totalTarget,
        achieved: totalAchieved,
        progress: overallProgress,
      },
    })
  } catch (error) {
    console.error("❌ Goals Tracking: Error:", error.message)
    res.status(500).json({
      message: "Erro ao carregar tracking de metas",
      error: error.message,
    })
  }
})

// Get all goals for a specific team with progress metrics
app.get(
  "/api/goals/team/:id",
  authenticateToken,
  authorize("admin", "gerente_comercial"),
  async (req, res) => {
    console.log("--- Goals API: GET /api/goals/team/:id started ---")
    try {
      const { id } = req.params
      const { period, startDate: start, endDate: end, status } = req.query
      const { startDate, endDate } = getDateRange(period, start, end)

      const goalsQuery = `
        SELECT g.*, u.name AS supervisor_name
          FROM metas_gerais g
          JOIN clone_users_apprudnik u ON g.usuario_id = u.id
         WHERE g.usuario_id = $1
           AND g.data_inicio <= $3 AND g.data_fim >= $2
         ORDER BY g.data_inicio ASC`

      const { rows } = await pool.query(goalsQuery, [id, startDate, endDate])

      const teamMembers = await getTeamMembers(id)
      const memberIds = teamMembers.map((m) => m.id)

      const goalsWithMetrics = []
      for (const goal of rows) {
        let actual = 0
        if (memberIds.length > 0) {
          let metricQuery = null
          if (goal.tipo_meta === "faturamento") {
            metricQuery = `
              SELECT COALESCE(SUM(p.total_price::DECIMAL),0) AS value
                FROM clone_propostas_apprudnik p
               WHERE p.seller = ANY($1)
                 AND p.has_generated_sale = true
                 AND p.created_at BETWEEN $2 AND $3`
          } else if (goal.tipo_meta === "propostas") {
            metricQuery = `
              SELECT COUNT(*) AS value
                FROM clone_propostas_apprudnik p
               WHERE p.seller = ANY($1)
                 AND p.created_at BETWEEN $2 AND $3`
          } else if (goal.tipo_meta === "vendas") {
            metricQuery = `
              SELECT COUNT(*) AS value
                FROM clone_propostas_apprudnik p
               WHERE p.seller = ANY($1)
                 AND p.has_generated_sale = true
                 AND p.created_at BETWEEN $2 AND $3`
          }

          if (metricQuery) {
            const result = await pool.query(metricQuery, [
              memberIds,
              goal.data_inicio,
              goal.data_fim,
            ])
            actual = parseFloat(result.rows[0].value)
          }
        }

        const target = parseFloat(goal.valor_meta)
        const progress = target > 0 ? (actual / target) * 100 : 0

        const now = new Date()
        const startGoal = new Date(goal.data_inicio)
        const endGoal = new Date(goal.data_fim)
        let goalStatus = "active"
        if (endGoal < now) goalStatus = progress >= 100 ? "completed" : "overdue"
        else if (startGoal > now) goalStatus = "upcoming"

        if (status && status !== goalStatus) continue

        goalsWithMetrics.push({
          ...goal,
          achieved: actual,
          progress,
          status: goalStatus,
          team_members: teamMembers,
        })
      }

      res.json(goalsWithMetrics)
    } catch (error) {
      console.error("❌ Goals Team: Error:", error.message)
      res.status(500).json({
        message: "Erro ao carregar metas da equipe",
        error: error.message,
      })
    }
  },
)

// Get users for goal assignment
app.get("/api/users", authenticateToken, authorize("admin", "gerente_comercial"), async (req, res) => {
  console.log("--- Users API: GET /api/users started ---")
  try {
    const usersQuery = `
      SELECT id, name, email, role, supervisor, children, is_active
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

// Get user's team (for supervisors)
app.get("/api/users/:id/team", authenticateToken, async (req, res) => {
  console.log("--- Users API: GET /api/users/:id/team started ---")
  try {
    const { id } = req.params

    /*if (req.user.role !== "gestor" && req.user.id !== Number.parseInt(id)) {
      return res.status(403).json({ message: "Access denied" })
    }*/

    // First check children field for direct relationships
    const leaderRes = await pool.query(
      "SELECT children FROM clone_users_apprudnik WHERE id = $1 AND is_active = true",
      [id],
    )

    let teamMembers = []
    if (leaderRes.rows.length > 0) {
      const children = parseJsonField(leaderRes.rows[0].children)
      if (children.length > 0) {
        const childIds = children.map((c) => Number(c.id))
        const childQuery = `
          SELECT id, name, email, role, is_active, created_at
          FROM clone_users_apprudnik
          WHERE id = ANY($1) AND is_active = true
          ORDER BY name
        `
        const childResult = await pool.query(childQuery, [childIds])
        teamMembers = childResult.rows
      }
    }

    // Fallback to supervisor relationship if no children found
    if (teamMembers.length === 0) {
      const teamQuery = `
        SELECT id, name, email, role, is_active, created_at
        FROM clone_users_apprudnik
        WHERE is_active = true
          AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements(supervisors) AS sup
            WHERE (sup->>'id')::int = $1
          )
        ORDER BY name
      `
      const result = await pool.query(teamQuery, [id])
      teamMembers = result.rows
    }

    // Include prepostos of any representante_premium members
    const enhancedMembers = [...teamMembers]
    for (const member of teamMembers) {
      if (member.role === "representante_premium") {
        const prepostos = await getTeamMembers(member.id)
        prepostos
          .filter((p) => p.role === "preposto")
          .forEach((p) =>
            enhancedMembers.push({
              ...p,
              parent_id: member.id,
              parent_name: member.name,
            }),
          )
      }
    }

    console.log(
      "✅ Users: Fetched",
      enhancedMembers.length,
      "team members including hierarchy",
    )
    res.json(enhancedMembers) 
  } catch (error) {
    console.error("❌ Users: Error fetching team:", error.message)
    res.status(500).json({ message: "Erro ao buscar equipe", error: error.message })
  }
})

// Dashboard endpoints (keeping existing ones)
app.get("/api/dashboard/vendedor/:id", authenticateToken, async (req, res) => {
  try {
    console.log("📊 Vendedor dashboard request:", { id: req.params.id, ...req.query })
    const { id } = req.params
    const { period, startDate: start, endDate: end } = req.query


    const { startDate, endDate } = getDateRange(period, start, end)
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
    const { period, startDate: start, endDate: end } = req.query

    const { startDate, endDate } = getDateRange(period, start, end)

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

    const propostas = await pool.query(proposalsQuery, [id, startDate, endDate])
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
    const { period, startDate: start, endDate: end } = req.query

    const { startDate, endDate } = getDateRange(period, start, end)

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

    const resumoEquipe = await pool.query(teamSummaryQuery, [vendedorIds, startDate, endDate])
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
    const { period, startDate: start, endDate: end } = req.query

    const { startDate, endDate } = getDateRange(period, start, end)

    const globalQuery = `
  SELECT 
    COUNT(*) as total_propostas,
    COUNT(CASE WHEN has_generated_sale = true THEN 1 END) as vendas,
    COALESCE(SUM(CASE WHEN has_generated_sale = true THEN CAST(total_price AS DECIMAL) END), 0) as faturamento_total
  FROM clone_propostas_apprudnik 
  WHERE created_at >= $1 AND created_at <= $2
`

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

    const topPerformersQuery = `
  SELECT 
    u.name,
    u.role,
    COALESCE(SUM(CASE WHEN p.has_generated_sale = true THEN CAST(p.total_price AS DECIMAL) END), 0) as faturamento,
    COUNT(CASE WHEN p.has_generated_sale = true THEN 1 END) as vendas
  FROM clone_users_apprudnik u
  LEFT JOIN clone_propostas_apprudnik p ON u.id = p.seller 
    AND p.created_at >= $1 AND p.created_at <= $2
  WHERE u.role IN ('vendedor', 'representante', 'parceiro_comercial', 'supervisor', 'preposto', 'representante_premium') AND u.is_active = true
  GROUP BY u.id, u.name, u.role
  ORDER BY faturamento DESC
  LIMIT 10
`

    const indicadores = await pool.query(globalQuery, [startDate, endDate])
    const faturamentoMensal = await pool.query(monthlyRevenueQuery, [startDate, endDate])
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
