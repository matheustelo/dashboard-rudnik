import { createRouter, createWebHistory } from "vue-router"
import { useAuthStore } from "../stores/auth"

const routes = [
  {
    path: "/",
    redirect: "/login",
  },
  {
    path: "/login",
    name: "Login",
    component: () => import("../views/Login.vue"),
  },
  {
    path: "/dashboard/vendedor",
    name: "DashboardVendedor",
    component: () => import("../views/DashboardVendedor.vue"),
    meta: { requiresAuth: true, role: "vendedor" },
  },
  {
    path: "/dashboard/representante",
    name: "DashboardRepresentante",
    component: () => import("../views/DashboardRepresentante.vue"),
    meta: { requiresAuth: true, roles: ["representante", "preposto"] },
  },
  {
    path: "/dashboard/preposto",
    name: "DashboardPreposto",
    component: () => import("../views/DashboardRepresentante.vue"),
    meta: { requiresAuth: true, roles: ["representante", "preposto"] },
  },
  {
    path: "/dashboard/representante_premium",
    name: "DashboardRepresentantePremium",
    component: () => import("../views/DashboardSupervisor.vue"),
    meta: { requiresAuth: true, role: "representante_premium" },
  },
  {
    path: "/dashboard/supervisor",
    name: "DashboardSupervisor",
    component: () => import("../views/DashboardSupervisor.vue"),
    meta: { requiresAuth: true, role: "supervisor" },
  },
  {
    path: "/dashboard/parceiro_comercial",
    name: "DashboardParceiroComercial",
    component:() => import("../views/DashboardSupervisor.vue"),
    meta: { requiresAuth: true, role: "parceiro_comercial" },
  },
  {
    path: "/dashboard/gerente_comercial",
    name: "DashboardGerenteComercial",
    component:() => import("../views/DashboardGerenteComercial.vue"),
    meta: { requiresAuth: true, roles: ["admin", "gerente_comercial"] },
  },
  {
    path: "/dashboard/admin",
    name: "DashboardAdmin",
    component: () => import("../views/DashboardGerenteComercial.vue"),
    meta: { requiresAuth: true, roles: ["admin", "gerente_comercial"] },
  },
  {
    path: "/dashboard/metas",
    name: "DashboardMetas",
    component: () => import("../views/DashboardMetas.vue"),
    meta: { requiresAuth: true, roles: ["admin", "gerente_comercial"] }, // New
  },
  {
    path: "/dashboard/team-goals-history",
    name: "TeamGoalsHistory",
    component: () => import("../views/TeamGoalsHistory.vue"),
    meta: { requiresAuth: true, roles: ["admin", "gerente_comercial", "supervisor", "parceiro_comercial"] }
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
