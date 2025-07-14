import { createRouter, createWebHistory } from "vue-router"
import { useAuthStore } from "../stores/auth"
import Login from "../views/Login.vue"
import DashboardVendedor from "../views/DashboardVendedor.vue"
import DashboardSupervisor from "../views/DashboardSupervisor.vue"
import DashboardGestor from "../views/DashboardGestor.vue"

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
    path: "/dashboard/supervisor",
    name: "DashboardSupervisor",
    component: DashboardSupervisor,
    meta: { requiresAuth: true, role: "supervisor" },
  },
  {
    path: "/dashboard/gestor",
    name: "DashboardGestor",
    component: DashboardGestor,
    meta: { requiresAuth: true, role: "gestor" },
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
  } else if (to.meta.role && authStore.user?.role !== to.meta.role) {
    // Redireciona para o painel apropriado com base na função
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
