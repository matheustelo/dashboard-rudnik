const express = require("express")
const { query } = require("../config/database")
const { authenticateToken, authorize } = require("../middleware/auth")
const { getDateRange } = require("../utils/dateHelpers")

const router = express.Router()

// GET /api/goals - Fetch all goals for the management view
router.get("/", authenticateToken, authorize("admin", "gerente_comercial"), async (req, res, next) => {
  try {
    const { period } = req.query
    const { startDate, endDate } = getDateRange(period)

    const generalGoalsQuery = `
      SELECT * FROM metas_gerais 
      WHERE data_inicio <= $2 AND data_fim >= $1
      ORDER BY data_inicio DESC
    `
    const generalGoals = await query(generalGoalsQuery, [startDate, endDate])

    const individualGoalsQuery = `
      SELECT m.*, u.name as user_name, u.email as user_email 
      FROM metas_individuais m
      JOIN clone_users_apprudnik u ON m.usuario_id = u.id
      WHERE m.data_inicio <= $2 AND m.data_fim >= $1
      ORDER BY u.name, m.data_inicio DESC
    `
    const individualGoals = await query(individualGoalsQuery, [startDate, endDate])

    res.json({
      generalGoals: generalGoals.rows,
      individualGoals: individualGoals.rows,
    })
  } catch (error) {
    next(error)
  }
})

// POST /api/goals - Create or update a goal
router.post("/", authenticateToken, authorize("admin", "gerente_comercial"), async (req, res, next) => {
  try {
    const { type, goalData } = req.body
    const { id, tipo_meta, valor_meta, data_inicio, data_fim, usuario_id } = goalData
    const created_by = req.user.id

    let result
    if (type === "general") {
      if (id) {
        result = await query(
          `UPDATE metas_gerais SET tipo_meta = $1, valor_meta = $2, data_inicio = $3, data_fim = $4, atualizado_em = NOW()
           WHERE id = $5 RETURNING *`,
          [tipo_meta, valor_meta, data_inicio, data_fim, id],
        )
      } else {
        result = await query(
          `INSERT INTO metas_gerais (tipo_meta, valor_meta, data_inicio, data_fim, criado_por)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [tipo_meta, valor_meta, data_inicio, data_fim, created_by],
        )
      }
    } else if (type === "individual") {
      if (id) {
        result = await query(
          `UPDATE metas_individuais SET tipo_meta = $1, valor_meta = $2, data_inicio = $3, data_fim = $4, usuario_id = $5, atualizado_em = NOW()
           WHERE id = $6 RETURNING *`,
          [tipo_meta, valor_meta, data_inicio, data_fim, usuario_id, id],
        )
      } else {
        result = await query(
          `INSERT INTO metas_individuais (tipo_meta, valor_meta, data_inicio, data_fim, usuario_id, criado_por)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [tipo_meta, valor_meta, data_inicio, data_fim, usuario_id, created_by],
        )
      }
    } else {
      return res.status(400).json({ message: "Invalid goal type" })
    }

    res.status(201).json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// DELETE /api/goals/:type/:id - Delete a goal
router.delete("/:type/:id", authenticateToken, authorize("admin", "gerente_comercial"), async (req, res, next) => {
  try {
    const { type, id } = req.params
    if (type === "general") {
      await query("DELETE FROM metas_gerais WHERE id = $1", [id])
    } else if (type === "individual") {
      await query("DELETE FROM metas_individuais WHERE id = $1", [id])
    } else {
      return res.status(400).json({ message: "Invalid goal type" })
    }
    res.status(204).send()
  } catch (error) {
    next(error)
  }
})

// GET /api/goals/tracking/seller/:id - Get goal tracking for a seller
router.get("/tracking/seller/:id", authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params
    const { period } = req.query
    const { startDate, endDate } = getDateRange(period)

    const goalsQuery = `
      SELECT * FROM metas_individuais
      WHERE usuario_id = $1 AND data_inicio <= $3 AND data_fim >= $2
    `
    const goalsResult = await query(goalsQuery, [id, startDate, endDate])
    const goals = goalsResult.rows

    const performanceQuery = `
      SELECT 
        COUNT(*) as propostas_realizadas,
        COALESCE(SUM(CASE WHEN has_generated_sale = true THEN total_price END), 0) as faturamento_realizado
      FROM clone_propostas_apprudnik
      WHERE seller = $1 AND created_at BETWEEN $2 AND $3
    `
    const performanceResult = await query(performanceQuery, [id, startDate, endDate])
    const performance = performanceResult.rows[0]

    const trackingData = goals.map((goal) => {
      const achieved =
        goal.tipo_meta === "faturamento"
          ? Number.parseFloat(performance.faturamento_realizado)
          : Number.parseInt(performance.propostas_realizadas, 10)
      const target = Number.parseFloat(goal.valor_meta)
      const progress = target > 0 ? (achieved / target) * 100 : 0
      return { ...goal, achieved, progress: Math.min(progress, 100) }
    })

    res.json(trackingData)
  } catch (error) {
    next(error)
  }
})

module.exports = router
