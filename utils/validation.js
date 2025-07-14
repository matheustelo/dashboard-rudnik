/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate Brazilian CPF
 * @param {string} cpf - CPF to validate
 * @returns {boolean} True if valid CPF
 */
const isValidCPF = (cpf) => {
  if (!cpf) return false

  // Remove non-numeric characters
  cpf = cpf.replace(/[^\d]/g, "")

  // Check if has 11 digits
  if (cpf.length !== 11) return false

  // Check if all digits are the same
  if (/^(\d)\1{10}$/.test(cpf)) return false

  // Validate check digits
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += Number.parseInt(cpf.charAt(i)) * (10 - i)
  }

  let remainder = 11 - (sum % 11)
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== Number.parseInt(cpf.charAt(9))) return false

  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += Number.parseInt(cpf.charAt(i)) * (11 - i)
  }

  remainder = 11 - (sum % 11)
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== Number.parseInt(cpf.charAt(10))) return false

  return true
}

/**
 * Validate Brazilian CNPJ
 * @param {string} cnpj - CNPJ to validate
 * @returns {boolean} True if valid CNPJ
 */
const isValidCNPJ = (cnpj) => {
  if (!cnpj) return false

  // Remove non-numeric characters
  cnpj = cnpj.replace(/[^\d]/g, "")

  // Check if has 14 digits
  if (cnpj.length !== 14) return false

  // Check if all digits are the same
  if (/^(\d)\1{13}$/.test(cnpj)) return false

  // Validate first check digit
  let sum = 0
  let weight = 2
  for (let i = 11; i >= 0; i--) {
    sum += Number.parseInt(cnpj.charAt(i)) * weight
    weight = weight === 9 ? 2 : weight + 1
  }

  let remainder = sum % 11
  if (remainder < 2) remainder = 0
  else remainder = 11 - remainder

  if (remainder !== Number.parseInt(cnpj.charAt(12))) return false

  // Validate second check digit
  sum = 0
  weight = 2
  for (let i = 12; i >= 0; i--) {
    sum += Number.parseInt(cnpj.charAt(i)) * weight
    weight = weight === 9 ? 2 : weight + 1
  }

  remainder = sum % 11
  if (remainder < 2) remainder = 0
  else remainder = 11 - remainder

  if (remainder !== Number.parseInt(cnpj.charAt(13))) return false

  return true
}

/**
 * Validate phone number (Brazilian format)
 * @param {string} phone - Phone to validate
 * @returns {boolean} True if valid phone
 */
const isValidPhone = (phone) => {
  if (!phone) return false

  // Remove non-numeric characters
  const cleanPhone = phone.replace(/[^\d]/g, "")

  // Check if has 10 or 11 digits (with area code)
  return cleanPhone.length === 10 || cleanPhone.length === 11
}

/**
 * Validate Brazilian CEP
 * @param {string} cep - CEP to validate
 * @returns {boolean} True if valid CEP
 */
const isValidCEP = (cep) => {
  if (!cep) return false

  // Remove non-numeric characters
  const cleanCEP = cep.replace(/[^\d]/g, "")

  // Check if has 8 digits
  return cleanCEP.length === 8
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with score and feedback
 */
const validatePasswordStrength = (password) => {
  if (!password) {
    return { isValid: false, score: 0, feedback: "Senha é obrigatória" }
  }

  let score = 0
  const feedback = []

  // Length check
  if (password.length >= 8) score += 1
  else feedback.push("Deve ter pelo menos 8 caracteres")

  // Uppercase check
  if (/[A-Z]/.test(password)) score += 1
  else feedback.push("Deve conter pelo menos uma letra maiúscula")

  // Lowercase check
  if (/[a-z]/.test(password)) score += 1
  else feedback.push("Deve conter pelo menos uma letra minúscula")

  // Number check
  if (/\d/.test(password)) score += 1
  else feedback.push("Deve conter pelo menos um número")

  // Special character check
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1
  else feedback.push("Deve conter pelo menos um caractere especial")

  return {
    isValid: score >= 3,
    score,
    feedback: feedback.length > 0 ? feedback : ["Senha forte"],
  }
}

module.exports = {
  isValidEmail,
  isValidCPF,
  isValidCNPJ,
  isValidPhone,
  isValidCEP,
  validatePasswordStrength,
}
