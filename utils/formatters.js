/**
 * Format currency in Brazilian Real
 * @param {number} value - Value to format
 * @param {boolean} showSymbol - Whether to show R$ symbol
 * @returns {string} Formatted currency
 */
const formatCurrency = (value, showSymbol = true) => {
  if (value === null || value === undefined || isNaN(value)) {
    return showSymbol ? "R$ 0,00" : "0,00"
  }

  const formatted = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)

  return showSymbol ? `R$ ${formatted}` : formatted
}

/**
 * Format number with thousands separator
 * @param {number} value - Value to format
 * @returns {string} Formatted number
 */
const formatNumber = (value) => {
  if (value === null || value === undefined || isNaN(value)) {
    return "0"
  }

  return new Intl.NumberFormat("pt-BR").format(value)
}

/**
 * Format percentage
 * @param {number} value - Value to format (0-100)
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage
 */
const formatPercentage = (value, decimals = 2) => {
  if (value === null || value === undefined || isNaN(value)) {
    return "0%"
  }

  return `${value.toFixed(decimals)}%`
}

/**
 * Format CPF (Brazilian individual taxpayer registry)
 * @param {string} cpf - CPF to format
 * @returns {string} Formatted CPF
 */
const formatCPF = (cpf) => {
  if (!cpf) return ""

  // Remove non-numeric characters
  const cleanCPF = cpf.replace(/[^\d]/g, "")

  // Apply mask: 000.000.000-00
  return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
}

/**
 * Format CNPJ (Brazilian company taxpayer registry)
 * @param {string} cnpj - CNPJ to format
 * @returns {string} Formatted CNPJ
 */
const formatCNPJ = (cnpj) => {
  if (!cnpj) return ""

  // Remove non-numeric characters
  const cleanCNPJ = cnpj.replace(/[^\d]/g, "")

  // Apply mask: 00.000.000/0000-00
  return cleanCNPJ.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
}

/**
 * Format phone number (Brazilian format)
 * @param {string} phone - Phone to format
 * @returns {string} Formatted phone
 */
const formatPhone = (phone) => {
  if (!phone) return ""

  // Remove non-numeric characters
  const cleanPhone = phone.replace(/[^\d]/g, "")

  // Apply mask based on length
  if (cleanPhone.length === 10) {
    // (00) 0000-0000
    return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3")
  } else if (cleanPhone.length === 11) {
    // (00) 00000-0000
    return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
  }

  return phone
}

/**
 * Format CEP (Brazilian postal code)
 * @param {string} cep - CEP to format
 * @returns {string} Formatted CEP
 */
const formatCEP = (cep) => {
  if (!cep) return ""

  // Remove non-numeric characters
  const cleanCEP = cep.replace(/[^\d]/g, "")

  // Apply mask: 00000-000
  return cleanCEP.replace(/(\d{5})(\d{3})/, "$1-$2")
}

/**
 * Format file size in human readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted file size
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes"

  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
const truncateText = (text, maxLength = 50) => {
  if (!text || text.length <= maxLength) return text

  return text.substring(0, maxLength) + "..."
}

/**
 * Format name to title case
 * @param {string} name - Name to format
 * @returns {string} Formatted name
 */
const formatName = (name) => {
  if (!name) return ""

  return name
    .toLowerCase()
    .split(" ")
    .map((word) => {
      // Don't capitalize prepositions and articles
      const lowercaseWords = ["de", "da", "do", "das", "dos", "e", "em", "na", "no", "nas", "nos"]
      if (lowercaseWords.includes(word)) return word

      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(" ")
}

/**
 * Remove accents from text
 * @param {string} text - Text to normalize
 * @returns {string} Text without accents
 */
const removeAccents = (text) => {
  if (!text) return ""

  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

/**
 * Generate initials from name
 * @param {string} name - Full name
 * @returns {string} Initials (max 2 characters)
 */
const getInitials = (name) => {
  if (!name) return ""

  const words = name.trim().split(" ")
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase()
  }

  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase()
}

module.exports = {
  formatCurrency,
  formatNumber,
  formatPercentage,
  formatCPF,
  formatCNPJ,
  formatPhone,
  formatCEP,
  formatFileSize,
  truncateText,
  formatName,
  removeAccents,
  getInitials,
}
