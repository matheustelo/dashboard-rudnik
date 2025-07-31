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
      <div class="bg-white shadow rounded-lg p-4 mb-6 flex items-center justify-between space-x-4">
        <div class="flex items-center space-x-4">
          <h3 class="text-md font-medium text-gray-700">Filtros:</h3>
          <select v-model="filters.supervisorId" @change="applyFilters"
            class="border border-gray-300 rounded-md px-3 py-2 text-sm">
            <option value="all">Todos os Líderes</option>
            <option v-for="leader in teamLeaders" :key="leader.id" :value="leader.id">{{ leader.name }} ({{ leader.role
            }})</option>
          </select>
          <select v-model="filters.period" @change="applyFilters"
            class="border border-gray-300 rounded-md px-3 py-2 text-sm">
            <option v-for="p in periods" :key="p" :value="p">
              {{ formatPeriodLabel(p) }}
            </option>
            <option value="">Período Personalizado</option>
          </select>
        </div>
        <div class="flex items-center space-x-2">
          <input v-model="filters.startDate" type="date" @change="applyFilters" :disabled="!!filters.period"
            class="border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100" />
          <span class="text-gray-500">até</span>
          <input v-model="filters.endDate" type="date" @change="applyFilters" :disabled="!!filters.period"
            class="border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100" />
        </div>
      </div>

      <!-- KPIs Principais -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                  <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z">
                    </path>
                  </svg>
                </div>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Faturamento Total</dt>
                  <dd class="flex items-baseline">
                    <div class="text-2xl font-semibold text-gray-900">
                      {{ formatCurrency(teamPerformance?.teamStats?.totalFaturamento || 0) }}
                    </div>
                    <div class="ml-2 flex items-baseline text-sm font-semibold"
                      :class="faturamentoProgress >= 100 ? 'text-green-600' : 'text-yellow-600'">
                      {{ faturamentoProgress.toFixed(1) }}% da meta
                    </div>
                  </dd>
                  <div class="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      :style="{ width: Math.min(faturamentoProgress, 100) + '%' }"></div>
                  </div>
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
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                  </svg>
                </div>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Total de Vendas</dt>
                  <dd class="text-2xl font-semibold text-gray-900">
                    {{ teamPerformance?.teamStats?.totalConvertidas || 0 }}
                    <span class="block text-sm font-normal text-gray-500">
                      {{ formatCurrency(teamPerformance?.teamStats?.totalFaturamento || 0) }}
                    </span>
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
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z">
                    </path>
                  </svg>
                </div>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Total de Propostas</dt>
                  <dd class="text-2xl font-semibold text-gray-900">
                    {{ teamPerformance?.teamStats?.totalPropostas || 0 }}
                    <span class="block text-sm font-normal text-gray-500">
                      {{ formatCurrency(teamPerformance?.teamStats?.totalValorPropostas || 0) }}
                    </span>
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
                  <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path>
                  </svg>
                </div>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Taxa de Conversão</dt>
                  <dd class="text-2xl font-semibold text-gray-900">
                    {{ teamPerformance?.teamStats?.teamConversionRate?.toFixed(1) || 0 }}%
                    <span class="block text-sm font-normal text-gray-500">
                      {{ formatCurrency(teamTicketMedio) }}
                    </span>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <!-- Proposal Metrics -->
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
                  <dt class="text-sm font-medium text-gray-500 truncate">Pedidos Fechadas</dt>
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

      <div v-if="loading" class="text-center py-12">
        <div class="text-lg">Carregando dashboard...</div>
      </div>
      <div v-else class="space-y-6">
        <!-- KPIs and Charts -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="bg-white shadow rounded-lg p-4">
            <LineChart :data="revenueVsTargetChartData" :options="lineChartOptions" />
          </div>

          <div class="bg-white shadow rounded-lg p-4">
            <BarChart :data="revenueBySupervisorChartData" :options="barChartOptions" />
          </div>
        </div>

        <!-- Detailed Performance Table -->
        <PerformanceTable v-if="teamPerformance" :team-members="teamPerformance.teamMembers"
          @drill-down="handleDrillDown" />

        <!-- Representative Detail Modal -->
        <RepresentativeDetailModal :is-open="showDetailModal" :representative="selectedRepresentative"
          :details="representativeDetails" :loading="detailLoading" @close="closeDetailModal" />
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { dashboardService, performanceService, teamLeaderService, goalsService } from '../services/api'
import PerformanceTable from '../components/PerformanceTable.vue'
import RepresentativeDetailModal from '../components/RepresentativeDetailModal.vue'
import LineChart from '../components/LineChart.vue'
import BarChart from '../components/BarChart.vue'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(true)
const teamPerformance = ref(null)
const teamLeaders = ref([])
const revenueVsTarget = ref([])
const revenueBySupervisor = ref([])
const proposalMetrics = ref({
  convertidas: 0,
  emNegociacao: 0,
  fechadas: 0,
  canceladas: 0,
})

const showDetailModal = ref(false)
const selectedRepresentative = ref(null)
const representativeDetails = ref(null)
const detailLoading = ref(false)

const periods = ref([])

const filters = reactive({
  period: '',
  startDate: '',
  endDate: '',
  supervisorId: 'all',
})

watch(() => filters.period, (newPeriod) => {
  if (newPeriod) {
    filters.startDate = ''
    filters.endDate = ''
  }
})

const applyFilters = async () => {
  loading.value = true
  try {
    const [perf, revVsTarget, revBySup, metrics] = await Promise.all([
      performanceService.getTeamPerformance(filters),
      dashboardService.getRevenueVsTarget(filters),
      dashboardService.getRevenueBySupervisor(filters),
      dashboardService.getProposalMetrics(filters),
    ])
    teamPerformance.value = perf.data
    revenueVsTarget.value = revVsTarget.data
    revenueBySupervisor.value = revBySup.data
    proposalMetrics.value = metrics.data
  } catch (error) {
    console.error('Erro ao aplicar filtros:', error)
  } finally {
    loading.value = false
  }
}

const loadInitialData = async () => {
  loading.value = true
  try {
    const [leaders, perf, revVsTarget, revBySup, metrics] = await Promise.all([
      teamLeaderService.getTeamLeaders(),
      performanceService.getTeamPerformance(filters),
      dashboardService.getRevenueVsTarget(filters),
      dashboardService.getRevenueBySupervisor(filters),
      dashboardService.getProposalMetrics(filters),
    ])
    teamLeaders.value = leaders.data
    teamPerformance.value = perf.data
    revenueVsTarget.value = revVsTarget.data
    revenueBySupervisor.value = revBySup.data
    proposalMetrics.value = metrics.data
  } catch (error) {
    console.error('Erro ao carregar dashboard:', error)
  } finally {
    loading.value = false
  }
}

const handleDrillDown = async (representative) => {
  selectedRepresentative.value = representative
  showDetailModal.value = true
  detailLoading.value = true
  try {
    const response = await performanceService.getRepresentativeDetails(representative.id, filters)
    representativeDetails.value = response.data
  } catch (error) {
    console.error('Erro ao carregar detalhes do representante:', error)
  } finally {
    detailLoading.value = false
  }
}

const closeDetailModal = () => {
  showDetailModal.value = false
  selectedRepresentative.value = null
  representativeDetails.value = null
}

const revenueVsTargetChartData = computed(() => ({
  labels: revenueVsTarget.value.map(d => d.month),
  datasets: [
    { label: 'Faturamento Realizado', data: revenueVsTarget.value.map(d => d.revenue), borderColor: '#4F46E5', tension: 0.1, fill: false },
    { label: 'Meta de Faturamento', data: revenueVsTarget.value.map(d => d.target), borderColor: '#F59E0B', borderDash: [5, 5], tension: 0.1, fill: false },
  ],
}))

const revenueBySupervisorChartData = computed(() => ({
  labels: revenueBySupervisor.value.map(d => d.supervisorName),
  datasets: [{ label: 'Faturamento por Líder', data: revenueBySupervisor.value.map(d => d.totalRevenue), backgroundColor: '#10B981' }],
}))

const lineChartOptions = { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Faturamento Mensal vs. Meta' } } }
const barChartOptions = { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Faturamento por Líder de Equipe' } } }

const logout = () => {
  authStore.logout()
  router.push('/login')
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

const formatPeriodLabel = (p) => {
  const [y, m] = p.split('-')
  const date = new Date(y, Number(m) - 1, 1)
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

const faturamentoProgress = computed(() => {
  if (!teamPerformance.value?.teamStats) return 0
  const meta = teamPerformance.value.teamStats.totalMetaFaturamento || 150000
  const atual = teamPerformance.value.teamStats.totalFaturamento || 0
  return (atual / meta) * 100
})

const teamTicketMedio = computed(() => {
  const stats = teamPerformance.value?.teamStats
  if (!stats || !stats.totalConvertidas) return 0
  return stats.totalFaturamento / stats.totalConvertidas
})

onMounted(async () => {
  authStore.initializeAuth()
  await loadPeriods()
  loadInitialData()
})
</script>
<style>
.custom-max-w-7xl {
  max-width: 100rem;
}
</style>
