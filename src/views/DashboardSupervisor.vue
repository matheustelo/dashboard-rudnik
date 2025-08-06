<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white shadow">
      <div class="custom-max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center py-6">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">{{ dashboardTitle }}</h1>
            <p class="text-gray-600">Bem-vindo, {{ authStore.user?.name }}</p>
          </div>
          <div class="flex items-center space-x-4">
            <router-link to="/dashboard/team-goals-history"
              class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium">
              Histórico de Metas
            </router-link>
            <button @click="logout" class="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700">Sair</button>
          </div>
        </div>
      </div>
    </header>

    <main class="custom-max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <!-- Filters -->
      <div class="bg-white shadow rounded-lg p-4 mb-6 flex items-center justify-between space-x-4">
        <div class="flex items-center space-x-4">
          <h3 class="text-md font-medium text-gray-700">Filtros:</h3>
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
      <div v-if="dashboardData" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <!-- Total de Propostas -->
        <DashboardCard
          title="Total de Propostas"
          :value="dashboardData.resumo.totalPropostas || 0"
          icon-bg="bg-blue-500"
        >
          <template #icon>
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
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
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </template>
        </DashboardCard>

        <!-- Propostas Convertidas -->
        <DashboardCard
          title="Propostas Convertidas"
          :value="dashboardData.resumo.propostasConvertidas || 0"
          :sub-value="formatCurrency(dashboardData.resumo.faturamentoTotal || 0)"
          icon-bg="bg-green-500"
        >
          <template #icon>
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          </template>
        </DashboardCard>
       
        <!-- Pendentes de Assinatura -->
        <DashboardCard
          title="Pendentes de Assinatura"
          :value="proposalMetrics.emNegociacao"
          icon-bg="bg-yellow-500"
        >
          <template #icon>
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          icon-bg="bg-blue-500"
        >
          <template #icon>
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 17v-2a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2zM7 7h10"
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
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </template>
        </DashboardCard>

        <!-- Taxa de Conversão -->
        <DashboardCard
          title="Taxa de Conversão"
          :value="(dashboardData.resumo.taxaConversao || 0) + '%'"
          :sub-value="'Ticket Médio: ' + formatCurrency(dashboardData.resumo.ticketMedio || 0)"
          :progress="salesProgress"
          progress-color="bg-purple-600"
          :footer-text="salesProgress.toFixed(1) + '% da meta'"
          icon-bg="bg-purple-500"
        >
          <template #icon>
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
              />
            </svg>
          </template>
        </DashboardCard>

        <!-- Vendas Válidas -->
        <DashboardCard
          title="Vendas Válidadas"
          value-class="flex items-baseline"
          :progress="vendasValidasProgress"
          progress-color="bg-indigo-600"
          :footer-text="'Meta: ' + formatCurrency(revenueGoal.target || 0)"
          icon-bg="bg-indigo-500"
        >
          <template #icon>
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
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
            <BarChart :data="revenueByMemberChartData" :options="barChartOptions" />
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
import { dashboardService, performanceService, goalsService } from '../services/api'
import DashboardCard from '../components/DashboardCard.vue'
import PerformanceTable from '../components/PerformanceTable.vue'
import RepresentativeDetailModal from '../components/RepresentativeDetailModal.vue'
import LineChart from '../components/LineChart.vue'
import BarChart from '../components/BarChart.vue'

const router = useRouter()
const authStore = useAuthStore()

const dashboardTitle = computed(() => {
  switch (authStore.user?.role) {
    case 'parceiro_comercial':
      return 'Dashboard Parceiro Comercial'
    case 'representante_premium':
      return 'Dashboard Representante Premium'
    default:
      return 'Dashboard Supervisor'
  }
})

const loading = ref(true)
const dashboardData = ref(null)
const teamPerformance = ref(null)
const revenueVsTarget = ref([])
const proposalMetrics = ref({
  emNegociacao: 0,
  fechadas: 0,
  canceladas: 0,
  valorCanceladas: 0,
  valorFechadas: 0,
  unitarias: 0,
  valorUnitarias: 0,
})

const goalsData = ref({ goals: [] })

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

const salesGoal = computed(() => {
  const goals = goalsData.value.goals.filter(g => g.tipo_meta === 'vendas')
  const target = goals.reduce((sum, g) => sum + parseFloat(g.valor_meta || 0), 0)
  return { target }
})

const salesProgress = computed(() => {
  const meta = salesGoal.value.target
  if (!meta) return 0
  return (proposalMetrics.value.fechadas / meta) * 100
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

const showDetailModal = ref(false)
const selectedRepresentative = ref(null)
const representativeDetails = ref(null)
const detailLoading = ref(false)

const periods = ref([])

const filters = reactive({
  period: '',
  startDate: '',
  endDate: '',
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
    const supervisorFilters = { ...filters, supervisorId: authStore.user.id }
    const [dashboardResp, perf, revVsTarget, metrics, goalsResp] = await Promise.all([
      dashboardService.getSupervisorDashboard(
        authStore.user.id,
        filters.period || undefined,
        filters.startDate || undefined,
        filters.endDate || undefined
      ),
      performanceService.getTeamPerformance(supervisorFilters),
      dashboardService.getRevenueVsTarget(supervisorFilters),
      dashboardService.getProposalMetrics(supervisorFilters),
      goalsService.getGoals(
        filters.period || undefined,
        filters.startDate || undefined,
        filters.endDate || undefined
      ),
    ])
    dashboardData.value = dashboardResp.data
    teamPerformance.value = perf.data
    revenueVsTarget.value = revVsTarget.data
    proposalMetrics.value = metrics.data
    goalsData.value = { goals: goalsResp.data?.generalGoals || [] }
  } catch (error) {
    console.error('Erro ao aplicar filtros:', error)
  } finally {
    loading.value = false
  }
}

const loadInitialData = async () => {
  loading.value = true
  try {
    const supervisorFilters = { ...filters, supervisorId: authStore.user.id }
    const [dashboardResp, perf, revVsTarget, metrics, goalsResp] = await Promise.all([
      dashboardService.getSupervisorDashboard(
        authStore.user.id,
        filters.period || undefined,
        filters.startDate || undefined,
        filters.endDate || undefined
      ),
      performanceService.getTeamPerformance(supervisorFilters),
      dashboardService.getRevenueVsTarget(supervisorFilters),
      dashboardService.getProposalMetrics(supervisorFilters),
      goalsService.getGoals(
        filters.period || undefined,
        filters.startDate || undefined,
        filters.endDate || undefined
      ),
    ])
    dashboardData.value = dashboardResp.data
    teamPerformance.value = perf.data
    revenueVsTarget.value = revVsTarget.data
    proposalMetrics.value = metrics.data
    goalsData.value = { goals: goalsResp.data?.generalGoals || [] }
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

const revenueByMemberChartData = computed(() => {
  if (!teamPerformance.value) return { labels: [], datasets: [] }

  const sorted = [...teamPerformance.value.teamMembers]
    .sort((a, b) => b.performance.faturamentoTotal - a.performance.faturamentoTotal)
    .slice(0, 10)
      
  return {
    labels: sorted.map(m => m.name),
    datasets: [{
      label: 'Faturamento por Membro',
      data: sorted.map(m => m.performance.faturamentoTotal),
      backgroundColor: '#10B981'
    }]
   }
})

const lineChartOptions = { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Faturamento Mensal vs. Meta' } } }
const barChartOptions = { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Faturamento por Membro de Equipe' } } }

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