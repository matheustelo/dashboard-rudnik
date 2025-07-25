import { defineStore } from "pinia"
import axios from "axios"
import api from "../services/api"

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: (() => {
      const stored = localStorage.getItem("user")
      if (!stored || stored === "undefined") return null
      try {
        return JSON.parse(stored)
      } catch {
        return null
      }
    })(),
    token: localStorage.getItem("token") || null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    userRole: (state) => state.user?.role,
  },

  actions: {
    async login(credentials) {
      try {
        const payload = {
          username: credentials.username || credentials.email,
          password: credentials.password,
        }
        const response = await axios.post(
          "https://www.apprudnik.com.br/api/auth/login",
          payload,
        )

        this.token = response.data.token
        this.user = response.data.user

        localStorage.setItem("token", this.token)
        localStorage.setItem("user", JSON.stringify(this.user))
        axios.defaults.headers.common["Authorization"] = `Bearer ${this.token}`
        api.defaults.headers.common["Authorization"] = `Bearer ${this.token}`

        return { status: response.status, user: this.user, token: this.token }
      } catch (error) {
        throw error.response?.data?.message || "Erro ao fazer login"
      }
    },

    logout() {
      this.user = null
      this.token = null
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      delete axios.defaults.headers.common["Authorization"]
      delete api.defaults.headers.common["Authorization"]
    },

    initializeAuth() {
      if (this.token) {
        axios.defaults.headers.common["Authorization"] = `Bearer ${this.token}`
        api.defaults.headers.common["Authorization"] = `Bearer ${this.token}`

        if (!this.user) {
          const storedUser = localStorage.getItem("user")
          if (storedUser && storedUser !== "undefined") {
            try {
              this.user = JSON.parse(storedUser)
            } catch {
              this.user = null
            }
          }
        }
      }
    },
  },
})