const fs = require("fs")
const path = require("path")

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, "..", "logs")
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir)
}

const logLevels = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
}

const currentLogLevel = logLevels[process.env.LOG_LEVEL?.toUpperCase()] || logLevels.INFO

const formatMessage = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString()
  const metaString = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : ""
  return `[${timestamp}] ${level}: ${message}${metaString}\n`
}

const writeToFile = (level, message, meta) => {
  const logFile = path.join(logsDir, `${new Date().toISOString().split("T")[0]}.log`)
  const formattedMessage = formatMessage(level, message, meta)

  fs.appendFile(logFile, formattedMessage, (err) => {
    if (err) console.error("Failed to write to log file:", err)
  })
}

const logger = {
  error: (message, meta = {}) => {
    if (currentLogLevel >= logLevels.ERROR) {
      console.error(`❌ ERROR: ${message}`, meta)
      writeToFile("ERROR", message, meta)
    }
  },

  warn: (message, meta = {}) => {
    if (currentLogLevel >= logLevels.WARN) {
      console.warn(`⚠️  WARN: ${message}`, meta)
      writeToFile("WARN", message, meta)
    }
  },

  info: (message, meta = {}) => {
    if (currentLogLevel >= logLevels.INFO) {
      console.log(`ℹ️  INFO: ${message}`, meta)
      writeToFile("INFO", message, meta)
    }
  },

  debug: (message, meta = {}) => {
    if (currentLogLevel >= logLevels.DEBUG) {
      console.log(`🐛 DEBUG: ${message}`, meta)
      writeToFile("DEBUG", message, meta)
    }
  },
}

module.exports = logger
