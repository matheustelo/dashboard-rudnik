import axios from "axios"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api"
const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 60000

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: API_TIMEOUT,
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
  getVendedorDashboard: (id, period, startDate, endDate) =>
    api.get(`/dashboard/vendedor/${id}`, { params: { period, startDate, endDate } }),
  getRepresentanteDashboard: (id, period, startDate, endDate) =>
    api.get(`/dashboard/representante/${id}`, { params: { period, startDate, endDate } }),
  getSupervisorDashboard: (id, period, startDate, endDate) =>
    api.get(`/dashboard/supervisor/${id}`, { params: { period, startDate, endDate } }),
  getGerenteComercialDashboard: (filters) =>
    api.get("/dashboard/gerente_comercial", { params: filters }),
  getGestorDashboard: (period, startDate, endDate) =>
    api.get("/dashboard/gerente_comercial", { params: { period, startDate, endDate } }),
  getRevenueVsTarget: (filters) => api.get("/dashboard/revenue-vs-target", { params: filters }),
  getRevenueBySupervisor: (filters) => api.get("/dashboard/revenue-by-supervisor", { params: filters }),
  getProposalMetrics: (filters) => api.get("/dashboard/proposal-metrics", { params: filters }),
}

// Goals service
export const goalsService = {
 getGoals: (period, startDate, endDate, supervisorId, goalType) =>
    api.get("/goals", {
       params: { period, startDate, endDate, supervisorId, goalType },
    }),
  getGeneralGoals: async (period) => {
    const response = await api.get("/goals", { params: { period } })
    return response.data.generalGoals
  },
  getIndividualGoals: async (period) => {
    const response = await api.get("/goals", { params: { period } })
    return response.data.individualGoals
  },
  getGeneralGoal: (id) => api.get(`/goals/general/${id}`),
  saveGoal: (type, goalData) => api.post("/goals", { type, goalData }),
  updateGoal: (type, id, goalData) =>
    api.put(`/goals/${type}/${id}`, { goalData }),
  deleteGoal: (type, id) => api.delete(`/goals/${type}/${id}`),
  getSellerTracking: (id, period, startDate, endDate) =>
    api.get(`/goals/tracking/seller/${id}`, { params: { period, startDate, endDate } }),
  getGoalPeriods: (id) => api.get(`/goals/periods/${id}`),
  getTeamGoals: (id, params) => api.get(`/goals/team/${id}`, { params }),
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
  getAllUsers: () => api.get("/users"),
  getUserTeam: (id) => api.get(`/users/${id}/team`),
  getUser: (id) => api.get(`/users/${id}`),
}

export default api
