const { body, param, query, validationResult } = require("express-validator")

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Validation failed",
      errors: errors.array(),
    })
  }
  next()
}

const loginValidation = [
  body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
  handleValidationErrors,
]

const userValidation = [
  body("name").trim().isLength({ min: 2, max: 100 }).withMessage("Name must be between 2 and 100 characters"),
  body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
  body("role").isIn(["vendedor", "supervisor", "gestor"]).withMessage("Role must be vendedor, supervisor, or gestor"),
  body("supervisor").optional().isInt({ min: 1 }).withMessage("Supervisor must be a valid user ID"),
  handleValidationErrors,
]

const proposalValidation = [
  body("name").trim().isLength({ min: 2, max: 200 }).withMessage("Proposal name must be between 2 and 200 characters"),
  body("total_price").isFloat({ min: 0 }).withMessage("Total price must be a positive number"),
  body("status")
    .isIn(["pendente", "aprovada", "rejeitada"])
    .withMessage("Status must be pendente, aprovada, or rejeitada"),
  body("customer").optional().trim().isLength({ max: 200 }).withMessage("Customer name must not exceed 200 characters"),
  handleValidationErrors,
]

const periodValidation = [
  query("period")
    .optional()
    .matches(/^\d{4}-\d{2}$/)
    .withMessage("Period must be in YYYY-MM format"),
  query("start_date").optional().isISO8601().withMessage("Start date must be a valid ISO date"),
  query("end_date").optional().isISO8601().withMessage("End date must be a valid ISO date"),
  handleValidationErrors,
]

const idValidation = [
  param("id").isInt({ min: 1 }).withMessage("ID must be a positive integer"),
  handleValidationErrors,
]

module.exports = {
  loginValidation,
  userValidation,
  proposalValidation,
  periodValidation,
  idValidation,
  handleValidationErrors,
}
