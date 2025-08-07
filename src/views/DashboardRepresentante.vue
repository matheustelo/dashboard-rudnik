<template>
  <div class="min-h-screen bg-gray-50">
    <!-- ================= HEADER ================= -->
    <header class="bg-white shadow">
      <div class="custom-max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center py-6">
          <!-- Título e boas-vindas -->
          <div>
            <h1 class="text-3xl font-bold text-gray-900">
              Dashboard Representante
            </h1>
            <p class="text-gray-600">
              Bem-vindo, {{ authStore.user?.name }}
            </p>
          </div>

          <!-- Botão de logout -->
          <div class="flex items-center space-x-4">
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

    <!-- ================= MAIN ================= -->
    <main class="custom-max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <!-- ---------- FILTROS ---------- -->
      <div class="bg-white shadow rounded-lg p-4 mb-6 flex items-center space-x-4">
        <!-- Período -->
        <select
          v-model="selectedPeriod"
          @change="handlePeriodChange"
          class="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option v-for="p in periods" :key="p" :value="p">
            {{ formatPeriodLabel(p) }}
          </option>
          <option value="">Período Personalizado</option>
        </select>

        <!-- Datas personalizadas -->
        <input
          type="date"
          v-model="customStart"
          :disabled="!!selectedPeriod"
          @change="loadDashboard"
          class="border border-gray-300 rounded-md px-2 py-1"
        />
        <span class="text-gray-500">até</span>
        <input
          type="date"
          v-model="customEnd"
          :disabled="!!selectedPeriod"
          @change="loadDashboard"
          class="border border-gray-300 rounded-md px-2 py-1"
        />
      </div>

      <!-- ---------- KPIs ---------- -->
      <div
        v-if="dashboardData"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6"
      >
        <!-- Total de Propostas -->
        <DashboardCard
          title="Total de Propostas"
          :value="dashboardData.resumo.totalPropostas || 0"
          icon-bg="bg-blue-500"
        >
          <template #icon>
            <svg
              class="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2
                   2 0 01-2-2V5a2 2 0 012-2h5.586a1
                   1 0 01.707.293l5.414 5.414a1 1
                   0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </template>
        </DashboardCard>

        <!-- Propostas Unitárias -->
        <DashboardCard
          title="Propostas Unitárias"
          :value="proposalMetrics.unitarias"
          :sub-value="formatCurrency(proposalMetrics.valorUnitarias)"
          :progress="proposalProgress"
          progress-color="bg-green-600"
          :footer-text="proposalProgress.toFixed(1) + '% de ' + (proposalGoal.target || 0)"
          icon-bg="bg-green-600"
        >
          <template #icon>
            <svg
              class="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </template>
        </DashboardCard>

        <!-- Propostas Convertidas -->
        <DashboardCard
          title="Total de Propostas"
          :value="dashboardData.resumo.propostasConvertidas || 0"
          :sub-value="formatCurrency(dashboardData.resumo.faturamentoTotal || 0)"
          icon-bg="bg-green-500"
        >
          <template #icon>
            <svg
              class="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 7h8m0 0v8m0-8l-8
                   8-4-4-6 6"
              />
            </svg>
          </template>
        </DashboardCard>

        <!-- Pendentes de Assinatura -->
        <DashboardCard
          title="Pendentes de Assinatura"
          :value="proposalMetrics.emNegociacao"
          :sub-value="formatCurrency(proposalMetrics.valorEmNegociacao)"
          icon-bg="bg-yellow-500"
        >
          <template #icon>
            <svg
              class="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 9l3 3-3 3m5-6l3 3-3 3"
              />
            </svg>
          </template>
        </DashboardCard>

        <!-- Contratos Assinados -->
        <DashboardCard
          title="Contratos Assinados"
          :value="proposalMetrics.fechadas"
          :sub-value="formatCurrency(proposalMetrics.valorFechadas)"
          icon-bg="bg-blue-500"
        >
          <template #icon>
            <svg
              class="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 17v-2a2 2 0 012-2h2a2
                   2 0 012 2v2a2 2 0 01-2 2h-2a2
                   2 0 01-2-2zM7 7h10"
              />
            </svg>
          </template>
        </DashboardCard>

        <!-- Pedidos Cancelados -->
        <DashboardCard
          title="Pedidos Cancelados"
          :value="proposalMetrics.canceladas"
          :sub-value="'(' + formatCurrency(proposalMetrics.valorCanceladas) + ')'"
          icon-bg="bg-red-500"
        >
          <template #icon>
            <svg
              class="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </template>
        </DashboardCard>

        <!-- Taxa de Conversão -->
        <DashboardCard
          title="Taxa de Conversão"
          :value="conversionRate.toFixed(1) + '%'"
          :sub-value="'Ticket Médio: ' + formatCurrency(dashboardData.resumo.ticketMedio || 0)"
          :progress="conversionProgress"
          :progress-color="conversionProgressColor"
          :footer-text="'Meta: ' + (conversionGoal.target || 0) + '%'"
          icon-bg="bg-purple-500"
        >
          <template #icon>
            <svg
              class="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M7 12l3-3 3 3 4-4M8
                   21l4-4 4 4M3 4h18M4 4h16v12a1
                   1 0 01-1 1H5a1 1 0 01-1-1V4z"
              />
            </svg>
          </template>
        </DashboardCard>

        <!-- Vendas Válidadas -->
        <DashboardCard
          title="Vendas Válidadas"
          value-class="flex items-baseline"
          :progress="vendasValidasProgress"
          progress-color="bg-indigo-600"
          :footer-text="'Meta: ' + formatCurrency(revenueGoal.target || 0)"
          icon-bg="bg-indigo-500"
        >
          <template #icon>
            <svg
              class="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 19v-6a2 2 0
                   00-2-2H5a2 2 0
                   00-2 2v6a2 2 0
                   002 2h2a2 2 0
                   002-2zm0 0V9a2
                   2 0 012-2h2a2 2
                   0 012 2v10m-6 0a2
                   2 0 002 2h2a2 2 0
                   00-2-2m0 0V5a2 2
                   0 012-2h2a2 2 0
                   012 2v14a2 2 0
                   01-2 2h-2a2 2 0
                   01-2-2z"
              />
            </svg>
          </template>
          <template #value>
            <div class="text-2xl font-semibold text-gray-900">
              {{ formatCurrency(proposalMetrics.valorFechadas || 0) }}
            </div>
            <div
              class="ml-2 flex items-baseline text-sm font-semibold"
              :class="vendasValidasProgress >= 100 ? 'text-green-600' : 'text-yellow-600'"
            >
              {{ vendasValidasProgress.toFixed(1) }}% da meta
            </div>
          </template>
        </DashboardCard>
      </div>

      <!-- ---------- LOADING ---------- -->
      <div v-if="loading" class="text-center py-12">
        <div class="text-lg">Carregando dashboard...</div>
      </div>

      <!-- ---------- GRÁFICOS ---------- -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GoalsChart :goals="goalsData.goals" :summary="goalsData.summary" />

        <div class="bg-white p-6 rounded-lg shadow">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Vendas Mensais</h3>
          <BarChart
            v-if="chartData.vendasMensais"
            :data="chartData.vendasMensais"
            :options="chartOptions.bar"
          />
        </div>
      </div>

      <!-- ---------- TABELA DE PROPOSTAS ---------- -->
      <div class="bg-white shadow rounded-lg mt-6">
        <div class="px-4 py-5 sm:p-6">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Propostas Detalhadas</h3>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Telefone
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="p in proposals" :key="p.id">
                  <td class="px-6 py-4 whitespace-normal break-words text-sm font-medium text-gray-900">
                    {{ p.clientName + ' #' + p.id }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {{ formatPhone(p.clientPhone) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    R$ {{ formatCurrency(p.totalPrice) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span
                      :class="p.hasGeneratedSale ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'"
                      class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    >
                      {{ p.status }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ formatDate(p.createdAt) }}
                  </td>
                </tr>
              </tbody>
            </table>
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
import { dashboardService, goalsService, performanceService } from '../services/api'
import BarChart from '../components/BarChart.vue'
import GoalsChart from '../components/GoalsChart.vue'
import DashboardCard from '../components/DashboardCard.vue'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(true)

const dashboardData = ref(null)
const goalsData = ref({ goals: [], summary: null })
const periods = ref([])

const selectedPeriod = ref('')
const customStart = ref('')
const customEnd = ref('')

const proposalMetrics = ref({
  convertidas: 0,
  emNegociacao: 0,
  valorEmNegociacao: 0,
  fechadas: 0,
  valorFechadas: 0,
  canceladas: 0,
  valorCanceladas: 0,
  unitarias: 0,
  valorUnitarias: 0,
})
const proposals = ref([])

const proposalGoal = computed(() => {
  const goals = goalsData.value.goals.filter(g => g.tipo_meta === 'propostas')
  const target = goals.reduce((sum, g) => sum + parseFloat(g.valor_meta || 0), 0)
  return { target }
})

const proposalProgress = computed(() => {
  const meta = proposalGoal.value.target
  if (!meta) return 0
  return (proposalMetrics.value.unitarias / meta) * 100
})

const conversionRate = computed(() => {
  const totalVendas = dashboardData.value?.indicadores?.totalVendas || 0
  const { unitarias } = proposalMetrics.value
  if (!unitarias) return 0
  return (totalVendas / unitarias) * 100
})

const conversionGoal = computed(() => {
  const goals = goalsData.value.goals.filter(g => g.tipo_meta === 'taxa_conversao')
  const target = goals.reduce((sum, g) => sum + parseFloat(g.valor_meta || 0), 0)
  return { target }
})

const conversionProgress = computed(() => {
  const meta = conversionGoal.value.target
  if (!meta) return 0
  return (conversionRate.value / meta) * 100
})

const conversionProgressColor = computed(() => {
  const progress = conversionProgress.value
  if (progress >= 100) return 'bg-green-600'
  if (progress >= 75) return 'bg-yellow-600'
  return 'bg-red-600'
})

const revenueGoal = computed(() => {
  const goals = goalsData.value.goals.filter(g => g.tipo_meta === 'faturamento')
  const target = goals.reduce((sum, g) => sum + parseFloat(g.valor_meta || 0), 0)
  return { target }
})

const vendasValidasProgress = computed(() => {
  const meta = revenueGoal.value.target
  if (!meta) return 0
  return (proposalMetrics.value.valorFechadas / meta) * 100
})

const teamTicketMedio = computed(() => {
  const totalVendas = dashboardData.value?.indicadores?.totalVendas || 0
  const { valorUnitarias } = proposalMetrics.value
  if (!valorUnitarias) return 0
  return valorUnitarias / totalVendas
})
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

    const userGoals = Array.isArray(goalsResponse.data.goals)
      ? goalsResponse.data.goals.filter(
        g => g.isIndividual || g.usuario_id === authStore.user.id
      )
      : []

    const targetSum = userGoals.reduce(
      (sum, g) => sum + parseFloat(g.valor_meta || 0),
      0
    )
    const achievedSum = userGoals.reduce(
      (sum, g) => sum + parseFloat(g.achieved || 0),
      0
    )

    goalsData.value = {
      goals: userGoals,
      summary: {
        target: targetSum,
        achieved: achievedSum,
        progress: targetSum > 0 ? (achievedSum / targetSum) * 100 : 0
      }
    }
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
    params.sellerId = authStore.user.id
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
    loadProposalMetrics()
    loadProposals()
  }
)

onMounted(async () => {
  authStore.initializeAuth()
  await loadPeriods()
  loadDashboard()
  loadProposalMetrics()
  loadProposals()
})
</script>
<style>
.custom-max-w-7xl {
  max-width: 100rem;
}
</style>
