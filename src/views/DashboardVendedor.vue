<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center py-6">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">Dashboard Vendedor</h1>
            <p class="text-gray-600">Bem-vindo, {{ authStore.user?.name }}</p>
          </div>
          <div class="flex items-center space-x-4">
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
              :disabled="!!selectedPeriod"
              class="border border-gray-300 rounded-md px-2 py-1"
              @change="loadDashboard"
            />
            <span class="text-gray-500">até</span>
            <input
              type="date"
              v-model="customEnd"
              :disabled="!!selectedPeriod"
              class="border border-gray-300 rounded-md px-2 py-1"
              @change="loadDashboard"
            />
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
        <!-- KPIs -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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
                      Total Propostas
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
                      Vendas
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
                    <span class="text-white text-sm font-bold">%</span>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">
                      Taxa Conversão
                    </dt>
                    <dd class="text-lg font-medium text-gray-900">
                      {{ dashboardData.resumo.taxaConversao }}%
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
                  <div class="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                    <span class="text-white text-sm font-bold">R$</span>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">
                      Faturamento
                    </dt>
                    <dd class="text-lg font-medium text-gray-900">
                      R$ {{ formatCurrency(dashboardData.resumo.faturamentoTotal) }}
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
                  <div class="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                    <span class="text-white text-sm font-bold">T</span>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">
                      Ticket Médio
                    </dt>
                    <dd class="text-lg font-medium text-gray-900">
                      R$ {{ formatCurrency(dashboardData.resumo.ticketMedio) }}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Charts -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Goals Chart -->
          <GoalsChart :goals="goalsData" />

          <!-- Monthly Sales Chart -->
          <div class="bg-white p-6 rounded-lg shadow">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Vendas Mensais</h3>
            <BarChart
              v-if="chartData.vendasMensais"
              :data="chartData.vendasMensais"
              :options="chartOptions.bar"
            />
          </div>
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
import GoalsChart from '../components/GoalsChart.vue'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(true)
const dashboardData = ref(null)
const goalsData = ref([])
const periods = ref([])
const selectedPeriod = ref('')
const customStart = ref('')
const customEnd = ref('')

const chartData = computed(() => {
  if (!dashboardData.value) return {}

  const vendasLabels = dashboardData.value.vendasMensais?.map(item => 
    new Date(item.mes).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
  ) || []

  return {
    vendasMensais: {
      labels: vendasLabels,
      datasets: [{
        label: 'Vendas',
        data: dashboardData.value.vendasMensais?.map(item => item.vendas) || [],
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 1
      }, {
        label: 'Propostas',
        data: dashboardData.value.vendasMensais?.map(item => item.totalPropostas) || [],
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1
      }]
    }
  }
})

const chartOptions = {
  bar: {
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
}

const loadDashboard = async () => {
  loading.value = true
  try {
    const periodParam = selectedPeriod.value ? selectedPeriod.value : undefined
    const start = selectedPeriod.value ? undefined : customStart.value || undefined
    const end = selectedPeriod.value ? undefined : customEnd.value || undefined
    const [dashboardResponse, goalsResponse] = await Promise.all([
      dashboardService.getVendedorDashboard(authStore.user.id, periodParam, start, end),
      goalsService.getSellerTracking(authStore.user.id, periodParam, start, end)
    ])
    
    dashboardData.value = dashboardResponse.data
    goalsData.value = goalsResponse.data
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
