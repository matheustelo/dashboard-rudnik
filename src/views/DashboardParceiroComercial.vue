<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center py-6">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">Dashboard Parceiro Comercial</h1>
            <p class="text-gray-600">Bem-vindo, {{ authStore.user?.name }}</p>
          </div>
          <div class="flex items-center space-x-4">
            <Navbar />
            <select
              v-model="selectedPeriod"
              @change="loadDashboard"
              class="border border-gray-300 rounded-md px-3 py-2"
            >
              <option v-for="p in periods" :key="p" :value="p">
                {{ formatPeriodLabel(p) }}
              </option>
              <option value="">Período Personalizado</option>
            </select>
            <input
              type="date"
              v-model="customStart"
              :disabled="selectedPeriod"
              class="border border-gray-300 rounded-md px-2 py-1"
              @change="loadDashboard"
            />
            <span class="text-gray-500">até</span>
            <input
              type="date"
              v-model="customEnd"
              :disabled="selectedPeriod"
              class="border border-gray-300 rounded-md px-2 py-1"
              @change="loadDashboard"
            />
            <router-link
              to="/dashboard/team-goals-history"
              class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
            >
              Histórico de Metas
            </router-link>
            <button
              @click="logout"
              class="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
            >
              Sair
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div v-if="loading" class="text-center py-12">
        <div class="text-lg">Carregando dashboard...</div>
      </div>

      <div v-else-if="dashboardData" class="space-y-6">
        <!-- KPIs da Equipe -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span class="text-white text-sm font-bold">P</span>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">
                      Total de Propostas (Equipe)
                    </dt>
                    <dd class="text-lg font-medium text-gray-900">
                      {{ dashboardData.resumo.totalPropostas }}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span class="text-white text-sm font-bold">V</span>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">
                      Vendas Fechadas (Equipe)
                    </dt>
                    <dd class="text-lg font-medium text-gray-900">
                      {{ dashboardData.resumo.propostasConvertidas }}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                    <span class="text-white text-sm font-bold">R$</span>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">
                      Faturamento (Equipe)
                    </dt>
                    <dd class="text-lg font-medium text-gray-900">
                      R$ {{ formatCurrency(dashboardData.resumo.faturamentoTotal) }}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Ranking de Vendedores -->
        <div class="bg-white shadow rounded-lg">
          <div class="px-4 py-5 sm:p-6">
            <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
              Ranking de Vendedores
            </h3>
            <div class="overflow-hidden">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Posição
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vendedor
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Propostas
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vendas
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Faturamento
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr
                    v-for="(vendedor, index) in dashboardData.rankingVendedores"
                    :key="vendedor.id"
                    :class="index < 3 ? 'bg-yellow-50' : ''"
                  >
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <span
                        v-if="index === 0"
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
                      >
                        🥇 1º
                      </span>
                      <span
                        v-else-if="index === 1"
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                      >
                        🥈 2º
                      </span>
                      <span
                        v-else-if="index === 2"
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800"
                      >
                        🥉 3º
                      </span>
                      <span v-else class="text-gray-500">{{ index + 1 }}º</span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {{ vendedor.name }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {{ vendedor.propostas }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {{ vendedor.vendas }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      R$ {{ formatCurrency(vendedor.faturamento) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Gráfico de Performance da Equipe -->
        <div class="bg-white p-6 rounded-lg shadow">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Performance da Equipe</h3>
          <BarChart
            v-if="chartData"
            :data="chartData"
            :options="chartOptions"
          />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { dashboardService, goalsService } from '../services/api'
import BarChart from '../components/BarChart.vue'
import Navbar from '../components/Navbar.vue'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(true)
const dashboardData = ref(null)
const periods = ref([])
const selectedPeriod = ref('')
const customStart = ref('')
const customEnd = ref('')

const chartData = computed(() => {
  if (!dashboardData.value?.rankingVendedores) return null

  return {
    labels: dashboardData.value.rankingVendedores.map(v => v.name),
    datasets: [
      {
        label: 'Faturamento (R$)',
        data: dashboardData.value.rankingVendedores.map(v => v.faturamento),
        backgroundColor: 'rgba(59, 130, 246, 0.8)'
      },
      {
        label: 'Vendas',
        data: dashboardData.value.rankingVendedores.map(v => v.vendas),
        backgroundColor: 'rgba(34, 197, 94, 0.8)'
      }
    ]
  }
})

const chartOptions = {
  responsive: true,
  plugins: {
    legend: {
      position: 'top'
    }
  },
  scales: {
    y: {
      beginAtZero: true
    }
  }
}

const loadDashboard = async () => {
  loading.value = true
  try {
    const periodParam = selectedPeriod.value ? selectedPeriod.value : undefined
    const start = selectedPeriod.value ? undefined : customStart.value || undefined
    const end = selectedPeriod.value ? undefined : customEnd.value || undefined
    const response = await dashboardService.getSupervisorDashboard(
      authStore.user.id,
      periodParam,
      start,
      end
    )
    dashboardData.value = response.data
  } catch (error) {
    console.error('Erro ao carregar dashboard:', error)
  } finally {
    loading.value = false
  }
}

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

const logout = () => {
  authStore.logout()
  router.push('/login')
}

const loadPeriods = async () => {
  try {
    const response = await goalsService.getGoalPeriods(authStore.user.id)
    periods.value = response.data
    if (periods.value.length && !selectedPeriod.value) {
      selectedPeriod.value = periods.value[0]
    }
  } catch (error) {
    console.error('Erro ao carregar períodos de metas:', error)
  }
}

const formatPeriodLabel = (p) => {
  const [y, m] = p.split('-')
  const date = new Date(y, Number(m) - 1, 1)
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

onMounted(async () => {
  authStore.initializeAuth()
  await loadPeriods()
  loadDashboard()
})
</script>