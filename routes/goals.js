const express = require("express")
const { query } = require("../config/database")
const { authenticateToken, authorize } = require("../middleware/auth")
const { getDateRange } = require("../utils/dateHelpers")
const router = express.Router()

// Get goals and progress for a period
router.get("/", authenticateToken, authorize("admin", "gerente_comercial"), async (req, res, next) => {
  try {
    const { period } = req.query
    const { startDate, endDate } = getDateRange(period)

    const generalGoalQuery = "SELECT target_proposals, target_sales FROM sales_goals WHERE user_id IS NULL AND period = $1"
    const generalGoal = await query(generalGoalQuery, [period])

    const individualGoalsQuery = `
      SELECT g.id, g.user_id, u.name, g.target_proposals, g.target_sales
      FROM sales_goals g
      JOIN clone_users_apprudnik u ON g.user_id = u.id
      WHERE g.period = $1 AND g.user_id IS NOT NULL
    `
    const individualGoals = await query(individualGoalsQuery, [period])

    const progressGeneralQuery = `
      SELECT COUNT(*) as proposals,
             COUNT(CASE WHEN has_generated_sale = true THEN 1 END) as sales
      FROM clone_propostas_apprudnik
      WHERE created_at >= $1 AND created_at <= $2
    `
    const progressGeneral = await query(progressGeneralQuery, [startDate, endDate])

    const progressIndividualQuery = `
      SELECT seller as user_id,
             COUNT(*) as proposals,
             COUNT(CASE WHEN has_generated_sale = true THEN 1 END) as sales
      FROM clone_propostas_apprudnik
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY seller
    `
    const progressIndividual = await query(progressIndividualQuery, [startDate, endDate])

    const progressMap = {}
    progressIndividual.rows.forEach((row) => {
      progressMap[row.user_id] = row
    })

    const individuals = individualGoals.rows.map((goal) => ({
      id: goal.id,
      userId: goal.user_id,
      name: goal.name,
      proposalsTarget: Number.parseInt(goal.target_proposals),
      salesTarget: Number.parseInt(goal.target_sales),
      proposalsAchieved: Number.parseInt(progressMap[goal.user_id]?.proposals || 0),
      salesAchieved: Number.parseInt(progressMap[goal.user_id]?.sales || 0),
    }))

    res.json({
      success: true,
      data: {
        general: {
          proposalsTarget: Number.parseInt(generalGoal.rows[0]?.target_proposals || 0),
          salesTarget: Number.parseInt(generalGoal.rows[0]?.target_sales || 0),
          proposalsAchieved: Number.parseInt(progressGeneral.rows[0].proposals),
          salesAchieved: Number.parseInt(progressGeneral.rows[0].sales),
        },
        individuals,
      },
    })
  } catch (error) {
    next(error)
  }
})

// Get only general goal and progress
router.get("/general", authenticateToken, authorize("admin", "gerente_comercial"), async (req, res, next) => {
  try {
    const { period } = req.query
    const { startDate, endDate } = getDateRange(period)

    const goalQuery = "SELECT target_proposals, target_sales FROM sales_goals WHERE user_id IS NULL AND period = $1"
    const goal = await query(goalQuery, [period])

    const progressQuery = `
      SELECT COUNT(*) as proposals,
             COUNT(CASE WHEN has_generated_sale = true THEN 1 END) as sales
      FROM clone_propostas_apprudnik
      WHERE created_at >= $1 AND created_at <= $2
    `
    const progress = await query(progressQuery, [startDate, endDate])

    res.json({
      success: true,
      data: {
        proposalsTarget: Number.parseInt(goal.rows[0]?.target_proposals || 0),
        salesTarget: Number.parseInt(goal.rows[0]?.target_sales || 0),
        proposalsAchieved: Number.parseInt(progress.rows[0].proposals),
        salesAchieved: Number.parseInt(progress.rows[0].sales),
      },
    })
  } catch (error) {
    next(error)
  }
})

// Set or update general goal
router.post("/general", authenticateToken, authorize("admin", "gerente_comercial"), async (req, res, next) => {
  try {
    const { period, target_proposals, target_sales } = req.body
    await query(
      `INSERT INTO sales_goals (period, user_id, target_proposals, target_sales)
       VALUES ($1, NULL, $2, $3)
       ON CONFLICT (period, user_id) DO UPDATE
       SET target_proposals = EXCLUDED.target_proposals,
           target_sales = EXCLUDED.target_sales`,
      [period, target_proposals, target_sales],
    )
    res.json({ success: true, message: "Meta geral salva" })
  } catch (error) {
    next(error)
  }
})

// Set or update individual goal
router.post("/individual", authenticateToken, authorize("admin", "gerente_comercial"), async (req, res, next) => {
  try {
    const { user_id, period, target_proposals, target_sales } = req.body
    await query(
      `INSERT INTO sales_goals (period, user_id, target_proposals, target_sales)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (period, user_id) DO UPDATE
       SET target_proposals = EXCLUDED.target_proposals,
           target_sales = EXCLUDED.target_sales`,
      [period, user_id, target_proposals, target_sales],
    )
    res.json({ success: true, message: "Meta individual salva" })
  } catch (error) {
    next(error)
  }
})

module.exports = router