const express = require("express")
const { query } = require("../config/database")
const { authenticateToken, checkSupervisorAccess } = require("../middleware/auth")
const { getDateRange } = require("../utils/dateHelpers")

const router = express.Router()

// Helper function to get date range
function getDateRangeLocal(period) {
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
router.get("/vendedor/:id", authenticateToken, checkSupervisorAccess, async (req, res) => {
  try {
    console.log("📊 Vendedor dashboard request:", { id: req.params.id, period: req.query.period })
    const { id } = req.params
    const { period } = req.query

    const { startDate, endDate } = getDateRangeLocal(period)
    console.log("📅 Date range:", { startDate, endDate })

    // Get proposals data
    const proposalsQuery = `
      SELECT 
        COUNT(*) as total, 
        COUNT(CASE WHEN has_generated_sale = true THEN 1 END) as convertidas,
        COALESCE(SUM(CASE WHEN has_generated_sale = true THEN total_price END), 0) as faturamento_total
      FROM clone_propostas_apprudnik 
      WHERE seller = $1 AND created_at >= $2 AND created_at <= $3
    `

    console.log("🔍 Executing proposals query...")
    const propostas = await query(proposalsQuery, [id, startDate, endDate])
    console.log("✅ Proposals data:", propostas.rows[0])

    // Get monthly sales data
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

    console.log("🔍 Executing monthly sales query...")
    const vendasMensais = await query(monthlySalesQuery, [id, startDate, endDate])
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
router.get("/representante/:id", authenticateToken, checkSupervisorAccess, async (req, res) => {
  try {
    console.log("📊 Representante dashboard request:", { id: req.params.id, period: req.query.period })
    const { id } = req.params
    const { period } = req.query

    const { startDate, endDate } = getDateRangeLocal(period)

    // Same logic as vendedor
    const proposalsQuery = `
      SELECT 
        COUNT(*) as total, 
        COUNT(CASE WHEN has_generated_sale = true THEN 1 END) as convertidas,
        COALESCE(SUM(CASE WHEN has_generated_sale = true THEN total_price END), 0) as faturamento_total
      FROM clone_propostas_apprudnik 
      WHERE seller = $1 AND created_at >= $2 AND created_at <= $3
    `

    const propostas = await query(proposalsQuery, [id, startDate, endDate])

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

    const vendasMensais = await query(monthlySalesQuery, [id, startDate, endDate])

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
router.get("/supervisor/:id", authenticateToken, checkSupervisorAccess, async (req, res) => {
  try {
    console.log("📊 Supervisor dashboard request:", { id: req.params.id, period: req.query.period })
    const { id } = req.params
    const { period } = req.query

    const { startDate, endDate } = getDateRangeLocal(period)

    // Get supervised users
    const teamQuery = `
      SELECT id, name FROM clone_users_apprudnik 
      WHERE supervisor = $1 AND is_active = true
    `
    const vendedores = await query(teamQuery, [id])
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
        COALESCE(SUM(CASE WHEN has_generated_sale = true THEN total_price END), 0) as faturamento
      FROM clone_propostas_apprudnik 
      WHERE seller = ANY($1) AND created_at >= $2 AND created_at <= $3
    `

    const resumoEquipe = await query(teamSummaryQuery, [vendedorIds, startDate, endDate])

    // Individual performance ranking
    const rankingQuery = `
      SELECT 
        u.name, u.id,
        COUNT(p.*) as propostas,
        COUNT(CASE WHEN p.has_generated_sale = true THEN 1 END) as vendas,
        COALESCE(SUM(CASE WHEN p.has_generated_sale = true THEN p.total_price END), 0) as faturamento
      FROM clone_users_apprudnik u
      LEFT JOIN clone_propostas_apprudnik p ON u.id = p.seller 
        AND p.created_at >= $2 AND p.created_at <= $3
      WHERE u.id = ANY($1)
      GROUP BY u.id, u.name
      ORDER BY faturamento DESC
    `

    const ranking = await query(rankingQuery, [vendedorIds, startDate, endDate])

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
router.get("/gerente_comercial", authenticateToken, async (req, res) => {
  try {
    console.log("📊 Gerente Comercial dashboard request:", { period: req.query.period })
    const { period } = req.query

    const { startDate, endDate } = getDateRangeLocal(period)

    // Global indicators
    const globalQuery = `
      SELECT 
        COUNT(*) as total_propostas,
        COUNT(CASE WHEN has_generated_sale = true THEN 1 END) as vendas,
        COALESCE(SUM(CASE WHEN has_generated_sale = true THEN total_price END), 0) as faturamento_total
      FROM clone_propostas_apprudnik 
      WHERE created_at >= $1 AND created_at <= $2
    `

    const indicadores = await query(globalQuery, [startDate, endDate])

    // Monthly revenue
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

    const faturamentoMensal = await query(monthlyRevenueQuery, [startDate, endDate])

    // Top performers
    const topPerformersQuery = `
      SELECT 
        u.name,
        u.role,
        COALESCE(SUM(CASE WHEN p.has_generated_sale = true THEN p.total_price END), 0) as faturamento,
        COUNT(CASE WHEN p.has_generated_sale = true THEN 1 END) as vendas
      FROM clone_users_apprudnik u
      LEFT JOIN clone_propostas_apprudnik p ON u.id = p.seller 
        AND p.created_at >= $1 AND p.created_at <= $2
      WHERE u.role IN ('vendedor', 'representante') AND u.is_active = true
      GROUP BY u.id, u.name, u.role
      ORDER BY faturamento DESC
      LIMIT 10
    `

    const topVendedores = await query(topPerformersQuery, [startDate, endDate])

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

module.exports = router
