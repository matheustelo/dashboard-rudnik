<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white shadow">
      <div class="custom-max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center py-6">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">Dashboard Representante</h1>
            <p class="text-gray-600">Bem-vindo, {{ authStore.user?.name }}</p>
          </div>
          <div class="flex items-center space-x-4">
            <button @click="logout" class="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700">
              Sair
            </button>
          </div>
        </div>
      </div>
    </header>

    <main class="custom-max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <!-- Filters -->
      <div class="bg-white shadow rounded-lg p-4 mb-6 flex items-center space-x-4">
        <select v-model="selectedPeriod" @change="loadDashboard"
          class="border border-gray-300 rounded-md px-3 py-2 text-sm">
          <option v-for="p in periods" :key="p" :value="p">
            {{ formatPeriodLabel(p) }}
          </option>
          <option value="">Período Personalizado</option>
        </select>
        <input type="date" v-model="customStart" :disabled="selectedPeriod"
          class="border border-gray-300 rounded-md px-2 py-1" @change="loadDashboard" />
        <span class="text-gray-500">até</span>
        <input type="date" v-model="customEnd" :disabled="selectedPeriod"
          class="border border-gray-300 rounded-md px-2 py-1" @change="loadDashboard" />
      </div>

      <!-- KPIs -->
      <div v-if="dashboardData" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
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
                  <dt class="text-sm font-medium text-gray-500 truncate">Total Propostas</dt>
                  <dd class="text-lg font-medium text-gray-900">{{ dashboardData.resumo.totalPropostas }}</dd>
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
                  <dt class="text-sm font-medium text-gray-500 truncate">Vendas</dt>
                  <dd class="text-lg font-medium text-gray-900">{{ dashboardData.resumo.propostasConvertidas }}</dd>
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
                  <dt class="text-sm font-medium text-gray-500 truncate">Taxa Conversão</dt>
                  <dd class="text-lg font-medium text-gray-900">{{ dashboardData.resumo.taxaConversao }}%</dd>
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
                  <dt class="text-sm font-medium text-gray-500 truncate">Faturamento</dt>
                  <dd class="text-lg font-medium text-gray-900">R$ {{
                    formatCurrency(dashboardData.resumo.faturamentoTotal) }}</dd>
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
                  <dt class="text-sm font-medium text-gray-500 truncate">Ticket Médio</dt>
                  <dd class="text-lg font-medium text-gray-900">R$ {{ formatCurrency(dashboardData.resumo.ticketMedio)
                    }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="loading" class="text-center py-12">
        <div class="text-lg">Carregando dashboard...</div>
      </div>
      <div v-else class="space-y-6">

                        <!-- Proposal Metrics -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">Propostas Convertidas</dt>
                    <dd class="text-2xl font-semibold text-gray-900">{{ proposalMetrics.convertidas }}</dd>
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
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M8 9l3 3-3 3m5-6l3 3-3 3" />
                    </svg>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">Pedidos em Negociação</dt>
                    <dd class="text-2xl font-semibold text-gray-900">{{ proposalMetrics.emNegociacao }}</dd>
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
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M9 17v-2a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2zM7 7h10" />
                    </svg>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">Pedidos Fechados</dt>
                    <dd class="text-2xl font-semibold text-gray-900">{{ proposalMetrics.fechadas }}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">Pedidos Cancelados</dt>
                    <dd class="text-2xl font-semibold text-gray-900">{{ proposalMetrics.canceladas }}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Goals Chart -->
          <GoalsChart :goals="teamGoals" :summary="teamSummary" />

          <!-- Monthly Sales Chart -->
          <div class="bg-white p-6 rounded-lg shadow">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Vendas Mensais</h3>
            <BarChart v-if="chartData.vendasMensais" :data="chartData.vendasMensais" :options="chartOptions.bar" />
          </div>
        </div>

        <!-- Detailed Propostas Table -->
        <div class="bg-white shadow rounded-lg">
          <div class="px-4 py-5 sm:p-6">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Propostas Detalhadas</h3>
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefone
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr v-for="p in proposals" :key="p.id">
                    <td class="px-6 py-4 whitespace-normal break-words text-sm font-medium text-gray-900">{{
                      p.clientName + ' #' + p.id }}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ formatPhone(p.clientPhone) }}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">R$ {{ formatCurrency(p.totalPrice) }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span
                        :class="p.hasGeneratedSale ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'"
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">{{ p.status
                        }}</span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatDate(p.createdAt) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { dashboardService, goalsService, userService, performanceService } from '../services/api'
import BarChart from '../components/BarChart.vue'
import GoalsChart from '../components/GoalsChart.vue'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(true)

const dashboardData = ref(null)
const goalsData = ref({ goals: [], summary: null })
const teamSummary = ref(null)
const teamGoals = ref([])
const periods = ref([])

const selectedPeriod = ref('')
const customStart = ref('')
const customEnd = ref('')

const proposalMetrics = ref({
  convertidas: 0,
  emNegociacao: 0,
  fechadas: 0,
  canceladas: 0,
})
const proposals = ref([])

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
      dashboardService.getRepresentanteDashboard(
        authStore.user.id,
        periodParam,
        start,
        end
      ),
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

const loadProposalMetrics = async () => {
  try {
    const params = {}
    if (selectedPeriod.value) params.period = selectedPeriod.value
    else {
      if (customStart.value) params.startDate = customStart.value
      if (customEnd.value) params.endDate = customEnd.value
    }
    params.supervisorId = authStore.user.id
    const { data } = await dashboardService.getProposalMetrics(params)
    proposalMetrics.value = data
  } catch (error) {
    console.error('Erro ao carregar métricas de propostas:', error)
  }
}

const loadProposals = async () => {
  try {
    const params = {}
    if (selectedPeriod.value) params.period = selectedPeriod.value
    else {
      if (customStart.value) params.startDate = customStart.value
      if (customEnd.value) params.endDate = customEnd.value
    }
    const { data } = await performanceService.getRepresentativeDetails(
      authStore.user.id,
      params
    )
    proposals.value = Array.isArray(data.proposals) ? data.proposals : []
  } catch (error) {
    console.error('Erro ao carregar propostas:', error)
    proposals.value = []
  }
}

const loadTeamGoals = async () => {
  try {
    const userRes = await userService.getUser(authStore.user.id)
    const sup =
      userRes.data.supervisor ||
      (Array.isArray(userRes.data.supervisors) && userRes.data.supervisors.length
        ? userRes.data.supervisors[0].id || userRes.data.supervisors[0]
        : null)

    if (!sup) {
      teamGoals.value = []
      teamSummary.value = null
      return
    }

    const params = {}
    if (selectedPeriod.value) params.period = selectedPeriod.value
    else {
      if (customStart.value) params.startDate = customStart.value
      if (customEnd.value) params.endDate = customEnd.value
    }

    const { data } = await goalsService.getTeamGoals(sup, params)
    teamGoals.value = Array.isArray(data) ? data : []
    const totalTarget = teamGoals.value.reduce(
      (s, g) => s + parseFloat(g.valor_meta),
      0
    )
    const totalAchieved = teamGoals.value.reduce(
      (s, g) => s + (g.achieved || 0),
      0
    )
    teamSummary.value = {
      target: totalTarget,
      achieved: totalAchieved,
      progress: totalTarget > 0 ? (totalAchieved / totalTarget) * 100 : 0,
    }
  } catch (error) {
    console.error('Erro ao carregar metas da equipe:', error)
    teamGoals.value = []
    teamSummary.value = null
  }
}

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('pt-BR')
}

const formatPhone = (phone) => {
  if (!phone) return ''
  const clean = phone.replace(/[^\d]/g, '')
  if (clean.length === 10) {
    return clean.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  }
  if (clean.length === 11) {
    return clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }
  return phone
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

watch(
  [selectedPeriod, customStart, customEnd],
  () => {
    loadDashboard()
    loadTeamGoals()
    loadProposalMetrics()
    loadProposals()
  }
)

onMounted(async () => {
  authStore.initializeAuth()
  await loadPeriods()
  loadDashboard()
  loadTeamGoals()
  loadProposalMetrics()
  loadProposals()
})
</script>
<style>
.custom-max-w-7xl {
  max-width: 100rem;
}
</style>
