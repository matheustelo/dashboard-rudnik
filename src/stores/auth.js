import { defineStore } from "pinia"
import axios from "axios"
import api from "../services/api"

function getStoredUser() {
  try {
    const item = localStorage.getItem("user")
    return item ? JSON.parse(item) : null
  } catch (err) {
    // Remove invalid data
    localStorage.removeItem("user")
    return null
  }
}

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: getStoredUser(),
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

        // Fetch the user role from the external system
        const remoteCredentials = {
          username: credentials.email || credentials.username,
          password: credentials.password,
        }
        const roleResponse = await axios.post(
          "https://www.apprudnik.com.br/api/auth/login",
          remoteCredentials,
          { validateStatus: () => true },
        )

        if (roleResponse.status === 401) {
          throw new Error("Credenciais inválidas")
        }

        if (roleResponse.status >= 400) {
          throw new Error(
            roleResponse.data?.message ||
              "Erro ao obter papel do usuário no sistema externo",
          )
        }

        const role =
          roleResponse.data?.user?.role ?? roleResponse.data?.role ?? this.user?.role

        this.token = response.data.token
         this.user = { ...response.data.user, role }

        localStorage.setItem("token", this.token)
        localStorage.setItem("user", JSON.stringify(this.user))
        axios.defaults.headers.common["Authorization"] = `Bearer ${this.token}`
        api.defaults.headers.common["Authorization"] = `Bearer ${this.token}`

        return { token: this.token, user: this.user }
      } catch (error) {
        this.logout()
        if (error.response) {
          if (error.response.status === 401) {
            throw "Credenciais inválidas"
          }
          throw error.response.data?.message || "Erro ao fazer login"
        }
        if (error.request) {
          throw "Falha de conexão com o servidor"
        }
        throw error.message || "Erro ao fazer login"
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
          this.user = getStoredUser()
        }
      }
    },
  },
})