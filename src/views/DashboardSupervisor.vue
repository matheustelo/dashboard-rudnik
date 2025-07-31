<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white shadow">
      <div class="custom-max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center py-6">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">Dashboard Supervisor</h1>
            <p class="text-gray-600">Bem-vindo, {{ authStore.user?.name }}</p>
          </div>
          <div class="flex items-center space-x-4">
            <Navbar />
            <button @click="logout" class="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700">Sair</button>
          </div>
        </div>
      </div>
    </header>

    <main class="custom-max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div class="bg-white shadow rounded-lg p-4 mb-6 flex items-center justify-between space-x-4">
        <div class="flex items-center space-x-4">
          <h3 class="text-md font-medium text-gray-700">Filtros:</h3>
          <select v-model="filters.period" @change="loadDashboard" class="border border-gray-300 rounded-md px-3 py-2 text-sm">
            <option v-for="p in periods" :key="p" :value="p">{{ formatPeriodLabel(p) }}</option>
            <option value="">Período Personalizado</option>
          </select>
        </div>
        <div class="flex items-center space-x-2">
          <input v-model="filters.startDate" type="date" @change="loadDashboard" :disabled="!!filters.period" class="border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100" />
          <span class="text-gray-500">até</span>
          <input v-model="filters.endDate" type="date" @change="loadDashboard" :disabled="!!filters.period" class="border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100" />
        </div>
      </div>
      <div v-if="loading" class="text-center py-12">
        <div class="text-lg">Carregando dashboard...</div>
      </div>

      <div v-else-if="dashboardData" class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">Faturamento Total</dt>
                    <dd class="text-2xl font-semibold text-gray-900">{{ formatCurrency(kpis.faturamentoTotal) }}</dd>
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
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">Total de Vendas</dt>
                    <dd class="text-2xl font-semibold text-gray-900">{{ kpis.totalVendas }}
                      <span class="block text-sm font-normal text-gray-500">{{ formatCurrency(kpis.faturamentoTotal) }}</span>
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
                  <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">Total de Propostas</dt>
                    <dd class="text-2xl font-semibold text-gray-900">{{ kpis.totalPropostas }}</dd>
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
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">Taxa de Conversão</dt>
                    <dd class="text-2xl font-semibold text-gray-900">{{ kpis.taxaConversao.toFixed(1) }}%
                      <span class="block text-sm font-normal text-gray-500">{{ formatCurrency(kpis.ticketMedio) }}</span>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="bg-white shadow rounded-lg p-4">
            <BarChart v-if="chartData" :data="chartData" :options="chartOptions" />
          </div>
          <div class="bg-white shadow rounded-lg">
            <div class="px-4 py-5 sm:p-6">
              <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">Ranking de Vendedores</h3>
              <div class="overflow-hidden">
                <table class="min-w-full divide-y divide-gray-200">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Posição</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendedor</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Propostas</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendas</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Faturamento</th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    <tr v-for="(vendedor, index) in dashboardData.rankingVendedores" :key="vendedor.id" :class="index < 3 ? 'bg-yellow-50' : ''">
                      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <span v-if="index === 0" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">🥇 1º</span>
                        <span v-else-if="index === 1" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">🥈 2º</span>
                        <span v-else-if="index === 2" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">🥉 3º</span>
                        <span v-else class="text-gray-500">{{ index + 1 }}º</span>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ vendedor.name }}</td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ vendedor.propostas }}</td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ vendedor.vendas }}</td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">R$ {{ formatCurrency(vendedor.faturamento) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, watch, computed } from 'vue'
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

const filters = reactive({
  period: '',
  startDate: '',
  endDate: ''
})

watch(() => filters.period, (newPeriod) => {
  if (newPeriod) {
    filters.startDate = ''
    filters.endDate = ''
  }
})

const loadDashboard = async () => {
  loading.value = true
  try {
    const periodParam = filters.period || undefined
    const start = filters.period ? undefined : filters.startDate || undefined
    const end = filters.period ? undefined : filters.endDate || undefined
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

const loadPeriods = async () => {
  try {
    const response = await goalsService.getGoalPeriods(authStore.user.id)
    periods.value = response.data
    if (periods.value.length && !filters.period) {
      filters.period = periods.value[0]
    }
  } catch (error) {
    console.error('Erro ao carregar períodos de metas:', error)
  }
}

const kpis = computed(() => {
  const resumo = dashboardData.value?.resumo || {}
  const totalPropostas = resumo.totalPropostas || 0
  const totalVendas = resumo.propostasConvertidas || 0
  const faturamentoTotal = resumo.faturamentoTotal || 0
  const taxaConversao = totalPropostas ? (totalVendas / totalPropostas) * 100 : 0
  const ticketMedio = totalVendas ? faturamentoTotal / totalVendas : 0
  return { totalPropostas, totalVendas, faturamentoTotal, taxaConversao, ticketMedio }
})

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

<style>
.custom-max-w-7xl {
  max-width: 100rem;
}
</style>