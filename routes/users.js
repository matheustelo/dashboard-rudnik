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

// Helper function to parse JSON fields safely
const parseJsonField = (field) => {
  if (!field) return []
  if (typeof field === "string") {
    try {
      return JSON.parse(field)
    } catch (e) {
      console.warn("Failed to parse JSON field:", field)
      return []
    }
  }
  if (Array.isArray(field)) return field
  return []
}

// GET /api/users - Fetch all users with hierarchical relationships
router.get("/", authenticateToken, authorize("admin", "gerente_comercial"), async (req, res) => {
  try {
    console.log("👥 Users API: Fetching all users with hierarchical data")

    const usersQuery = `
      SELECT 
        id, 
        name, 
        email, 
        role, 
        supervisor,
        supervisors,
        children,
        is_active, 
        created_at,
        last_login
      FROM clone_users_apprudnik 
      WHERE is_active = true
      ORDER BY name
    `

    const result = await query(usersQuery)
    console.log("✅ Users API: Fetched", result.rows.length, "users from database")

    // Build hierarchical relationships
    const usersWithHierarchy = result.rows.map((user) => ({
      ...user,
      supervisors: parseJsonField(user.supervisors),
      children: parseJsonField(user.children),
      has_team: parseJsonField(user.children).length > 0,
      team_members_count: parseJsonField(user.children).length,
    }))

    console.log("✅ Users API: Processed hierarchical relationships")
    res.json(usersWithHierarchy)
  } catch (error) {
    console.error("❌ Users API: Error fetching users:", error.message)
    res.status(500).json({
      message: "Erro ao buscar usuários",
      error: error.message,
    })
  }
})

// GET /api/users/sellers - Fetch only sellers and representatives with their supervisors
router.get("/sellers", authenticateToken, authorize("admin", "gerente_comercial"), async (req, res) => {
  try {
    console.log("👥 Users API: Fetching sellers and representatives with supervisor info")

    const sellersQuery = `
      SELECT 
        id, 
        name, 
        email, 
        role, 
        supervisor,
        supervisors,
        children,
        is_active
      FROM clone_users_apprudnik 
      WHERE role IN ('vendedor', 'representante') AND is_active = true
      ORDER BY name
    `

    const result = await query(sellersQuery)
    console.log("✅ Users API: Fetched", result.rows.length, "sellers/representatives")

    // Enhance sellers with supervisor information
    const enhancedSellers = result.rows.map((seller) => {
      const supervisors = parseJsonField(seller.supervisors)
      return {
        ...seller,
        supervisors: supervisors,
        has_supervisor: supervisors.length > 0,
        direct_supervisor_id: supervisors.length > 0 ? supervisors[0] : null,
      }
    })

    res.json(enhancedSellers)
  } catch (error) {
    console.error("❌ Users API: Error fetching sellers:", error.message)
    res.status(500).json({
      message: "Erro ao buscar vendedores",
      error: error.message,
    })
  }
})

// GET /api/users/team-leaders - Fetch users who can lead teams (supervisors, parceiros, etc.)
router.get("/team-leaders", authenticateToken, authorize("admin", "gerente_comercial"), async (req, res) => {
  try {
    console.log("👥 Users API: Fetching team leaders")

    const leadersQuery = `
      SELECT 
        id, 
        name, 
        email, 
        role, 
        children,
        created_at
      FROM clone_users_apprudnik 
      WHERE role IN ('supervisor', 'parceiro_comercial', 'gerente_comercial') 
        AND is_active = true
      ORDER BY name
    `

    const result = await query(leadersQuery)
    console.log("✅ Users API: Fetched", result.rows.length, "team leaders")

    // Enhance team leaders with team information
    const enhancedTeamLeaders = await Promise.all(
      result.rows.map(async (leader) => {
        const children = parseJsonField(leader.children)

        // Get actual team members (vendedor/representante only)
        let teamMembers = []
        if (children.length > 0) {
          const teamQuery = `
            SELECT id, name, email, role
            FROM clone_users_apprudnik 
            WHERE id = ANY($1) 
              AND role IN ('vendedor', 'representante') 
              AND is_active = true
            ORDER BY name
          `

          const teamResult = await query(teamQuery, [children])
          teamMembers = teamResult.rows
        }

        return {
          ...leader,
          children: children,
          team_members: teamMembers,
          team_members_count: teamMembers.length,
          has_team: teamMembers.length > 0,
        }
      }),
    )

    console.log("✅ Users API: Fetched", enhancedTeamLeaders.length, "team leaders")

    res.json(enhancedTeamLeaders)
  } catch (error) {
    console.error("❌ Users API: Error fetching team leaders:", error.message)
    res.status(500).json({
      message: "Erro ao buscar líderes de equipe",
      error: error.message,
    })
  }
})

// Get user by ID with full hierarchy information
router.get("/:id", authenticateToken, idValidation, async (req, res) => {
  try {
    const { id } = req.params

    console.log("👥 Users API: Fetching user:", id)

    const userQuery = `
      SELECT 
        id, 
        name, 
        email, 
        role, 
        supervisor,
        supervisors,
        children,
        is_active,
        created_at
      FROM clone_users_apprudnik 
      WHERE id = $1
    `

    const result = await query(userQuery, [id])

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Usuário não encontrado",
        error: "USER_NOT_FOUND",
      })
    }

    const user = result.rows[0]

    // Enhance user with hierarchy information
    const enhancedUser = {
      ...user,
      supervisors: parseJsonField(user.supervisors),
      children: parseJsonField(user.children),
      has_team: parseJsonField(user.children).length > 0,
      team_members_count: parseJsonField(user.children).length,
    }

    console.log("✅ Users API: Fetched user:", enhancedUser.name)

    res.json(enhancedUser)
  } catch (error) {
    console.error("❌ Users API: Error fetching user:", error.message)
    res.status(500).json({
      message: "Erro ao buscar usuário",
      error: error.message,
    })
  }
})

// Get user's team (for supervisors) - Updated to use children field
router.get("/:id/team", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    console.log("👥 Users API: Fetching team for user:", id)

    // Validate ID
    const userId = Number.parseInt(id)
    if (isNaN(userId) || userId <= 0) {
      return res.status(400).json({
        message: "ID do usuário deve ser um número válido",
        error: "INVALID_ID",
      })
    }

    // Check permissions
    if (req.user.role !== "admin" && req.user.role !== "gerente_comercial" && req.user.id !== userId) {
      return res.status(403).json({
        message: "Acesso negado",
        error: "ACCESS_DENIED",
      })
    }

    // Get user's children field
    const userQuery = `
      SELECT children, name, role
      FROM clone_users_apprudnik 
      WHERE id = $1 AND is_active = true
    `

    const userResult = await query(userQuery, [userId])

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        message: "Usuário não encontrado",
        error: "USER_NOT_FOUND",
      })
    }

    const user = userResult.rows[0]
    const children = parseJsonField(user.children)

    console.log("👤 User:", user.name, "Children:", children)

    if (children.length === 0) {
      console.log("ℹ️ No team members found for user:", userId)
      return res.json({
        success: true,
        data: [],
        message: "Usuário não possui equipe",
      })
    }

    // Get team members (only vendedor and representante roles)
    const teamQuery = `
      SELECT id, name, email, role, created_at
      FROM clone_users_apprudnik 
      WHERE id = ANY($1) 
        AND role IN ('vendedor', 'representante') 
        AND is_active = true
      ORDER BY name
    `

    const teamResult = await query(teamQuery, [children])

    console.log("✅ Users API: Found", teamResult.rows.length, "team members")

    res.json({
      success: true,
      data: teamResult.rows,
      leader: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("❌ Users API: Error fetching user team:", error.message)
    res.status(500).json({
      message: "Erro ao buscar equipe do usuário",
      error: error.message,
    })
  }
})

// Create user (admin and gerente_comercial only)
router.post("/", authenticateToken, authorize("admin", "gerente_comercial"), userValidation, async (req, res) => {
  try {
    const { name, email, role, supervisor } = req.body

    console.log("👥 Users API: Creating user:", { name, email, role })

    // Check if email already exists
    const existingUserQuery = `
      SELECT id FROM clone_users_apprudnik WHERE email = $1
    `

    const existingUser = await query(existingUserQuery, [email])

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        message: "Email já está em uso",
        error: "EMAIL_EXISTS",
      })
    }

    const insertUserQuery = `
      INSERT INTO clone_users_apprudnik (name, email, role, is_active, created_at)
      VALUES ($1, $2, $3, true, NOW())
      RETURNING id, name, email, role, created_at
    `

    const result = await query(insertUserQuery, [name, email, role])

    console.log("✅ Users API: User created:", result.rows[0])

    res.status(201).json({
      success: true,
      message: "Usuário criado com sucesso",
      user: result.rows[0],
    })
  } catch (error) {
    console.error("❌ Users API: Error creating user:", error.message)
    res.status(500).json({
      message: "Erro ao criar usuário",
      error: error.message,
    })
  }
})

// Update user
router.put(
  "/:id",
  authenticateToken,
  authorize("admin", "gerente_comercial"),
  idValidation,
  userValidation,
  async (req, res) => {
    try {
      const { id } = req.params
      const { name, email, role, is_active } = req.body

      console.log("👥 Users API: Updating user:", id)

      // Check if user exists
      const existingUserQuery = `
      SELECT id FROM clone_users_apprudnik WHERE id = $1
    `

      const existingUser = await query(existingUserQuery, [id])

      if (existingUser.rows.length === 0) {
        return res.status(404).json({
          message: "Usuário não encontrado",
          error: "USER_NOT_FOUND",
        })
      }

      // Check if email is already used by another user
      const emailCheckQuery = `
      SELECT id FROM clone_users_apprudnik WHERE email = $1 AND id != $2
    `

      const emailCheck = await query(emailCheckQuery, [email, id])

      if (emailCheck.rows.length > 0) {
        return res.status(400).json({
          message: "Email já está em uso por outro usuário",
          error: "EMAIL_EXISTS",
        })
      }

      const updateUserQuery = `
      UPDATE clone_users_apprudnik 
      SET name = $1, email = $2, role = $3, is_active = $4, updated_at = NOW()
      WHERE id = $5
      RETURNING id, name, email, role, is_active, updated_at
    `

      const result = await query(updateUserQuery, [name, email, role, is_active, id])

      console.log("✅ Users API: User updated:", result.rows[0])

      res.json({
        success: true,
        message: "Usuário atualizado com sucesso",
        user: result.rows[0],
      })
    } catch (error) {
      console.error("❌ Users API: Error updating user:", error.message)
      res.status(500).json({
        message: "Erro ao atualizar usuário",
        error: error.message,
      })
    }
  },
)

// Delete user (soft delete)
router.delete("/:id", authenticateToken, authorize("admin", "gerente_comercial"), idValidation, async (req, res) => {
  try {
    const { id } = req.params

    console.log("👥 Users API: Soft deleting user:", id)

    const updateUserQuery = `
      UPDATE clone_users_apprudnik 
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING id, name, email
    `

    const result = await query(updateUserQuery, [id])

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Usuário não encontrado",
        error: "USER_NOT_FOUND",
      })
    }

    console.log("✅ Users API: User soft deleted:", result.rows[0])

    res.json({
      success: true,
      message: "Usuário desativado com sucesso",
      user: result.rows[0],
    })
  } catch (error) {
    console.error("❌ Users API: Error deleting user:", error.message)
    res.status(500).json({
      message: "Erro ao desativar usuário",
      error: error.message,
    })
  }
})

module.exports = router
