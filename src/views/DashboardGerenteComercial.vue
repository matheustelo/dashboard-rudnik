<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Dashboard Gerente Comercial</h1>
        <p class="mt-2 text-gray-600">Visão geral da performance comercial e gestão de equipes</p>
      </div>

      <!-- Filters -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Filtros</h3>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <!-- Period Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Período</label>
            <select 
              v-model="filters.period" 
              @change="applyFilters"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Selecione o período</option>
              <option v-for="period in availablePeriods" :key="period.value" :value="period.value">
                {{ period.label }}
              </option>
            </select>
          </div>

          <!-- Start Date Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Data Início</label>
            <input 
              type="date" 
              v-model="filters.startDate" 
              @change="applyFilters"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <!-- End Date Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Data Fim</label>
            <input 
              type="date" 
              v-model="filters.endDate" 
              @change="applyFilters"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <!-- Supervisor Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Supervisor/Parceiro</label>
            <select 
              v-model="filters.supervisor" 
              @change="applyFilters"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Todos</option>
              <option v-for="supervisor in supervisors" :key="supervisor.id" :value="supervisor.id">
                {{ supervisor.name }} ({{ supervisor.role }})
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center items-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>

      <!-- Main Content -->
      <div v-else class="space-y-8">
        <!-- KPI Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                  <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Total Propostas</dt>
                  <dd class="text-lg font-medium text-gray-900">{{ teamStats?.totalPropostas || 0 }}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                  <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Vendas Convertidas</dt>
                  <dd class="text-lg font-medium text-gray-900">{{ teamStats?.totalConvertidas || 0 }}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                  <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Faturamento Total</dt>
                  <dd class="text-lg font-medium text-gray-900">{{ formatCurrency(teamStats?.totalFaturamento || 0) }}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                  <svg class="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Taxa Conversão</dt>
                  <dd class="text-lg font-medium text-gray-900">{{ teamStats?.teamConversionRate?.toFixed(1) || 0 }}%</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <!-- Charts Row -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <!-- Revenue vs Target Chart -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Faturamento vs Meta</h3>
            <div class="h-80">
              <LineChart v-if="revenueVsTargetData" :data="revenueVsTargetData" :options="lineChartOptions" />
            </div>
          </div>

          <!-- Revenue by Supervisor Chart -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Faturamento por Supervisor</h3>
            <div class="h-80">
              <BarChart v-if="revenueBySupervisorData" :data="revenueBySupervisorData" :options="barChartOptions" />
            </div>
          </div>
        </div>

        <!-- Performance Table -->
        <PerformanceTable 
          v-if="teamMembers && teamMembers.length > 0"
          :team-members="teamMembers" 
          @view-details="handleViewDetails" 
        />

        <!-- Empty State -->
        <div v-else class="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">Nenhum dado encontrado</h3>
          <p class="mt-1 text-sm text-gray-500">Ajuste os filtros para visualizar os dados da equipe.</p>
        </div>
      </div>

      <!-- Representative Detail Modal -->
      <RepresentativeDetailModal
        :is-open="showDetailModal"
        :representative-id="selectedRepresentativeId"
        :filters="filters"
        @close="closeDetailModal"
      />
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { performanceService, dashboardService, teamLeaderService } from '@/services/api'
import PerformanceTable from '@/components/PerformanceTable.vue'
import RepresentativeDetailModal from '@/components/RepresentativeDetailModal.vue'
import LineChart from '@/components/LineChart.vue'
import BarChart from '@/components/BarChart.vue'

export default {
  name: 'DashboardGerenteComercial',
  components: {
    PerformanceTable,
    RepresentativeDetailModal,
    LineChart,
    BarChart
  },
  setup() {
    const authStore = useAuthStore()
    
    // Reactive data
    const loading = ref(true)
    const teamPerformanceData = ref(null)
    const revenueVsTarget = ref([])
    const revenueBySupervisor = ref([])
    const supervisors = ref([])
    const showDetailModal = ref(false)
    const selectedRepresentativeId = ref(null)

    // Filters
    const filters = reactive({
      period: '',
      startDate: '',
      endDate: '',
      supervisor: 'all'
    })

    // Available periods for dropdown
    const availablePeriods = computed(() => {
      const periods = []
      const now = new Date()
      
      for (let i = 0; i < 12; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        periods.push({
          value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
          label: date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
        })
      }
      
      return periods
    })

    // Computed properties
    const teamStats = computed(() => teamPerformanceData.value?.teamStats)
    const teamMembers = computed(() => teamPerformanceData.value?.teamMembers || [])

    const revenueVsTargetData = computed(() => {
      if (!revenueVsTarget.value || revenueVsTarget.value.length === 0) return null
      
      return {
        labels: revenueVsTarget.value.map(item => item.monthName || item.month),
        datasets: [
          {
            label: 'Faturamento Realizado',
            data: revenueVsTarget.value.map(item => item.revenue),
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: false
          },
          {
            label: 'Meta de Faturamento',
            data: revenueVsTarget.value.map(item => item.target),
            borderColor: 'rgb(245, 158, 11)',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            borderDash: [5, 5],
            tension: 0.4,
            fill: false
          }
        ]
      }
    })

    const revenueBySupervisorData = computed(() => {
      if (!revenueBySupervisor.value || revenueBySupervisor.value.length === 0) return null
      
      return {
        labels: revenueBySupervisor.value.map(item => item.supervisorName),
        datasets: [
          {
            label: 'Faturamento',
            data: revenueBySupervisor.value.map(item => item.totalRevenue),
            backgroundColor: 'rgba(16, 185, 129, 0.8)',
            borderColor: 'rgb(16, 185, 129)',
            borderWidth: 1
          }
        ]
      }
    })

    // Chart options
    const lineChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 0
              }).format(value)
            }
          }
        }
      }
    }

    const barChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 0
              }).format(value)
            }
          }
        }
      }
    }

    // Methods
    const loadInitialData = async () => {
      loading.value = true
      try {
        // Set default period to current month
        if (!filters.period) {
          const now = new Date()
          filters.period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        }

        const [supervisorsResponse] = await Promise.all([
          teamLeaderService.getTeamLeaders()
        ])

        supervisors.value = supervisorsResponse.data
        await applyFilters()
      } catch (error) {
        console.error('Error loading initial data:', error)
      } finally {
        loading.value = false
      }
    }

    const applyFilters = async () => {
      loading.value = true
      try {
        const [teamPerformance, revenueVsTargetResponse, revenueBySupervisorResponse] = await Promise.all([
          performanceService.getTeamPerformance(filters),
          dashboardService.getRevenueVsTarget(filters),
          dashboardService.getRevenueBySupervisor(filters)
        ])

        teamPerformanceData.value = teamPerformance.data
        revenueVsTarget.value = revenueVsTargetResponse.data
        revenueBySupervisor.value = revenueBySupervisorResponse.data
      } catch (error) {
        console.error('Error applying filters:', error)
      } finally {
        loading.value = false
      }
    }

    const handleViewDetails = (representativeId) => {
      selectedRepresentativeId.value = representativeId
      showDetailModal.value = true
    }

    const closeDetailModal = () => {
      showDetailModal.value = false
      selectedRepresentativeId.value = null
    }

    const formatCurrency = (value) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value || 0)
    }

    // Lifecycle
    onMounted(() => {
      loadInitialData()
    })

    return {
      // Data
      loading,
      teamStats,
      teamMembers,
      supervisors,
      showDetailModal,
      selectedRepresentativeId,
      filters,
      availablePeriods,
      revenueVsTargetData,
      revenueBySupervisorData,
      lineChartOptions,
      barChartOptions,
      
      // Methods
      applyFilters,
      handleViewDetails,
      closeDetailModal,
      formatCurrency
    }
  }
}
</script>
