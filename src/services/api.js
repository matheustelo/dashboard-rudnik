import axios from "axios"

const api = axios.create({
  baseURL: "/api",
  timeout: 10000,
})

// Interceptor para debug das requisições
api.interceptors.request.use(
  (config) => {
    console.log("Making request to:", config.baseURL + config.url)
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Interceptor para debug das respostas
api.interceptors.response.use(
  (response) => {
    console.log("Response received from:", response.config.url)
    return response
  },
  (error) => {
    console.error("API Error:", error.response?.status, error.response?.data)
    return Promise.reject(error)
  },
)

export const dashboardService = {
  getVendedorDashboard(id, period) {
    return api.get(`/dashboard/vendedor/${id}`, { params: { period } })
  },

  // Novo método para representante (usa o mesmo endpoint do vendedor)
  getRepresentanteDashboard(id, period) {
    return api.get(`/dashboard/representante/${id}`, { params: { period } })
  },

  getSupervisorDashboard(id, period) {
    return api.get(`/dashboard/supervisor/${id}`, { params: { period } })
  },

  // Trocar método do gestor para gerente comercial
  getGerenteComercialDashboard(period) {
    return api.get("/dashboard/gerente_comercial", { params: { period } })
  },
}

export const goalsService = {
  // For management dashboard
  getGoals(period) {
    return api.get("/goals", { params: { period } })
  },
  saveGoal(type, goalData) {
    return api.post("/goals", { type, goalData })
  },
  deleteGoal(type, id) {
    return api.delete(`/goals/${type}/${id}`)
  },

  // For tracking dashboards
  getSellerTracking(id, period) {
    return api.get(`/goals/tracking/seller/${id}`, { params: { period } })
  },
}

export const userService = {
  getUsers() {
    // Assuming the endpoint returns all users, which might need adjustment for security
    return api.get("/users")
  },
}

export default api
