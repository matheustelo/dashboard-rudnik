const express = require("express")
const { query } = require("../config/database")
const { authenticateToken, authorize } = require("../middleware/auth")
const { periodValidation } = require("../middleware/validation")
const { getDateRange } = require("../utils/dateHelpers")
const logger = {
  info: (message) => console.log(`ℹ️  ${message}`),
  error: (message, meta) => console.error(`❌ ${message}`, meta || ""),
}

const router = express.Router()

// Sales performance report
router.get("/performance", authenticateToken, periodValidation, async (req, res, next) => {
  try {
    const { period, start_date, end_date, seller_id } = req.query
    const { startDate, endDate } = getDateRange(period, start_date, end_date)

    let whereClause = "WHERE p.created_at >= $1 AND p.created_at <= $2"
    const params = [startDate, endDate]

    // Role-based filtering
    if (req.user.role === "vendedor") {
      whereClause += ` AND p.seller = $${params.length + 1}`
      params.push(req.user.id)
    } else if (req.user.role === "supervisor") {
      const teamResult = await query("SELECT id FROM clone_users_apprudnik WHERE supervisor = $1 OR id = $1", [
        req.user.id,
      ])
      const teamIds = teamResult.rows.map((row) => row.id)

      whereClause += ` AND p.seller = ANY($${params.length + 1})`
      params.push(teamIds)
    } else if (seller_id) {
      whereClause += ` AND p.seller = $${params.length + 1}`
      params.push(seller_id)
    }

    const performanceQuery = `
      SELECT 
        u.id,
        u.name,
        u.role,
        COUNT(p.*) as total_propostas,
        COUNT(CASE WHEN p.status = 'aprovada' THEN 1 END) as propostas_aprovadas,
        COUNT(CASE WHEN p.has_generated_sale = true THEN 1 END) as vendas_realizadas,
        COALESCE(SUM(CASE WHEN p.has_generated_sale = true THEN p.total_price END), 0) as faturamento_total,
        COALESCE(AVG(CASE WHEN p.has_generated_sale = true THEN p.total_price END), 0) as ticket_medio,
        ROUND(
          CASE 
            WHEN COUNT(p.*) > 0 THEN 
              (COUNT(CASE WHEN p.has_generated_sale = true THEN 1 END)::float / COUNT(p.*)) * 100
            ELSE 0 
          END, 2
        ) as taxa_conversao
      FROM clone_users_apprudnik u
      LEFT JOIN clone_propostas_apprudnik p ON u.id = p.seller AND p.created_at >= $1 AND p.created_at <= $2
      WHERE u.role = 'vendedor' AND u.is_active = true
      ${whereClause.replace("WHERE p.created_at >= $1 AND p.created_at <= $2", "")}
      GROUP BY u.id, u.name, u.role
      ORDER BY faturamento_total DESC
    `

    const result = await query(performanceQuery, params)

    res.json({
      success: true,
      data: {
        performance: result.rows.map((row) => ({
          id: row.id,
          name: row.name,
          role: row.role,
          totalPropostas: Number.parseInt(row.total_propostas),
          propostasAprovadas: Number.parseInt(row.propostas_aprovadas),
          vendasRealizadas: Number.parseInt(row.vendas_realizadas),
          faturamentoTotal: Number.parseFloat(row.faturamento_total),
          ticketMedio: Number.parseFloat(row.ticket_medio),
          taxaConversao: Number.parseFloat(row.taxa_conversao),
        })),
        periodo: { startDate, endDate },
      },
    })
  } catch (error) {
    next(error)
  }
})

// Revenue analysis report
router.get(
  "/revenue",
  authenticateToken,
  authorize("supervisor", "gestor"),
  periodValidation,
  async (req, res, next) => {
    try {
      const { period, start_date, end_date } = req.query
      const { startDate, endDate } = getDateRange(period, start_date, end_date)

      // Monthly revenue breakdown
      const monthlyRevenueQuery = `
      SELECT 
        DATE_TRUNC('month', created_at) as mes,
        COUNT(*) as total_propostas,
        COUNT(CASE WHEN has_generated_sale = true THEN 1 END) as vendas,
        COALESCE(SUM(CASE WHEN has_generated_sale = true THEN total_price END), 0) as faturamento,
        COALESCE(AVG(CASE WHEN has_generated_sale = true THEN total_price END), 0) as ticket_medio
      FROM clone_propostas_apprudnik 
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY mes
    `

      // Revenue by status
      const statusRevenueQuery = `
      SELECT 
        status,
        COUNT(*) as count,
        COALESCE(SUM(total_price), 0) as total_value,
        COALESCE(AVG(total_price), 0) as avg_value
      FROM clone_propostas_apprudnik 
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY status
      ORDER BY total_value DESC
    `

      // Top customers by revenue
      const topCustomersQuery = `
      SELECT 
        COALESCE(customer, 'Cliente não informado') as customer,
        COUNT(*) as total_propostas,
        COUNT(CASE WHEN has_generated_sale = true THEN 1 END) as vendas,
        COALESCE(SUM(CASE WHEN has_generated_sale = true THEN total_price END), 0) as faturamento
      FROM clone_propostas_apprudnik 
      WHERE created_at >= $1 AND created_at <= $2 AND has_generated_sale = true
      GROUP BY customer
      ORDER BY faturamento DESC
      LIMIT 10
    `

      const [monthlyRevenue, statusRevenue, topCustomers] = await Promise.all([
        query(monthlyRevenueQuery, [startDate, endDate]),
        query(statusRevenueQuery, [startDate, endDate]),
        query(topCustomersQuery, [startDate, endDate]),
      ])

      res.json({
        success: true,
        data: {
          faturamentoMensal: monthlyRevenue.rows.map((row) => ({
            mes: row.mes,
            totalPropostas: Number.parseInt(row.total_propostas),
            vendas: Number.parseInt(row.vendas),
            faturamento: Number.parseFloat(row.faturamento),
            ticketMedio: Number.parseFloat(row.ticket_medio),
          })),
          faturamentoPorStatus: statusRevenue.rows.map((row) => ({
            status: row.status,
            count: Number.parseInt(row.count),
            totalValue: Number.parseFloat(row.total_value),
            avgValue: Number.parseFloat(row.avg_value),
          })),
          topClientes: topCustomers.rows.map((row) => ({
            customer: row.customer,
            totalPropostas: Number.parseInt(row.total_propostas),
            vendas: Number.parseInt(row.vendas),
            faturamento: Number.parseFloat(row.faturamento),
          })),
          periodo: { startDate, endDate },
        },
      })
    } catch (error) {
      next(error)
    }
  },
)

// Conversion funnel report
router.get("/funnel", authenticateToken, periodValidation, async (req, res, next) => {
  try {
    const { period, start_date, end_date } = req.query
    const { startDate, endDate } = getDateRange(period, start_date, end_date)

    let whereClause = "WHERE created_at >= $1 AND created_at <= $2"
    const params = [startDate, endDate]

    // Role-based filtering
    if (req.user.role === "vendedor") {
      whereClause += ` AND seller = $${params.length + 1}`
      params.push(req.user.id)
    } else if (req.user.role === "supervisor") {
      const teamResult = await query("SELECT id FROM clone_users_apprudnik WHERE supervisor = $1 OR id = $1", [
        req.user.id,
      ])
      const teamIds = teamResult.rows.map((row) => row.id)

      whereClause += ` AND seller = ANY($${params.length + 1})`
      params.push(teamIds)
    }

    const funnelQuery = `
      SELECT 
        'Total Propostas' as stage,
        COUNT(*) as count,
        100.0 as percentage,
        1 as order_stage
      FROM clone_propostas_apprudnik 
      ${whereClause}
      
      UNION ALL
      
      SELECT 
        'Propostas Aprovadas' as stage,
        COUNT(*) as count,
        ROUND(
          (COUNT(*)::float / (SELECT COUNT(*) FROM clone_propostas_apprudnik ${whereClause})) * 100, 2
        ) as percentage,
        2 as order_stage
      FROM clone_propostas_apprudnik 
      ${whereClause} AND status = 'aprovada'
      
      UNION ALL
      
      SELECT 
        'Vendas Realizadas' as stage,
        COUNT(*) as count,
        ROUND(
          (COUNT(*)::float / (SELECT COUNT(*) FROM clone_propostas_apprudnik ${whereClause})) * 100, 2
        ) as percentage,
        3 as order_stage
      FROM clone_propostas_apprudnik 
      ${whereClause} AND has_generated_sale = true
      
      ORDER BY order_stage
    `

    const result = await query(funnelQuery, [...params, ...params, ...params])

    res.json({
      success: true,
      data: {
        funnel: result.rows.map((row) => ({
          stage: row.stage,
          count: Number.parseInt(row.count),
          percentage: Number.parseFloat(row.percentage),
        })),
        periodo: { startDate, endDate },
      },
    })
  } catch (error) {
    next(error)
  }
})

// Export data (CSV format)
router.get("/export/:type", authenticateToken, async (req, res, next) => {
  try {
    const { type } = req.params
    const { period, start_date, end_date } = req.query
    const { startDate, endDate } = getDateRange(period, start_date, end_date)

    let query_text = ""
    let filename = ""

    switch (type) {
      case "proposals":
        query_text = `
          SELECT 
            p.id,
            p.name,
            p.status,
            p.has_generated_sale,
            p.total_price,
            p.customer,
            p.created_at,
            u.name as seller_name
          FROM clone_propostas_apprudnik p
          JOIN clone_users_apprudnik u ON p.seller = u.id
          WHERE p.created_at >= $1 AND p.created_at <= $2
          ORDER BY p.created_at DESC
        `
        filename = "propostas"
        break

      case "sales":
        query_text = `
          SELECT 
            s.id,
            s.name,
            s.status,
            s.customer,
            s."order",
            s.created_at,
            u.name as seller_name,
            p.total_price
          FROM clone_vendas_apprudnik s
          JOIN clone_users_apprudnik u ON s.seller = u.id
          LEFT JOIN clone_propostas_apprudnik p ON s.seller = p.seller 
            AND p.has_generated_sale = true
          WHERE s.created_at >= $1 AND s.created_at <= $2
          ORDER BY s.created_at DESC
        `
        filename = "vendas"
        break

      default:
        return res.status(400).json({ message: "Invalid export type" })
    }

    const result = await query(query_text, [startDate, endDate])

    // Convert to CSV
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No data found for export" })
    }

    const headers = Object.keys(result.rows[0])
    const csvContent = [
      headers.join(","),
      ...result.rows.map((row) =>
        headers
          .map((header) => {
            const value = row[header]
            return typeof value === "string" ? `"${value.replace(/"/g, '""')}"` : value
          })
          .join(","),
      ),
    ].join("\n")

    res.setHeader("Content-Type", "text/csv")
    res.setHeader("Content-Disposition", `attachment; filename="${filename}_${startDate}_${endDate}.csv"`)
    res.send(csvContent)

    logger.info(`Data exported: ${type} by user ${req.user.id}`)
  } catch (error) {
    next(error)
  }
})

module.exports = router
