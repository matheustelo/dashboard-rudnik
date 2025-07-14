import axios from "axios"

const api = axios.create({
  baseURL: "/api",
})

export const dashboardService = {
  getVendedorDashboard(id, period) {
    return api.get(`/dashboard/vendedor/${id}`, { params: { period } })
  },

  getSupervisorDashboard(id, period) {
    return api.get(`/dashboard/supervisor/${id}`, { params: { period } })
  },

  getGestorDashboard(period) {
    return api.get("/dashboard/gestor", { params: { period } })
  },
}

export default api
