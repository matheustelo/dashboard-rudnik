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
    const remoteCredentials = {
      username: credentials.email || credentials.username,
      password: credentials.password,
    }

    // Primeiro, tenta login na API externa
    const externalResponse = await axios.post(
      "https://www.apprudnik.com.br/api/auth/login",
      remoteCredentials,
      { validateStatus: () => true },
    )

    if (externalResponse.status === 401) {
      throw new Error("Credenciais inválidas na API externa")
    }

    if (externalResponse.status !== 200) {
      throw new Error(
        externalResponse.data?.message ||
        "Erro ao validar credenciais na API externa"
      )
    }

    // Faz login na API local apenas com o e-mail (sem senha)
    const localResponse = await axios.post("/api/auth/login", {
      email: credentials.email || credentials.username,
    })

    const role =
      externalResponse.data?.user?.role ??
      externalResponse.data?.role ??
      localResponse.data?.user?.role

    this.token = localResponse.data.token
    this.user = { ...localResponse.data.user, role }

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