const express = require("express")
const { query } = require("../config/database")
const { authenticateToken, checkSupervisorAccess } = require("../middleware/auth")
const { periodValidation, idValidation } = require("../middleware/validation")
const { getDateRange } = require("../utils/dateHelpers")
const logger = {
  info: (message) => console.log(`ℹ️  ${message}`),
  error: (message, meta) => console.error(`❌ ${message}`, meta || ""),
}

const router = express.Router()

// Vendedor dashboard
router.get(
  "/vendedor/:id",
  authenticateToken,
  checkSupervisorAccess,
  idValidation,
  periodValidation,
  async (req, res, next) => {
    try {
      const { id } = req.params
      const { period, start_date, end_date } = req.query

      const { startDate, endDate } = getDateRange(period, start_date, end_date)

      // Get basic metrics
      const metricsQuery = `
      SELECT 
        COUNT(*) as total_propostas,
        COUNT(CASE WHEN has_generated_sale = true THEN 1 END) as propostas_convertidas,
        COALESCE(SUM(CASE WHEN has_generated_sale = true THEN total_price END), 0) as faturamento_total,
        COALESCE(AVG(CASE WHEN has_generated_sale = true THEN total_price END), 0) as ticket_medio
      FROM clone_propostas_apprudnik 
      WHERE seller = $1 AND created_at >= $2 AND created_at <= $3
    `

      const metrics = await query(metricsQuery, [id, startDate, endDate])

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

      const monthlySales = await query(monthlySalesQuery, [id, startDate, endDate])

      // Get conversion funnel
      const funnelQuery = `
      SELECT 
        'Propostas' as stage,
        COUNT(*) as count,
        1 as order_stage
      FROM clone_propostas_apprudnik 
      WHERE seller = $1 AND created_at >= $2 AND created_at <= $3
      
      UNION ALL
      
      SELECT 
        'Aprovadas' as stage,
        COUNT(*) as count,
        2 as order_stage
      FROM clone_propostas_apprudnik 
      WHERE seller = $1 AND created_at >= $2 AND created_at <= $3 AND status = 'aprovada'
      
      UNION ALL
      
      SELECT 
        'Vendas' as stage,
        COUNT(*) as count,
        3 as order_stage
      FROM clone_propostas_apprudnik 
      WHERE seller = $1 AND created_at >= $2 AND created_at <= $3 AND has_generated_sale = true
      
      ORDER BY order_stage
    `

      const funnel = await query(funnelQuery, [id, startDate, endDate])

      // Calculate conversion rate
      const totalPropostas = Number.parseInt(metrics.rows[0].total_propostas)
      const propostasConvertidas = Number.parseInt(metrics.rows[0].propostas_convertidas)
      const taxaConversao = totalPropostas > 0 ? (propostasConvertidas / totalPropostas) * 100 : 0

      const response = {
        success: true,
        data: {
          resumo: {
            totalPropostas,
            propostasConvertidas,
            faturamentoTotal: Number.parseFloat(metrics.rows[0].faturamento_total),
            ticketMedio: Number.parseFloat(metrics.rows[0].ticket_medio),
            taxaConversao: Number.parseFloat(taxaConversao.toFixed(2)),
          },
          vendasMensais: monthlySales.rows.map((row) => ({
            mes: row.mes,
            totalPropostas: Number.parseInt(row.total_propostas),
            vendas: Number.parseInt(row.vendas),
            faturamento: Number.parseFloat(row.faturamento),
          })),
          funil: funnel.rows.map((row) => ({
            stage: row.stage,
            count: Number.parseInt(row.count),
          })),
          periodo: { startDate, endDate },
        },
      }

      logger.info(`Dashboard vendedor ${id} accessed by user ${req.user.id}`)
      res.json(response)
    } catch (error) {
      next(error)
    }
  },
)

// Supervisor dashboard
router.get(
  "/supervisor/:id",
  authenticateToken,
  checkSupervisorAccess,
  idValidation,
  periodValidation,
  async (req, res, next) => {
    try {
      const { id } = req.params
      const { period, start_date, end_date } = req.query

      const { startDate, endDate } = getDateRange(period, start_date, end_date)

      // Get supervised users
      const teamQuery = `
      SELECT id, name, email 
      FROM clone_users_apprudnik 
      WHERE supervisor = $1 AND is_active = true
    `
      const team = await query(teamQuery, [id])
      const teamIds = team.rows.map((user) => user.id)

      if (teamIds.length === 0) {
        return res.json({
          success: true,
          data: {
            resumo: { totalPropostas: 0, propostasConvertidas: 0, faturamentoTotal: 0 },
            rankingVendedores: [],
            equipe: [],
            periodo: { startDate, endDate },
          },
        })
      }

      // Team summary
      const teamSummaryQuery = `
      SELECT 
        COUNT(*) as total_propostas,
        COUNT(CASE WHEN has_generated_sale = true THEN 1 END) as propostas_convertidas,
        COALESCE(SUM(CASE WHEN has_generated_sale = true THEN total_price END), 0) as faturamento_total
      FROM clone_propostas_apprudnik 
      WHERE seller = ANY($1) AND created_at >= $2 AND created_at <= $3
    `

      const teamSummary = await query(teamSummaryQuery, [teamIds, startDate, endDate])

      // Individual performance ranking
      const rankingQuery = `
      SELECT 
        u.id,
        u.name,
        u.email,
        COUNT(p.*) as total_propostas,
        COUNT(CASE WHEN p.has_generated_sale = true THEN 1 END) as vendas,
        COALESCE(SUM(CASE WHEN p.has_generated_sale = true THEN p.total_price END), 0) as faturamento,
        COALESCE(AVG(CASE WHEN p.has_generated_sale = true THEN p.total_price END), 0) as ticket_medio
      FROM clone_users_apprudnik u
      LEFT JOIN clone_propostas_apprudnik p ON u.id = p.seller 
        AND p.created_at >= $2 AND p.created_at <= $3
      WHERE u.id = ANY($1)
      GROUP BY u.id, u.name, u.email
      ORDER BY faturamento DESC, vendas DESC
    `

      const ranking = await query(rankingQuery, [teamIds, startDate, endDate])

      // Team performance over time
      const teamPerformanceQuery = `
      SELECT 
        DATE_TRUNC('month', created_at) as mes,
        COUNT(*) as propostas,
        COUNT(CASE WHEN has_generated_sale = true THEN 1 END) as vendas,
        COALESCE(SUM(CASE WHEN has_generated_sale = true THEN total_price END), 0) as faturamento
      FROM clone_propostas_apprudnik 
      WHERE seller = ANY($1) AND created_at >= $2 AND created_at <= $3
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY mes
    `

      const teamPerformance = await query(teamPerformanceQuery, [teamIds, startDate, endDate])

      const response = {
        success: true,
        data: {
          resumo: {
            totalPropostas: Number.parseInt(teamSummary.rows[0].total_propostas),
            propostasConvertidas: Number.parseInt(teamSummary.rows[0].propostas_convertidas),
            faturamentoTotal: Number.parseFloat(teamSummary.rows[0].faturamento_total),
          },
          rankingVendedores: ranking.rows.map((row) => ({
            id: row.id,
            name: row.name,
            email: row.email,
            totalPropostas: Number.parseInt(row.total_propostas),
            vendas: Number.parseInt(row.vendas),
            faturamento: Number.parseFloat(row.faturamento),
            ticketMedio: Number.parseFloat(row.ticket_medio),
          })),
          equipe: team.rows,
          performanceEquipe: teamPerformance.rows.map((row) => ({
            mes: row.mes,
            propostas: Number.parseInt(row.propostas),
            vendas: Number.parseInt(row.vendas),
            faturamento: Number.parseFloat(row.faturamento),
          })),
          periodo: { startDate, endDate },
        },
      }

      logger.info(`Dashboard supervisor ${id} accessed by user ${req.user.id}`)
      res.json(response)
    } catch (error) {
      next(error)
    }
  },
)

// Gestor dashboard
router.get("/admin", authenticateToken, periodValidation, async (req, res, next) => {
  try {
    const { period, start_date, end_date } = req.query
    const { startDate, endDate } = getDateRange(period, start_date, end_date)

    // Global indicators
    const globalQuery = `
      SELECT 
        COUNT(*) as total_propostas,
        COUNT(CASE WHEN has_generated_sale = true THEN 1 END) as total_vendas,
        COALESCE(SUM(CASE WHEN has_generated_sale = true THEN total_price END), 0) as faturamento_total,
        COALESCE(AVG(CASE WHEN has_generated_sale = true THEN total_price END), 0) as ticket_medio_global
      FROM clone_propostas_apprudnik 
      WHERE created_at >= $1 AND created_at <= $2
    `

    const globalMetrics = await query(globalQuery, [startDate, endDate])

    const totalPropostas = Number.parseInt(globalMetrics.rows[0].total_propostas)
    const totalVendas = Number.parseInt(globalMetrics.rows[0].total_vendas)
    const faturamentoTotal = Number.parseFloat(globalMetrics.rows[0].faturamento_total)
    const ticketMedioGlobal = Number.parseFloat(globalMetrics.rows[0].ticket_medio_global)
    const taxaConversao =
      totalPropostas > 0 ? (totalVendas / totalPropostas) * 100 : 0

    // Monthly revenue
    const monthlyRevenueQuery = `
      SELECT 
        DATE_TRUNC('month', created_at) as mes,
        COUNT(*) as propostas,
        COUNT(CASE WHEN has_generated_sale = true THEN 1 END) as vendas,
        COALESCE(SUM(CASE WHEN has_generated_sale = true THEN total_price END), 0) as faturamento
      FROM clone_propostas_apprudnik 
      WHERE has_generated_sale = true AND created_at >= $1 AND created_at <= $2
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY mes
    `

    const monthlyRevenue = await query(monthlyRevenueQuery, [startDate, endDate])

    // Top performers
    const topPerformersQuery = `
      SELECT 
        u.id,
        u.name,
        u.role,
        COUNT(p.*) as total_propostas,
        COUNT(CASE WHEN p.has_generated_sale = true THEN 1 END) as vendas,
        COALESCE(SUM(CASE WHEN p.has_generated_sale = true THEN p.total_price END), 0) as faturamento,
        COALESCE(AVG(CASE WHEN p.has_generated_sale = true THEN p.total_price END), 0) as ticket_medio
      FROM clone_users_apprudnik u
      LEFT JOIN clone_propostas_apprudnik p ON u.id = p.seller 
        AND p.created_at >= $1 AND p.created_at <= $2
      WHERE u.role = 'vendedor' AND u.is_active = true
      GROUP BY u.id, u.name, u.role
      HAVING COUNT(CASE WHEN p.has_generated_sale = true THEN 1 END) > 0
      ORDER BY faturamento DESC
      LIMIT 10
    `

    const topPerformers = await query(topPerformersQuery, [startDate, endDate])

    // Sales by status
    const salesByStatusQuery = `
      SELECT 
        status,
        COUNT(*) as count,
        COALESCE(SUM(total_price), 0) as total_value
      FROM clone_propostas_apprudnik 
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY status
      ORDER BY count DESC
    `

    const salesByStatus = await query(salesByStatusQuery, [startDate, endDate])

    // Regional performance (if you have region data)
    const supervisorPerformanceQuery = `
      SELECT 
        s.id as supervisor_id,
        s.name as supervisor_name,
        COUNT(p.*) as total_propostas,
        COUNT(CASE WHEN p.has_generated_sale = true THEN 1 END) as vendas,
        COALESCE(SUM(CASE WHEN p.has_generated_sale = true THEN p.total_price END), 0) as faturamento,
        COUNT(DISTINCT v.id) as vendedores_ativos
      FROM clone_users_apprudnik s
      LEFT JOIN clone_users_apprudnik v ON s.id = v.supervisor
      LEFT JOIN clone_propostas_apprudnik p ON v.id = p.seller 
        AND p.created_at >= $1 AND p.created_at <= $2
      WHERE s.role = 'supervisor' AND s.is_active = true
      GROUP BY s.id, s.name
      ORDER BY faturamento DESC
    `

    const supervisorPerformance = await query(supervisorPerformanceQuery, [startDate, endDate])

    const response = {
      success: true,
      data: {
        indicadores: {
          totalPropostas,
          totalVendas,
          faturamentoTotal,
          ticketMedioGlobal,
          taxaConversao: Number.parseFloat(taxaConversao.toFixed(2)),
        },
        faturamentoMensal: monthlyRevenue.rows.map((row) => ({
          mes: row.mes,
          propostas: Number.parseInt(row.propostas),
          vendas: Number.parseInt(row.vendas),
          faturamento: Number.parseFloat(row.faturamento),
        })),
        topVendedores: topPerformers.rows.map((row) => ({
          id: row.id,
          name: row.name,
          role: row.role,
          totalPropostas: Number.parseInt(row.total_propostas),
          vendas: Number.parseInt(row.vendas),
          faturamento: Number.parseFloat(row.faturamento),
          ticketMedio: Number.parseFloat(row.ticket_medio),
        })),
        vendasPorStatus: salesByStatus.rows.map((row) => ({
          status: row.status,
          count: Number.parseInt(row.count),
          totalValue: Number.parseFloat(row.total_value),
        })),
        performanceSupervisores: supervisorPerformance.rows.map((row) => ({
          supervisorId: row.supervisor_id,
          supervisorName: row.supervisor_name,
          totalPropostas: Number.parseInt(row.total_propostas),
          vendas: Number.parseInt(row.vendas),
          faturamento: Number.parseFloat(row.faturamento),
          vendedoresAtivos: Number.parseInt(row.vendedores_ativos),
        })),
        periodo: { startDate, endDate },
      },
    }

    logger.info(`Dashboard gestor accessed by user ${req.user.id}`)
    res.json(response)
  } catch (error) {
    next(error)
  }
})

module.exports = router
