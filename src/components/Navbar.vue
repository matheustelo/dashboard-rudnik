<template>
  <nav class="flex items-center space-x-4">
    <router-link :to="dashboardPath" class="text-blue-600 hover:underline">
      Dashboard
    </router-link>
    <router-link
      v-if="showGoals"
      to="/painel-metas/gerente_comercial"
      class="text-blue-600 hover:underline"
    >
      Painel de Metas
    </router-link>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

const dashboardPath = computed(() => `/dashboard/${authStore.user?.role}`)

const showGoals = computed(() => {
  const role = authStore.user?.role
  return role === 'gerente_comercial' || role === 'admin'
})
</script>