const jwt = require("jsonwebtoken")
const { query } = require("../config/database")
const logger = {
  error: (message, meta) => console.error(`❌ ${message}`, meta || ""),
}

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"]
    const token = authHeader && authHeader.split(" ")[1]

    if (!token) {
      return res.status(401).json({ message: "Access token required" })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Verify user still exists and is active
    const result = await query(
      "SELECT id, name, email, role, supervisor, is_active FROM clone_users_apprudnik WHERE id = $1 AND is_active = true",
      [decoded.id],
    )

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "User not found or inactive" })
    }

    req.user = result.rows[0]
    next()
  } catch (error) {
    logger.error("Authentication error:", error)
    return res.status(403).json({ message: "Invalid or expired token" })
  }
}

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" })
    }

    const hasRole = roles.includes(req.user.role)

    // Allow admin to access gerente_comercial privileges automatically
    const adminOverride =
      req.user.role === "admin" && roles.includes("gerente_comercial")

    if (!hasRole && !adminOverride) {
      return res.status(403).json({ message: "Insufficient permissions" })
    }

    next()
  }
}

const checkSupervisorAccess = async (req, res, next) => {
  try {
    const { id } = req.params
    const user = req.user

    // Gestor can access everything
    if (user.role === "gestor") {
      return next()
    }

    // Supervisor can only access their own data or their team's data
    if (user.role === "supervisor") {
      if (user.id === Number.parseInt(id)) {
        return next()
      }

      // Check if the requested user is supervised by current user
      const result = await query("SELECT id FROM clone_users_apprudnik WHERE id = $1 AND supervisor = $2", [
        id,
        user.id,
      ])

      if (result.rows.length === 0) {
        return res.status(403).json({ message: "Access denied to this user data" })
      }
    }

    // Vendedor and representante can only access their own data
    const currentUserId = Number(user.id)

    if (user.role === "vendedor" && currentUserId !== Number.parseInt(id)) {
      return res.status(403).json({ message: "Access denied" })
    }

    next()
  } catch (error) {
    logger.error("Authorization error:", error)
    res.status(500).json({ message: "Authorization check failed" })
  }
}

module.exports = {
  authenticateToken,
  authorize,
  checkSupervisorAccess,
}
