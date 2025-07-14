const express = require("express")
const { query } = require("../config/database")
const { authenticateToken, authorize } = require("../middleware/auth")
const { getDateRange } = require("../utils/dateHelpers")

const router = express.Router()

// GET /api/goals - Fetch all goals for the management view
router.get("/", authenticateToken, authorize("admin", "gerente_comercial"), async (req, res, next) => {
  console.log("--- Route: GET /api/goals initiated ---")
  try {
    console.log("ℹ️ Route: User role for /api/goals:", req.user.role)
    const { period } = req.query
    const { startDate, endDate } = getDateRange(period)
    console.log("📅 Route: Date range for goals:", { startDate, endDate })

    const generalGoalsQuery = `
      SELECT * FROM metas_gerais 
      WHERE data_inicio <= $2 AND data_fim >= $1
      ORDER BY data_inicio DESC
    `
    const generalGoals = await query(generalGoalsQuery, [startDate, endDate])
    console.log("✅ Route: Fetched general goals:", generalGoals.rows.length, "rows.")

    const individualGoalsQuery = `
      SELECT m.*, u.name as user_name, u.email as user_email 
      FROM metas_individuais m
      JOIN clone_users_apprudnik u ON m.usuario_id = u.id
      WHERE m.data_inicio <= $2 AND m.data_fim >= $1
      ORDER BY u.name, m.data_inicio DESC
    `
    const individualGoals = await query(individualGoalsQuery, [startDate, endDate])
    console.log("✅ Route: Fetched individual goals:", individualGoals.rows.length, "rows.")

    res.json({
      generalGoals: generalGoals.rows,
      individualGoals: individualGoals.rows,
    })
  } catch (error) {
    console.error("❌ Route: Error fetching goals:", error.message)
    next(error) // Pass error to global error handler
  } finally {
    console.log("--- Route: GET /api/goals finished ---")
  }
})

// POST /api/goals - Create or update a goal
router.post("/", authenticateToken, authorize("admin", "gerente_comercial"), async (req, res, next) => {
  console.log("--- Route: POST /api/goals initiated ---")
  try {
    console.log("ℹ️ Route: User role for POST /api/goals:", req.user.role)
    const { type, goalData } = req.body
    const { id, tipo_meta, valor_meta, data_inicio, data_fim, usuario_id } = goalData
    const created_by = req.user.id

    let result
    if (type === "general") {
      if (id) {
        console.log("🔄 Route: Updating general goal ID:", id)
        result = await query(
          `UPDATE metas_gerais SET tipo_meta = $1, valor_meta = $2, data_inicio = $3, data_fim = $4, atualizado_em = NOW()
           WHERE id = $5 RETURNING *`,
          [tipo_meta, valor_meta, data_inicio, data_fim, id],
        )
      } else {
        console.log("➕ Route: Creating new general goal.")
        result = await query(
          `INSERT INTO metas_gerais (tipo_meta, valor_meta, data_inicio, data_fim, criado_por)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [tipo_meta, valor_meta, data_inicio, data_fim, created_by],
        )
      }
    } else if (type === "individual") {
      if (id) {
        console.log("🔄 Route: Updating individual goal ID:", id, "for user:", usuario_id)
        result = await query(
          `UPDATE metas_individuais SET tipo_meta = $1, valor_meta = $2, data_inicio = $3, data_fim = $4, usuario_id = $5, atualizado_em = NOW()
           WHERE id = $6 RETURNING *`,
          [tipo_meta, valor_meta, data_inicio, data_fim, usuario_id, id],
        )
      } else {
        console.log("➕ Route: Creating new individual goal for user:", usuario_id)
        result = await query(
          `INSERT INTO metas_individuais (tipo_meta, valor_meta, data_inicio, data_fim, usuario_id, criado_por)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [tipo_meta, valor_meta, data_inicio, data_fim, usuario_id, created_by],
        )
      }
    } else {
      console.log("❌ Route: Invalid goal type received:", type)
      return res.status(400).json({ message: "Invalid goal type" })
    }

    console.log("✅ Route: Goal operation successful. Result:", result.rows[0])
    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error("❌ Route: Error creating/updating goal:", error.message)
    next(error)
  } finally {
    console.log("--- Route: POST /api/goals finished ---")
  }
})

// DELETE /api/goals/:type/:id - Delete a goal
router.delete("/:type/:id", authenticateToken, authorize("admin", "gerente_comercial"), async (req, res, next) => {
  console.log("--- Route: DELETE /api/goals/:type/:id initiated ---")
  try {
    console.log("ℹ️ Route: User role for DELETE /api/goals:", req.user.role)
    console.log("ℹ️ Route: Deleting goal type:", req.params.type, "| ID:", req.params.id)
    const { type, id } = req.params
    if (type === "general") {
      await query("DELETE FROM metas_gerais WHERE id = $1", [id])
    } else if (type === "individual") {
      await query("DELETE FROM metas_individuais WHERE id = $1", [id])
    } else {
      console.log("❌ Route: Invalid goal type for deletion:", type)
      return res.status(400).json({ message: "Invalid goal type" })
    }
    console.log("✅ Route: Goal deleted successfully.")
    res.status(204).send()
  } catch (error) {
    console.error("❌ Route: Error deleting goal:", error.message)
    next(error)
  } finally {
    console.log("--- Route: DELETE /api/goals/:type/:id finished ---")
  }
})

// GET /api/goals/tracking/seller/:id - Get goal tracking for a seller
router.get("/tracking/seller/:id", authenticateToken, async (req, res, next) => {
  console.log("--- Route: GET /api/goals/tracking/seller/:id initiated ---")
  try {
    console.log("ℹ️ Route: User role for /tracking/seller:", req.user.role)
    console.log("ℹ️ Route: Fetching goal tracking for seller ID:", req.params.id, "| Period:", req.query.period)
    const { id } = req.params
    const { period } = req.query
    const { startDate, endDate } = getDateRange(period)
    console.log("📅 Route: Tracking date range:", { startDate, endDate })

    // Ensure the user can only track their own goals or if they are a supervisor/manager/admin
    if (req.user.id !== Number.parseInt(id) && !["supervisor", "gerente_comercial", "admin"].includes(req.user.role)) {
      console.log("❌ Route: Access denied for tracking goals of user ID:", id, "by user role:", req.user.role)
      return res.status(403).json({ message: "Access denied to track this user's goals" })
    }

    const goalsQuery = `
      SELECT * FROM metas_individuais
      WHERE usuario_id = $1 AND data_inicio <= $3 AND data_fim >= $2
    `
    const goalsResult = await query(goalsQuery, [id, startDate, endDate])
    const goals = goalsResult.rows
    console.log("✅ Route: Found", goals.length, "individual goals for seller.")

    const performanceQuery = `
      SELECT 
        COUNT(*) as propostas_realizadas,
        COALESCE(SUM(CASE WHEN has_generated_sale = true THEN total_price END), 0) as faturamento_realizado
      FROM clone_propostas_apprudnik
      WHERE seller = $1 AND created_at BETWEEN $2 AND $3
    `
    const performanceResult = await query(performanceQuery, [id, startDate, endDate])
    const performance = performanceResult.rows[0]
    console.log("✅ Route: Seller performance:", performance)

    const trackingData = goals.map((goal) => {
      const achieved =
        goal.tipo_meta === "faturamento"
          ? Number.parseFloat(performance.faturamento_realizado)
          : Number.parseInt(performance.propostas_realizadas, 10)
      const target = Number.parseFloat(goal.valor_meta)
      const progress = target > 0 ? (achieved / target) * 100 : 0
      return { ...goal, achieved, progress: Math.min(progress, 100) }
    })

    console.log("✅ Route: Sending tracking data:", trackingData)
    res.json(trackingData)
  } catch (error) {
    console.error("❌ Route: Error fetching goal tracking:", error.message)
    next(error)
  } finally {
    console.log("--- Route: GET /api/goals/tracking/seller/:id finished ---")
  }
})

module.exports = router
