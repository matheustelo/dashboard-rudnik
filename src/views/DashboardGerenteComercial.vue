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
            <select
              v-model="selectedPeriod"
              @change="loadDashboard"
              class="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="2025-01">Janeiro 2025</option>
              <option value="2025-02">Fevereiro 2025</option>
              <option value="2025-03">Março 2025</option>
              <option value="2025-04">Abril 2025</option>
              <option value="2025-05">Maio 2025</option>
              <option value="2025-06">Junho 2025</option>
              <option value="2025-07">Julho 2025</option>
            </select>
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
                      R$ {{ formatCurrency(teamPerformance.teamStats.totalFaturamento) }}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Performance Charts -->
        <div v-if="teamPerformance" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TeamPerformanceChart
            :data="conversionRateChartData"
            title="Taxa de Conversão por Representante"
            type="bar"
            :options="chartOptions.conversionRate"
          />

          <TeamPerformanceChart
            :data="goalAchievementChartData"
            title="Atingimento de Metas por Representante"
            type="bar"
            :options="chartOptions.goalAchievement"
          />
        </div>

        <!-- Detailed Performance Table -->
        <PerformanceTable
          v-if="teamPerformance"
          :team-members="teamPerformance.teamMembers"
          title="Performance Detalhada da Equipe"
        />

        <!-- Original KPIs (for backward compatibility) -->
        <div v-if="dashboardData" class="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                      Faturamento Total
                    </dt>
                    <dd class="text-lg font-medium text-gray-900">
                      R$ {{ formatCurrency(dashboardData.indicadores.faturamentoTotal) }}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Top Performers Chart -->
        <div v-if="dashboardData" class="bg-white p-6 rounded-lg shadow">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Top Vendedores</h3>
          <BarChart
            v-if="chartData.topVendedores"
            :data="chartData.topVendedores"
            :options="chartOptions.bar"
          />
        </div>

        <!-- Top Vendedores Table -->
        <div v-if="dashboardData" class="bg-white shadow rounded-lg">
          <div class="px-4 py-5 sm:p-6">
            <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
              Top 10 Vendedores e Representantes
            </h3>
            <div class="overflow-hidden">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Posição
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
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
                    v-for="(vendedor, index) in dashboardData.topVendedores"
                    :key="index"
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
                      <span 
                        :class="vendedor.role === 'representante' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'"
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      >
                        {{ vendedor.role === 'representante' ? 'Representante' : 'Vendedor' }}
                      </span>
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
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { dashboardService, performanceService } from '../services/api'
import BarChart from '../components/BarChart.vue'
import TeamPerformanceChart from '../components/TeamPerformanceChart.vue'
import PerformanceTable from '../components/PerformanceTable.vue'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(true)
const dashboardData = ref(null)
const teamPerformance = ref(null)
const selectedPeriod = ref('2025-07')

const chartData = computed(() => {
  if (!dashboardData.value) return {}

  return {
    topVendedores: {
      labels: dashboardData.value.topVendedores?.slice(0, 5).map(v => v.name) || [],
      datasets: [{
        label: 'Faturamento (R$)',
        data: dashboardData.value.topVendedores?.slice(0, 5).map(v => v.faturamento) || [],
        backgroundColor: [
          'rgba(255, 206, 84, 0.8)',
          'rgba(192, 192, 192, 0.8)',
          'rgba(255, 159, 64, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(153, 102, 255, 0.8)'
        ]
      }]
    }
  }
})

const conversionRateChartData = computed(() => {
  if (!teamPerformance.value) return {}

  return {
    labels: teamPerformance.value.teamMembers.map(member => member.name),
    datasets: [{
      label: 'Taxa de Conversão (%)',
      data: teamPerformance.value.teamMembers.map(member => member.performance.conversionRate),
      backgroundColor: teamPerformance.value.teamMembers.map(member => {
        const rate = member.performance.conversionRate
        if (rate >= 20) return 'rgba(34, 197, 94, 0.8)'
        if (rate >= 15) return 'rgba(234, 179, 8, 0.8)'
        return 'rgba(239, 68, 68, 0.8)'
      })
    }]
  }
})

const goalAchievementChartData = computed(() => {
  if (!teamPerformance.value) return {}

  return {
    labels: teamPerformance.value.teamMembers.map(member => member.name),
    datasets: [{
      label: 'Metas Atingidas',
      data: teamPerformance.value.teamMembers.map(member => member.goals.achievedGoals),
      backgroundColor: 'rgba(34, 197, 94, 0.8)'
    }, {
      label: 'Total de Metas',
      data: teamPerformance.value.teamMembers.map(member => member.goals.totalGoals),
      backgroundColor: 'rgba(156, 163, 175, 0.8)'
    }]
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
  },
  conversionRate: {
    responsive: true,
    plugins: {
      legend: {
        position: 'top'
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return context.dataset.label + ': ' + context.parsed.y + '%'
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: function(value) {
            return value + '%'
          }
        }
      }
    }
  },
  goalAchievement: {
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
    // Load both original dashboard data and team performance
    const [dashboardResponse, performanceResponse] = await Promise.all([
      dashboardService.getGerenteComercialDashboard(selectedPeriod.value),
      performanceService.getTeamPerformance(selectedPeriod.value)
    ])
    
    dashboardData.value = dashboardResponse.data
    teamPerformance.value = performanceResponse.data
    
    console.log('Team Performance Data:', teamPerformance.value)
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

onMounted(() => {
  authStore.initializeAuth()
  loadDashboard()
})
</script>
