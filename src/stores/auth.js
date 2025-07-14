import { defineStore } from "pinia"
import axios from "axios"

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null,
    token: localStorage.getItem("token") || null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    userRole: (state) => state.user?.role,
  },

  actions: {
    async login(credentials) {
      try {
        const response = await axios.post("/api/auth/login", credentials)

        this.token = response.data.token
        this.user = response.data.user

        localStorage.setItem("token", this.token)
        axios.defaults.headers.common["Authorization"] = `Bearer ${this.token}`

        return response.data
      } catch (error) {
        throw error.response?.data?.message || "Erro ao fazer login"
      }
    },

    logout() {
      this.user = null
      this.token = null
      localStorage.removeItem("token")
      delete axios.defaults.headers.common["Authorization"]
    },

    initializeAuth() {
      if (this.token) {
        axios.defaults.headers.common["Authorization"] = `Bearer ${this.token}`
      }
    },
  },
})
