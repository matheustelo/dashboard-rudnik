const moment = require("moment")

/**
 * Get date range based on period or explicit start/end dates
 * @param {string} period - Period in YYYY-MM format (e.g., "2025-07")
 * @param {string} startDate - Explicit start date in ISO format
 * @param {string} endDate - Explicit end date in ISO format
 * @returns {Object} Object with startDate and endDate strings
 */
const getDateRange = (period, startDate, endDate) => {
  // If explicit dates are provided, use them
  if (startDate && endDate) {
    return {
      startDate: moment(startDate).format("YYYY-MM-DD"),
      // Use end of day to include the full end date in comparisons
      endDate: moment(endDate).endOf("day").format("YYYY-MM-DD HH:mm:ss"),
    }
  }

  // If period is provided (YYYY-MM format)
  if (period && isValidPeriod(period)) {
    const [year, month] = period.split("-")
    const start = moment(`${year}-${month}-01`)
    const end = start.clone().endOf("month")

    return {
      startDate: start.format("YYYY-MM-DD"),
      // Ensure the end date covers the entire day
      endDate: end.endOf("day").format("YYYY-MM-DD HH:mm:ss"),
    }
  }

  // Default to current month if no parameters provided
  const now = new Date()
  const startDateDefault = new Date(now.getFullYear(), now.getMonth(), 1)
  const endDateDefault = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return {
    startDate: startDateDefault.toISOString().split("T")[0],
    // Append 23:59:59 to include the entire last day
    endDate: moment(endDateDefault).endOf("day").format("YYYY-MM-DD HH:mm:ss"),
  }
}

/**
 * Format date for database insertion
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string for database
 */
const formatDateForDB = (date) => {
  return moment(date).format("YYYY-MM-DD HH:mm:ss")
}

/**
 * Validate period format (YYYY-MM)
 * @param {string} period - Period string to validate
 * @returns {boolean} True if valid period format
 */
const isValidPeriod = (period) => {
  if (!period || typeof period !== "string") return false

  const periodRegex = /^\d{4}-\d{2}$/
  if (!periodRegex.test(period)) return false

  const [year, month] = period.split("-")
  const yearNum = Number.parseInt(year)
  const monthNum = Number.parseInt(month)

  // Basic validation
  return yearNum >= 2020 && yearNum <= 2030 && monthNum >= 1 && monthNum <= 12
}

/**
 * Get current period in YYYY-MM format
 * @returns {string} Current period
 */
const getCurrentPeriod = () => {
  return moment().format("YYYY-MM")
}

/**
 * Get previous period in YYYY-MM format
 * @param {string} period - Current period (optional)
 * @returns {string} Previous period
 */
const getPreviousPeriod = (period = null) => {
  const currentPeriod = period || getCurrentPeriod()
  const [year, month] = currentPeriod.split("-")
  const date = moment(`${year}-${month}-01`)

  return date.subtract(1, "month").format("YYYY-MM")
}

/**
 * Get next period in YYYY-MM format
 * @param {string} period - Current period (optional)
 * @returns {string} Next period
 */
const getNextPeriod = (period = null) => {
  const currentPeriod = period || getCurrentPeriod()
  const [year, month] = currentPeriod.split("-")
  const date = moment(`${year}-${month}-01`)

  return date.add(1, "month").format("YYYY-MM")
}

/**
 * Get date range for last N months
 * @param {number} months - Number of months to go back
 * @returns {Object} Object with startDate and endDate
 */
const getLastNMonthsRange = (months = 6) => {
  const end = moment().endOf("month")
  const start = moment()
    .subtract(months - 1, "months")
    .startOf("month")

  return {
    startDate: start.format("YYYY-MM-DD"),
    endDate: end.format("YYYY-MM-DD"),
  }
}

/**
 * Get date range for current year
 * @returns {Object} Object with startDate and endDate
 */
const getCurrentYearRange = () => {
  const start = moment().startOf("year")
  const end = moment().endOf("year")

  return {
    startDate: start.format("YYYY-MM-DD"),
    endDate: end.format("YYYY-MM-DD"),
  }
}

/**
 * Get date range for last year
 * @returns {Object} Object with startDate and endDate
 */
const getLastYearRange = () => {
  const start = moment().subtract(1, "year").startOf("year")
  const end = moment().subtract(1, "year").endOf("year")

  return {
    startDate: start.format("YYYY-MM-DD"),
    endDate: end.format("YYYY-MM-DD"),
  }
}

/**
 * Get quarter date range
 * @param {number} year - Year
 * @param {number} quarter - Quarter (1-4)
 * @returns {Object} Object with startDate and endDate
 */
const getQuarterRange = (year, quarter) => {
  if (quarter < 1 || quarter > 4) {
    throw new Error("Quarter must be between 1 and 4")
  }

  const start = moment(`${year}-${(quarter - 1) * 3 + 1}-01`)
  const end = start.clone().add(2, "months").endOf("month")

  return {
    startDate: start.format("YYYY-MM-DD"),
    endDate: end.format("YYYY-MM-DD"),
  }
}

/**
 * Format date for display in Brazilian format
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date (DD/MM/YYYY)
 */
const formatDateBR = (date) => {
  return moment(date).format("DD/MM/YYYY")
}

/**
 * Format datetime for display in Brazilian format
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted datetime (DD/MM/YYYY HH:mm)
 */
const formatDateTimeBR = (date) => {
  return moment(date).format("DD/MM/YYYY HH:mm")
}

/**
 * Get month name in Portuguese
 * @param {string} period - Period in YYYY-MM format
 * @returns {string} Month name in Portuguese
 */
const getMonthNamePT = (period) => {
  const monthNames = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ]

  if (!isValidPeriod(period)) return ""

  const [year, month] = period.split("-")
  const monthIndex = Number.parseInt(month) - 1

  return `${monthNames[monthIndex]} ${year}`
}

/**
 * Get list of periods for dropdown/select
 * @param {number} monthsBack - How many months back to include
 * @returns {Array} Array of period objects with value and label
 */
const getPeriodOptions = (monthsBack = 12) => {
  const options = []
  const current = moment()

  for (let i = 0; i < monthsBack; i++) {
    const date = current.clone().subtract(i, "months")
    const period = date.format("YYYY-MM")
    const label = getMonthNamePT(period)

    options.push({
      value: period,
      label: label,
    })
  }

  return options
}

/**
 * Check if date is within range
 * @param {Date|string} date - Date to check
 * @param {string} startDate - Range start date
 * @param {string} endDate - Range end date
 * @returns {boolean} True if date is within range
 */
const isDateInRange = (date, startDate, endDate) => {
  const checkDate = moment(date)
  const start = moment(startDate)
  const end = moment(endDate)

  return checkDate.isBetween(start, end, "day", "[]") // inclusive
}

/**
 * Get days difference between two dates
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {number} Number of days
 */
const getDaysDifference = (startDate, endDate) => {
  const start = moment(startDate)
  const end = moment(endDate)

  return end.diff(start, "days")
}

/**
 * Add business days to a date (excluding weekends)
 * @param {Date|string} date - Starting date
 * @param {number} days - Number of business days to add
 * @returns {string} New date in YYYY-MM-DD format
 */
const addBusinessDays = (date, days) => {
  let result = moment(date)
  let remainingDays = days

  while (remainingDays > 0) {
    result = result.add(1, "day")

    // Skip weekends (Saturday = 6, Sunday = 0)
    if (result.day() !== 0 && result.day() !== 6) {
      remainingDays--
    }
  }

  return result.format("YYYY-MM-DD")
}

module.exports = {
  getDateRange,
  formatDateForDB,
  isValidPeriod,
  getCurrentPeriod,
  getPreviousPeriod,
  getNextPeriod,
  getLastNMonthsRange,
  getCurrentYearRange,
  getLastYearRange,
  getQuarterRange,
  formatDateBR,
  formatDateTimeBR,
  getMonthNamePT,
  getPeriodOptions,
  isDateInRange,
  getDaysDifference,
  addBusinessDays,
}
