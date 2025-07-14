const express = require("express")
const { query } = require("../config/database")
const { authenticateToken } = require("../middleware/auth")
const { idValidation, periodValidation } = require("../middleware/validation")
const { getDateRange } = require("../utils/dateHelpers")

const router = express.Router()

// Get sales with filters
router.get("/", authenticateToken, periodValidation, async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, seller, period, start_date, end_date, is_invoice_issued } = req.query

    let whereClause = "WHERE 1=1"
    const params = []

    // Role-based filtering
    if (req.user.role === "vendedor") {
      whereClause += ` AND s.seller = $${params.length + 1}`
      params.push(req.user.id)
    } else if (req.user.role === "supervisor") {
      const teamResult = await query("SELECT id FROM clone_users_apprudnik WHERE supervisor = $1 OR id = $1", [
        req.user.id,
      ])
      const teamIds = teamResult.rows.map((row) => row.id)

      whereClause += ` AND s.seller = ANY($${params.length + 1})`
      params.push(teamIds)
    }

    // Additional filters
    if (status) {
      whereClause += ` AND s.status = $${params.length + 1}`
      params.push(status)
    }

    if (seller && req.user.role === "gestor") {
      whereClause += ` AND s.seller = $${params.length + 1}`
      params.push(seller)
    }

    if (is_invoice_issued !== undefined) {
      whereClause += ` AND s.is_invoice_issued = $${params.length + 1}`
      params.push(is_invoice_issued === "true")
    }

    // Date filtering
    if (period || start_date || end_date) {
      const { startDate, endDate } = getDateRange(period, start_date, end_date)
      whereClause += ` AND s.created_at >= $${params.length + 1} AND s.created_at <= $${params.length + 2}`
      params.push(startDate, endDate)
    }

    const offset = (page - 1) * limit

    const salesQuery = `
      SELECT 
        s.id,
        s.name,
        s.status,
        s.is_invoice_issued,
        s.created_at,
        s.customer,
        s."order",
        u.name as seller_name,
        u.email as seller_email,
        p.total_price
      FROM clone_vendas_apprudnik s
      JOIN clone_users_apprudnik u ON s.seller = u.id
      LEFT JOIN clone_propostas_apprudnik p ON s.seller = p.seller 
        AND p.has_generated_sale = true 
        AND p.name LIKE '%' || SUBSTRING(s.name FROM 8) || '%'
      ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `

    const countQuery = `
      SELECT COUNT(*) as total
      FROM clone_vendas_apprudnik s
      JOIN clone_users_apprudnik u ON s.seller = u.id
      ${whereClause}
    `

    const [sales, count] = await Promise.all([query(salesQuery, [...params, limit, offset]), query(countQuery, params)])

    res.json({
      success: true,
      data: {
        sales: sales.rows,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total: Number.parseInt(count.rows[0].total),
          pages: Math.ceil(count.rows[0].total / limit),
        },
      },
    })
  } catch (error) {
    next(error)
  }
})

// Get sale by ID
router.get("/:id", authenticateToken, idValidation, async (req, res, next) => {
  try {
    const { id } = req.params

    let whereClause = "WHERE s.id = $1"
    const params = [id]

    // Role-based access control
    if (req.user.role === "vendedor") {
      whereClause += ` AND s.seller = $2`
      params.push(req.user.id)
    } else if (req.user.role === "supervisor") {
      const teamResult = await query("SELECT id FROM clone_users_apprudnik WHERE supervisor = $1 OR id = $1", [
        req.user.id,
      ])
      const teamIds = teamResult.rows.map((row) => row.id)

      whereClause += ` AND s.seller = ANY($2)`
      params.push(teamIds)
    }

    const saleQuery = `
      SELECT 
        s.id,
        s.name,
        s.status,
        s.is_invoice_issued,
        s.created_at,
        s.customer,
        s."order",
        u.name as seller_name,
        u.email as seller_email,
        u.id as seller_id,
        p.total_price,
        p.id as proposal_id
      FROM clone_vendas_apprudnik s
      JOIN clone_users_apprudnik u ON s.seller = u.id
      LEFT JOIN clone_propostas_apprudnik p ON s.seller = p.seller 
        AND p.has_generated_sale = true 
        AND p.name LIKE '%' || SUBSTRING(s.name FROM 8) || '%'
      ${whereClause}
    `

    const result = await query(saleQuery, params)

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Sale not found" })
    }

    res.json({
      success: true,
      data: result.rows[0],
    })
  } catch (error) {
    next(error)
  }
})

// Update sale
router.put("/:id", authenticateToken, idValidation, async (req, res, next) => {
  try {
    const { id } = req.params
    const { status, is_invoice_issued, customer } = req.body

    // Check if sale exists and user has access
    let accessQuery = "SELECT seller FROM clone_vendas_apprudnik WHERE id = $1"
    const accessParams = [id]

    if (req.user.role === "vendedor") {
      accessQuery += " AND seller = $2"
      accessParams.push(req.user.id)
    } else if (req.user.role === "supervisor") {
      const teamResult = await query("SELECT id FROM clone_users_apprudnik WHERE supervisor = $1 OR id = $1", [
        req.user.id,
      ])
      const teamIds = teamResult.rows.map((row) => row.id)

      accessQuery += " AND seller = ANY($2)"
      accessParams.push(teamIds)
    }

    const accessResult = await query(accessQuery, accessParams)

    if (accessResult.rows.length === 0) {
      return res.status(404).json({ message: "Sale not found or access denied" })
    }

    const updateQuery = `
      UPDATE clone_vendas_apprudnik 
      SET status = COALESCE($1, status), 
          is_invoice_issued = COALESCE($2, is_invoice_issued),
          customer = COALESCE($3, customer),
          updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `

    const result = await query(updateQuery, [status, is_invoice_issued, customer, id])

    res.json({
      success: true,
      data: result.rows[0],
      message: "Sale updated successfully",
    })
  } catch (error) {
    next(error)
  }
})

module.exports = router
