const express = require("express")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const { query } = require("../config/database")
const { loginValidation } = require("../middleware/validation")
const logger = {
  info: (message) => console.log(`ℹ️  ${message}`),
  error: (message, meta) => console.error(`❌ ${message}`, meta || ""),
}

const router = express.Router()

// Login
router.post("/login", loginValidation, async (req, res, next) => {
  try {
    const { email, password } = req.body

    // Find user
    const result = await query(
      "SELECT id, name, email, role, supervisor, password_hash FROM clone_users_apprudnik WHERE email = $1 AND is_active = true",
      [email],
    )

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" })
    }

    const user = result.rows[0]

    // For demo purposes, we'll check against plain text password "123456"
    // In production, use bcrypt.compare with hashed passwords
    const isValidPassword =
      password === "123456" || (user.password_hash && (await bcrypt.compare(password, user.password_hash)))

    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid credentials" })
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "24h" },
    )

    // Update last login
    await query("UPDATE clone_users_apprudnik SET last_login = NOW() WHERE id = $1", [user.id])

    logger.info(`User ${user.email} logged in successfully`)

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        supervisor: user.supervisor,
      },
    })
  } catch (error) {
    next(error)
  }
})

// Refresh token
router.post("/refresh", async (req, res, next) => {
  try {
    const { token } = req.body

    if (!token) {
      return res.status(401).json({ message: "Refresh token required" })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Generate new token
    const newToken = jwt.sign(
      {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        name: decoded.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "24h" },
    )

    res.json({
      success: true,
      token: newToken,
    })
  } catch (error) {
    next(error)
  }
})

// Logout (optional - mainly for logging purposes)
router.post("/logout", (req, res) => {
  // In a stateless JWT system, logout is handled client-side
  // But we can log the event
  logger.info("User logged out")
  res.json({ success: true, message: "Logged out successfully" })
})

module.exports = router
