import axios from "axios"

const API_BASE_URL = "http://localhost:3001/api"

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  console.log("Making request to:", config.baseURL + config.url)
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => {
    console.log("Response received from:", response.config.url)
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      window.location.href = "/login"
    }
    console.error("API Error:", error.response?.status, error.response?.data)
    return Promise.reject(error)
  },
)

// Auth service
export const authService = {
  login: (credentials) => api.post("/auth/login", credentials),
  logout: () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
  },
}

// Dashboard service
export const dashboardService = {
  getVendedorDashboard: (id, period) => api.get(`/dashboard/vendedor/${id}`, { params: { period } }),
  getRepresentanteDashboard: (id, period) => api.get(`/dashboard/representante/${id}`, { params: { period } }),
  getSupervisorDashboard: (id, period) => api.get(`/dashboard/supervisor/${id}`, { params: { period } }),
  getGerenteComercialDashboard: (period) => api.get("/dashboard/gerente_comercial", { params: { period } }),
}

// Goals service
export const goalsService = {
  getGoals: (period) => api.get("/goals", { params: { period } }),
  saveGoal: (type, goalData) => api.post("/goals", { type, goalData }),
  deleteGoal: (type, id) => api.delete(`/goals/${type}/${id}`),
  getSellerTracking: (id, period) => api.get(`/goals/tracking/seller/${id}`, { params: { period } }),
}

// Performance service
export const performanceService = {
  getTeamPerformance: (period) => api.get("/performance/team", { params: { period } }),
}

// Users service
export const userService = {
  getUsers: () => api.get("/users"),
}

export default api
