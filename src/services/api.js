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
  getRevenueVsTarget: (filters) => api.get("/dashboard/revenue-vs-target", { params: filters }),
  getRevenueBySupervisor: (filters) => api.get("/dashboard/revenue-by-supervisor", { params: filters }),
}

// Performance service
export const performanceService = {
  getTeamPerformance: (filters) => {
    const params = new URLSearchParams()
    if (filters.period) params.append("period", filters.period)
    if (filters.startDate) params.append("startDate", filters.startDate)
    if (filters.endDate) params.append("endDate", filters.endDate)
    if (filters.supervisor) params.append("supervisor", filters.supervisor)

    return api.get(`/performance/team?${params.toString()}`)
  },
  getRepresentativeDetails: (id, filters) => {
    const params = new URLSearchParams()
    if (filters.period) params.append("period", filters.period)
    if (filters.startDate) params.append("startDate", filters.startDate)
    if (filters.endDate) params.append("endDate", filters.endDate)

    return api.get(`/performance/representative/${id}?${params.toString()}`)
  },
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
