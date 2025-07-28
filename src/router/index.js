import { createRouter, createWebHistory } from "vue-router"
import { useAuthStore } from "../stores/auth"
import Login from "../views/Login.vue"
import DashboardVendedor from "../views/DashboardVendedor.vue"
import DashboardSupervisor from "../views/DashboardSupervisor.vue"
import DashboardGerenteComercial from "../views/DashboardGerenteComercial.vue"
import DashboardRepresentante from "../views/DashboardRepresentante.vue"
import DashboardMetas from "../views/DashboardMetas.vue"
import TeamGoalsHistory from "../views/TeamGoalsHistory.vue"

const routes = [
  {
    path: "/",
    redirect: "/login",
  },
  {
    path: "/login",
    name: "Login",
    component: Login,
  },
  {
    path: "/dashboard/vendedor",
    name: "DashboardVendedor",
    component: DashboardVendedor,
    meta: { requiresAuth: true, role: "vendedor" },
  },
  {
    path: "/dashboard/representante",
    name: "DashboardRepresentante",
    component: DashboardRepresentante,
    meta: { requiresAuth: true, role: "representante" },
  },
  {
    path: "/dashboard/supervisor",
    name: "DashboardSupervisor",
    component: DashboardSupervisor,
    meta: { requiresAuth: true, role: "supervisor" },
  },
  {
    path: "/dashboard/gerente_comercial",
    name: "DashboardGerenteComercial",
    component: DashboardGerenteComercial,
    meta: { requiresAuth: true, roles: ["admin", "gerente_comercial"] },
  },
  {
    path: "/dashboard/admin",
    name: "DashboardGerenteComercial",
    component: DashboardGerenteComercial,
    meta: { requiresAuth: true, roles: ["admin", "gerente_comercial"] },
  },
  {
    path: "/dashboard/metas",
    name: "DashboardMetas",
    component: DashboardMetas,
    meta: { requiresAuth: true, roles: ["admin", "gerente_comercial"] }, // New
  },
  {
    path: "/dashboard/team-goals-history",
    name: "TeamGoalsHistory",
    component: TeamGoalsHistory,
    meta: { requiresAuth: true, roles: ["admin", "gerente_comercial"] },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  authStore.initializeAuth() // Ensure auth state is loaded
  const userRole = authStore.user?.role

  if (to.meta.requiresAuth) {
    if (!authStore.isAuthenticated) {
      return next({ name: "Login" })
    }

    const requiredRoles = to.meta.roles || (to.meta.role ? [to.meta.role] : [])

    if (requiredRoles.length > 0 && !requiredRoles.includes(userRole)) {
      // If user has a role, redirect to their dashboard, otherwise to login
      return userRole ? next(`/dashboard/${userRole}`) : next({ name: "Login" })
    }
  }

  next()
})

export default router
