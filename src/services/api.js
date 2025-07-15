import axios from "axios"

const API_BASE_URL = "http://localhost:3001/api"

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      window.location.href = "/login"
    }
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
  getRevenueVsTarget: (filters) => api.get("/dashboard/revenue-vs-target", { params: filters }),
  getRevenueBySupervisor: (filters) => api.get("/dashboard/revenue-by-supervisor", { params: filters }),
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
  getTeamPerformance: (filters) => api.get("/performance/team", { params: filters }),
  getRepresentativeDetails: (id, filters) => api.get(`/performance/representative/${id}`, { params: filters }),
}

// Supervisors service
export const supervisorService = {
  getSupervisors: () => api.get("/supervisors"),
}

// Team Leaders service
export const teamLeaderService = {
  getTeamLeaders: () => api.get("/team-leaders"),
}

// Users service
export const userService = {
  getUsers: () => api.get("/users"),
}

export default api