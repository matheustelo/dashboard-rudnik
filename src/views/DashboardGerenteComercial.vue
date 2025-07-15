<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center py-6">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">Dashboard Gerente Comercial</h1>
            <p class="text-gray-600">Bem-vindo, {{ authStore.user?.name }}</p>
          </div>
          <div class="flex items-center space-x-4">
            <router-link
              to="/dashboard/metas"
              class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium"
            >
              Gerenciar Metas
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

      <div v-else class="space-y-6">
        <!-- Team Overview KPIs -->
        <div v-if="teamPerformance" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span class="text-white text-sm font-bold">👥</span>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">
                      Membros da Equipe
                    </dt>
                    <dd class="text-lg font-medium text-gray-900">
                      {{ teamPerformance.teamStats.totalMembers }}
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
                    <span class="text-white text-sm font-bold">📈</span>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">
                      Taxa Conversão Média
                    </dt>
                    <dd class="text-lg font-medium text-gray-900">
                      {{ teamPerformance.teamStats.teamConversionRate }}%
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
                    <span class="text-white text-sm font-bold">🎯</span>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">
                      Taxa Atingimento Metas
                    </dt>
                    <dd class="text-lg font-medium text-gray-900">
                      {{ teamPerformance.teamStats.goalAchievementRate }}%
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
                    <span class="text-white text-sm font-bold">💰</span>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">
                      Faturamento Total
                    </dt>
                    <dd class="text-lg font-medium text-gray-900">
                      <div v-if="dashboardData">
                        R$ {{ formatCurrency(dashboardData.indicadores.faturamentoTotal) }} / 
                        R$ {{ formatCurrency(dashboardData.indicadores.metaMensal) }}
                      </div>
                      <div v-else>
                        R$ {{ formatCurrency(teamPerformance.teamStats.totalFaturamento) }}
                      </div>
                    </dd>
                    <dd v-if="dashboardData" class="text-xs text-gray-500 mt-1">
                      {{ getMetaProgressPercentage() }}% da meta mensal
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <!-- Progress bar for meta -->
            <div v-if="dashboardData" class="px-5 pb-3">
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div 
                  class="h-2 rounded-full transition-all duration-300"
                  :class="getMetaProgressColor()"
                  :style="{ width: Math.min(getMetaProgressPercentage(), 100) + '%' }"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Original KPIs (for backward compatibility) -->
        <div v-if="dashboardData" class="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      Total de Propostas
                    </dt>
                    <dd class="text-lg font-medium text-gray-900">
                      {{ dashboardData.indicadores.totalPropostas }}
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
                      Total de Vendas
                    </dt>
                    <dd class="text-lg font-medium text-gray-900">
                      {{ dashboardData.indicadores.totalVendas }}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Enhanced Performance Table -->
        <PerformanceTable
          v-if="teamPerformance"
          :team-members="teamPerformance.teamMembers"
          :supervisors="supervisors"
          title="Performance Detalhada da Equipe"
          @filter-change="handleFilterChange"
          @drill-down="handleDrillDown"
        />

        <!-- Representative Detail Modal -->
        <RepresentativeDetailModal
          :is-open="showDetailModal"
          :representative="selectedRepresentative"
          :details="representativeDetails"
          :loading="detailLoading"
          @close="closeDetailModal"
        />
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { dashboardService, performanceService, supervisorService } from '../services/api'
import PerformanceTable from '../components/PerformanceTable.vue'
import RepresentativeDetailModal from '../components/RepresentativeDetailModal.vue'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(true)
const dashboardData = ref(null)
const teamPerformance = ref(null)
const supervisors = ref([])
const showDetailModal = ref(false)
const selectedRepresentative = ref(null)
const representativeDetails = ref(null)
const detailLoading = ref(false)

const currentFilters = ref({
  period: '2025-07',
  startDate: '',
  endDate: '',
  supervisor: 'all'
})

const loadDashboard = async () => {
  loading.value = true
  try {
    // Load dashboard data, team performance, and supervisors
    const [dashboardResponse, performanceResponse, supervisorsResponse] = await Promise.all([
      dashboardService.getGerenteComercialDashboard(currentFilters.value.period),
      performanceService.getTeamPerformance(currentFilters.value),
      supervisorService.getSupervisors()
    ])
    
    dashboardData.value = dashboardResponse.data
    teamPerformance.value = performanceResponse.data
    supervisors.value = supervisorsResponse.data
    
    console.log('Dashboard Data:', dashboardData.value)
    console.log('Team Performance Data:', teamPerformance.value)
    console.log('Supervisors:', supervisors.value)
  } catch (error) {
    console.error('Erro ao carregar dashboard:', error)
  } finally {
    loading.value = false
  }
}

const handleFilterChange = async (filters) => {
  currentFilters.value = { ...filters }
  
  try {
    const performanceResponse = await performanceService.getTeamPerformance(filters)
    teamPerformance.value = performanceResponse.data
    
    // Also update dashboard data if period changed
    if (filters.period) {
      const dashboardResponse = await dashboardService.getGerenteComercialDashboard(filters.period)
      dashboardData.value = dashboardResponse.data
    }
  } catch (error) {
    console.error('Erro ao aplicar filtros:', error)
  }
}

const handleDrillDown = async (representative) => {
  selectedRepresentative.value = representative
  showDetailModal.value = true
  detailLoading.value = true
  
  try {
    const response = await performanceService.getRepresentativeDetails(
      representative.id, 
      currentFilters.value
    )
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

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

const getMetaProgressPercentage = () => {
  if (!dashboardData.value) return 0
  const { faturamentoTotal, metaMensal } = dashboardData.value.indicadores
  return metaMensal > 0 ? ((faturamentoTotal / metaMensal) * 100).toFixed(1) : 0
}

const getMetaProgressColor = () => {
  const percentage = getMetaProgressPercentage()
  if (percentage >= 100) return 'bg-green-500'
  if (percentage >= 75) return 'bg-yellow-500'
  if (percentage >= 50) return 'bg-orange-500'
  return 'bg-red-500'
}

const logout = () => {
  authStore.logout()
  router.push('/login')
}

onMounted(() => {
  authStore.initializeAuth()
  loadDashboard()
})
</script>
