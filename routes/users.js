const express = require("express")
const bcrypt = require("bcryptjs")
const { query, transaction } = require("../config/database")
const { authenticateToken, authorize } = require("../middleware/auth")
const { userValidation, idValidation } = require("../middleware/validation")
const logger = {
  info: (message) => console.log(`ℹ️  ${message}`),
  error: (message, meta) => console.error(`❌ ${message}`, meta || ""),
}

const router = express.Router()

// GET /api/users - Fetch all users (for admin and gerente_comercial)
router.get("/", authenticateToken, authorize("admin", "gerente_comercial"), async (req, res) => {
  try {
    console.log("👥 Users API: Fetching all users")

    const usersQuery = `
      SELECT id, name, email, role, supervisor, is_active, created_at
      FROM clone_users_apprudnik 
      WHERE is_active = true
      ORDER BY name
    `

    const result = await query(usersQuery)
    console.log("✅ Users API: Fetched", result.rows.length, "users")

    res.json(result.rows)
  } catch (error) {
    console.error("❌ Users API: Error fetching users:", error.message)
    res.status(500).json({
      message: "Erro ao buscar usuários",
      error: error.message,
    })
  }
})

// GET /api/users/sellers - Fetch only sellers and representatives
router.get("/sellers", authenticateToken, authorize("admin", "gerente_comercial", "supervisor"), async (req, res) => {
  try {
    console.log("👥 Users API: Fetching sellers and representatives")

    const sellersQuery = `
      SELECT id, name, email, role, supervisor, is_active
      FROM clone_users_apprudnik 
      WHERE role IN ('vendedor', 'representante') AND is_active = true
      ORDER BY name
    `

    const result = await query(sellersQuery)
    console.log("✅ Users API: Fetched", result.rows.length, "sellers/representatives")

    res.json(result.rows)
  } catch (error) {
    console.error("❌ Users API: Error fetching sellers:", error.message)
    res.status(500).json({
      message: "Erro ao buscar vendedores",
      error: error.message,
    })
  }
})

// Get user by ID
router.get("/:id", authenticateToken, idValidation, async (req, res, next) => {
  try {
    const { id } = req.params

    // Check permissions
    if (req.user.role !== "gestor" && req.user.id !== Number.parseInt(id)) {
      return res.status(403).json({ message: "Access denied" })
    }

    const userQuery = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.supervisor,
        u.is_active,
        u.created_at,
        u.last_login,
        s.name as supervisor_name
      FROM clone_users_apprudnik u
      LEFT JOIN clone_users_apprudnik s ON u.supervisor = s.id
      WHERE u.id = $1
    `

    const result = await query(userQuery, [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" })
    }

    res.json({
      success: true,
      data: result.rows[0],
    })
  } catch (error) {
    next(error)
  }
})

// Create user (gestor only)
router.post("/", authenticateToken, authorize("gestor"), userValidation, async (req, res, next) => {
  try {
    const { name, email, role, supervisor } = req.body

    // Check if email already exists
    const existingUser = await query("SELECT id FROM clone_users_apprudnik WHERE email = $1", [email])

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ message: "Email already exists" })
    }

    // Validate supervisor if provided
    if (supervisor) {
      const supervisorExists = await query(
        "SELECT id FROM clone_users_apprudnik WHERE id = $1 AND role IN ($2, $3) AND is_active = true",
        [supervisor, "supervisor", "gestor"],
      )

      if (supervisorExists.rows.length === 0) {
        return res.status(400).json({ message: "Invalid supervisor" })
      }
    }

    // Default password hash for "123456"
    const defaultPasswordHash = await bcrypt.hash("123456", 10)

    const insertQuery = `
      INSERT INTO clone_users_apprudnik (name, email, role, supervisor, password_hash, is_active, created_at)
      VALUES ($1, $2, $3, $4, $5, true, NOW())
      RETURNING id, name, email, role, supervisor, is_active, created_at
    `

    const result = await query(insertQuery, [name, email, role, supervisor || null, defaultPasswordHash])

    logger.info(`User created: ${email} by ${req.user.email}`)

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: "User created successfully",
    })
  } catch (error) {
    next(error)
  }
})

// Update user
router.put("/:id", authenticateToken, idValidation, userValidation, async (req, res, next) => {
  try {
    const { id } = req.params
    const { name, email, role, supervisor, is_active } = req.body

    // Check permissions
    if (req.user.role !== "gestor" && req.user.id !== Number.parseInt(id)) {
      return res.status(403).json({ message: "Access denied" })
    }

    // Non-gestors can only update their own basic info
    if (req.user.role !== "gestor") {
      if (role !== req.user.role || supervisor !== req.user.supervisor) {
        return res.status(403).json({ message: "Cannot modify role or supervisor" })
      }
    }

    // Check if user exists
    const userExists = await query("SELECT id FROM clone_users_apprudnik WHERE id = $1", [id])

    if (userExists.rows.length === 0) {
      return res.status(404).json({ message: "User not found" })
    }

    // Check email uniqueness
    const emailExists = await query("SELECT id FROM clone_users_apprudnik WHERE email = $1 AND id != $2", [email, id])

    if (emailExists.rows.length > 0) {
      return res.status(409).json({ message: "Email already exists" })
    }

    const updateQuery = `
      UPDATE clone_users_apprudnik 
      SET name = $1, email = $2, role = $3, supervisor = $4, is_active = $5, updated_at = NOW()
      WHERE id = $6
      RETURNING id, name, email, role, supervisor, is_active, updated_at
    `

    const result = await query(updateQuery, [
      name,
      email,
      role,
      supervisor || null,
      is_active !== undefined ? is_active : true,
      id,
    ])

    logger.info(`User updated: ${email} by ${req.user.email}`)

    res.json({
      success: true,
      data: result.rows[0],
      message: "User updated successfully",
    })
  } catch (error) {
    next(error)
  }
})

// Delete user (soft delete)
router.delete("/:id", authenticateToken, authorize("gestor"), idValidation, async (req, res, next) => {
  try {
    const { id } = req.params

    // Cannot delete self
    if (req.user.id === Number.parseInt(id)) {
      return res.status(400).json({ message: "Cannot delete your own account" })
    }

    const result = await query(
      "UPDATE clone_users_apprudnik SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING email",
      [id],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" })
    }

    logger.info(`User deactivated: ${result.rows[0].email} by ${req.user.email}`)

    res.json({
      success: true,
      message: "User deactivated successfully",
    })
  } catch (error) {
    next(error)
  }
})

// Get user's team (for supervisors)
router.get("/:id/team", authenticateToken, idValidation, async (req, res, next) => {
  try {
    const { id } = req.params

    // Check permissions
    if (req.user.role !== "gestor" && req.user.id !== Number.parseInt(id)) {
      return res.status(403).json({ message: "Access denied" })
    }

    const teamQuery = `
      SELECT 
        id,
        name,
        email,
        role,
        is_active,
        created_at,
        last_login
      FROM clone_users_apprudnik 
      WHERE supervisor = $1 AND is_active = true
      ORDER BY name
    `

    const result = await query(teamQuery, [id])

    res.json({
      success: true,
      data: result.rows,
    })
  } catch (error) {
    next(error)
  }
})

module.exports = router
