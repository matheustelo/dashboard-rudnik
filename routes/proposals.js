const express = require("express")
const { query, transaction } = require("../config/database")
const { authenticateToken, authorize } = require("../middleware/auth")
const { proposalValidation, idValidation, periodValidation } = require("../middleware/validation")
const { getDateRange } = require("../utils/dateHelpers")
const logger = {
  info: (message) => console.log(`ℹ️  ${message}`),
  error: (message, meta) => console.error(`❌ ${message}`, meta || ""),
}

const router = express.Router()

// Get proposals with filters
router.get("/", authenticateToken, periodValidation, async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, seller, period, start_date, end_date, has_generated_sale } = req.query

    let whereClause = "WHERE 1=1"
    const params = []

    // Role-based filtering
    if (req.user.role === "vendedor") {
      whereClause += ` AND p.seller = $${params.length + 1}`
      params.push(req.user.id)
    } else if (req.user.role === "supervisor") {
      // Get supervised users
      const teamResult = await query("SELECT id FROM clone_users_apprudnik WHERE supervisor = $1 OR id = $1", [
        req.user.id,
      ])
      const teamIds = teamResult.rows.map((row) => row.id)

      whereClause += ` AND p.seller = ANY($${params.length + 1})`
      params.push(teamIds)
    }

    // Additional filters
    if (status) {
      whereClause += ` AND p.status = $${params.length + 1}`
      params.push(status)
    }

    if (seller && req.user.role === "gestor") {
      whereClause += ` AND p.seller = $${params.length + 1}`
      params.push(seller)
    }

    if (has_generated_sale !== undefined) {
      whereClause += ` AND p.has_generated_sale = $${params.length + 1}`
      params.push(has_generated_sale === "true")
    }

    // Date filtering
    if (period || start_date || end_date) {
      const { startDate, endDate } = getDateRange(period, start_date, end_date)
      whereClause += ` AND p.created_at >= $${params.length + 1} AND p.created_at <= $${params.length + 2}`
      params.push(startDate, endDate)
    }

    const offset = (page - 1) * limit

    const proposalsQuery = `
      SELECT 
        p.id,
        p.name,
        p.status,
        p.has_generated_sale,
        p.total_price,
        p.created_at,
        p.updated_at,
        u.name as seller_name,
        u.email as seller_email
      FROM clone_propostas_apprudnik p
      JOIN clone_users_apprudnik u ON p.seller = u.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `

    const countQuery = `
      SELECT COUNT(*) as total
      FROM clone_propostas_apprudnik p
      JOIN clone_users_apprudnik u ON p.seller = u.id
      ${whereClause}
    `

    const [proposals, count] = await Promise.all([
      query(proposalsQuery, [...params, limit, offset]),
      query(countQuery, params),
    ])

    res.json({
      success: true,
      data: {
        proposals: proposals.rows,
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

// Get proposal by ID
router.get("/:id", authenticateToken, idValidation, async (req, res, next) => {
  try {
    const { id } = req.params

    let whereClause = "WHERE p.id = $1"
    const params = [id]

    // Role-based access control
    if (req.user.role === "vendedor") {
      whereClause += ` AND p.seller = $2`
      params.push(req.user.id)
    } else if (req.user.role === "supervisor") {
      const teamResult = await query("SELECT id FROM clone_users_apprudnik WHERE supervisor = $1 OR id = $1", [
        req.user.id,
      ])
      const teamIds = teamResult.rows.map((row) => row.id)

      whereClause += ` AND p.seller = ANY($2)`
      params.push(teamIds)
    }

    const proposalQuery = `
      SELECT 
        p.id,
        p.name,
        p.status,
        p.has_generated_sale,
        p.total_price,
        p.customer,
        p.created_at,
        p.updated_at,
        u.name as seller_name,
        u.email as seller_email,
        u.id as seller_id
      FROM clone_propostas_apprudnik p
      JOIN clone_users_apprudnik u ON p.seller = u.id
      ${whereClause}
    `

    const result = await query(proposalQuery, params)

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Proposal not found" })
    }

    res.json({
      success: true,
      data: result.rows[0],
    })
  } catch (error) {
    next(error)
  }
})

// Create proposal
router.post("/", authenticateToken, proposalValidation, async (req, res, next) => {
  try {
    const { name, total_price, status = "pendente", customer } = req.body

    // Vendedores can only create proposals for themselves
    const sellerId = req.user.role === "vendedor" ? req.user.id : req.body.seller || req.user.id

    // Validate seller exists and is accessible
    if (req.user.role === "supervisor") {
      const teamResult = await query(
        "SELECT id FROM clone_users_apprudnik WHERE (supervisor = $1 OR id = $1) AND id = $2",
        [req.user.id, sellerId],
      )

      if (teamResult.rows.length === 0) {
        return res.status(403).json({ message: "Cannot create proposal for this seller" })
      }
    }

    const insertQuery = `
      INSERT INTO clone_propostas_apprudnik (name, total_price, status, seller, customer, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id, name, total_price, status, seller, customer, created_at
    `

    const result = await query(insertQuery, [name, total_price, status, sellerId, customer || null])

    logger.info(`Proposal created: ${name} by user ${req.user.id}`)

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: "Proposal created successfully",
    })
  } catch (error) {
    next(error)
  }
})

// Update proposal
router.put("/:id", authenticateToken, idValidation, proposalValidation, async (req, res, next) => {
  try {
    const { id } = req.params
    const { name, total_price, status, customer, has_generated_sale } = req.body

    // Check if proposal exists and user has access
    let accessQuery = "SELECT seller FROM clone_propostas_apprudnik WHERE id = $1"
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
      return res.status(404).json({ message: "Proposal not found or access denied" })
    }

    const updateQuery = `
      UPDATE clone_propostas_apprudnik 
      SET name = $1, total_price = $2, status = $3, customer = $4, has_generated_sale = $5, updated_at = NOW()
      WHERE id = $6
      RETURNING id, name, total_price, status, customer, has_generated_sale, updated_at
    `

    const result = await query(updateQuery, [
      name,
      total_price,
      status,
      customer || null,
      has_generated_sale || false,
      id,
    ])

    logger.info(`Proposal updated: ${id} by user ${req.user.id}`)

    res.json({
      success: true,
      data: result.rows[0],
      message: "Proposal updated successfully",
    })
  } catch (error) {
    next(error)
  }
})

// Delete proposal
router.delete("/:id", authenticateToken, idValidation, async (req, res, next) => {
  try {
    const { id } = req.params

    // Check access permissions
    let accessQuery = "SELECT seller FROM clone_propostas_apprudnik WHERE id = $1"
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
      return res.status(404).json({ message: "Proposal not found or access denied" })
    }

    await query("DELETE FROM clone_propostas_apprudnik WHERE id = $1", [id])

    logger.info(`Proposal deleted: ${id} by user ${req.user.id}`)

    res.json({
      success: true,
      message: "Proposal deleted successfully",
    })
  } catch (error) {
    next(error)
  }
})

// Convert proposal to sale
router.post("/:id/convert", authenticateToken, idValidation, async (req, res, next) => {
  try {
    const { id } = req.params
    const { customer_name, order_number } = req.body

    await transaction(async (client) => {
      // Get proposal details
      const proposalResult = await client.query("SELECT * FROM clone_propostas_apprudnik WHERE id = $1", [id])

      if (proposalResult.rows.length === 0) {
        throw new Error("Proposal not found")
      }

      const proposal = proposalResult.rows[0]

      // Check access permissions
      if (req.user.role === "vendedor" && proposal.seller !== req.user.id) {
        throw new Error("Access denied")
      }

      if (req.user.role === "supervisor") {
        const teamResult = await client.query("SELECT id FROM clone_users_apprudnik WHERE supervisor = $1 OR id = $1", [
          req.user.id,
        ])
        const teamIds = teamResult.rows.map((row) => row.id)

        if (!teamIds.includes(proposal.seller)) {
          throw new Error("Access denied")
        }
      }

      // Update proposal
      await client.query(
        "UPDATE clone_propostas_apprudnik SET has_generated_sale = true, status = $1, updated_at = NOW() WHERE id = $2",
        ["aprovada", id],
      )

      // Create sale record
      const saleResult = await client.query(
        `
        INSERT INTO clone_vendas_apprudnik (name, status, is_invoice_issued, created_at, customer, seller, "order")
        VALUES ($1, $2, $3, NOW(), $4, $5, $6)
        RETURNING *
      `,
        [
          `Venda - ${proposal.name}`,
          "finalizada",
          false,
          customer_name || proposal.customer || "Cliente",
          proposal.seller,
          order_number || `ORD-${Date.now()}`,
        ],
      )

      return saleResult.rows[0]
    })

    logger.info(`Proposal ${id} converted to sale by user ${req.user.id}`)

    res.json({
      success: true,
      message: "Proposal converted to sale successfully",
    })
  } catch (error) {
    next(error)
  }
})

module.exports = router
