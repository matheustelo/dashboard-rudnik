import { createRouter, createWebHistory } from "vue-router"
import { useAuthStore } from "../stores/auth"
import Login from "../views/Login.vue"
import DashboardVendedor from "../views/DashboardVendedor.vue"
import DashboardSupervisor from "../views/DashboardSupervisor.vue"
import DashboardGerenteComercial from "../views/DashboardGerenteComercial.vue"
import DashboardRepresentante from "../views/DashboardRepresentante.vue"
import PainelMetas from "../views/PainelMetas.vue"

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
    meta: { requiresAuth: true, role: "gerente_comercial" },
  },
  {
    path: "/painel-metas/gerente_comercial",
    name: "PainelMetasGerenteComercial",
    component: PainelMetas,
    meta: { requiresAuth: true, roles: ["admin", "gerente_comercial"] },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next("/login")
  } else if (to.meta.roles && !to.meta.roles.includes(authStore.user?.role)) {
    const role = authStore.user?.role
    if (role) {
      next(`/dashboard/${role}`)
    } else {
      next("/login")
    }
  } else if (to.meta.role && authStore.user?.role !== to.meta.role) {
    // Redirect to appropriate dashboard based on role
    const role = authStore.user?.role
    if (role) {
      next(`/dashboard/${role}`)
    } else {
      next("/login")
    }
  } else {
    next()
  }
})

export default router
