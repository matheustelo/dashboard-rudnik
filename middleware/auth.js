const jwt = require("jsonwebtoken")
const { Pool } = require("pg")
require("dotenv").config()

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
})

const authenticateToken = async (req, res, next) => {
  console.log("--- Auth Middleware: authenticateToken initiated ---")
  try {
    const authHeader = req.headers["authorization"]
    const token = authHeader && authHeader.split(" ")[1]

    if (!token) {
      console.log("❌ Auth Middleware: No token provided in Authorization header.")
      return res.status(401).json({ message: "Access token required" })
    }

    console.log("ℹ️ Auth Middleware: Token received. Verifying...")
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    console.log("✅ Auth Middleware: Token decoded. User ID:", decoded.id, "| Role:", decoded.role)

    // Verify user still exists and is active in the database
    const result = await pool.query(
      "SELECT id, name, email, role, supervisor, is_active FROM clone_users_apprudnik WHERE id = $1 AND is_active = true",
      [decoded.id],
    )

    if (result.rows.length === 0) {
      console.log("❌ Auth Middleware: User not found or inactive in DB for ID:", decoded.id)
      return res.status(401).json({ message: "User not found or inactive" })
    }

    req.user = result.rows[0]
    console.log("✅ Auth Middleware: User authenticated successfully. Email:", req.user.email, "| Role:", req.user.role)
    next()
  } catch (error) {
    console.error("❌ Auth Middleware: Authentication error:", error.message)
    if (error.name === "TokenExpiredError") {
      return res.status(403).json({ message: "Token expired" })
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(403).json({ message: "Invalid token" })
    }
    return res.status(500).json({ message: "Internal authentication error" })
  } finally {
    console.log("--- Auth Middleware: authenticateToken finished ---")
  }
}

const authorize = (...roles) => {
  return (req, res, next) => {
    console.log("--- Auth Middleware: authorize initiated ---")
    if (!req.user) {
      console.log(
        "❌ Auth Middleware: Authorization failed - req.user is undefined. (Authentication likely failed before this point)",
      )
      return res.status(401).json({ message: "Authentication required" })
    }

    console.log("ℹ️ Auth Middleware: Checking authorization for user role:", req.user.role, "| Required roles:", roles)
    if (!roles.includes(req.user.role)) {
      console.log(
        "❌ Auth Middleware: User role",
        req.user.role,
        "is NOT authorized for this route. Required roles:",
        roles,
      )
      return res.status(403).json({ message: "Insufficient permissions" })
    }

    console.log("✅ Auth Middleware: User role", req.user.role, "IS authorized.")
    next()
    console.log("--- Auth Middleware: authorize finished ---")
  }
}

const checkSupervisorAccess = async (req, res, next) => {
  console.log("--- Auth Middleware: checkSupervisorAccess initiated ---")
  try {
    const { id } = req.params
    const user = req.user

    if (!user) {
      console.log("❌ Auth Middleware: checkSupervisorAccess failed - req.user is undefined.")
      return res.status(401).json({ message: "Authentication required" })
    }

    console.log(
      "ℹ️ Auth Middleware: Checking supervisor access for user ID:",
      user.id,
      "with role:",
      user.role,
      "| Target ID:",
      id,
    )

    // Gerente Comercial and Admin can access everything
    if (user.role === "gerente_comercial" || user.role === "admin") {
      console.log("✅ Auth Middleware: Gerente Comercial/Admin has full access.")
      return next()
    }

    // Supervisor can only access their own data or their team's data
    if (user.role === "supervisor") {
      if (user.id === Number.parseInt(id)) {
        console.log("✅ Auth Middleware: Supervisor accessing their own data.")
        return next()
      }

      // Check if the requested user is supervised by current user
      const result = await pool.query("SELECT id FROM clone_users_apprudnik WHERE id = $1 AND supervisor = $2", [
        id,
        user.id,
      ])

      if (result.rows.length === 0) {
        console.log("❌ Auth Middleware: Supervisor denied access to user ID", id, "not in their team.")
        return res.status(403).json({ message: "Access denied to this user data" })
      }
      console.log("✅ Auth Middleware: Supervisor accessing data for team member ID", id)
    }

    // Vendedor and Representante can only access their own data
    if ((user.role === "vendedor" || user.role === "representante") && user.id !== Number.parseInt(id)) {
      console.log("❌ Auth Middleware: Vendedor/Representante denied access to other user's data.")
      return res.status(403).json({ message: "Access denied" })
    }

    next()
  } catch (error) {
    console.error("❌ Auth Middleware: checkSupervisorAccess error:", error)
    res.status(500).json({ message: "Authorization check failed" })
  } finally {
    console.log("--- Auth Middleware: checkSupervisorAccess finished ---")
  }
}

module.exports = {
  authenticateToken,
  authorize,
  checkSupervisorAccess,
}
