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

// Middleware
app.use(cors())
app.use(express.json())

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) {
    return res.sendStatus(401)
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403)
    req.user = user
    next()
  })
}

// Login endpoint
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body

    const result = await pool.query("SELECT * FROM clone_users_apprudnik WHERE email = $1 AND is_active = true", [
      email,
    ])

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Credenciais inválidas" })
    }

    const user = result.rows[0]

    // For demo purposes, we'll use simple password check
    // In production, use bcrypt.compare with hashed passwords
    if (password !== "123456") {
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
    console.error("Login error:", error)
    res.status(500).json({ message: "Erro interno do servidor" })
  }
})

// Dashboard endpoints
app.get("/api/dashboard/vendedor/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { period } = req.query

    const startDate = period ? `${period}-01` : "2025-01-01"
    const endDate = period ? `${period.substring(0, 7)}-31` : "2025-12-31"

    // Propostas
    const propostas = await pool.query(
      `
      SELECT COUNT(*) as total, 
             COUNT(CASE WHEN has_generated_sale = true THEN 1 END) as convertidas
      FROM clone_propostas_apprudnik 
      WHERE seller = $1 AND created_at >= $2 AND created_at <= $3
    `,
      [id, startDate, endDate],
    )

    // Faturamento
    const faturamento = await pool.query(
      `
      SELECT COALESCE(SUM(total_price), 0) as total
      FROM clone_propostas_apprudnik 
      WHERE seller = $1 AND has_generated_sale = true 
      AND created_at >= $2 AND created_at <= $3
    `,
      [id, startDate, endDate],
    )

    // Vendas por mês
    const vendasMensais = await pool.query(
      `
      SELECT DATE_TRUNC('month', created_at) as mes,
             COUNT(*) as vendas,
             COALESCE(SUM(total_price), 0) as faturamento
      FROM clone_propostas_apprudnik 
      WHERE seller = $1 AND has_generated_sale = true
      AND created_at >= $2 AND created_at <= $3
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY mes
    `,
      [id, startDate, endDate],
    )

    const totalPropostas = Number.parseInt(propostas.rows[0].total)
    const propostasConvertidas = Number.parseInt(propostas.rows[0].convertidas)
    const taxaConversao = totalPropostas > 0 ? ((propostasConvertidas / totalPropostas) * 100).toFixed(2) : 0
    const ticketMedio =
      propostasConvertidas > 0 ? (Number.parseFloat(faturamento.rows[0].total) / propostasConvertidas).toFixed(2) : 0

    res.json({
      resumo: {
        totalPropostas,
        propostasConvertidas,
        faturamentoTotal: Number.parseFloat(faturamento.rows[0].total),
        taxaConversao: Number.parseFloat(taxaConversao),
        ticketMedio: Number.parseFloat(ticketMedio),
      },
      vendasMensais: vendasMensais.rows.map((row) => ({
        mes: row.mes,
        vendas: Number.parseInt(row.vendas),
        faturamento: Number.parseFloat(row.faturamento),
      })),
    })
  } catch (error) {
    console.error("Dashboard vendedor error:", error)
    res.status(500).json({ message: "Erro ao carregar dashboard" })
  }
})

app.get("/api/dashboard/representante/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { period } = req.query

    const startDate = period ? `${period}-01` : "2025-01-01"
    const endDate = period ? `${period.substring(0, 7)}-31` : "2025-12-31"

    // Propostas
    const propostas = await pool.query(
      `
      SELECT COUNT(*) as total, 
             COUNT(CASE WHEN has_generated_sale = true THEN 1 END) as convertidas
      FROM clone_propostas_apprudnik 
      WHERE seller = $1 AND created_at >= $2 AND created_at <= $3
    `,
      [id, startDate, endDate],
    )

    // Faturamento
    const faturamento = await pool.query(
      `
      SELECT COALESCE(SUM(total_price), 0) as total
      FROM clone_propostas_apprudnik 
      WHERE seller = $1 AND has_generated_sale = true 
      AND created_at >= $2 AND created_at <= $3
    `,
      [id, startDate, endDate],
    )

    // Vendas por mês
    const vendasMensais = await pool.query(
      `
      SELECT DATE_TRUNC('month', created_at) as mes,
             COUNT(*) as vendas,
             COALESCE(SUM(total_price), 0) as faturamento
      FROM clone_propostas_apprudnik 
      WHERE seller = $1 AND has_generated_sale = true
      AND created_at >= $2 AND created_at <= $3
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY mes
    `,
      [id, startDate, endDate],
    )

    const totalPropostas = Number.parseInt(propostas.rows[0].total)
    const propostasConvertidas = Number.parseInt(propostas.rows[0].convertidas)
    const taxaConversao = totalPropostas > 0 ? ((propostasConvertidas / totalPropostas) * 100).toFixed(2) : 0
    const ticketMedio =
      propostasConvertidas > 0 ? (Number.parseFloat(faturamento.rows[0].total) / propostasConvertidas).toFixed(2) : 0

    res.json({
      resumo: {
        totalPropostas,
        propostasConvertidas,
        faturamentoTotal: Number.parseFloat(faturamento.rows[0].total),
        taxaConversao: Number.parseFloat(taxaConversao),
        ticketMedio: Number.parseFloat(ticketMedio),
      },
      vendasMensais: vendasMensais.rows.map((row) => ({
        mes: row.mes,
        vendas: Number.parseInt(row.vendas),
        faturamento: Number.parseFloat(row.faturamento),
      })),
    })
  } catch (error) {
    console.error("Dashboard vendedor error:", error)
    res.status(500).json({ message: "Erro ao carregar dashboard" })
  }
})

app.get("/api/dashboard/supervisor/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { period } = req.query

    const startDate = period ? `${period}-01` : "2025-01-01"
    const endDate = period ? `${period.substring(0, 7)}-31` : "2025-12-31"

    // Buscar vendedores supervisionados
    const vendedores = await pool.query(
      `
      SELECT id, name FROM clone_users_apprudnik 
      WHERE supervisor = $1 AND is_active = true
    `,
      [id],
    )

    const vendedorIds = vendedores.rows.map((v) => v.id)

    if (vendedorIds.length === 0) {
      return res.json({
        resumo: { totalPropostas: 0, propostasConvertidas: 0, faturamentoTotal: 0 },
        rankingVendedores: [],
        vendasMensais: [],
      })
    }

    // Resumo da equipe
    const resumoEquipe = await pool.query(
      `
      SELECT COUNT(*) as total_propostas,
             COUNT(CASE WHEN has_generated_sale = true THEN 1 END) as convertidas,
             COALESCE(SUM(CASE WHEN has_generated_sale = true THEN total_price END), 0) as faturamento
      FROM clone_propostas_apprudnik 
      WHERE seller = ANY($1) AND created_at >= $2 AND created_at <= $3
    `,
      [vendedorIds, startDate, endDate],
    )

    // Ranking de vendedores
    const ranking = await pool.query(
      `
      SELECT u.name, u.id,
             COUNT(p.*) as propostas,
             COUNT(CASE WHEN p.has_generated_sale = true THEN 1 END) as vendas,
             COALESCE(SUM(CASE WHEN p.has_generated_sale = true THEN p.total_price END), 0) as faturamento
      FROM clone_users_apprudnik u
      LEFT JOIN clone_propostas_apprudnik p ON u.id = p.seller 
        AND p.created_at >= $2 AND p.created_at <= $3
      WHERE u.id = ANY($1)
      GROUP BY u.id, u.name
      ORDER BY faturamento DESC
    `,
      [vendedorIds, startDate, endDate],
    )

    res.json({
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
    })
  } catch (error) {
    console.error("Dashboard supervisor error:", error)
    res.status(500).json({ message: "Erro ao carregar dashboard" })
  }
})

app.get("/api/dashboard/gerente_comercial", authenticateToken, async (req, res) => {
  try {
    const { period } = req.query

    const startDate = period ? `${period}-01` : "2025-01-01"
    const endDate = period ? `${period.substring(0, 7)}-31` : "2025-12-31"

    // Indicadores globais
    const indicadores = await pool.query(
      `
      SELECT COUNT(*) as total_propostas,
             COUNT(CASE WHEN has_generated_sale = true THEN 1 END) as vendas,
             COALESCE(SUM(CASE WHEN has_generated_sale = true THEN total_price END), 0) as faturamento_total
      FROM clone_propostas_apprudnik 
      WHERE created_at >= $1 AND created_at <= $2
    `,
      [startDate, endDate],
    )

    // Faturamento por mês
    const faturamentoMensal = await pool.query(
      `
      SELECT DATE_TRUNC('month', created_at) as mes,
             COALESCE(SUM(total_price), 0) as faturamento,
             COUNT(CASE WHEN has_generated_sale = true THEN 1 END) as vendas
      FROM clone_propostas_apprudnik 
      WHERE has_generated_sale = true AND created_at >= $1 AND created_at <= $2
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY mes
    `,
      [startDate, endDate],
    )

    // Top vendedores
    const topVendedores = await pool.query(
      `
      SELECT u.name,
             COALESCE(SUM(CASE WHEN p.has_generated_sale = true THEN p.total_price END), 0) as faturamento,
             COUNT(CASE WHEN p.has_generated_sale = true THEN 1 END) as vendas
      FROM clone_users_apprudnik u
      LEFT JOIN clone_propostas_apprudnik p ON u.id = p.seller 
        AND p.created_at >= $1 AND p.created_at <= $2
      WHERE u.role = 'vendedor'
      GROUP BY u.id, u.name
      ORDER BY faturamento DESC
      LIMIT 10
    `,
      [startDate, endDate],
    )

    res.json({
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
        faturamento: Number.parseFloat(row.faturamento),
        vendas: Number.parseInt(row.vendas),
      })),
    })
  } catch (error) {
    console.error("Dashboard gestor error:", error)
    res.status(500).json({ message: "Erro ao carregar dashboard" })
  }
})

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`)
})
