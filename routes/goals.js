const express = require("express")
const { query } = require("../config/database")
const { authenticateToken, authorize } = require("../middleware/auth")
const { getDateRange } = require("../utils/dateHelpers")
const cache = require("../utils/cache")

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

// Helper function to validate and sanitize numeric values
const validateNumericValue = (value, fieldName) => {
  console.log(`🔍 Validating ${fieldName}:`, value, typeof value)

  // Handle null or undefined
  if (value === null || value === undefined || value === "") {
    throw new Error(`${fieldName} é obrigatório`)
  }

  // Convert to string first to handle various input types
  const stringValue = String(value).trim()

  // Check if it's a valid number string
  if (stringValue === "" || stringValue === "null" || stringValue === "undefined") {
    throw new Error(`${fieldName} não pode estar vazio`)
  }

  // Parse as float
  const numericValue = Number.parseFloat(stringValue)

  // Validate the parsed number
  if (isNaN(numericValue)) {
    throw new Error(`${fieldName} deve ser um número válido. Valor recebido: "${stringValue}"`)
  }

  if (numericValue < 0) {
    throw new Error(`${fieldName} não pode ser negativo`)
  }

  if (!isFinite(numericValue)) {
    throw new Error(`${fieldName} deve ser um número finito`)
  }

  console.log(`✅ ${fieldName} validated:`, numericValue)
  return numericValue
}

// Helper function to validate goal type
const validateGoalType = (tipo_meta) => {
  console.log("🔍 Validating goal type:", tipo_meta)

  if (!tipo_meta || typeof tipo_meta !== "string") {
    throw new Error("Tipo de meta é obrigatório")
  }

  const validTypes = ["faturamento", "propostas"]
  const normalizedType = tipo_meta.toLowerCase().trim()

  if (!validTypes.includes(normalizedType)) {
    throw new Error(`Tipo de meta inválido. Valores aceitos: ${validTypes.join(", ")}`)
  }

  console.log("✅ Goal type validated:", normalizedType)
  return normalizedType
}

// Helper function to validate date format
const validateDate = (dateString, fieldName) => {
  console.log(`🔍 Validating ${fieldName}:`, dateString)

  if (!dateString) {
    throw new Error(`${fieldName} é obrigatório`)
  }

  const date = new Date(dateString)
  if (isNaN(date.getTime())) {
    throw new Error(`${fieldName} deve ser uma data válida`)
  }

  console.log(`✅ ${fieldName} validated:`, date.toISOString().split("T")[0])
  return date.toISOString().split("T")[0]
}

// Helper function to get team members using supervisor relationship
const getTeamMembers = async (leaderId) => {
  console.log("🔄 Getting team members for leader:", leaderId)

  const cacheKey = `teamMembers:${leaderId}`
  const cached = cache.get(cacheKey)
  if (cached) {
    console.log("♻️ Returning team members from cache")
    return cached
  }

  try {

    const teamQuery = `
      SELECT id, name, email, role
      FROM clone_users_apprudnik
      WHERE is_active = true
        AND role IN ('vendedor', 'representante', 'representante_premium', 'preposto')
        AND (
          supervisor_id = $1 OR EXISTS (
            SELECT 1 FROM jsonb_array_elements(COALESCE(supervisors, '[]'::jsonb)) sup
            WHERE (sup->>'id')::int = $1
          )
        )
      ORDER BY name
    `

    const teamResult = await query(teamQuery, [leaderId])
    console.log("✅ Found", teamResult.rows.length, "team members")

    cache.set(cacheKey, teamResult.rows, 3600)
    return teamResult.rows
  } catch (error) {
    console.error("❌ Error getting team members:", error)
    return []
  }
}

// GET /api/goals - Fetch all goals with enhanced hierarchy information
router.get(
  "/",
  authenticateToken,
  authorize("admin", "gerente_comercial", "supervisor"),
  async (req, res) => {
  try {
    const { period, goalType, supervisorId, startDate, endDate,  page = 1, limit = 10 } = req.query

    const cacheKey = `goals:${period || ""}:${goalType || ""}:${supervisorId || ""}:${startDate || ""}:${endDate || ""}:${page}:${limit}`
    const cached = cache.get(cacheKey)
    if (cached) {
      console.log("♻️ Returning goals from cache")
      return res.json(cached)
    }

    // Validate and normalize date range
    const { startDate: normalizedStart, endDate: normalizedEnd } = getDateRange(
      period,
      startDate,
      endDate,
    )

    // --- Build dynamic filters for queries ---
    const generalConditions = ["u.is_active = true"]
    const generalParams = []
    const individualConditions = ["u.is_active = true"]
    const individualParams = []

    // Apply date range filters
    generalConditions.push(`g.data_inicio >= $${generalParams.length + 1}`)
    generalParams.push(normalizedStart)
    generalConditions.push(`g.data_fim <= $${generalParams.length + 1}`)
    generalParams.push(normalizedEnd)

    individualConditions.push(`g.data_inicio >= $${individualParams.length + 1}`)
    individualParams.push(normalizedStart)
    individualConditions.push(`g.data_fim <= $${individualParams.length + 1}`)
    individualParams.push(normalizedEnd)

    if (goalType) {
      generalConditions.push(`g.tipo_meta = $${generalParams.length + 1}`)
      generalParams.push(goalType)
      individualConditions.push(`g.tipo_meta = $${individualParams.length + 1}`)
      individualParams.push(goalType)
    }

    if (supervisorId) {
      generalConditions.push(`g.usuario_id = $${generalParams.length + 1}`)
      generalParams.push(supervisorId)
      individualConditions.push(`(u.supervisor_id = $${individualParams.length + 1} OR COALESCE(u.supervisors, '[]'::jsonb) @> $${individualParams.length + 2}::jsonb)`)
      individualParams.push(supervisorId)
      individualParams.push(JSON.stringify([{ id: Number(supervisorId) }]))
    }

    const offset = (page - 1) * limit

    const generalWhere = generalConditions.join(" AND ")
    const individualWhere = individualConditions.join(" AND ")

    // Fetch general goals (team goals)
    const generalGoalsQuery = `
      SELECT
        g.id,
        g.usuario_id,
        g.tipo_meta,
        g.valor_meta,
        g.data_inicio,
        g.data_fim,
        g.created_at,
        u.name as supervisor_name,
        u.role as supervisor_role,
        u.children
      FROM metas_gerais g
      JOIN clone_users_apprudnik u ON g.usuario_id = u.id
      WHERE ${generalWhere}
      ORDER BY g.created_at DESC
      LIMIT $${generalParams.length + 1} OFFSET $${generalParams.length + 2}
    `

    // Fetch individual goals
    const individualGoalsQuery = `
      SELECT
        g.id,
        g.usuario_id,
        g.tipo_meta,
        g.valor_meta,
        g.data_inicio,
        g.data_fim,
        g.created_at,
        u.name as user_name,
        u.role as user_role,
        u.supervisors
      FROM metas_individuais g
      JOIN clone_users_apprudnik u ON g.usuario_id = u.id
      WHERE ${individualWhere}
      ORDER BY g.created_at DESC
      LIMIT $${individualParams.length + 1} OFFSET $${individualParams.length + 2}
    `

    const [generalResult, individualResult] = await Promise.all([
      query(generalGoalsQuery, [...generalParams, limit, offset]),
      query(individualGoalsQuery, [...individualParams, limit, offset]),
    ])

    const total = generalResult.rowCount + individualResult.rowCount

    // Enhance general goals with team information
    let enhancedGeneralGoals = await Promise.all(
      generalResult.rows.map(async (goal) => {
        const teamMembers = await getTeamMembers(goal.usuario_id)
        return {
          ...goal,
          children: parseJsonField(goal.children),
          team_members: teamMembers,
          team_members_count: teamMembers.length,
        }
      }),
    )

    // Enhance individual goals with supervisor information
    let enhancedIndividualGoals = individualResult.rows.map((goal) => ({
      ...goal,
      supervisors: parseJsonField(goal.supervisors),
    }))

    console.log(
      "✅ Goals API: Fetched",
      enhancedGeneralGoals.length,
      "general goals and",
      enhancedIndividualGoals.length,
      "individual goals",
    )

    const responseData = {
      page: Number.parseInt(page),
      limit: Number.parseInt(limit),
      total,
      generalGoals: enhancedGeneralGoals,
      individualGoals: enhancedIndividualGoals,
    }
    cache.set(cacheKey, responseData, 300)
    res.json(responseData)
  } catch (error) {
    console.error("❌ Goals API: Error fetching goals:", error.message)
    res.status(500).json({
      message: "Erro ao buscar metas",
      error: error.message,
    })
  }
})

// POST /api/goals - Create a new goal with enhanced validation
router.post("/", authenticateToken, authorize("admin", "gerente_comercial"), async (req, res) => {
  try {
    console.log("🎯 Goals API: Creating new goal")
    console.log("📥 Request body:", JSON.stringify(req.body, null, 2))

    const { type, goalData } = req.body

    if (!type) {
      return res.status(400).json({
        message: "Tipo de meta é obrigatório",
        error: "MISSING_TYPE",
      })
    }

    if (!goalData) {
      return res.status(400).json({
        message: "Dados da meta são obrigatórios",
        error: "MISSING_GOAL_DATA",
      })
    }

    console.log("Goal type:", type)
    console.log("Goal data:", goalData)

    if (type === "general") {
      // Create general goal with manual distribution
      const { usuario_id, tipo_meta, valor_meta, data_inicio, data_fim, manualDistribution } = goalData

      try {
        // Validate all required fields with detailed error messages
        if (!usuario_id) {
          throw new Error("ID do usuário é obrigatório")
        }

        const validatedUserId = Number.parseInt(usuario_id)
        if (isNaN(validatedUserId) || validatedUserId <= 0) {
          throw new Error("ID do usuário deve ser um número válido")
        }

        const validatedGoalType = validateGoalType(tipo_meta)
        const validatedGoalValue = validateNumericValue(valor_meta, "Valor da meta")
        const validatedStartDate = validateDate(data_inicio, "Data de início")
        const validatedEndDate = validateDate(data_fim, "Data de fim")

        // Validate date range
        if (new Date(validatedStartDate) >= new Date(validatedEndDate)) {
          throw new Error("Data de início deve ser anterior à data de fim")
        }

        console.log("✅ All validations passed for general goal")

        // Verify the user exists and can lead a team
        const userQuery = `
          SELECT id, name, role, children
          FROM clone_users_apprudnik 
          WHERE id = $1 AND is_active = true
        `

        const userResult = await query(userQuery, [validatedUserId])

        if (userResult.rows.length === 0) {
          return res.status(404).json({
            message: "Usuário não encontrado ou inativo",
            error: "USER_NOT_FOUND",
          })
        }

        const user = userResult.rows[0]
        const teamMembers = await getTeamMembers(validatedUserId)

        console.log("👤 User:", user.name, "Team members:", teamMembers.length)

        // Start transaction
        await query("BEGIN")

        try {
          // Insert general goal with validated data
          const insertGeneralGoalQuery = `
            INSERT INTO metas_gerais (usuario_id, tipo_meta, valor_meta, data_inicio, data_fim, created_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
            RETURNING id
          `

          console.log("📝 Inserting general goal with values:", [
            validatedUserId,
            validatedGoalType,
            validatedGoalValue,
            validatedStartDate,
            validatedEndDate,
          ])

          const generalGoalResult = await query(insertGeneralGoalQuery, [
            validatedUserId,
            validatedGoalType,
            validatedGoalValue,
            validatedStartDate,
            validatedEndDate,
          ])

          const generalGoalId = generalGoalResult.rows[0].id
          console.log("✅ General goal created with ID:", generalGoalId)

          // Handle manual distribution if provided
          if (manualDistribution && Array.isArray(manualDistribution) && manualDistribution.length > 0) {
            console.log("📊 Processing manual distribution:", manualDistribution)

            // Validate that all distributed users are in the team
            const teamMemberIds = teamMembers.map((m) => m.id)
            const invalidDistributions = manualDistribution.filter((d) => !teamMemberIds.includes(d.usuario_id))

            if (invalidDistributions.length > 0) {
              throw new Error("Algumas distribuições são para usuários que não estão na equipe")
            }

            // Insert individual goals for each distribution
            for (const distribution of manualDistribution) {
              try {
                const distributionUserId = Number.parseInt(distribution.usuario_id)
                const distributionValue = validateNumericValue(distribution.valor_meta, "Valor da distribuição")

                if (distributionValue > 0) {
                  const insertIndividualGoalQuery = `
                    INSERT INTO metas_individuais (usuario_id, tipo_meta, valor_meta, data_inicio, data_fim, meta_geral_id, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, NOW())
                  `

                  console.log("📝 Inserting individual goal with values:", [
                    distributionUserId,
                    validatedGoalType,
                    distributionValue,
                    validatedStartDate,
                    validatedEndDate,
                    generalGoalId,
                  ])

                  await query(insertIndividualGoalQuery, [
                    distributionUserId,
                    validatedGoalType,
                    distributionValue,
                    validatedStartDate,
                    validatedEndDate,
                    generalGoalId,
                  ])

                  console.log(
                    "✅ Created individual goal for user",
                    distributionUserId,
                    "with value",
                    distributionValue,
                  )
                }
              } catch (distError) {
                console.error("❌ Error processing distribution:", distError)
                throw new Error(`Erro na distribuição para usuário ${distribution.usuario_id}: ${distError.message}`)
              }
            }
          }

          await query("COMMIT")

          console.log("✅ Goals API: General goal created successfully with ID:", generalGoalId)

          res.status(201).json({
            success: true,
            message: "Meta de equipe criada com sucesso",
            goalId: generalGoalId,
          })
        } catch (error) {
          await query("ROLLBACK")
          throw error
        }
      } catch (validationError) {
        console.error("❌ Validation error for general goal:", validationError.message)
        return res.status(400).json({
          message: "Erro de validação",
          error: validationError.message,
          details: "Verifique os dados enviados e tente novamente",
        })
      }
    } else if (type === "individual") {
      // Create individual goal
      const { usuario_id, tipo_meta, valor_meta, data_inicio, data_fim } = goalData

      try {
        // Validate all required fields
        if (!usuario_id) {
          throw new Error("ID do usuário é obrigatório")
        }

        const validatedUserId = Number.parseInt(usuario_id)
        if (isNaN(validatedUserId) || validatedUserId <= 0) {
          throw new Error("ID do usuário deve ser um número válido")
        }

        const validatedGoalType = validateGoalType(tipo_meta)
        const validatedGoalValue = validateNumericValue(valor_meta, "Valor da meta")
        const validatedStartDate = validateDate(data_inicio, "Data de início")
        const validatedEndDate = validateDate(data_fim, "Data de fim")

        // Validate date range
        if (new Date(validatedStartDate) >= new Date(validatedEndDate)) {
          throw new Error("Data de início deve ser anterior à data de fim")
        }

        console.log("✅ All validations passed for individual goal")

        // Verify the user exists
        const userQuery = `
          SELECT id, name, role
          FROM clone_users_apprudnik 
          WHERE id = $1 AND role IN ('vendedor', 'representante') AND is_active = true
        `

        const userResult = await query(userQuery, [validatedUserId])

        if (userResult.rows.length === 0) {
          return res.status(404).json({
            message: "Vendedor/Representante não encontrado ou inativo",
            error: "USER_NOT_FOUND",
          })
        }

        const insertIndividualGoalQuery = `
          INSERT INTO metas_individuais (usuario_id, tipo_meta, valor_meta, data_inicio, data_fim, created_at)
          VALUES ($1, $2, $3, $4, $5, NOW())
          RETURNING id
        `

        console.log("📝 Inserting individual goal with values:", [
          validatedUserId,
          validatedGoalType,
          validatedGoalValue,
          validatedStartDate,
          validatedEndDate,
        ])

        const result = await query(insertIndividualGoalQuery, [
          validatedUserId,
          validatedGoalType,
          validatedGoalValue,
          validatedStartDate,
          validatedEndDate,
        ])

        console.log("✅ Goals API: Individual goal created successfully with ID:", result.rows[0].id)

        res.status(201).json({
          success: true,
          message: "Meta individual criada com sucesso",
          goalId: result.rows[0].id,
        })
      } catch (validationError) {
        console.error("❌ Validation error for individual goal:", validationError.message)
        return res.status(400).json({
          message: "Erro de validação",
          error: validationError.message,
          details: "Verifique os dados enviados e tente novamente",
        })
      }
    } else {
      return res.status(400).json({
        message: "Tipo de meta inválido. Use 'general' ou 'individual'",
        error: "INVALID_TYPE",
      })
    }
  } catch (error) {
    console.error("❌ Goals API: Error creating goal:", error.message)
    console.error("❌ Stack trace:", error.stack)
    res.status(500).json({
      message: "Erro interno do servidor ao criar meta",
      error: error.message,
      details: "Entre em contato com o suporte se o problema persistir",
    })
  }
})

// DELETE /api/goals/:type/:id - Delete a goal
router.delete("/:type/:id", authenticateToken, authorize("admin", "gerente_comercial"), async (req, res) => {
  try {
    const { type, id } = req.params

    console.log("🗑️ Goals API: Deleting goal", type, id)

    // Validate ID
    const goalId = Number.parseInt(id)
    if (isNaN(goalId) || goalId <= 0) {
      return res.status(400).json({
        message: "ID da meta deve ser um número válido",
        error: "INVALID_ID",
      })
    }

    if (type === "general") {
      // Start transaction to delete general goal and related individual goals
      await query("BEGIN")

      try {
        // Delete related individual goals first
        await query("DELETE FROM metas_individuais WHERE meta_geral_id = $1", [goalId])

        // Delete general goal
        const result = await query("DELETE FROM metas_gerais WHERE id = $1 RETURNING id", [goalId])

        if (result.rows.length === 0) {
          await query("ROLLBACK")
          return res.status(404).json({
            message: "Meta de equipe não encontrada",
            error: "GOAL_NOT_FOUND",
          })
        }

        await query("COMMIT")

        console.log("✅ Goals API: General goal and related individual goals deleted")

        res.json({
          success: true,
          message: "Meta de equipe excluída com sucesso",
        })
      } catch (error) {
        await query("ROLLBACK")
        throw error
      }
    } else if (type === "individual") {
      const result = await query("DELETE FROM metas_individuais WHERE id = $1 RETURNING id", [goalId])

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Meta individual não encontrada",
          error: "GOAL_NOT_FOUND",
        })
      }

      console.log("✅ Goals API: Individual goal deleted")

      res.json({
        success: true,
        message: "Meta individual excluída com sucesso",
      })
    } else {
      return res.status(400).json({
        message: "Tipo de meta inválido. Use 'general' ou 'individual'",
        error: "INVALID_TYPE",
      })
    }
  } catch (error) {
    console.error("❌ Goals API: Error deleting goal:", error.message)
    res.status(500).json({
      message: "Erro ao excluir meta",
      error: error.message,
    })
  }
})

// GET /api/goals/tracking/seller/:id - Get goal tracking for a specific seller
router.get("/tracking/seller/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { period } = req.query

    console.log("📊 Goals API: Fetching goal tracking for seller:", id)

    // Validate ID
    const sellerId = Number.parseInt(id)
    if (isNaN(sellerId) || sellerId <= 0) {
      return res.status(400).json({
        message: "ID do vendedor deve ser um número válido",
        error: "INVALID_ID",
      })
    }

    // Check permissions
    const currentUserId = Number(req.user.id)

    if (req.user.role !== "admin" &&
        req.user.role !== "gerente_comercial" &&
        currentUserId !== sellerId) {
      return res.status(403).json({
        message: "Acesso negado",
        error: "ACCESS_DENIED",
      })
    }

    let dateFilter = ""
    const params = [sellerId]

    if (period) {
      const now = new Date()
      let startDate

      switch (period) {
        case "week":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
          break
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case "quarter":
          const quarter = Math.floor(now.getMonth() / 3)
          startDate = new Date(now.getFullYear(), quarter * 3, 1)
          break
        case "year":
          startDate = new Date(now.getFullYear(), 0, 1)
          break
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      }

      dateFilter = "AND g.data_inicio >= $2"
      params.push(startDate.toISOString().split("T")[0])
    }

    // Get individual goals for the seller
    const goalsQuery = `
      SELECT 
        g.id,
        g.usuario_id,
        g.tipo_meta,
        g.valor_meta,
        g.data_inicio,
        g.data_fim,
        g.created_at,
        u.name as user_name,
        u.role as user_role
      FROM metas_individuais g
      JOIN clone_users_apprudnik u ON g.usuario_id = u.id
      WHERE g.usuario_id = $1 ${dateFilter}
      ORDER BY g.created_at DESC
    `

    const result = await query(goalsQuery, params)

    console.log("✅ Goals API: Found", result.rows.length, "goals for seller")

    res.json({
      success: true,
      data: result.rows,
    })
  } catch (error) {
    console.error("❌ Goals API: Error fetching seller tracking:", error.message)
    res.status(500).json({
      message: "Erro ao buscar acompanhamento de metas",
      error: error.message,
    })
  }
})

module.exports = router
