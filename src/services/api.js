import axios from "axios"

const api = axios.create({
  baseURL: "/api",
})

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

export default api
